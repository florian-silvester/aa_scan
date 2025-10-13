const path = require('path');
const fs = require('fs');

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

async function deleteImageSizeFields() {
  console.log('🗑️  Deleting image size Option fields\n');
  console.log('='.repeat(60));

  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
  const articles = collections.collections?.find(c => c.slug === 'articles');
  
  if (!articles) {
    console.error('❌ Articles collection not found');
    process.exit(1);
  }

  const collectionId = articles.id;
  const details = await webflowRequest(`/collections/${collectionId}`);

  console.log('Current Option fields:');
  const optionFields = details.fields?.filter(f => f.type === 'Option') || [];
  optionFields.forEach(f => console.log(`  - ${f.slug}`));
  console.log('');

  // Delete fields that match image size pattern:
  // - section-hero-image-1-size
  // - section-1-image-1-size
  // - section-2-image-2-size
  // etc.
  // BUT KEEP:
  // - hero-image-sizes (section layout)
  // - section-1-image-sizes (section layout)
  // etc.

  const imageSizeFields = optionFields.filter(f => {
    // Match pattern: ends with -image-[number]-size (singular)
    // Keep fields ending with -image-sizes (plural) or -layout
    return /image-\d+-size$/.test(f.slug);
  });

  if (imageSizeFields.length === 0) {
    console.log('✅ No image size fields to delete (all clean!)');
    return;
  }

  console.log('Fields to DELETE (image sizes):');
  imageSizeFields.forEach(f => console.log(`  ❌ ${f.slug}`));
  console.log('');

  const keepFields = optionFields.filter(f => !imageSizeFields.includes(f));
  console.log('Fields to KEEP (section layouts):');
  keepFields.forEach(f => console.log(`  ✅ ${f.slug}`));
  console.log('');

  console.log('Deleting...\n');

  let deletedCount = 0;

  for (const field of imageSizeFields) {
    try {
      console.log(`   🗑️  ${field.slug}`);
      await webflowRequest(`/collections/${collectionId}/fields/${field.id}`, {
        method: 'DELETE'
      });
      deletedCount++;
      console.log(`   ✅ Deleted`);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Deleted ${deletedCount} image size fields`);
  console.log(`✅ Kept ${keepFields.length} section layout fields\n`);
}

deleteImageSizeFields().catch(console.error);

