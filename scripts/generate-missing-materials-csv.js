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

async function generateMissingCSV() {
  // Read missing materials
  const missing = JSON.parse(fs.readFileSync('missing-materials.json', 'utf8'));
  
  // Get Sanity materials
  const sanityMaterials = await sanity.fetch(`*[_type=='material'] { _id, name, slug }`);
  const sanityMap = {};
  sanityMaterials.forEach(m => {
    if (m.slug?.current) {
      sanityMap[m.slug.current] = m;
    }
  });

  console.log(`Found ${missing.length} missing materials`);

  const rows = ['Item ID,Name,Slug'];

  for (const item of missing) {
    const itemId = item.id;
    const slug = item.slug;
    const sanityItem = sanityMap[slug];

    // Use DE name from Sanity, or fallback to EN
    const name = sanityItem?.name?.de || sanityItem?.name?.en || item.name;

    const fields = [itemId, name, slug];
    const csvLine = fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
    rows.push(csvLine);
  }

  const csv = rows.join('\n');
  const outPath = path.join(__dirname, '..', 'reports', 'material-missing-de.csv');
  fs.writeFileSync(outPath, csv, 'utf8');

  console.log(`\n✅ Generated: ${outPath}`);
  console.log(`${rows.length - 1} missing materials with GERMAN names`);
  console.log(`\nImport to Material collection in DE-DE locale with "Link and update matching items"`);
}

generateMissingCSV().catch(console.error);

