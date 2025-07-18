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

async function webflowRequest(endpoint, options = {}) {
  const response = await fetch(`https://api.webflow.com/v2${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Webflow API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function rebuildAssetMappings() {
  console.log('🔄 Rebuilding asset mappings from existing Webflow assets...\n');
  
  try {
    // 1. Get all existing assets from Webflow
    console.log('📥 Fetching existing Webflow assets...');
    let allAssets = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const response = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/assets?limit=${limit}&offset=${offset}`);
      allAssets = allAssets.concat(response.assets);
      
      if (response.assets.length < limit) break;
      offset += limit;
    }
    
    console.log(`  ✅ Found ${allAssets.length} existing assets in Webflow`);
    
    // 2. Get all artwork images from Sanity
    console.log('\n📥 Fetching artwork images from Sanity...');
    const artworks = await sanityClient.fetch(`
      *[_type == "artwork" && defined(images)] {
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
    
    // Flatten all images
    const allSanityImages = [];
    artworks.forEach(artwork => {
      artwork.images?.forEach(image => {
        if (image.asset) {
          allSanityImages.push({
            sanityAssetId: image.asset._id,
            filename: image.asset.originalFilename,
            url: image.asset.url,
            artworkName: artwork.name
          });
        }
      });
    });
    
    console.log(`  ✅ Found ${allSanityImages.length} images from ${artworks.length} artworks`);
    
    // 3. Match assets by filename
    console.log('\n🔍 Matching assets by filename...');
    const newAssetMappings = {};
    let matchedCount = 0;
    
    allSanityImages.forEach(sanityImage => {
      // Try to find matching Webflow asset by filename
      const webflowAsset = allAssets.find(asset => {
        if (!asset.filename || !sanityImage.filename) return false;
        
        return asset.filename === sanityImage.filename ||
               asset.filename.includes(sanityImage.filename.split('.')[0]) ||
               sanityImage.filename.includes(asset.filename.split('.')[0]);
      });
      
      if (webflowAsset) {
        newAssetMappings[sanityImage.sanityAssetId] = {
          webflowAssetId: webflowAsset.id,
          altText: '',
          filename: sanityImage.filename,
          url: sanityImage.url,
          lastUpdated: new Date().toISOString()
        };
        matchedCount++;
        console.log(`  ✅ Matched: ${sanityImage.filename} → ${webflowAsset.id}`);
      } else {
        console.log(`  ❌ No match: ${sanityImage.filename}`);
      }
    });
    
    console.log(`\n📊 Matching Results:`);
    console.log(`  ✅ Matched: ${matchedCount} assets`);
    console.log(`  ❌ Unmatched: ${allSanityImages.length - matchedCount} assets`);
    
    // 4. Save new asset mappings to Sanity
    console.log('\n💾 Saving new asset mappings to Sanity...');
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'asset-mappings',
      assetMappings: JSON.stringify(newAssetMappings),
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`✅ Saved ${Object.keys(newAssetMappings).length} asset mappings`);
    
    // 5. Test with one artwork
    console.log('\n🧪 Testing with one artwork...');
    const testArtwork = artworks.find(artwork => artwork.images?.length > 0);
    if (testArtwork) {
      console.log(`  Testing artwork: ${testArtwork.name}`);
      
      const testImageAssetIds = testArtwork.images
        .map(image => newAssetMappings[image.asset._id]?.webflowAssetId)
        .filter(Boolean);
      
      console.log(`  Image asset IDs: [${testImageAssetIds.join(', ')}]`);
      
      if (testImageAssetIds.length > 0) {
        console.log('  ✅ Asset mappings ready for sync!');
      } else {
        console.log('  ❌ No valid asset mappings found for test artwork');
      }
    }
    
  } catch (error) {
    console.error('❌ Error rebuilding asset mappings:', error);
  }
}

rebuildAssetMappings(); 