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

// Generate a unique key for Sanity blocks
function generateKey() {
  return Math.random().toString(36).substring(2, 11);
}

// Count how many image sections an article has
function countImageSections(article) {
  let count = 0;
  for (let i = 1; i <= 4; i++) {
    const images = article[`section${i}Images`];
    if (images && images.length > 0) {
      count++;
    }
  }
  return count;
}

// Get image section numbers that have images
function getImageSectionNumbers(article) {
  const sections = [];
  for (let i = 1; i <= 4; i++) {
    const images = article[`section${i}Images`];
    if (images && images.length > 0) {
      sections.push(i);
    }
  }
  return sections;
}

// Insert image markers at natural break points in the text
function insertImageMarkers(portableTextBlocks, imageSections) {
  if (!portableTextBlocks || portableTextBlocks.length === 0) {
    return portableTextBlocks;
  }
  
  if (imageSections.length === 0) {
    return portableTextBlocks;
  }
  
  // Filter out existing imageMarker blocks
  const textBlocks = portableTextBlocks.filter(block => block._type !== 'imageMarker');
  
  if (textBlocks.length === 0) {
    return portableTextBlocks;
  }
  
  const result = [];
  const numSections = imageSections.length;
  const totalBlocks = textBlocks.length;
  
  // If not enough text blocks to distribute evenly, insert after each block
  if (totalBlocks <= numSections) {
    for (let i = 0; i < textBlocks.length; i++) {
      result.push(textBlocks[i]);
      if (i < imageSections.length) {
        result.push({
          _key: generateKey(),
          _type: 'imageMarker',
          reference: `images${imageSections[i]}`
        });
      }
    }
    // Add remaining image markers at the end
    for (let i = textBlocks.length; i < imageSections.length; i++) {
      result.push({
        _key: generateKey(),
        _type: 'imageMarker',
        reference: `images${imageSections[i]}`
      });
    }
    return result;
  }
  
  // Calculate insertion points - divide text into roughly equal parts
  const interval = Math.floor(totalBlocks / (numSections + 1));
  let imageIndex = 0;
  
  for (let i = 0; i < textBlocks.length; i++) {
    result.push(textBlocks[i]);
    
    // Insert image marker at calculated intervals
    const shouldInsert = (i + 1) % interval === 0 && imageIndex < imageSections.length;
    
    if (shouldInsert) {
      result.push({
        _key: generateKey(),
        _type: 'imageMarker',
        reference: `images${imageSections[imageIndex]}`
      });
      imageIndex++;
    }
  }
  
  // Add any remaining image markers at the end
  while (imageIndex < imageSections.length) {
    result.push({
      _key: generateKey(),
      _type: 'imageMarker',
      reference: `images${imageSections[imageIndex]}`
    });
    imageIndex++;
  }
  
  return result;
}

async function distributeImagesInText(dryRun = false) {
  console.log('🔍 Fetching all articles from Sanity...\n');
  
  const articles = await client.fetch(
    `*[_type == "article"] | order(creatorName asc) {
      _id,
      creatorName,
      "titleEn": title.en,
      fullText,
      section1Images,
      section2Images,
      section3Images,
      section4Images
    }`
  );
  
  console.log(`📊 Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    const displayName = article.creatorName || article.titleEn || article._id;
    
    // Check if article has images and text
    const imageSections = getImageSectionNumbers(article);
    const hasText = article.fullText?.en?.length > 0 || article.fullText?.de?.length > 0;
    
    if (imageSections.length === 0 || !hasText) {
      console.log(`  ⏭️  ${displayName} - No images or no text, skipping`);
      skipped++;
      continue;
    }
    
    // Process English text
    const enText = article.fullText?.en || [];
    const newEnText = insertImageMarkers(enText, imageSections);
    
    // Process German text
    const deText = article.fullText?.de || [];
    const newDeText = insertImageMarkers(deText, imageSections);
    
    // Check if anything changed
    const enChanged = JSON.stringify(enText) !== JSON.stringify(newEnText);
    const deChanged = JSON.stringify(deText) !== JSON.stringify(newDeText);
    
    if (enChanged || deChanged) {
      console.log(`  ✅ ${displayName} - Inserting ${imageSections.length} image markers (sections: ${imageSections.join(', ')})`);
      
      if (!dryRun) {
        const updates = {};
        if (enChanged) updates['fullText.en'] = newEnText;
        if (deChanged) updates['fullText.de'] = newDeText;
        
        await client
          .patch(article._id)
          .set(updates)
          .commit();
      }
      
      updated++;
    } else {
      console.log(`  ⏭️  ${displayName} - Already has image markers`);
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

// Main
const dryRun = process.argv.includes('--dry-run');
distributeImagesInText(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

