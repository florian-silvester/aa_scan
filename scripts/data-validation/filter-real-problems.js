import client from '../../sanity-client.js';

async function filterRealProblems() {
  console.log('=== FILTERING REAL TRANSLATION PROBLEMS ===\n');
  
  // Get artworks with identical EN/DE descriptions (real problem)
  const identical = await client.fetch(`
    *[_type == "artwork" && 
      description.en == description.de && 
      defined(description.en) && 
      description.en != ""
    ]{
      _id, 
      title,
      "artist": creator->name,
      description
    }
  `);
  
  console.log(`IDENTICAL EN/DE DESCRIPTIONS: ${identical.length} cases`);
  console.log('These need proper translation\n');
  
  // Sample of first 10 identical cases
  console.log('=== SAMPLE IDENTICAL CASES ===');
  identical.slice(0, 10).forEach((artwork, i) => {
    console.log(`${i + 1}. ${artwork.artist} - ${artwork.title}`);
    console.log(`   ID: ${artwork._id}`);
    console.log(`   TEXT: "${artwork.description.en}"`);
    console.log('');
  });
  
  return {
    identicalCount: identical.length,
    identicalSample: identical.slice(0, 20) // Return first 20 for batch processing
  };
}

filterRealProblems().catch(console.error); 