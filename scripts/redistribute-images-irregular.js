import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.bak
const envPath = path.join(__dirname, '..', '.env.bak');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

// Irregular rhythm patterns organized by total count (NO zeros - all sections get images)
const patterns = [
  // 5 images
  [1, 2, 1, 1],
  [1, 1, 2, 1],
  [2, 1, 1, 1],
  [1, 1, 1, 2],
  // 6 images
  [1, 2, 2, 1],
  [2, 1, 2, 1],
  [1, 3, 1, 1],
  [2, 2, 1, 1],
  [1, 1, 3, 1],
  [1, 1, 2, 2],
  // 7 images
  [1, 3, 2, 1],
  [2, 1, 3, 1],
  [1, 2, 3, 1],
  [1, 2, 2, 2],
  [2, 2, 2, 1],
  [1, 3, 1, 2],
  [2, 3, 1, 1],
  [1, 1, 3, 2],
  [3, 1, 2, 1],
  [1, 2, 1, 3]
];

// Pick a pattern based on total images
function pickPattern(totalImages) {
  if (totalImages <= 4) {
    // Few images - use simple patterns
    if (totalImages === 4) return [1, 1, 1, 1];
    if (totalImages === 3) return [1, 1, 1, 0];
    if (totalImages === 2) return [1, 1, 0, 0];
    if (totalImages === 1) return [1, 0, 0, 0];
  }
  
  // Find patterns that match or are close to total
  const suitable = patterns.filter(p => {
    const sum = p.reduce((a, b) => a + b, 0);
    return sum <= totalImages && sum >= totalImages - 1;
  });
  
  if (suitable.length > 0) {
    return suitable[Math.floor(Math.random() * suitable.length)];
  }
  
  // Default to balanced pattern
  return [2, 2, 2, 1];
}

async function redistributeImages(dryRun = false) {
  console.log('🔍 Fetching all articles from Sanity...\n');
  
  const articles = await client.fetch(
    `*[_type == "article"] | order(creatorName asc) {
      _id,
      creatorName,
      "titleEn": title.en,
      section1Images,
      section1Layout,
      section1Captions,
      section2Images,
      section2Layout,
      section2Captions,
      section3Images,
      section3Layout,
      section3Captions,
      section4Images,
      section4Layout,
      section4Captions
    }`
  );
  
  console.log(`📊 Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  let patternIndex = 0; // Cycle through patterns for variety
  
  for (const article of articles) {
    const displayName = article.creatorName || article.titleEn || article._id;
    
    // Collect all images from all sections
    const allImages = [];
    const allCaptions = { en: [], de: [] };
    
    for (let i = 1; i <= 4; i++) {
      const images = article[`section${i}Images`] || [];
      const captions = article[`section${i}Captions`];
      
      // Limit to 3 images per section
      const limitedImages = images.slice(0, 3);
      allImages.push(...limitedImages);
      
      if (captions?.en) allCaptions.en.push(captions.en);
      if (captions?.de) allCaptions.de.push(captions.de);
    }
    
    if (allImages.length === 0) {
      skipped++;
      continue;
    }
    
    // Pick irregular pattern - cycle through patterns array for each article
    let pattern;
    if (allImages.length <= 4) {
      // Few images - simple distribution
      pattern = pickPattern(allImages.length);
    } else {
      // Find patterns that match the actual image count
      const matchingPatterns = patterns.filter(p => {
        const sum = p.reduce((a, b) => a + b, 0);
        return sum === allImages.length;
      });
      
      if (matchingPatterns.length > 0) {
        // Use matching pattern, cycling through them
        pattern = matchingPatterns[patternIndex % matchingPatterns.length];
      } else {
        // No exact match, use default
        pattern = pickPattern(allImages.length);
      }
      patternIndex++;
    }
    const patternSum = pattern.reduce((a, b) => a + b, 0);
    
    // Distribute images according to pattern
    const updates = {};
    let imageIndex = 0;
    let needsUpdate = false;
    
    for (let i = 1; i <= 4; i++) {
      const targetCount = pattern[i - 1];
      const newImages = allImages.slice(imageIndex, imageIndex + targetCount);
      imageIndex += targetCount;
      
      const oldImages = article[`section${i}Images`] || [];
      const oldLayout = article[`section${i}Layout`];
      
      // Set new images
      updates[`section${i}Images`] = newImages;
      
      // Set layout based on image count
      const newLayout = newImages.length > 1 ? 'Full' : newImages.length === 1 ? 'Small' : 'Main';
      updates[`section${i}Layout`] = newLayout;
      
      // Check if changed
      if (oldImages.length !== newImages.length || oldLayout !== newLayout) {
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log(`  ✅ ${displayName} - Pattern: [${pattern.join('-')}] (${patternSum} images)`);
      
      if (!dryRun) {
        await client
          .patch(article._id)
          .set(updates)
          .commit();
      }
      
      updated++;
    } else {
      skipped++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('Run without --dry-run to apply changes');
  }
}

const dryRun = process.argv.includes('--dry-run');
redistributeImages(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

