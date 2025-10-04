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

// Import functions from main sync script
const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_COLLECTIONS = {
  artwork: '686e50ba1170cab27bfa6c49'
};

let assetMappings = new Map();

// Copy essential functions from main sync script
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
      console.log('📁 No existing asset mappings found, starting fresh');
      assetMappings = new Map();
    }
  } catch (error) {
    console.log('📁 Failed to load asset mappings, starting fresh:', error.message);
    assetMappings = new Map();
  }
}

async function saveAssetMappings() {
  try {
    const mappings = Object.fromEntries(assetMappings);
    
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'asset-mappings',
      assetMappings: JSON.stringify(mappings),
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`💾 Saved ${assetMappings.size} asset mappings to Sanity`);
  } catch (error) {
    console.error('❌ Failed to save asset mappings:', error.message);
  }
}

async function uploadImageToWebflow(imageUrl, type = 'artwork', altText = '', filename = '') {
  try {
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), filename || 'artwork.jpg');
    
    const uploadResponse = await fetch(`https://api.webflow.com/v2/sites/68664367794a916bfa6d247c/assets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      console.error('❌ Failed to upload image:', await uploadResponse.text());
      return null;
    }
    
    const result = await uploadResponse.json();
    return result.id;
    
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return null;
  }
}

async function syncArtworkImages(artworkImages) {
  if (!artworkImages || artworkImages.length === 0) {
    return [];
  }
  
  console.log(`🖼️  Syncing ${artworkImages.length} images with fresh upload logic...`);
  const webflowAssetIds = [];
  
  for (const image of artworkImages) {
    if (!image.asset?.url) continue;
    
    const sanityAssetId = image.asset._id;
    const originalFilename = image.asset.originalFilename || '';
    const imageUrl = image.asset.url;
    
    // Check if we've seen this image before
    const existingAsset = assetMappings.get(sanityAssetId);
    
    if (!existingAsset) {
      // New image - upload it
      console.log(`📤 Uploading new image: ${originalFilename}`);
        
      const assetId = await uploadImageToWebflow(
        imageUrl, 
        'artwork', 
        image.alt?.en || image.alt?.de || '', 
        originalFilename
      );
      
      if (assetId) {
        // Track this asset
        assetMappings.set(sanityAssetId, {
          webflowAssetId: assetId,
          altText: image.alt?.en || image.alt?.de || '',
          filename: originalFilename,
          url: imageUrl,
          lastUpdated: new Date().toISOString()
        });
        
        console.log(`✅ Image uploaded successfully: ${assetId}`);
        webflowAssetIds.push(assetId);
      }
    } else {
      console.log(`⏭️  Reusing existing image: ${originalFilename}`);
      webflowAssetIds.push(existingAsset.webflowAssetId);
    }
  }
  
  console.log(`📊 Final webflowAssetIds: [${webflowAssetIds.join(', ')}]`);
  return webflowAssetIds;
}

async function testSingleArtworkWithImages() {
  console.log('🧪 Testing single artwork with images...\n');
  
  try {
    // Load asset mappings
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
    
    console.log(`✅ Found artwork: ${artwork.name}`);
    console.log(`📷 Images: ${artwork.images?.length || 0}`);
    
    // Process images
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
    
    if (artworkImages.length > 0) {
      console.log(`\n🎨 Creating artwork with ${artworkImages.length} images...`);
      
      // Create artwork with images
      const artworkData = {
        fieldData: {
          'name': artwork.name,
          'slug': `test-${artwork.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          'artwork-images': artworkImages
        }
      };
      
      const response = await fetch(`https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTIONS.artwork}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(artworkData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ SUCCESS: Artwork created with ID ${result.id}`);
        console.log(`📷 Images connected: ${JSON.stringify(result.fieldData['artwork-images'])}`);
        
        if (result.fieldData['artwork-images'].length > 0) {
          console.log('🎉 IMAGES ARE NOW CONNECTED!');
        } else {
          console.log('❌ Images still not connected...');
        }
      } else {
        console.log(`❌ FAILED to create artwork: ${JSON.stringify(result, null, 2)}`);
      }
    }
    
    // Save asset mappings
    await saveAssetMappings();
    
  } catch (error) {
    console.error('❌ Error testing artwork with images:', error);
  }
}

testSingleArtworkWithImages(); 