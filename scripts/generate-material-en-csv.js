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

async function generateMaterialENCSV() {
  const token = process.env.WEBFLOW_API_TOKEN;
  const siteId = process.env.WEBFLOW_SITE_ID;

  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const enId = site.locales.primary.cmsLocaleId;

  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const materialCol = cols.collections.find(c => c.displayName === 'Material');

  // Get all EN materials
  const enItems = await fetch(`https://api.webflow.com/v2/collections/${materialCol.id}/items?cmsLocaleId=${enId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  // Get Sanity materials
  const sanityMaterials = await sanity.fetch(`*[_type=='material'] | order(name.en asc) { _id, name, slug }`);
  const sanityMap = {};
  sanityMaterials.forEach(m => {
    if (m.slug?.current) {
      sanityMap[m.slug.current] = m;
    }
  });

  console.log(`Found ${enItems.items.length} EN materials in Webflow`);
  console.log(`Found ${sanityMaterials.length} materials in Sanity`);

  const rows = ['Item ID,Name,Slug'];

  for (const item of enItems.items) {
    const itemId = item.id;
    const slug = item.fieldData.slug;
    const sanityItem = sanityMap[slug];

    // Use EN name from Sanity
    const name = sanityItem?.name?.en || item.fieldData.name;

    if (!sanityItem) {
      console.log(`⚠ ${slug}: no Sanity match`);
    }

    const fields = [itemId, name, slug];
    const csvLine = fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
    rows.push(csvLine);
  }

  const csv = rows.join('\n');
  const outPath = path.join(__dirname, '..', 'reports', 'material-en.csv');
  fs.writeFileSync(outPath, csv, 'utf8');

  console.log(`\n✅ Generated: ${outPath}`);
  console.log(`${rows.length - 1} materials with ENGLISH names`);
  console.log(`\nImport to EN locale to restore English names`);
}

generateMaterialENCSV().catch(console.error);

