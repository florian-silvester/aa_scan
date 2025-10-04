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

async function analyzeMissingMedia() {
  console.log('🔍 Analyzing artworks missing media...\n');

  // Get stats on different media field conditions
  const stats = await sanityClient.fetch(`{
    "total": count(*[_type == "artwork"]),
    "noImageFieldAtAll": count(*[_type == "artwork" && !defined(images)]),
    "emptyImagesArray": count(*[_type == "artwork" && defined(images) && count(images) == 0]),
    "imagesWithNoAsset": count(*[_type == "artwork" && defined(images) && count(images) > 0 && count(images[defined(asset._ref)]) == 0]),
    "hasValidImages": count(*[_type == "artwork" && defined(images) && count(images[defined(asset._ref)]) > 0]),
    "noMainImage": count(*[_type == "artwork" && !defined(mainImage.asset._ref)]),
    "hasMainImage": count(*[_type == "artwork" && defined(mainImage.asset._ref)])
  }`);

  console.log('📊 ARTWORK MEDIA STATISTICS:');
  console.log('─'.repeat(50));
  console.log(`Total artworks: ${stats.total}`);
  console.log(`\n🖼️  IMAGES ARRAY (multi-image gallery):`);
  console.log(`  ✅ Has valid images: ${stats.hasValidImages}`);
  console.log(`  ❌ No images field: ${stats.noImageFieldAtAll}`);
  console.log(`  ❌ Empty images array: ${stats.emptyImagesArray}`);
  console.log(`  ❌ Images array but no assets: ${stats.imagesWithNoAsset}`);
  
  console.log(`\n🎨 MAIN IMAGE (single primary image):`);
  console.log(`  ✅ Has main image: ${stats.hasMainImage}`);
  console.log(`  ❌ No main image: ${stats.noMainImage}`);

  const totalMissingAnyMedia = stats.total - Math.max(stats.hasValidImages, stats.hasMainImage);
  console.log(`\n❌ TOTAL MISSING ANY MEDIA: ${totalMissingAnyMedia}`);

  // Sample artworks missing media
  console.log('\n\n📝 SAMPLE ARTWORKS MISSING MEDIA (first 10):');
  console.log('─'.repeat(50));
  
  const missingMedia = await sanityClient.fetch(`
    *[_type == "artwork" && 
      (!defined(images) || count(images[defined(asset._ref)]) == 0) &&
      !defined(mainImage.asset._ref)
    ] | order(_createdAt desc) [0...10] {
      _id,
      "title": workTitle.en,
      "creator": creator->name,
      _createdAt,
      "hasImagesField": defined(images),
      "imagesCount": count(images),
      "hasMainImageField": defined(mainImage)
    }
  `);

  missingMedia.forEach((artwork, i) => {
    console.log(`\n${i + 1}. ${artwork.title}`);
    console.log(`   Creator: ${artwork.creator || 'Unknown'}`);
    console.log(`   Created: ${artwork._createdAt}`);
    console.log(`   Has images field: ${artwork.hasImagesField}`);
    console.log(`   Images count: ${artwork.imagesCount || 0}`);
    console.log(`   Has mainImage field: ${artwork.hasMainImageField}`);
  });

  // Check if this is a data import issue or schema issue
  console.log('\n\n🔬 CHECKING SCHEMA STRUCTURE:');
  console.log('─'.repeat(50));
  
  const sampleWithImages = await sanityClient.fetch(`
    *[_type == "artwork" && defined(images) && count(images) > 0][0] {
      _id,
      "title": workTitle.en,
      "imagesStructure": images[0]
    }
  `);

  const sampleWithMainImage = await sanityClient.fetch(`
    *[_type == "artwork" && defined(mainImage.asset._ref)][0] {
      _id,
      "title": workTitle.en,
      "mainImageStructure": mainImage
    }
  `);

  if (sampleWithImages) {
    console.log('\n✅ Sample artwork WITH images array:');
    console.log(`   Title: ${sampleWithImages.title}`);
    console.log(`   Image structure:`, JSON.stringify(sampleWithImages.imagesStructure, null, 2));
  }

  if (sampleWithMainImage) {
    console.log('\n✅ Sample artwork WITH mainImage:');
    console.log(`   Title: ${sampleWithMainImage.title}`);
    console.log(`   MainImage structure:`, JSON.stringify(sampleWithMainImage.mainImageStructure, null, 2));
  }

  // Check for artworks that have BOTH
  const hasBoth = await sanityClient.fetch(`
    count(*[_type == "artwork" && 
      defined(images) && count(images[defined(asset._ref)]) > 0 &&
      defined(mainImage.asset._ref)
    ])
  `);

  console.log(`\n📊 Artworks with BOTH images array AND mainImage: ${hasBoth}`);

  // Root cause analysis
  console.log('\n\n💡 ROOT CAUSE ANALYSIS:');
  console.log('─'.repeat(50));
  
  const oldestMissing = stats.noImageFieldAtAll + stats.emptyImagesArray + stats.imagesWithNoAsset;
  const percentMissing = ((oldestMissing / stats.total) * 100).toFixed(1);
  
  console.log(`${percentMissing}% of artworks are missing media.`);
  console.log('\nLikely causes:');
  console.log('1. Images were never imported from the source');
  console.log('2. Data migration script didn\'t include media');
  console.log('3. Schema changed and old data needs updating');
  console.log('4. External image URLs expired or broke');
}

analyzeMissingMedia().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

