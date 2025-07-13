import { sanityClient } from './sanity-client.js';

// SECURITY: Use environment variable for API token
// Make sure SANITY_API_TOKEN is set in your .env file

async function checkClaudiaHoppe() {
  console.log('🔍 Checking Claudia Hoppe specifically...');
  
  try {
    // Find Claudia Hoppe specifically
    const claudia = await sanityClient.fetch(`
      *[_type == "creator" && name match "Claudia Hoppe*"][0] {
        _id,
        name,
        slug,
        biography,
        portrait,
        sourceUrls
      }
    `);
    
    if (!claudia) {
      console.log('❌ Claudia Hoppe not found');
      return;
    }
    
    console.log('📊 Claudia Hoppe found:');
    console.log('   _id:', claudia._id);
    console.log('   name:', claudia.name);
    console.log('   slug:', claudia.slug);
    console.log('   ');
    
    console.log('📖 Biography structure:');
    if (claudia.biography) {
      console.log('   biography exists:', typeof claudia.biography);
      console.log('   biography.en exists:', !!claudia.biography.en);
      console.log('   biography.de exists:', !!claudia.biography.de);
      
      if (claudia.biography.en) {
        console.log('   biography.en length:', claudia.biography.en.length);
        console.log('   biography.en first block:', claudia.biography.en[0]);
      }
      
      if (claudia.biography.de) {
        console.log('   biography.de length:', claudia.biography.de.length);
        console.log('   biography.de first block:', claudia.biography.de[0]);
      }
    } else {
      console.log('   ❌ biography is missing or null');
    }
    
    console.log('');
    console.log('🎭 Portrait structure:');
    if (claudia.portrait) {
      console.log('   portrait exists:', typeof claudia.portrait);
      console.log('   portrait.en exists:', !!claudia.portrait.en);
      console.log('   portrait.de exists:', !!claudia.portrait.de);
      
      if (claudia.portrait.en) {
        console.log('   portrait.en length:', claudia.portrait.en.length);
        console.log('   portrait.en first block:', claudia.portrait.en[0]);
      }
      
      if (claudia.portrait.de) {
        console.log('   portrait.de length:', claudia.portrait.de.length);
        console.log('   portrait.de first block:', claudia.portrait.de[0]);
      }
    } else {
      console.log('   ❌ portrait is missing or null');
    }
    
  } catch (error) {
    console.error('❌ Error checking Claudia Hoppe:', error);
  }
}

checkClaudiaHoppe(); 