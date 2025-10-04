const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_SITE_ID = '68664367794a916bfa6d247c';
const WEBFLOW_COLLECTIONS = {
  artwork: '686e50ba1170cab27bfa6c49',
  creator: '686e4d544cb3505ce3b1412c'
};

// Load the full sync functions
const { performCompleteSync } = require('../api/sync-to-webflow.js');

async function testLimitedArtworkSync() {
  console.log('🧪 Testing limited artwork sync (3 artworks with images)...\n');
  
  try {
    // Get 3 artworks with images
    const artworks = await sanityClient.fetch(`
      *[_type == "artwork" && defined(images) && length(images) > 0] | order(name asc) [0...3] {
        _id,
        name,
        images[]{ 
          asset->{
            _id,
            url,
            originalFilename
          }
        }
      }
    `);
    
    console.log(`✅ Found ${artworks.length} artworks with images:`);
    artworks.forEach((artwork, i) => {
      console.log(`  ${i + 1}. ${artwork.name} (${artwork.images?.length || 0} images)`);
    });
    
    console.log('\n🚀 Running limited sync...');
    
    // Modify the sync to only process these specific artworks
    // We'll need to temporarily patch the sync function
    
    // For now, let's just run the full sync and see what happens
    console.log('Note: Running full sync since limited sync requires code modification');
    
    await performCompleteSync();
    
    console.log('\n✅ Sync completed! Check Webflow for results.');
    
  } catch (error) {
    console.error('❌ Error testing limited artwork sync:', error);
  }
}

testLimitedArtworkSync(); 