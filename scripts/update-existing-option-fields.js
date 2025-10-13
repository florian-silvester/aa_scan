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

function generateOptionId(optionName) {
  return crypto.createHash('md5').update(optionName + 'stable').digest('hex');
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

async function updateOptionFields() {
  console.log('🔧 Updating existing Option fields\n');
  console.log('='.repeat(60));

  try {
    const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
    const articles = collections.collections?.find(c => c.slug === 'articles');
    
    if (!articles) {
      console.error('❌ Articles collection not found');
      process.exit(1);
    }

    const collectionId = articles.id;
    console.log(`✅ Articles: ${collectionId}\n`);

    const details = await webflowRequest(`/collections/${collectionId}`);

    // Define which fields to update and their new options
    const fieldsToUpdate = [
      {
        slug: 'section-1-image-sizes',
        displayName: 'Section 1 Layout',
        options: [
          { name: 'stacked full', id: generateOptionId('stacked full') },
          { name: 'stacked container', id: generateOptionId('stacked container') },
          { name: 'stacked small', id: generateOptionId('stacked small') },
          { name: 'grid container', id: generateOptionId('grid container') },
          { name: 'grid small', id: generateOptionId('grid small') }
        ]
      },
      {
        slug: 'section-2-image-sizes',
        displayName: 'Section 2 Layout',
        options: [
          { name: 'stacked full', id: generateOptionId('stacked full') },
          { name: 'stacked container', id: generateOptionId('stacked container') },
          { name: 'stacked small', id: generateOptionId('stacked small') },
          { name: 'grid container', id: generateOptionId('grid container') },
          { name: 'grid small', id: generateOptionId('grid small') }
        ]
      },
      {
        slug: 'section-3-image-sizes',
        displayName: 'Section 3 Layout',
        options: [
          { name: 'stacked full', id: generateOptionId('stacked full') },
          { name: 'stacked container', id: generateOptionId('stacked container') },
          { name: 'stacked small', id: generateOptionId('stacked small') },
          { name: 'grid container', id: generateOptionId('grid container') },
          { name: 'grid small', id: generateOptionId('grid small') }
        ]
      },
      {
        slug: 'section-4-image-sizes',
        displayName: 'Section 4 Layout',
        options: [
          { name: 'stacked full', id: generateOptionId('stacked full') },
          { name: 'stacked container', id: generateOptionId('stacked container') },
          { name: 'stacked small', id: generateOptionId('stacked small') },
          { name: 'grid container', id: generateOptionId('grid container') },
          { name: 'grid small', id: generateOptionId('grid small') }
        ]
      },
      // Image size fields are already correct (sticky/fill) - keep them
      {
        slug: 'section-hero-image-1-size',
        displayName: 'Hero Image 1 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      },
      {
        slug: 'section-hero-image-2-size',
        displayName: 'Hero Image 2 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      },
      {
        slug: 'section-1-image-1-size',
        displayName: 'Section 1 Image 1 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      },
      {
        slug: 'section-1-image-2-size',
        displayName: 'Section 1 Image 2 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      },
      {
        slug: 'section-2-image-2-size',
        displayName: 'Section 2 Image 2 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      },
      {
        slug: 'section-3-image-1-size',
        displayName: 'Section 3 Image 1 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      },
      {
        slug: 'section-3-image-2-size',
        displayName: 'Section 3 Image 2 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      },
      {
        slug: 'section-4-image-1-size',
        displayName: 'Section 4 Image 1 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      },
      {
        slug: 'section-4-image-2-size',
        displayName: 'Section 4 Image 2 Size',
        options: [
          { name: 'sticky', id: generateOptionId('sticky') },
          { name: 'fill', id: generateOptionId('fill') }
        ]
      }
    ];

    let updatedCount = 0;
    let failedCount = 0;

    for (const fieldUpdate of fieldsToUpdate) {
      const existingField = details.fields?.find(f => f.slug === fieldUpdate.slug);
      
      if (!existingField) {
        console.log(`   ⏭️  ${fieldUpdate.slug} - Not found, skipping`);
        continue;
      }

      console.log(`   🔄 ${fieldUpdate.slug} - Updating options...`);

      try {
        await webflowRequest(`/collections/${collectionId}/fields/${existingField.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            displayName: fieldUpdate.displayName,
            validations: {
              options: fieldUpdate.options
            }
          })
        });
        updatedCount++;
        console.log(`   ✅ Updated: ${fieldUpdate.options.map(o => o.name).join(', ')}`);
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (error) {
        failedCount++;
        console.error(`   ❌ Failed: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updatedCount} fields`);
    console.log(`   Failed: ${failedCount} fields\n`);
    
    if (updatedCount > 0) {
      console.log('📋 Updated options:\n');
      console.log('Section Layouts (sections 1-4):');
      console.log('  • stacked full');
      console.log('  • stacked container');
      console.log('  • stacked small');
      console.log('  • grid container');
      console.log('  • grid small\n');
      console.log('Image Sizes (all images):');
      console.log('  • sticky');
      console.log('  • fill');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

updateOptionFields().catch(console.error);

