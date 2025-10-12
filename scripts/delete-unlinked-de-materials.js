const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

async function deleteUnlinkedDEMaterials() {
  const token = process.env.WEBFLOW_API_TOKEN;
  const siteId = process.env.WEBFLOW_SITE_ID;

  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const en = site.locales.primary.cmsLocaleId;
  const de = site.locales.secondary[0].cmsLocaleId;

  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const materialCol = cols.collections.find(c => c.displayName === 'Material');

  // Read missing materials slugs
  const missing = JSON.parse(fs.readFileSync('missing-materials.json', 'utf8'));
  const missingSlugs = new Set(missing.map(m => m.slug));

  // Get all DE materials
  const deItems = await fetch(`https://api.webflow.com/v2/collections/${materialCol.id}/items?cmsLocaleId=${de}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  console.log(`\n🗑️  Finding DE-only materials to delete...`);
  const toDelete = [];

  for (const deItem of deItems.items) {
    if (missingSlugs.has(deItem.fieldData.slug)) {
      // Check if this DE item has an EN variant
      const enCheck = await fetch(`https://api.webflow.com/v2/collections/${materialCol.id}/items/${deItem.id}?cmsLocaleId=${en}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!enCheck.ok) {
        // DE-only item, should be deleted
        toDelete.push(deItem);
      }
    }
  }

  console.log(`Found ${toDelete.length} DE-only materials to delete`);

  for (const item of toDelete) {
    console.log(`Deleting: ${item.fieldData.slug} (${item.fieldData.name})`);
    
    const delRes = await fetch(`https://api.webflow.com/v2/collections/${materialCol.id}/items/${item.id}?cmsLocaleId=${de}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (delRes.ok) {
      console.log(`  ✅ Deleted`);
    } else {
      const err = await delRes.text();
      console.log(`  ❌ Failed:`, err);
    }
  }

  console.log(`\n✅ Deleted ${toDelete.length} DE-only materials`);
  console.log(`Now import material-missing-de.csv to create linked DE variants`);
}

deleteUnlinkedDEMaterials().catch(console.error);

