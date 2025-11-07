const { createClient } = require('@sanity/client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: require('path').join(__dirname, '../.env.bak') });

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

async function checkOrphans() {
  // Get all published articles from Sanity
  const sanityArticles = await sanityClient.fetch('*[_type == "article" && !(_id in path("drafts.**"))]{ _id, slug }');
  console.log(`📊 Sanity: ${sanityArticles.length} published articles`);
  
  const sanitySlugs = new Set(sanityArticles.map(a => a.slug.current));
  console.log('Sanity slugs:', Array.from(sanitySlugs).sort());
  
  // Get all articles from Webflow
  const response = await fetch('https://api.webflow.com/v2/collections/672e03c6f3f3796f05c75e5a/items?limit=100', {
    headers: { 'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}` }
  });
  
  const data = await response.json();
  console.log(`\n📊 Webflow: ${data.items ? data.items.length : 0} articles`);
  
  if (data.items) {
    const webflowSlugs = data.items.map(item => item.fieldData.slug);
    console.log('Webflow slugs:', webflowSlugs.sort());
    
    // Find orphans (in Webflow but not in Sanity)
    const orphans = data.items.filter(item => !sanitySlugs.has(item.fieldData.slug));
    
    console.log(`\n🗑️  Found ${orphans.length} orphaned articles in Webflow:`);
    orphans.forEach(item => {
      console.log(`  - ${item.fieldData.name} (${item.fieldData.slug}) - ID: ${item.id}`);
    });
  }
}

checkOrphans().catch(console.error);

