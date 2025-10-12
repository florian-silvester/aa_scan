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

async function checkMedia() {
  console.log('Sanity medium items:');
  const media = await sanity.fetch(`*[_type=='medium'] | order(name.en asc) {
    _id,
    name,
    slug
  }`);
  
  media.slice(0, 10).forEach(m => {
    const en = m.name?.en || '';
    const de = m.name?.de || '';
    const slug = m.slug?.current || 'NO SLUG';
    console.log(`  ${slug}: EN="${en}" DE="${de}"`);
  });
  console.log(`  ... (${media.length} total)\n`);
  
  console.log('Webflow Media slugs:');
  const siteId = process.env.WEBFLOW_SITE_ID;
  const token = process.env.WEBFLOW_API_TOKEN;
  
  const site = await fetch(`https://api.webflow.com/v2/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const en = site.locales.primary.cmsLocaleId;
  
  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  const mediaCol = cols.collections.find(c => c.displayName === 'Media' || c.slug === 'media');
  
  const items = await fetch(`https://api.webflow.com/v2/collections/${mediaCol.id}/items?cmsLocaleId=${en}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  
  items.items.forEach(i => {
    console.log(`  ${i.fieldData.slug}: "${i.fieldData.name}"`);
  });
}

checkMedia().catch(console.error);

