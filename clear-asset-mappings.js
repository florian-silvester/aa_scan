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

async function clearAssetMappings() {
  console.log('🧹 Clearing stale asset mappings...\n');
  
  try {
    // Delete the asset mappings document
    await sanityClient.delete('asset-mappings');
    console.log('✅ Asset mappings cleared successfully');
    console.log('📝 Next sync will re-upload images and create fresh asset mappings');
    
  } catch (error) {
    console.error('❌ Error clearing asset mappings:', error);
  }
}

clearAssetMappings(); 