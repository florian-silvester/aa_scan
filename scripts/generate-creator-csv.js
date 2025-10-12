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

async function generateCreatorCSV() {
  const siteId = process.env.WEBFLOW_SITE_ID;
  const token = process.env.WEBFLOW_API_TOKEN;
  
  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const en = site.locales.primary.cmsLocaleId;
  
  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  
  const creatorCol = cols.collections.find(c => c.slug === 'creator');
  
  console.log('Found Creator collection:', creatorCol.id);
  
  let allItems = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const url = `https://api.webflow.com/v2/collections/${creatorCol.id}/items?cmsLocaleId=${en}&limit=100&offset=${offset}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    
    allItems.push(...(data.items || []));
    hasMore = data.items && data.items.length === 100;
    offset += 100;
  }
  
  console.log(`Found ${allItems.length} EN items\n`);
  
  const sanityCreators = await sanity.fetch(`*[_type=='creator']{
    _id,
    name,
    lastName,
    slug,
    portrait,
    biography,
    nationality,
    specialties
  }`);
  
  console.log(`Found ${sanityCreators.length} Sanity creator items\n`);
  
  const extract = blocks => (blocks || []).map(b => (b.children || []).map(c => c.text).join('')).join(' ');
  
  const rows = ['Item ID,Name,Last Name,Slug,Portrait,Biography,Nationality,Specialties'];
  let matched = 0;
  let unmatched = 0;
  
  for (const item of allItems) {
    const slug = item.fieldData.slug;
    const itemId = item.id;
    
    const sanityItem = sanityCreators.find(c => c.slug?.current === slug);
    
    if (sanityItem) {
      const name = sanityItem.name || item.fieldData.name;
      const lastName = sanityItem.lastName || item.fieldData['last-name'] || '';
      const portrait = extract(sanityItem.portrait?.de) || extract(sanityItem.portrait?.en) || '';
      const bio = extract(sanityItem.biography?.de) || extract(sanityItem.biography?.en) || '';
      const nationality = sanityItem.nationality?.de || sanityItem.nationality?.en || '';
      const specs = (sanityItem.specialties?.de || sanityItem.specialties?.en || []).join(', ');
      
      const fields = [itemId, name, lastName, slug, portrait, bio, nationality, specs];
      const csvLine = fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
      rows.push(csvLine);
      matched++;
      if (matched <= 10) console.log(`✓ ${slug}: ${name}`);
    } else {
      const name = item.fieldData.name;
      const lastName = item.fieldData['last-name'] || '';
      const fields = [itemId, name, lastName, slug, '', '', '', ''];
      const csvLine = fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
      rows.push(csvLine);
      unmatched++;
      if (unmatched <= 5) console.log(`⚠ ${slug}: no Sanity match`);
    }
  }
  
  console.log(`\n... (showing first 10 matched, first 5 unmatched)`);
  console.log(`Total: ${matched} matched, ${unmatched} unmatched\n`);
  
  const csvPath = path.join(__dirname, '..', 'reports', 'creator-de-link.csv');
  fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');
  
  console.log(`✅ CSV generated: ${csvPath}`);
  console.log(`\nNext: Designer → CMS → Creator → switch to DE → Import → Link and update matching items`);
}

generateCreatorCSV().catch(console.error);

