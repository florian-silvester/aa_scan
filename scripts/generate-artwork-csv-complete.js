const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

let createClient;
try {
  createClient = require('@sanity/client').createClient;
} catch (e) {
  createClient = require(path.join(__dirname, '..', 'sanity-cms', 'node_modules', '@sanity', 'client')).createClient;
}

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN
});

async function generateArtworkCSV() {
  const siteId = process.env.WEBFLOW_SITE_ID;
  const token = process.env.WEBFLOW_API_TOKEN;
  
  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const en = site.locales.primary.cmsLocaleId;
  
  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  
  const artworkCol = cols.collections.find(c => c.slug === 'artwork');
  
  console.log('Found Artwork collection:', artworkCol.id);
  console.log('Fetching EN items (this may take a moment)...\n');
  
  let allItems = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const url = `https://api.webflow.com/v2/collections/${artworkCol.id}/items?cmsLocaleId=${en}&limit=100&offset=${offset}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    
    allItems.push(...(data.items || []));
    hasMore = data.items && data.items.length === 100;
    offset += 100;
    if (offset % 200 === 0) console.log(`  Fetched ${offset} items...`);
  }
  
  console.log(`Found ${allItems.length} EN items\n`);
  
  console.log('Fetching Sanity artworks...');
  const sanityArtworks = await sanity.fetch(`*[_type=='artwork']{
    _id,
    name,
    workTitle,
    slug,
    description,
    year
  }`);
  
  console.log(`Found ${sanityArtworks.length} Sanity artwork items\n`);
  
  const extract = blocks => {
    if (!Array.isArray(blocks)) return '';
    return blocks.map(b => (b.children || []).map(c => c.text).join('')).join(' ');
  };
  
  const rows = ['Item ID,Name,Work Title,Slug,Description'];
  let matched = 0;
  let unmatched = 0;
  
  for (const item of allItems) {
    const slug = item.fieldData.slug;
    const itemId = item.id;
    
    const sanityItem = sanityArtworks.find(a => a.slug?.current === slug);
    
    if (sanityItem) {
      const name = sanityItem.name || item.fieldData.name || '';
      const workTitle = sanityItem.workTitle?.de || sanityItem.workTitle?.en || item.fieldData['work-title'] || '';
      const desc = extract(sanityItem.description?.de) || extract(sanityItem.description?.en) || '';
      
      const fields = [itemId, name, workTitle, slug, desc];
      const csvLine = fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
      rows.push(csvLine);
      matched++;
      if (matched <= 10) console.log(`✓ ${slug}: "${workTitle}"`);
    } else {
      const name = item.fieldData.name || '';
      const workTitle = item.fieldData['work-title'] || '';
      const fields = [itemId, name, workTitle, slug, ''];
      const csvLine = fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
      rows.push(csvLine);
      unmatched++;
      if (unmatched <= 5) console.log(`⚠ ${slug}: no Sanity match`);
    }
  }
  
  console.log(`\n... (showing first 10 matched, first 5 unmatched)`);
  console.log(`Total: ${matched} matched, ${unmatched} unmatched\n`);
  
  const csvPath = path.join(__dirname, '..', 'reports', 'artwork-de-link.csv');
  fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');
  
  console.log(`✅ CSV generated: ${csvPath}`);
  console.log(`\nNext: Designer → CMS → Artwork → switch to DE → Import → Link and update matching items`);
  console.log(`Map: Name → Name, Work Title → Work Title, Slug → Slug, Description → Description`);
  console.log(`Note: Images and references will inherit from EN automatically after linking`);
}

generateArtworkCSV().catch(console.error);

