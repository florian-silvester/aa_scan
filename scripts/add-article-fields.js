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

async function addArticleFields() {
  console.log('🎨 Adding new fields to Articles Collection\n');
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

    console.log(`✅ Found Articles collection: ${articlesCollection.displayName}`);
    console.log(`   Collection ID: ${articlesCollection.id}\n`);

    const collectionId = articlesCollection.id;

    // Get existing fields
    const details = await webflowRequest(`/collections/${collectionId}`);
    const existingFieldSlugs = new Set(details.fields?.map(f => f.slug) || []);
    
    console.log('📋 Current fields:', existingFieldSlugs.size);
    console.log('');

    // Define all new fields
    const newFields = [
      // Hero fields
      { slug: 'hero-headline', displayName: 'Hero Headline', type: 'RichText', helpText: 'Main headline (supports rich text)' },
      { slug: 'hero-creator', displayName: 'Hero Creator', type: 'PlainText', helpText: 'Creator/author name' },
      { slug: 'hero-image', displayName: 'Hero Image', type: 'Image', helpText: 'Main hero image' },
      { 
        slug: 'hero-layout', 
        displayName: 'Hero Layout', 
        type: 'Option', 
        helpText: 'sticky or standard',
        validations: { options: [{ id: 'sticky', name: 'Sticky' }, { id: 'standard', name: 'Standard' }] }
      },
      { slug: 'hero-caption', displayName: 'Hero Caption', type: 'PlainText', helpText: 'Optional caption' },
      
      // Section 1
      { slug: 'section-1-text', displayName: 'Section 1 Text', type: 'RichText', helpText: 'Rich text content' },
      { slug: 'section-1-images', displayName: 'Section 1 Images', type: 'MultiImage', helpText: 'Multiple images' },
      { 
        slug: 'section-1-layout', 
        displayName: 'Section 1 Layout', 
        type: 'Option',
        validations: { options: [{ id: 'solo', name: 'Solo' }, { id: 'twin', name: 'Twin' }, { id: 'sticky', name: 'Sticky' }] }
      },
      { 
        slug: 'section-1-size', 
        displayName: 'Section 1 Size', 
        type: 'Option',
        validations: { options: [{ id: 'small', name: 'Small' }, { id: 'mid', name: 'Mid' }, { id: 'full', name: 'Full' }] }
      },
      { slug: 'section-1-caption', displayName: 'Section 1 Caption', type: 'PlainText' },
      
      // Section 2
      { slug: 'section-2-text', displayName: 'Section 2 Text', type: 'RichText' },
      { slug: 'section-2-images', displayName: 'Section 2 Images', type: 'MultiImage' },
      { 
        slug: 'section-2-layout', 
        displayName: 'Section 2 Layout', 
        type: 'Option',
        validations: { options: [{ id: 'solo', name: 'Solo' }, { id: 'twin', name: 'Twin' }, { id: 'sticky', name: 'Sticky' }] }
      },
      { 
        slug: 'section-2-size', 
        displayName: 'Section 2 Size', 
        type: 'Option',
        validations: { options: [{ id: 'small', name: 'Small' }, { id: 'mid', name: 'Mid' }, { id: 'full', name: 'Full' }] }
      },
      { slug: 'section-2-caption', displayName: 'Section 2 Caption', type: 'PlainText' },
      
      // Section 3
      { slug: 'section-3-text', displayName: 'Section 3 Text', type: 'RichText' },
      { slug: 'section-3-images', displayName: 'Section 3 Images', type: 'MultiImage' },
      { 
        slug: 'section-3-layout', 
        displayName: 'Section 3 Layout', 
        type: 'Option',
        validations: { options: [{ id: 'solo', name: 'Solo' }, { id: 'twin', name: 'Twin' }, { id: 'sticky', name: 'Sticky' }] }
      },
      { 
        slug: 'section-3-size', 
        displayName: 'Section 3 Size', 
        type: 'Option',
        validations: { options: [{ id: 'small', name: 'Small' }, { id: 'mid', name: 'Mid' }, { id: 'full', name: 'Full' }] }
      },
      { slug: 'section-3-caption', displayName: 'Section 3 Caption', type: 'PlainText' },
      
      // Section 4
      { slug: 'section-4-text', displayName: 'Section 4 Text', type: 'RichText' },
      { slug: 'section-4-images', displayName: 'Section 4 Images', type: 'MultiImage' },
      { 
        slug: 'section-4-layout', 
        displayName: 'Section 4 Layout', 
        type: 'Option',
        validations: { options: [{ id: 'solo', name: 'Solo' }, { id: 'twin', name: 'Twin' }, { id: 'sticky', name: 'Sticky' }] }
      },
      { 
        slug: 'section-4-size', 
        displayName: 'Section 4 Size', 
        type: 'Option',
        validations: { options: [{ id: 'small', name: 'Small' }, { id: 'mid', name: 'Mid' }, { id: 'full', name: 'Full' }] }
      },
      { slug: 'section-4-caption', displayName: 'Section 4 Caption', type: 'PlainText' }
    ];

    console.log('➕ Adding new fields:\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const fieldDef of newFields) {
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
          ...(fieldDef.helpText && { helpText: fieldDef.helpText }),
          ...(fieldDef.validations && { validations: fieldDef.validations })
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
    console.log(`\n📝 Next steps:`);
    console.log(`   Use manage-webflow-articles.js to create/update articles`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

addArticleFields().catch(console.error);

