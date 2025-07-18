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

async function debugImageSync() {
  console.log('🔍 Debugging artwork image sync...\n');
  
  try {
    // Get one artwork with images
    const artwork = await sanityClient.fetch(`
      *[_type == "artwork" && defined(images) && length(images) > 0][0] {
        _id,
        name,
        workTitle,
        description,
        creator->{_id, name},
        images[]{ 
          asset->{
            _id,
            url,
            originalFilename
          },
          alt
        }
      }
    `);
    
    if (!artwork) {
      console.log('❌ No artwork with images found');
      return;
    }
    
    console.log('✅ Found artwork with images:');
    console.log(`  - Name: ${artwork.name}`);
    console.log(`  - Creator: ${artwork.creator?.name || 'None'}`);
    console.log(`  - Images: ${artwork.images?.length || 0}`);
    
    if (artwork.images && artwork.images.length > 0) {
      console.log('\n🖼️  Image details:');
      artwork.images.forEach((image, i) => {
        console.log(`  ${i + 1}. Asset ID: ${image.asset?._id || 'None'}`);
        console.log(`     URL: ${image.asset?.url || 'None'}`);
        console.log(`     Filename: ${image.asset?.originalFilename || 'None'}`);
        console.log(`     Alt text: ${image.alt?.en || image.alt?.de || 'None'}`);
        console.log('');
      });
    }
    
    // Check if asset mappings exist
    const assetMappingsPath = path.join(__dirname, 'asset-mappings.json');
    if (fs.existsSync(assetMappingsPath)) {
      const assetMappings = JSON.parse(fs.readFileSync(assetMappingsPath, 'utf8'));
      console.log(`\n📋 Asset mappings loaded: ${Object.keys(assetMappings).length} entries`);
      
      // Check if our artwork's images are in the mappings
      if (artwork.images) {
        console.log('\n🔍 Checking asset mappings for this artwork:');
        artwork.images.forEach((image, i) => {
          const sanityAssetId = image.asset?._id;
          if (sanityAssetId && assetMappings[sanityAssetId]) {
            console.log(`  ${i + 1}. ✅ Asset ${sanityAssetId} is mapped to Webflow ID: ${assetMappings[sanityAssetId].webflowAssetId}`);
          } else {
            console.log(`  ${i + 1}. ❌ Asset ${sanityAssetId} is NOT in asset mappings`);
          }
        });
      }
    } else {
      console.log('❌ No asset mappings file found');
    }
    
  } catch (error) {
    console.error('❌ Error debugging image sync:', error);
  }
}

debugImageSync(); 