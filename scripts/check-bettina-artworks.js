import sanityClient from '../sanity-cms/sanity-client.js';

async function checkBettinaArtworks() {
  try {
    // Find Bettina Geistlich creator
    const creator = await sanityClient.fetch(`
      *[_type == 'creator' && name match '*Geistlich*' || name match '*Geitlisch*'][0] {
        _id,
        name,
        'artworkCount': count(*[_type == 'artwork' && references(^._id)])
      }
    `);
    
    if (!creator) {
      console.log('❌ No creator found matching "Geistlich" or "Geitlisch"');
      return;
    }
    
    console.log(`\n✅ Found creator: ${creator.name}`);
    console.log(`📊 Total artworks: ${creator.artworkCount}`);
    
    // Get detailed artwork info
    const artworks = await sanityClient.fetch(`
      *[_type == 'artwork' && references($creatorId)] {
        _id,
        workTitle,
        'hasMainImage': defined(mainImage),
        'mainImageUrl': mainImage.asset->url,
        'hasImages': defined(images) && count(images) > 0,
        'imageCount': count(images),
        'hasMedia': defined(media) && count(media) > 0,
        'mediaCount': count(media),
        'captionsExist': defined(description),
        description,
        year,
        _updatedAt
      } | order(_updatedAt desc)
    `, { creatorId: creator._id });
    
    console.log(`\n📋 Artwork Details:\n`);
    artworks.forEach((artwork, index) => {
      const title = artwork.workTitle?.en || artwork.workTitle?.de || JSON.stringify(artwork.workTitle) || 'Untitled';
      console.log(`${index + 1}. ${title}`);
      console.log(`   ID: ${artwork._id}`);
      console.log(`   Main Image: ${artwork.hasMainImage ? `✅ ${artwork.mainImageUrl}` : '❌ None'}`);
      console.log(`   Legacy Images: ${artwork.hasImages ? `✅ ${artwork.imageCount}` : '❌ None'}`);
      console.log(`   Description: ${artwork.captionsExist ? `✅` : '❌ None'}`);
      if (artwork.description?.en) console.log(`      EN: ${artwork.description.en.substring(0, 80)}...`);
      if (artwork.description?.de) console.log(`      DE: ${artwork.description.de.substring(0, 80)}...`);
      console.log(`   Year: ${artwork.year || 'N/A'}`);
      console.log(`   Updated: ${artwork._updatedAt}`);
      console.log('');
    });
    
    // Summary
    const withMainImage = artworks.filter(a => a.hasMainImage).length;
    const withoutMainImage = artworks.filter(a => !a.hasMainImage).length;
    const withCaptions = artworks.filter(a => a.captionsExist).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total artworks: ${artworks.length}`);
    console.log(`   With mainImage: ${withMainImage}`);
    console.log(`   Without mainImage: ${withoutMainImage}`);
    console.log(`   With descriptions: ${withCaptions}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBettinaArtworks();

