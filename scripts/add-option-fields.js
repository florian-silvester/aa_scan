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

async function addOptionFields() {
  console.log('🎨 Adding Option fields to Articles Collection\n');
  console.log('='.repeat(60));

  try {
    // Get Articles collection
    const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
    const articlesCollection = collections.collections?.find(c => 
      c.slug === 'articles' || c.slug === 'article'
    );

    if (!articlesCollection) {
      console.error('❌ Articles collection not found');
      process.exit(1);
    }

    const collectionId = articlesCollection.id;
    console.log(`✅ Collection ID: ${collectionId}\n`);

    // Get existing fields
    const details = await webflowRequest(`/collections/${collectionId}`);
    const existingFieldSlugs = new Set(details.fields?.map(f => f.slug) || []);

    // Define option fields with corrected format
    const optionFields = [
      { 
        slug: 'hero-layout', 
        displayName: 'Hero Layout', 
        type: 'Option',
        options: ['sticky', 'standard']
      },
      { 
        slug: 'section-1-layout', 
        displayName: 'Section 1 Layout', 
        type: 'Option',
        options: ['solo', 'twin', 'sticky']
      },
      { 
        slug: 'section-1-size', 
        displayName: 'Section 1 Size', 
        type: 'Option',
        options: ['small', 'mid', 'full']
      },
      { 
        slug: 'section-2-layout', 
        displayName: 'Section 2 Layout', 
        type: 'Option',
        options: ['solo', 'twin', 'sticky']
      },
      { 
        slug: 'section-2-size', 
        displayName: 'Section 2 Size', 
        type: 'Option',
        options: ['small', 'mid', 'full']
      },
      { 
        slug: 'section-3-layout', 
        displayName: 'Section 3 Layout', 
        type: 'Option',
        options: ['solo', 'twin', 'sticky']
      },
      { 
        slug: 'section-3-size', 
        displayName: 'Section 3 Size', 
        type: 'Option',
        options: ['small', 'mid', 'full']
      },
      { 
        slug: 'section-4-layout', 
        displayName: 'Section 4 Layout', 
        type: 'Option',
        options: ['solo', 'twin', 'sticky']
      },
      { 
        slug: 'section-4-size', 
        displayName: 'Section 4 Size', 
        type: 'Option',
        options: ['small', 'mid', 'full']
      }
    ];

    console.log('➕ Adding option fields:\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const fieldDef of optionFields) {
      if (existingFieldSlugs.has(fieldDef.slug)) {
        console.log(`   ⏭️  ${fieldDef.slug} - Already exists, skipping`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`   ➕ ${fieldDef.slug} - Adding...`);

        const fieldPayload = {
          displayName: fieldDef.displayName,
          type: fieldDef.type,
          isRequired: false,
          validations: {
            format: null,
            messages: {},
            options: fieldDef.options
          }
        };

        await webflowRequest(`/collections/${collectionId}/fields`, {
          method: 'POST',
          body: JSON.stringify(fieldPayload)
        });

        console.log(`   ✅ ${fieldDef.slug} - Added successfully!`);
        addedCount++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`   ❌ ${fieldDef.slug} - Failed: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Update complete!`);
    console.log(`   Added: ${addedCount} fields`);
    console.log(`   Skipped: ${skippedCount} fields (already exist)`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

addOptionFields().catch(console.error);

