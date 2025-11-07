const sanityClient = require('@sanity/client');
require('dotenv').config({ path: '../.env.bak' });

const client = sanityClient.createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

// Generate dummy caption paragraphs (20 words each)
function generateDummyCaptions(count, language = 'en') {
  const captions = [];
  const placeholder = language === 'en' 
    ? 'This is a placeholder caption for the artwork image. Please replace with actual details about the piece, materials, dimensions, year, and artist information.'
    : 'Dies ist eine Platzhalter-Bildunterschrift für das Kunstwerk. Bitte ersetzen Sie sie durch tatsächliche Details über das Stück, Materialien, Abmessungen, Jahr und Künstlerinformationen.';
  
  for (let i = 0; i < count; i++) {
    captions.push({
      _type: 'block',
      _key: `dummy-${Date.now()}-${i}`,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: `span-${Date.now()}-${i}`,
          text: placeholder,
          marks: []
        }
      ]
    });
  }
  
  return captions;
}

async function addDummyCaptions(dryRun = true) {
  console.log('🔍 Fetching all articles from Sanity...\n');
  
  const articles = await client.fetch(`
    *[_type == "article"] {
      _id,
      creatorName,
      "titleEn": title.en,
      "titleDe": title.de,
      section1Images,
      section1Captions,
      section2Images,
      section2Captions,
      section3Images,
      section3Captions,
      section4Images,
      section4Captions
    }
  `);
  
  console.log(`📊 Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    const displayName = article.creatorName || article.titleEn || article.titleDe || article._id;
    console.log(`\n📄 ${displayName}`);
    
    const sections = [
      { name: 'section1', images: article.section1Images, captions: article.section1Captions },
      { name: 'section2', images: article.section2Images, captions: article.section2Captions },
      { name: 'section3', images: article.section3Images, captions: article.section3Captions },
      { name: 'section4', images: article.section4Images, captions: article.section4Captions }
    ];
    
    const updates = {};
    let hasUpdates = false;
    
    for (const section of sections) {
      const imageCount = section.images?.length || 0;
      const captionsEn = section.captions?.en || [];
      const captionsDe = section.captions?.de || [];
      const captionCountEn = captionsEn.length;
      const captionCountDe = captionsDe.length;
      
      if (imageCount === 0) {
        // No images, skip
        continue;
      }
      
      console.log(`   ${section.name}: ${imageCount} images`);
      
      // Force replace captions with new 20-word text
      if (imageCount > 0) {
        console.log(`      → Replacing with ${imageCount} new 20-word captions (EN + DE)`);
        updates[`${section.name}Captions.en`] = generateDummyCaptions(imageCount, 'en');
        updates[`${section.name}Captions.de`] = generateDummyCaptions(imageCount, 'de');
        hasUpdates = true;
      }
    }
    
    if (hasUpdates) {
      console.log(`   ✅ Updating article with ${Object.keys(updates).length} caption fields`);
      
      if (!dryRun) {
        await client
          .patch(article._id)
          .set(updates)
          .commit();
      }
      
      updated++;
    } else {
      console.log(`   ⏭️  All captions match image counts`);
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
    console.log('Run with --apply to actually update articles in Sanity');
  }
}

// Main
const dryRun = !process.argv.includes('--apply');
addDummyCaptions(dryRun).catch(console.error);

