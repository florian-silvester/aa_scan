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

async function setLayoutsByImageCount(dryRun = false) {
  console.log('🔍 Fetching all articles from Sanity...\n');
  
  const articles = await client.fetch(
    `*[_type == "article"] | order(creatorName asc) {
      _id,
      creatorName,
      "titleEn": title.en,
      section1Images,
      section1Layout,
      section2Images,
      section2Layout,
      section3Images,
      section3Layout,
      section4Images,
      section4Layout
    }`
  );
  
  console.log(`📊 Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    const displayName = article.creatorName || article.titleEn || article._id;
    const updates = {};
    let needsUpdate = false;
    
    for (let i = 1; i <= 4; i++) {
      const imagesKey = `section${i}Images`;
      const layoutKey = `section${i}Layout`;
      
      const images = article[imagesKey];
      const currentLayout = article[layoutKey];
      const imageCount = images?.length || 0;
      
      if (imageCount === 0) {
        continue; // Skip sections with no images
      }
      
      // Determine desired layout based on image count
      const desiredLayout = imageCount > 1 ? 'Full' : 'Small';
      
      if (currentLayout !== desiredLayout) {
        updates[layoutKey] = desiredLayout;
        needsUpdate = true;
        console.log(`  📐 ${displayName} - Section ${i}: ${imageCount} image(s) → ${desiredLayout} (was: ${currentLayout || 'not set'})`);
      }
    }
    
    if (needsUpdate) {
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
  console.log(`   ⏭️  Skipped (already correct): ${skipped}`);
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('Run without --dry-run to apply changes');
  }
}

const dryRun = process.argv.includes('--dry-run');
setLayoutsByImageCount(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

