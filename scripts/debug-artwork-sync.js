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

// Mock the asset mappings like in the main sync script
let assetMappings = new Map();

async function loadAssetMappings() {
  try {
    const result = await sanityClient.fetch(`
      *[_type == "webflowSyncSettings" && _id == "asset-mappings"][0] {
        assetMappings
      }
    `);
    
    if (result?.assetMappings) {
      const parsedMappings = JSON.parse(result.assetMappings);
      assetMappings = new Map(Object.entries(parsedMappings));
      console.log(`📁 Loaded ${assetMappings.size} asset mappings from Sanity`);
    } else {
      console.log('📁 No existing asset mappings found');
      assetMappings = new Map();
    }
  } catch (error) {
    console.log('📁 Failed to load asset mappings:', error.message);
    assetMappings = new Map();
  }
}

async function syncArtworkImages(artworkImages) {
  if (!artworkImages || artworkImages.length === 0) {
    console.log('❌ No artwork images provided');
    return [];
  }
  
  console.log(`🖼️  Syncing ${artworkImages.length} images...`);
  const webflowAssetIds = [];
  
  for (const image of artworkImages) {
    if (!image.asset?.url) {
      console.log('❌ Image has no asset URL:', image);
      continue;
    }
    
    const sanityAssetId = image.asset._id;
    console.log(`🔍 Checking asset: ${sanityAssetId}`);
    
    // Check if we've seen this image before
    const existingAsset = assetMappings.get(sanityAssetId);
    
    if (existingAsset) {
      console.log(`✅ Found existing asset: ${existingAsset.webflowAssetId}`);
      webflowAssetIds.push(existingAsset.webflowAssetId);
    } else {
      console.log(`❌ Asset not found in mappings: ${sanityAssetId}`);
    }
  }
  
  console.log(`📊 Final webflowAssetIds: [${webflowAssetIds.join(', ')}]`);
  return webflowAssetIds;
}

async function debugArtworkSync() {
  console.log('🔍 Debugging artwork sync...\n');
  
  try {
    // Load asset mappings first
    await loadAssetMappings();
    
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
    
    console.log('✅ Found artwork:');
    console.log(`  - Name: ${artwork.name}`);
    console.log(`  - Images: ${artwork.images?.length || 0}`);
    
    // Test the syncArtworkImages function
    if (artwork.images && artwork.images.length > 0) {
      console.log('\n🧪 Testing syncArtworkImages...');
      
      // Create enhanced image data like in the main script
      const enhancedImages = artwork.images.map(image => ({
        ...image,
        artworkContext: {
          name: artwork.name,
          workTitle: artwork.workTitle?.en || artwork.workTitle?.de,
          creatorName: artwork.creator?.name,
          description: artwork.description?.en || artwork.description?.de
        }
      }));
      
      const artworkImages = await syncArtworkImages(enhancedImages);
      console.log(`\n✅ syncArtworkImages returned: ${artworkImages.length} asset IDs`);
      
      // This is what would be passed to the artwork field
      console.log('\n📝 Field data that would be sent to Webflow:');
      console.log(`  'artwork-images': [${artworkImages.join(', ')}]`);
      
      if (artworkImages.length === 0) {
        console.log('❌ PROBLEM: No asset IDs returned - this is why artworks have no images!');
      } else {
        console.log('✅ Asset IDs returned - images should be connected');
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging artwork sync:', error);
  }
}

debugArtworkSync(); 