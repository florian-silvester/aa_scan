import sanity from './sanity-client.js';

async function checkArtworkTitles() {
  console.log('🔍 Checking artwork titles and captions...');
  
  const artworks = await sanity.fetch(`
    *[_type == "artwork"][0...10] {
      _id,
      title,
      rawCaption,
      creator->{name}
    }
  `);
  
  console.log(`📋 Found ${artworks.length} artworks (sample):`);
  
  artworks.forEach((artwork, index) => {
    console.log(`\n${index + 1}. Title: "${artwork.title}"`);
    console.log(`   Creator: ${artwork.creator?.name || 'No creator'}`);
    console.log(`   Raw Caption: "${artwork.rawCaption || 'No caption'}"`);
    console.log(`   ID: ${artwork._id}`);
  });
}

checkArtworkTitles().catch(console.error); 