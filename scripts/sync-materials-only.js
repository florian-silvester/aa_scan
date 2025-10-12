const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

const { createClient } = require('@sanity/client');

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: false
});

async function syncMaterials() {
  const token = process.env.WEBFLOW_API_TOKEN;
  const siteId = process.env.WEBFLOW_SITE_ID;

  // Get locales
  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const enId = site.locales.primary.cmsLocaleId;

  // Get material collection
  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const materialCol = cols.collections.find(c => c.displayName === 'Material');

  // Get Sanity materials
  const sanityMaterials = await sanity.fetch(`
    *[_type=='material'] | order(name.en asc) {
      _id,
      name,
      slug,
      description
    }
  `);

  console.log(`\n📦 Found ${sanityMaterials.length} materials in Sanity`);

  // Get existing Webflow materials
  const existingRes = await fetch(`https://api.webflow.com/v2/collections/${materialCol.id}/items?cmsLocaleId=${enId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  const existingBySlug = {};
  (existingRes.items || []).forEach(item => {
    existingBySlug[item.fieldData.slug] = item;
  });

  console.log(`📦 Found ${Object.keys(existingBySlug).length} materials in Webflow EN`);

  // Separate new vs update
  const toCreate = [];
  const toUpdate = [];

  for (const item of sanityMaterials) {
    const slug = item.slug?.current;
    if (!slug) continue;

    const existing = existingBySlug[slug];
    const fieldData = {
      name: item.name?.en || '',
      slug: slug
    };

    if (existing) {
      toUpdate.push({ id: existing.id, fieldData });
    } else {
      toCreate.push({ fieldData });
    }
  }

  console.log(`\n✨ ${toCreate.length} to create, ${toUpdate.length} to update`);

  // Create new items
  if (toCreate.length > 0) {
    console.log(`\n📝 Creating ${toCreate.length} new materials...`);
    const createRes = await fetch(`https://api.webflow.com/v2/collections/${materialCol.id}/items`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: toCreate })
    });

    if (createRes.ok) {
      const result = await createRes.json();
      console.log(`✅ Created ${result.items?.length || 0} materials`);
    } else {
      const err = await createRes.text();
      console.log(`❌ Create failed:`, err);
    }
  }

  // Update existing items
  if (toUpdate.length > 0) {
    console.log(`\n📝 Updating ${toUpdate.length} materials...`);
    
    // Batch update (100 at a time)
    const batchSize = 100;
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize).map(item => ({
        id: item.id,
        cmsLocaleId: enId,
        fieldData: item.fieldData
      }));

      const patchRes = await fetch(`https://api.webflow.com/v2/collections/${materialCol.id}/items`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: batch })
      });

      if (patchRes.ok) {
        console.log(`✅ Updated batch ${Math.floor(i/batchSize) + 1} (${batch.length} items)`);
      } else {
        const err = await patchRes.text();
        console.log(`❌ Update batch ${Math.floor(i/batchSize) + 1} failed:`, err);
      }
    }
  }

  console.log(`\n✅ Material sync complete!`);
}

syncMaterials().catch(console.error);

