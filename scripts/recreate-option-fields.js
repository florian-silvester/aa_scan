const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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

function generateOptionId(name) {
  return crypto.createHash('md5').update(name + 'stable').digest('hex');
}

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
    const errorBody = await response.text();
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`);
  }

  if (response.status === 204) return {};
  return response.json();
}

async function recreateOptionFields() {
  console.log('🔧 Recreating Option fields with correct options\n');
  console.log('='.repeat(60));

  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
  const articles = collections.collections?.find(c => c.slug === 'articles');
  
  if (!articles) {
    console.error('❌ Articles collection not found');
    process.exit(1);
  }

  const collectionId = articles.id;
  const details = await webflowRequest(`/collections/${collectionId}`);

  // Define fields to recreate
  const fieldsToRecreate = [
    // Section layouts
    {
      slug: 'hero-image-sizes',
      displayName: 'Hero Layout',
      options: ['stacked full', 'stacked container', 'stacked small', 'grid container', 'grid small']
    },
    {
      slug: 'section-1-image-sizes',
      displayName: 'Section 1 Layout',
      options: ['stacked full', 'stacked container', 'stacked small', 'grid container', 'grid small']
    },
    {
      slug: 'section-2-image-sizes',
      displayName: 'Section 2 Layout',
      options: ['stacked full', 'stacked container', 'stacked small', 'grid container', 'grid small']
    },
    {
      slug: 'section-3-image-sizes',
      displayName: 'Section 3 Layout',
      options: ['stacked full', 'stacked container', 'stacked small', 'grid container', 'grid small']
    },
    {
      slug: 'section-4-image-sizes',
      displayName: 'Section 4 Layout',
      options: ['stacked full', 'stacked container', 'stacked small', 'grid container', 'grid small']
    },
    // Image sizes - keep as sticky/fill
    {
      slug: 'section-hero-image-1-size',
      displayName: 'Hero Image 1 Size',
      options: ['sticky', 'fill']
    },
    {
      slug: 'section-hero-image-2-size',
      displayName: 'Hero Image 2 Size',
      options: ['sticky', 'fill']
    },
    {
      slug: 'section-1-image-1-size',
      displayName: 'Section 1 Image 1 Size',
      options: ['sticky', 'fill']
    },
    {
      slug: 'section-1-image-2-size',
      displayName: 'Section 1 Image 2 Size',
      options: ['sticky', 'fill']
    },
    {
      slug: 'section-2-image-2-size',
      displayName: 'Section 2 Image 2 Size',
      options: ['sticky', 'fill']
    },
    {
      slug: 'section-3-image-1-size',
      displayName: 'Section 3 Image 1 Size',
      options: ['sticky', 'fill']
    },
    {
      slug: 'section-3-image-2-size',
      displayName: 'Section 3 Image 2 Size',
      options: ['sticky', 'fill']
    },
    {
      slug: 'section-4-image-1-size',
      displayName: 'Section 4 Image 1 Size',
      options: ['sticky', 'fill']
    },
    {
      slug: 'section-4-image-2-size',
      displayName: 'Section 4 Image 2 Size',
      options: ['sticky', 'fill']
    }
  ];

  let recreatedCount = 0;

  for (const fieldDef of fieldsToRecreate) {
    const existingField = details.fields?.find(f => f.slug === fieldDef.slug);
    
    if (!existingField) {
      console.log(`   ⏭️  ${fieldDef.slug} - Not found, skipping`);
      continue;
    }

    try {
      // Step 1: Delete old field
      console.log(`   🗑️  ${fieldDef.slug} - Deleting...`);
      await webflowRequest(`/collections/${collectionId}/fields/${existingField.id}`, {
        method: 'DELETE'
      });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Create new field with correct options
      console.log(`   ➕ ${fieldDef.slug} - Creating with new options...`);
      await webflowRequest(`/collections/${collectionId}/fields`, {
        method: 'POST',
        body: JSON.stringify({
          displayName: fieldDef.displayName,
          type: 'Option',
          isRequired: false,
          validations: {
            options: fieldDef.options.map(name => ({
              name,
              id: generateOptionId(name)
            }))
          }
        })
      });
      
      recreatedCount++;
      console.log(`   ✅ Created with: ${fieldDef.options.join(', ')}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
    }
  }

  console.log('='.repeat(60));
  console.log(`\n✅ Complete! Recreated ${recreatedCount} fields\n`);
  console.log('📋 New options:\n');
  console.log('Layout fields:');
  console.log('  • stacked full');
  console.log('  • stacked container');
  console.log('  • stacked small');
  console.log('  • grid container');
  console.log('  • grid small\n');
  console.log('Image size fields:');
  console.log('  • sticky');
  console.log('  • fill\n');
}

recreateOptionFields().catch(console.error);

