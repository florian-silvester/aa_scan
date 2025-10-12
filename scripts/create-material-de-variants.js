const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

async function createMaterialDEVariants() {
  const token = process.env.WEBFLOW_API_TOKEN;
  const siteId = process.env.WEBFLOW_SITE_ID;

  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const enId = site.locales.primary.cmsLocaleId;
  const deId = site.locales.secondary[0].cmsLocaleId;

  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const materialCol = cols.collections.find(c => c.displayName === 'Material');

  // Get all EN materials
  let allEnItems = [];
  let offset = 0;
  while (true) {
    const resp = await fetch(`https://api.webflow.com/v2/collections/${materialCol.id}/items?cmsLocaleId=${enId}&limit=100&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    
    allEnItems = allEnItems.concat(resp.items || []);
    if (!resp.items || resp.items.length < 100) break;
    offset += 100;
  }

  console.log(`Found ${allEnItems.length} EN materials`);
  console.log(`Creating DE variants (copying same field data)...\n`);

  // Batch PATCH to create DE variants
  const batchSize = 100;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < allEnItems.length; i += batchSize) {
    const batch = allEnItems.slice(i, i + batchSize).map(enItem => ({
      id: enItem.id,
      cmsLocaleId: deId,
      fieldData: {
        name: enItem.fieldData.name,
        slug: enItem.fieldData.slug
      }
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
      const result = await patchRes.json();
      updated += batch.length;
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} items`);
    } else {
      const err = await patchRes.text();
      console.log(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, err);
      failed += batch.length;
    }
  }

  console.log(`\n✅ Created ${updated} DE material variants`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\nNow materials are linked! You can update DE names via CSV if needed.`);
}

createMaterialDEVariants().catch(console.error);

