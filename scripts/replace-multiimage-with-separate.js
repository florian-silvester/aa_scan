const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID;

if (!WEBFLOW_API_TOKEN || !WEBFLOW_SITE_ID) {
  console.error('❌ Missing WEBFLOW_API_TOKEN or WEBFLOW_SITE_ID in .env');
  process.exit(1);
}

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2';
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

async function replaceMultiImageFields() {
  console.log('🖼️  Replacing MultiImage fields with separate Image fields\n');
  console.log('='.repeat(60));

  try {
    // Get Articles collection
    const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
    const articlesCollection = collections.collections?.find(c => c.slug === 'articles');

    if (!articlesCollection) {
      console.error('❌ Articles collection not found');
      process.exit(1);
    }

    const collectionId = articlesCollection.id;
    console.log(`✅ Articles collection: ${collectionId}\n`);

    // Get current fields
    const details = await webflowRequest(`/collections/${collectionId}`);
    
    // Fields to replace (MultiImage -> 2 separate Image fields)
    const multiImageFields = [
      { oldSlug: 'section-1-images', section: 1 },
      { oldSlug: 'section-2-images', section: 2 },
      { oldSlug: 'section-3-images', section: 3 },
      { oldSlug: 'section-4-images', section: 4 },
      { oldSlug: 'section-final-image', section: 'final' }
    ];

    let deletedCount = 0;
    let addedCount = 0;

    for (const fieldInfo of multiImageFields) {
      const existingField = details.fields?.find(f => f.slug === fieldInfo.oldSlug);
      
      if (existingField) {
        console.log(`🗑️  Deleting ${fieldInfo.oldSlug}...`);
        try {
          await webflowRequest(`/collections/${collectionId}/fields/${existingField.id}`, {
            method: 'DELETE'
          });
          deletedCount++;
          console.log(`   ✅ Deleted`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`   ❌ Failed to delete: ${error.message}`);
        }
      }

      // Add 2 separate image fields
      const section = fieldInfo.section;
      for (let i = 1; i <= 2; i++) {
        const newSlug = `section-${section}-image-${i}`;
        const displayName = `Section ${section.toString().toUpperCase()} Image ${i}`;
        
        console.log(`➕ Adding ${newSlug}...`);
        try {
          await webflowRequest(`/collections/${collectionId}/fields`, {
            method: 'POST',
            body: JSON.stringify({
              displayName: displayName,
              type: 'Image',
              isRequired: false,
              helpText: `Image ${i} for section ${section}`
            })
          });
          addedCount++;
          console.log(`   ✅ Added`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`   ❌ Failed to add: ${error.message}`);
        }
      }

      console.log('');
    }

    console.log('='.repeat(60));
    console.log(`\n✅ Update complete!`);
    console.log(`   Deleted: ${deletedCount} MultiImage fields`);
    console.log(`   Added: ${addedCount} separate Image fields`);
    console.log(`\n📝 Each section now has 2 separate image fields:`);
    console.log(`   section-1-image-1, section-1-image-2`);
    console.log(`   section-2-image-1, section-2-image-2`);
    console.log(`   section-3-image-1, section-3-image-2`);
    console.log(`   section-4-image-1, section-4-image-2`);
    console.log(`   section-final-image-1, section-final-image-2`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

replaceMultiImageFields().catch(console.error);

