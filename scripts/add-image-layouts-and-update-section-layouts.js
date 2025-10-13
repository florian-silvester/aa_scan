const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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

function generateOptionId(optionName) {
  return crypto.createHash('md5').update(optionName + Date.now()).digest('hex');
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

async function updateArticleLayouts() {
  console.log('🎨 Adding image layout options and updating section layouts\n');
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
    const existingFields = new Map(details.fields?.map(f => [f.slug, f]) || []);

    console.log('STEP 1: Adding Option fields for each image (sticky/fill)\n');

    // Add Option field for each image
    const sections = [1, 2, 3, 4, 'final'];
    let addedCount = 0;

    for (const section of sections) {
      for (let imageNum = 1; imageNum <= 2; imageNum++) {
        const fieldSlug = `section-${section}-image-${imageNum}-layout`;
        
        if (existingFields.has(fieldSlug)) {
          console.log(`   ⏭️  ${fieldSlug} - Already exists`);
          continue;
        }

        console.log(`   ➕ ${fieldSlug} - Adding...`);
        try {
          await webflowRequest(`/collections/${collectionId}/fields`, {
            method: 'POST',
            body: JSON.stringify({
              displayName: `Section ${section} Image ${imageNum} Layout`,
              type: 'Option',
              isRequired: false,
              helpText: 'sticky or fill',
              validations: {
                options: [
                  { name: 'sticky', id: generateOptionId('sticky') },
                  { name: 'fill', id: generateOptionId('fill') }
                ]
              }
            })
          });
          addedCount++;
          console.log(`   ✅ Added`);
          await new Promise(resolve => setTimeout(resolve, 400));
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Added ${addedCount} image layout fields\n`);
    console.log('='.repeat(60));
    console.log('\nSTEP 2: Updating section layout options\n');

    // Update section layout fields with new options
    // First, try to PATCH existing fields, if that fails, delete and recreate
    const newLayoutOptions = [
      { name: 'stacked full', id: generateOptionId('stacked full') },
      { name: 'stacked container', id: generateOptionId('stacked container') },
      { name: 'stacked small', id: generateOptionId('stacked small') },
      { name: 'grid container', id: generateOptionId('grid container') },
      { name: 'grid small', id: generateOptionId('grid small') }
    ];

    let updatedCount = 0;

    for (const section of [1, 2, 3, 4]) {
      const layoutFieldSlug = `section-${section}-layout`;
      const existingField = existingFields.get(layoutFieldSlug);

      if (!existingField) {
        console.log(`   ⚠️  ${layoutFieldSlug} - Not found, skipping`);
        continue;
      }

      console.log(`   🔄 ${layoutFieldSlug} - Updating options...`);

      // Try to PATCH the field to update options
      try {
        await webflowRequest(`/collections/${collectionId}/fields/${existingField.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            validations: {
              options: newLayoutOptions
            }
          })
        });
        updatedCount++;
        console.log(`   ✅ Updated via PATCH`);
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (patchError) {
        // If PATCH fails, try delete and recreate
        console.log(`   ⚠️  PATCH failed, trying delete and recreate...`);
        try {
          // Delete old field
          await webflowRequest(`/collections/${collectionId}/fields/${existingField.id}`, {
            method: 'DELETE'
          });
          await new Promise(resolve => setTimeout(resolve, 500));

          // Create new field with updated options
          await webflowRequest(`/collections/${collectionId}/fields`, {
            method: 'POST',
            body: JSON.stringify({
              displayName: `Section ${section} Layout`,
              type: 'Option',
              isRequired: false,
              helpText: 'Layout style for this section',
              validations: {
                options: newLayoutOptions
              }
            })
          });
          updatedCount++;
          console.log(`   ✅ Recreated with new options`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (recreateError) {
          console.error(`   ❌ Failed to recreate: ${recreateError.message}`);
        }
      }
    }

    console.log(`\n✅ Updated ${updatedCount} section layout fields\n`);
    console.log('='.repeat(60));
    console.log('\n🎉 Complete!\n');
    console.log('Image layout options (for each image):');
    console.log('  - sticky');
    console.log('  - fill\n');
    console.log('Section layout options:');
    console.log('  - stacked full');
    console.log('  - stacked container');
    console.log('  - stacked small');
    console.log('  - grid container');
    console.log('  - grid small');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

updateArticleLayouts().catch(console.error);

