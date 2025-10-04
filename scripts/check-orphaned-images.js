import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

dotenv.config();

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN,
});

async function checkOrphanedImages() {
  console.log('🔍 Checking for orphaned images in Sanity...\n');

  // Get all image assets
  console.log('📥 Fetching all image assets...');
  const allImages = await sanityClient.fetch(`
    *[_type == "sanity.imageAsset"] {
      _id,
      originalFilename,
      url,
      "uploadDate": _createdAt
    } | order(_createdAt desc)
  `);
  
  console.log(`Found ${allImages.length} total image assets\n`);

  // Get all images referenced by artworks
  console.log('📥 Fetching images used by artworks...');
  const usedByArtworks = await sanityClient.fetch(`
    array::unique(*[_type == "artwork"]{
      "imageRefs": [
        ...select(defined(images) => images[].asset._ref, []),
        ...select(defined(mainImage.asset._ref) => [mainImage.asset._ref], [])
      ]
    }.imageRefs[])
  `);
  
  console.log(`Found ${usedByArtworks.length} images used by artworks\n`);

  // Get images used by creators
  console.log('📥 Fetching images used by creators...');
  const usedByCreators = await sanityClient.fetch(`
    array::unique(*[_type == "creator"]{
      "imageRefs": [
        ...select(defined(profileImage.asset._ref) => [profileImage.asset._ref], []),
        ...select(defined(overviewImage.asset._ref) => [overviewImage.asset._ref], [])
      ]
    }.imageRefs[])
  `);
  
  console.log(`Found ${usedByCreators.length} images used by creators\n`);

  // Combine all used images
  const allUsedImages = new Set([...usedByArtworks, ...usedByCreators]);
  console.log(`Total unique images in use: ${allUsedImages.size}\n`);

  // Find orphaned images
  const orphanedImages = allImages.filter(img => !allUsedImages.has(img._id));
  
  console.log('📊 RESULTS:');
  console.log('─'.repeat(70));
  console.log(`Total image assets: ${allImages.length}`);
  console.log(`Images in use: ${allUsedImages.size}`);
  console.log(`Orphaned images: ${orphanedImages.length}`);
  console.log(`Percentage orphaned: ${((orphanedImages.length / allImages.length) * 100).toFixed(1)}%`);

  if (orphanedImages.length > 0) {
    console.log('\n\n📸 Sample orphaned images (first 20):');
    console.log('─'.repeat(70));
    orphanedImages.slice(0, 20).forEach((img, i) => {
      console.log(`${i + 1}. ${img.originalFilename || 'unknown'}`);
      console.log(`   ID: ${img._id}`);
      console.log(`   Uploaded: ${img.uploadDate?.split('T')[0]}`);
    });

    // Check if orphaned images match missing artwork patterns
    console.log('\n\n🔍 Checking if orphaned images match missing artworks...');
    
    const missingArtworks = await sanityClient.fetch(`
      *[_type == "artwork" && !defined(images) && !defined(mainImage.asset._ref)] {
        _id,
        "title": workTitle.en,
        "creator": creator->name,
        slug
      }
    `);

    console.log(`\nMissing media artworks: ${missingArtworks.length}`);
    console.log(`Orphaned images: ${orphanedImages.length}`);
    
    if (orphanedImages.length >= missingArtworks.length) {
      console.log('\n✅ Good news! There are enough orphaned images to potentially match all missing artworks.');
    } else {
      console.log('\n⚠️  Not enough orphaned images to cover all missing artworks.');
    }

    // Try to find matching patterns
    console.log('\n\n🔗 Sample potential matches:');
    console.log('─'.repeat(70));
    
    let matchCount = 0;
    for (let i = 0; i < Math.min(10, missingArtworks.length); i++) {
      const artwork = missingArtworks[i];
      const creatorName = (artwork.creator || '').toLowerCase();
      const title = (artwork.title || '').toLowerCase();
      
      // Find images with matching filename patterns
      const potentialMatches = orphanedImages.filter(img => {
        const filename = (img.originalFilename || '').toLowerCase();
        return filename.includes(creatorName) || 
               (title.length > 3 && filename.includes(title));
      });

      if (potentialMatches.length > 0) {
        matchCount++;
        console.log(`\n✓ ${artwork.creator} - ${artwork.title}`);
        console.log(`  Potential matches: ${potentialMatches.length}`);
        potentialMatches.slice(0, 2).forEach(img => {
          console.log(`    → ${img.originalFilename}`);
        });
      }
    }

    console.log(`\n\nFound ${matchCount}/10 potential matches in sample`);
  }

  console.log('\n\n💡 NEXT STEPS:');
  console.log('─'.repeat(70));
  if (orphanedImages.length > 0) {
    console.log('1. Create a script to match orphaned images to artworks by filename patterns');
    console.log('2. Link matched images to their artworks');
    console.log('3. For unmatched artworks, fetch images from ArtAurea');
  } else {
    console.log('No orphaned images found. Need to import images from external source.');
  }
}

checkOrphanedImages().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

