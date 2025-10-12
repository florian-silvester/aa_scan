const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

async function syncArtworkImagesBatch() {
  const siteId = process.env.WEBFLOW_SITE_ID;
  const token = process.env.WEBFLOW_API_TOKEN;
  
  // Get locale IDs
  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  
  const en = site.locales.primary.cmsLocaleId;
  const de = site.locales.secondary[0].cmsLocaleId;
  
  console.log('Locale IDs:', { en, de });
  
  // Get artwork collection
  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  
  const artworkCol = cols.collections.find(c => c.slug === 'artwork');
  console.log('Artwork collection:', artworkCol.id);
  
  console.log('\nFetching EN artworks with all data...');
  let allEnItems = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const url = `https://api.webflow.com/v2/collections/${artworkCol.id}/items?cmsLocaleId=${en}&limit=100&offset=${offset}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    
    allEnItems.push(...(data.items || []));
    hasMore = data.items && data.items.length === 100;
    offset += 100;
    if (offset % 200 === 0) console.log(`  Fetched ${offset} EN items...`);
  }
  
  console.log(`Found ${allEnItems.length} EN items\n`);
  console.log('Syncing to DE in batches of 100...\n');
  
  let totalUpdated = 0;
  let totalFailed = 0;
  
  // Process in batches of 100
  for (let i = 0; i < allEnItems.length; i += 100) {
    const batch = allEnItems.slice(i, i + 100);
    
    // Prepare batch items
    const batchItems = batch.map(enItem => ({
      id: enItem.id,
      cmsLocaleId: de,
      fieldData: {
        'main-image': enItem.fieldData['main-image'],
        'artwork-images': enItem.fieldData['artwork-images']
      }
    }));
    
    try {
      const patchRes = await fetch(`https://api.webflow.com/v2/collections/${artworkCol.id}/items`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: batchItems })
      });
      
      if (patchRes.ok) {
        const result = await patchRes.json();
        totalUpdated += result.items?.length || batch.length;
        console.log(`  Batch ${Math.floor(i / 100) + 1}: Updated ${result.items?.length || batch.length} items (total: ${totalUpdated}/${allEnItems.length})`);
      } else {
        const err = await patchRes.text();
        totalFailed += batch.length;
        console.log(`  ⚠ Batch ${Math.floor(i / 100) + 1} failed: ${err.substring(0, 150)}`);
      }
      
      // Small pause between batches
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      totalFailed += batch.length;
      console.log(`  ⚠ Batch ${Math.floor(i / 100) + 1} error: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Sync complete!`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log(`\nNext: Publish all DE artworks`);
}

syncArtworkImagesBatch().catch(err => {
  console.error('❌ ERROR:', err.message);
});

