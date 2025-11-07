const { createClient } = require('@sanity/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.bak') });

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID;
const ARTICLE_COLLECTION_ID = '690a113b26f99e215e88d1c1';

async function webflowRequest(path, options = {}) {
  const url = `https://api.webflow.com/v2${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Accept-Version': '1.0.0',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Webflow API error: ${response.status} ${error}`);
  }

  return response.json();
}

async function getAllWebflowArticles() {
  let allItems = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await webflowRequest(`/collections/${ARTICLE_COLLECTION_ID}/items?limit=${limit}&offset=${offset}`);
    const items = result.items || [];
    
    allItems.push(...items);
    
    if (items.length < limit) {
      break;
    }
    offset += limit;
  }
  
  return allItems;
}

async function deleteWebflowItems(collectionId, itemIds) {
  const batchSize = 100;
  
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize);
    
    console.log(`  🗑️  Deleting batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`);
    
    await webflowRequest(`/collections/${collectionId}/items`, {
      method: 'DELETE',
      body: JSON.stringify({ itemIds: batch })
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

(async () => {
  console.log('🔍 Fetching all articles from Webflow...\n');
  
  const allArticles = await getAllWebflowArticles();
  console.log(`📋 Total articles in Webflow: ${allArticles.length}\n`);
  
  // Sort by creation date (most recent first)
  const sortedArticles = allArticles.sort((a, b) => {
    const dateA = new Date(a.createdOn);
    const dateB = new Date(b.createdOn);
    return dateB - dateA;
  });
  
  console.log('Most recent articles:');
  sortedArticles.slice(0, 25).forEach((article, i) => {
    const createdDate = new Date(article.createdOn);
    const today = new Date();
    const isToday = createdDate.toDateString() === today.toDateString();
    console.log(`  ${i + 1}. ${article.fieldData?.name || 'No name'} (${article.id})`);
    console.log(`     Created: ${createdDate.toISOString()} ${isToday ? '← TODAY' : ''}`);
  });
  
  // Identify today's articles
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysArticles = allArticles.filter(article => {
    const createdDate = new Date(article.createdOn);
    return createdDate >= today;
  });
  
  console.log(`\n📅 Articles created today: ${todaysArticles.length}`);
  
  if (todaysArticles.length === 0) {
    console.log('✅ No articles created today. Nothing to delete.');
    return;
  }
  
  console.log('\nArticles to delete:');
  todaysArticles.forEach((article, i) => {
    console.log(`  ${i + 1}. ${article.fieldData?.name || 'No name'} (${article.id})`);
  });
  
  console.log(`\n⚠️  About to delete ${todaysArticles.length} articles created today.`);
  console.log('Press Ctrl+C to cancel, or the script will proceed in 5 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('🗑️  Deleting articles...\n');
  const itemIds = todaysArticles.map(a => a.id);
  await deleteWebflowItems(ARTICLE_COLLECTION_ID, itemIds);
  
  console.log(`\n✅ Deleted ${todaysArticles.length} articles`);
  console.log(`📊 Remaining articles: ${allArticles.length - todaysArticles.length}`);
})().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
