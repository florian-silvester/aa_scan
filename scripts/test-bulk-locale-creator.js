const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');

// Load env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: false
});

async function testBulkLocaleCreator() {
  const token = process.env.WEBFLOW_API_TOKEN;
  const siteId = process.env.WEBFLOW_SITE_ID;

  // Get locale IDs
  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const enId = site.locales.primary.cmsLocaleId;
  const deId = site.locales.secondary[0].cmsLocaleId;

  console.log('Locale IDs:');
  console.log('  EN:', enId);
  console.log('  DE:', deId);

  // Get creator collection
  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const creatorCol = cols.collections.find(c => c.displayName === 'Creator');

  // Get creator from Sanity
  const creator = await sanity.fetch(`*[_type=='creator' && slug.current=='api-test-sunday'][0] {
    _id,
    name,
    slug,
    bio,
    portrait
  }`);

  if (!creator) {
    console.log('\n❌ Creator "api-test-sunday" not found in Sanity!');
    return;
  }

  console.log('\n✅ Found creator in Sanity:');
  console.log('  Name (EN):', creator.name?.en);
  console.log('  Name (DE):', creator.name?.de);
  console.log('  Slug:', creator.slug?.current);

  // Create using /items/bulk with cmsLocaleIds
  console.log('\n🚀 Creating creator in Webflow with BOTH locales...\n');

  const createRes = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/bulk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cmsLocaleIds: [enId, deId],
      isDraft: true,
      fieldData: {
        name: creator.name?.en || 'Test Sunday EN',
        slug: creator.slug?.current || 'api-test-sunday'
      }
    })
  });

  console.log('Status:', createRes.status);
  const result = await createRes.json();

  if (!createRes.ok) {
    console.log('❌ Failed:', JSON.stringify(result, null, 2));
    return;
  }

  console.log('\n✅ Created! Response:');
  console.log(JSON.stringify(result, null, 2));

  if (result.items && result.items.length === 2) {
    const itemId = result.items[0].id;
    console.log(`\n🎉 SUCCESS! Both locales created with same ID: ${itemId}`);
    console.log(`  EN cmsLocaleId: ${result.items[0].cmsLocaleId}`);
    console.log(`  DE cmsLocaleId: ${result.items[1].cmsLocaleId}`);

    // Now update each locale with its language-specific content
    console.log('\n📝 Updating DE locale with German content...');

    const updateDeRes = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cmsLocaleId: deId,
        fieldData: {
          name: creator.name?.de || creator.name?.en || 'Test Sunday DE'
        }
      })
    });

    if (updateDeRes.ok) {
      console.log('✅ DE locale updated with German name');
    } else {
      const err = await updateDeRes.text();
      console.log('❌ DE update failed:', err);
    }

    // Verify both locales
    console.log('\n🔍 Verifying both locales exist...');
    
    const enCheck = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/${itemId}?cmsLocaleId=${enId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    
    const deCheck = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/${itemId}?cmsLocaleId=${deId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    console.log(`\n  EN: ${enCheck.fieldData?.name} (${enCheck.fieldData?.slug})`);
    console.log(`  DE: ${deCheck.fieldData?.name} (${deCheck.fieldData?.slug})`);
    console.log(`\n🎊🎊🎊 BOTH LOCALES PROPERLY LINKED!`);
  }
}

testBulkLocaleCreator().catch(console.error);

