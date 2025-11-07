// Manually delete orphaned items from DE locale
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: require('path').join(__dirname, '../.env.bak') });

async function webflowRequest(endpoint, options = {}) {
  const url = `https://api.webflow.com/v2${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  if (response.status === 204 || options.method === 'DELETE') {
    return {}
  }
  
  return await response.json()
}

async function main() {
  const collectionId = '672e03c6f3f3796f05c75e5a' // Articles
  
  console.log('Fetching items from EN locale...');
  const enItems = await webflowRequest(`/collections/${collectionId}/items?limit=100`);
  console.log(`EN locale: ${enItems.items.length} items`);
  
  const enIds = new Set(enItems.items.map(item => item.id));
  console.log('EN IDs:', Array.from(enIds));
  
  console.log('\nFetching items from DE locale...');
  const deLocaleId = '68e134d0086ac0f97d5540b9';
  const deItems = await webflowRequest(`/collections/${collectionId}/items?limit=100&locale=${deLocaleId}`);
  console.log(`DE locale: ${deItems.items.length} items`);
  
  const deIds = new Set(deItems.items.map(item => item.id));
  console.log('DE IDs:', Array.from(deIds));
  
  // Find items that exist in DE but not in EN
  const orphanedDeIds = Array.from(deIds).filter(id => !enIds.has(id));
  
  console.log(`\n🗑️  Found ${orphanedDeIds.length} orphaned items in DE locale:`);
  orphanedDeIds.forEach(id => {
    const item = deItems.items.find(i => i.id === id);
    console.log(`  - ${item.fieldData?.name || 'Unnamed'} (${item.fieldData?.slug || 'no-slug'}) - ${item.id}`);
  });
  
  if (orphanedDeIds.length > 0) {
    console.log('\nDeleting orphaned items...');
    for (const itemId of orphanedDeIds) {
      try {
        await webflowRequest(`/collections/${collectionId}/items/${itemId}`, {
          method: 'DELETE'
        });
        console.log(`  ✅ Deleted ${itemId}`);
      } catch (error) {
        console.error(`  ❌ Failed to delete ${itemId}: ${error.message}`);
      }
    }
  }
}

main().catch(console.error);

