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
  return crypto.createHash('md5').update(optionName).digest('hex');
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

async function deleteFieldIfExists(collectionId, fieldSlug) {
  const details = await webflowRequest(`/collections/${collectionId}`);
  const field = details.fields?.find(f => f.slug === fieldSlug);
  if (field) {
    console.log(`   🗑️  Deleting old ${fieldSlug} field...`);
    await webflowRequest(`/collections/${collectionId}/fields/${field.id}`, {
      method: 'DELETE'
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
  return false;
}

async function fixArticlesFields() {
  console.log('🔧 Fixing Articles Collection Fields\n');
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

    console.log(`✅ Articles: ${articlesCollectionId}`);
    console.log(`✅ Creator: ${creatorCollectionId || 'NOT FOUND'}`);
    console.log(`✅ Medium: ${mediumCollectionId || 'NOT FOUND'}`);
    console.log(`✅ Material: ${materialCollectionId || 'NOT FOUND'}\n`);

    const fieldsToFix = [
      // Delete and recreate PlainText layout/size fields as Option fields
      {
        slug: 'hero-layout',
        displayName: 'Hero Layout',
        type: 'Option',
        validations: {
          options: [
            { name: 'sticky', id: generateOptionId('sticky') },
            { name: 'standard', id: generateOptionId('standard') }
          ]
        },
        needsDelete: true
      },
      {
        slug: 'section-1-layout',
        displayName: 'Section 1 Layout',
        type: 'Option',
        validations: {
          options: [
            { name: 'solo', id: generateOptionId('solo') },
            { name: 'twin', id: generateOptionId('twin') },
            { name: 'sticky', id: generateOptionId('sticky') }
          ]
        },
        needsDelete: true
      },
      {
        slug: 'section-1-size',
        displayName: 'Section 1 Size',
        type: 'Option',
        validations: {
          options: [
            { name: 'small', id: generateOptionId('small') },
            { name: 'mid', id: generateOptionId('mid') },
            { name: 'full', id: generateOptionId('full') }
          ]
        },
        needsDelete: true
      },
      {
        slug: 'section-2-layout',
        displayName: 'Section 2 Layout',
        type: 'Option',
        validations: {
          options: [
            { name: 'solo', id: generateOptionId('solo') },
            { name: 'twin', id: generateOptionId('twin') },
            { name: 'sticky', id: generateOptionId('sticky') }
          ]
        },
        needsDelete: true
      },
      {
        slug: 'section-2-size',
        displayName: 'Section 2 Size',
        type: 'Option',
        validations: {
          options: [
            { name: 'small', id: generateOptionId('small') },
            { name: 'mid', id: generateOptionId('mid') },
            { name: 'full', id: generateOptionId('full') }
          ]
        },
        needsDelete: true
      },
      {
        slug: 'section-3-layout',
        displayName: 'Section 3 Layout',
        type: 'Option',
        validations: {
          options: [
            { name: 'solo', id: generateOptionId('solo') },
            { name: 'twin', id: generateOptionId('twin') },
            { name: 'sticky', id: generateOptionId('sticky') }
          ]
        },
        needsDelete: true
      },
      {
        slug: 'section-3-size',
        displayName: 'Section 3 Size',
        type: 'Option',
        validations: {
          options: [
            { name: 'small', id: generateOptionId('small') },
            { name: 'mid', id: generateOptionId('mid') },
            { name: 'full', id: generateOptionId('full') }
          ]
        },
        needsDelete: true
      },
      {
        slug: 'section-4-layout',
        displayName: 'Section 4 Layout',
        type: 'Option',
        validations: {
          options: [
            { name: 'solo', id: generateOptionId('solo') },
            { name: 'twin', id: generateOptionId('twin') },
            { name: 'sticky', id: generateOptionId('sticky') }
          ]
        },
        needsDelete: true
      },
      {
        slug: 'section-4-size',
        displayName: 'Section 4 Size',
        type: 'Option',
        validations: {
          options: [
            { name: 'small', id: generateOptionId('small') },
            { name: 'mid', id: generateOptionId('mid') },
            { name: 'full', id: generateOptionId('full') }
          ]
        },
        needsDelete: true
      },
      
      // Add reference fields with correct types
      {
        slug: 'article-creator',
        displayName: 'Creator',
        type: 'Reference',
        validations: {
          collectionId: creatorCollectionId
        },
        helpText: 'Link to creator',
        needsDelete: false
      },
      {
        slug: 'article-medium',
        displayName: 'Medium',
        type: 'MultiReference',
        validations: {
          collectionId: mediumCollectionId
        },
        helpText: 'Link to medium/categories (multiple)',
        needsDelete: false
      },
      {
        slug: 'article-materials',
        displayName: 'Materials',
        type: 'MultiReference',
        validations: {
          collectionId: materialCollectionId
        },
        helpText: 'Link to materials (multiple)',
        needsDelete: false
      }
    ];

    console.log('🔧 Fixing fields:\n');

    let fixedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const fieldDef of fieldsToFix) {
      // Skip if reference collection not found
      if ((fieldDef.type === 'Reference' || fieldDef.type === 'MultiReference') && !fieldDef.validations?.collectionId) {
        console.log(`   ⚠️  ${fieldDef.slug} - Skipped (target collection not found)`);
        skippedCount++;
        continue;
      }

      try {
        // Delete old field if needed
        if (fieldDef.needsDelete) {
          await deleteFieldIfExists(articlesCollectionId, fieldDef.slug);
        }

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
        fixedCount++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ ${fieldDef.slug} - Failed: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Fix complete!`);
    console.log(`   Fixed: ${fixedCount} fields`);
    console.log(`   Skipped: ${skippedCount} fields`);
    console.log(`   Failed: ${failedCount} fields`);
    
    if (failedCount === 0) {
      console.log('\n🎉 All fields fixed successfully!');
      console.log('\n📝 Your Articles collection now has:');
      console.log('   ✅ Hero fields (headline, creator, image, layout, caption)');
      console.log('   ✅ Sections 1-4 (text, images, layout, size, caption)');
      console.log('   ✅ Reference fields (creator, medium, materials)');
      console.log('\n📝 Next: node scripts/manage-webflow-articles.js list');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

fixArticlesFields().catch(console.error);

