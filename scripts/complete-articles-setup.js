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

async function getCollectionId(collectionSlug) {
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
  const collection = collections.collections?.find(c => c.slug === collectionSlug);
  return collection?.id || null;
}

async function completeArticlesSetup() {
  console.log('🎨 Completing Articles Collection Setup\n');
  console.log('='.repeat(60));

  try {
    // Get collections
    const articlesCollectionId = await getCollectionId('articles');
    const creatorCollectionId = await getCollectionId('creators') || await getCollectionId('creator');
    const mediumCollectionId = await getCollectionId('medium') || await getCollectionId('mediums');
    const materialCollectionId = await getCollectionId('materials') || await getCollectionId('material');

    if (!articlesCollectionId) {
      console.error('❌ Articles collection not found');
      process.exit(1);
    }

    console.log(`✅ Articles collection: ${articlesCollectionId}`);
    console.log(`✅ Creator collection: ${creatorCollectionId || 'NOT FOUND'}`);
    console.log(`✅ Medium collection: ${mediumCollectionId || 'NOT FOUND'}`);
    console.log(`✅ Material collection: ${materialCollectionId || 'NOT FOUND'}\n`);

    // Get existing fields
    const details = await webflowRequest(`/collections/${articlesCollectionId}`);
    const existingFieldSlugs = new Set(details.fields?.map(f => f.slug) || []);

    console.log(`📋 Current fields: ${existingFieldSlugs.size}\n`);

    // Define all fields to add
    const fieldsToAdd = [
      // Reference fields
      {
        slug: 'article-creator',
        displayName: 'Creator',
        type: 'ItemRef',
        validations: {
          collectionId: creatorCollectionId
        },
        helpText: 'Link to creator'
      },
      {
        slug: 'article-medium',
        displayName: 'Medium',
        type: 'ItemRefSet',
        validations: {
          collectionId: mediumCollectionId
        },
        helpText: 'Link to medium/categories (multiple)'
      },
      {
        slug: 'article-materials',
        displayName: 'Materials',
        type: 'ItemRefSet',
        validations: {
          collectionId: materialCollectionId
        },
        helpText: 'Link to materials (multiple)'
      },
      
      // Try option fields with different format - using enum pattern
      {
        slug: 'hero-layout',
        displayName: 'Hero Layout',
        type: 'PlainText',
        helpText: 'Layout: sticky or standard'
      },
      {
        slug: 'section-1-layout',
        displayName: 'Section 1 Layout',
        type: 'PlainText',
        helpText: 'Layout: solo, twin, or sticky'
      },
      {
        slug: 'section-1-size',
        displayName: 'Section 1 Size',
        type: 'PlainText',
        helpText: 'Size: small, mid, or full'
      },
      {
        slug: 'section-2-layout',
        displayName: 'Section 2 Layout',
        type: 'PlainText',
        helpText: 'Layout: solo, twin, or sticky'
      },
      {
        slug: 'section-2-size',
        displayName: 'Section 2 Size',
        type: 'PlainText',
        helpText: 'Size: small, mid, or full'
      },
      {
        slug: 'section-3-layout',
        displayName: 'Section 3 Layout',
        type: 'PlainText',
        helpText: 'Layout: solo, twin, or sticky'
      },
      {
        slug: 'section-3-size',
        displayName: 'Section 3 Size',
        type: 'PlainText',
        helpText: 'Size: small, mid, or full'
      },
      {
        slug: 'section-4-layout',
        displayName: 'Section 4 Layout',
        type: 'PlainText',
        helpText: 'Layout: solo, twin, or sticky'
      },
      {
        slug: 'section-4-size',
        displayName: 'Section 4 Size',
        type: 'PlainText',
        helpText: 'Size: small, mid, or full'
      }
    ];

    console.log('➕ Adding fields:\n');

    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const fieldDef of fieldsToAdd) {
      if (existingFieldSlugs.has(fieldDef.slug)) {
        console.log(`   ⏭️  ${fieldDef.slug} - Already exists`);
        skippedCount++;
        continue;
      }

      // Skip if reference collection not found
      if ((fieldDef.type === 'ItemRef' || fieldDef.type === 'ItemRefSet') && !fieldDef.validations?.collectionId) {
        console.log(`   ⚠️  ${fieldDef.slug} - Skipped (target collection not found)`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`   ➕ ${fieldDef.slug} (${fieldDef.type}) - Adding...`);

        const fieldPayload = {
          displayName: fieldDef.displayName,
          type: fieldDef.type,
          isRequired: false,
          ...(fieldDef.helpText && { helpText: fieldDef.helpText }),
          ...(fieldDef.validations && { validations: fieldDef.validations })
        };

        await webflowRequest(`/collections/${articlesCollectionId}/fields`, {
          method: 'POST',
          body: JSON.stringify(fieldPayload)
        });

        console.log(`   ✅ ${fieldDef.slug} - Added successfully!`);
        addedCount++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`   ❌ ${fieldDef.slug} - Failed: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Setup complete!`);
    console.log(`   Added: ${addedCount} fields`);
    console.log(`   Skipped: ${skippedCount} fields`);
    console.log(`   Failed: ${failedCount} fields`);
    
    if (failedCount === 0) {
      console.log('\n🎉 All fields added successfully!');
      console.log('\n📝 Next steps:');
      console.log('   Use manage-webflow-articles.js to create/update articles');
      console.log('   Example: node scripts/manage-webflow-articles.js list');
    } else {
      console.log('\n⚠️  Some fields failed. You may need to add Option fields manually in Webflow Designer.');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

completeArticlesSetup().catch(console.error);

