const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

async function syncArtworkRefs() {
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
  const artworkCol = cols.collections.find(c => c.displayName === 'Artwork');

  console.log(`\n🎨 Syncing artwork references to DE locale...`);

  // Get all EN artworks
  let allEnItems = [];
  let offset = 0;
  while (true) {
    const resp = await fetch(`https://api.webflow.com/v2/collections/${artworkCol.id}/items?cmsLocaleId=${enId}&limit=100&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    
    allEnItems = allEnItems.concat(resp.items || []);
    if (!resp.items || resp.items.length < 100) break;
    offset += 100;
  }

  console.log(`📦 Found ${allEnItems.length} EN artworks`);

  // Reference fields to copy
  const refFields = [
    'creator',
    'materials',
    'finishes',
    'medium'
  ];

  // Batch PATCH to copy references
  const batchSize = 100;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < allEnItems.length; i += batchSize) {
    const batch = allEnItems.slice(i, i + batchSize).map(enItem => {
      const fieldData = {};
      
      // Copy each reference field
      refFields.forEach(field => {
        if (enItem.fieldData[field] !== undefined) {
          fieldData[field] = enItem.fieldData[field];
        }
      });

      return {
        id: enItem.id,
        cmsLocaleId: deId,
        fieldData
      };
    });

    const patchRes = await fetch(`https://api.webflow.com/v2/collections/${artworkCol.id}/items`, {
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
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} artworks`);
    } else {
      const err = await patchRes.text();
      console.log(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, err);
      failed += batch.length;
    }
  }

  console.log(`\n✅ Updated ${updated} artworks`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\nDE artworks now have all references linked!`);
}

syncArtworkRefs().catch(console.error);

