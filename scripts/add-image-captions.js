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

// Create a simple 20-word caption in portable text format
function createCaptionBlock(text) {
  return [
    {
      _key: generateKey(),
      _type: 'block',
      children: [
        {
          _key: generateKey(),
          _type: 'span',
          text: text,
          marks: []
        }
      ],
      markDefs: [],
      style: 'normal'
    }
  ];
}

// Default captions (exactly 20 words each)
const defaultCaptions = {
  en: "Image caption to be added. Please update with details about artwork, artist, techniques, materials or context shown in these images.",
  de: "Bildunterschrift hinzuzufügen. Bitte aktualisieren mit Details über Kunstwerk, Künstler, Techniken, Materialien oder Kontext dieser Bilder hier."
};

async function addImageCaptions(dryRun = false) {
  console.log('🔍 Fetching all articles from Sanity...\n');
  
  const articles = await client.fetch(
    `*[_type == "article"] | order(creatorName asc) {
      _id,
      creatorName,
      "titleEn": title.en,
      section1Images,
      section1Captions,
      section2Images,
      section2Captions,
      section3Images,
      section3Captions,
      section4Images,
      section4Captions
    }`
  );
  
  console.log(`📊 Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    const displayName = article.creatorName || article.titleEn || article._id;
    const updates = {};
    let needsUpdate = false;
    
    // Check each section
    for (let i = 1; i <= 4; i++) {
      const imagesKey = `section${i}Images`;
      const captionsKey = `section${i}Captions`;
      
      const hasImages = article[imagesKey] && article[imagesKey].length > 0;
      const hasCaptions = article[captionsKey] && 
                          (article[captionsKey].en?.length > 0 || article[captionsKey].de?.length > 0);
      
      // If has images but no captions, add placeholder
      if (hasImages && !hasCaptions) {
        updates[captionsKey] = {
          en: createCaptionBlock(defaultCaptions.en),
          de: createCaptionBlock(defaultCaptions.de)
        };
        needsUpdate = true;
        console.log(`  📝 ${displayName} - Adding caption to section ${i}`);
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
  console.log(`   ⏭️  Skipped (already has captions): ${skipped}`);
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('Run without --dry-run to apply changes');
  }
}

// Main
const dryRun = process.argv.includes('--dry-run');
addImageCaptions(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });

