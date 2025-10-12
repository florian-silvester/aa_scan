const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

async function syncArtworkImagesAndRefs() {
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
  
  console.log('Syncing to DE locale (this will take several minutes)...\n');
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < allEnItems.length; i++) {
    const enItem = allEnItems[i];
    const itemId = enItem.id;
    const slug = enItem.fieldData.slug;
    
    // Copy images only (skip references for now to avoid validation errors)
    const deFieldData = {
      'main-image': enItem.fieldData['main-image'],
      'artwork-images': enItem.fieldData['artwork-images']
    };
    
    // PATCH DE locale with EN data
    try {
      const patchRes = await fetch(`https://api.webflow.com/v2/collections/${artworkCol.id}/items`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{
            id: itemId,
            cmsLocaleId: de,
            fieldData: deFieldData
          }]
        })
      });
      
      if (patchRes.ok) {
        updated++;
        if (updated % 50 === 0) console.log(`  Updated ${updated}/${allEnItems.length}...`);
      } else {
        failed++;
        const err = await patchRes.text();
        if (failed <= 3) console.log(`  ⚠ Failed ${slug}: ${err.substring(0, 100)}`);
      }
      
      // Rate limiting
      if ((i + 1) % 60 === 0) {
        console.log(`  Pausing briefly (rate limit)...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      failed++;
      if (failed <= 3) console.log(`  ⚠ Error ${slug}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Sync complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\nNext: Publish all DE artworks`);
}

syncArtworkImagesAndRefs().catch(err => {
  console.error('❌ ERROR:', err.message);
});

