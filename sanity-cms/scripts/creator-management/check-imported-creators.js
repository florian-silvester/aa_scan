import { sanityClient } from './sanity-client.js';

// SECURITY: Use environment variable for API token
// Make sure SANITY_API_TOKEN is set in your .env file

async function checkImportedCreators() {
  console.log('🔍 Checking imported creator data structure...');
  
  try {
    // Get a few creators to examine structure
    const creators = await sanityClient.fetch(`
      *[_type == "creator"][0...3] {
        _id,
        name,
        slug,
        biography,
        portrait,
        sourceUrls
      }
    `);
    
    console.log(`\n📊 Found ${creators.length} creators. Examining structure:\n`);
    
    creators.forEach((creator, index) => {
      console.log(`[${index + 1}] Creator: ${creator.name}`);
      console.log(`   _id: ${creator._id}`);
      console.log(`   slug: ${creator.slug?.current || 'N/A'}`);
      console.log(`   biography:`, creator.biography ? 'Present' : 'Missing');
      console.log(`   portrait:`, creator.portrait ? 'Present' : 'Missing');
      console.log(`   sourceUrls:`, creator.sourceUrls ? 'Present' : 'Missing');
      
      if (creator.biography) {
        console.log(`   biography structure:`, JSON.stringify(creator.biography, null, 2));
      }
      
      if (creator.portrait) {
        console.log(`   portrait structure:`, JSON.stringify(creator.portrait, null, 2));
      }
      
      console.log('');
    });
    
    // Get total count
    const totalCount = await sanityClient.fetch(`count(*[_type == "creator"])`);
    console.log(`\n📈 Total creators in database: ${totalCount}`);
    
  } catch (error) {
    console.error('❌ Error checking creators:', error);
  }
}

checkImportedCreators(); 