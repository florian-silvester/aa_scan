const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID;

if (!WEBFLOW_API_TOKEN || !WEBFLOW_SITE_ID) {
  console.error('❌ Missing WEBFLOW_API_TOKEN or WEBFLOW_SITE_ID in .env');
  process.exit(1);
}

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2';
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

async function getArticlesCollectionId() {
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
  const articlesCollection = collections.collections?.find(c => 
    c.slug === 'articles' || c.slug === 'article' || c.displayName?.toLowerCase().includes('article')
  );
  
  if (!articlesCollection) {
    throw new Error('Articles collection not found. Run setup-articles-collection.js first.');
  }
  
  return articlesCollection.id;
}

// List all articles
async function listArticles() {
  console.log('📰 Listing all articles...\n');
  
  const collectionId = await getArticlesCollectionId();
  const items = await webflowRequest(`/collections/${collectionId}/items`);
  
  if (!items.items || items.items.length === 0) {
    console.log('No articles found.');
    return [];
  }
  
  items.items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.fieldData['hero-headline'] || 'Untitled'}`);
    console.log(`   ID: ${item.id}`);
    console.log(`   Creator: ${item.fieldData['hero-creator'] || 'N/A'}`);
    console.log(`   Layout: ${item.fieldData['hero-layout'] || 'N/A'}\n`);
  });
  
  return items.items;
}

// Create a new article
async function createArticle(articleData) {
  console.log('➕ Creating new article...\n');
  
  const collectionId = await getArticlesCollectionId();
  
  const result = await webflowRequest(`/collections/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify({
      fieldData: articleData,
      isDraft: true // Set to false to publish immediately
    })
  });
  
  console.log('✅ Article created successfully!');
  console.log(`   ID: ${result.id}`);
  console.log(`   Headline: ${articleData['hero-headline']}\n`);
  
  return result;
}

// Update an existing article
async function updateArticle(articleId, articleData) {
  console.log(`✏️  Updating article ${articleId}...\n`);
  
  const collectionId = await getArticlesCollectionId();
  
  const result = await webflowRequest(`/collections/${collectionId}/items/${articleId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fieldData: articleData
    })
  });
  
  console.log('✅ Article updated successfully!\n');
  
  return result;
}

// Delete an article
async function deleteArticle(articleId) {
  console.log(`🗑️  Deleting article ${articleId}...\n`);
  
  const collectionId = await getArticlesCollectionId();
  
  await webflowRequest(`/collections/${collectionId}/items/${articleId}`, {
    method: 'DELETE'
  });
  
  console.log('✅ Article deleted successfully!\n');
}

// Publish an article
async function publishArticle(articleId) {
  console.log(`🚀 Publishing article ${articleId}...\n`);
  
  const collectionId = await getArticlesCollectionId();
  
  await webflowRequest(`/collections/${collectionId}/items/publish`, {
    method: 'POST',
    body: JSON.stringify({
      itemIds: [articleId]
    })
  });
  
  console.log('✅ Article published successfully!\n');
}

// Example: Create a sample article
async function createSampleArticle() {
  const sampleArticle = {
    'hero-headline': 'Sample Article: Contemporary Art Jewelry',
    'hero-creator': 'Jane Smith',
    'hero-layout': 'sticky',
    'hero-caption': 'A collection of modern pieces',
    
    'section-1-text': '<p>This is the first section with rich text content.</p><p>You can add multiple paragraphs here.</p>',
    'section-1-layout': 'twin',
    'section-1-size': 'mid',
    'section-1-caption': 'First section images',
    
    'section-2-text': '<p>Second section content goes here.</p>',
    'section-2-layout': 'solo',
    'section-2-size': 'full',
    'section-2-caption': 'Full width image in section 2'
  };
  
  return await createArticle(sampleArticle);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'list':
        await listArticles();
        break;
        
      case 'create-sample':
        await createSampleArticle();
        break;
        
      case 'create':
        // Parse JSON from command line
        const articleData = JSON.parse(args[1] || '{}');
        await createArticle(articleData);
        break;
        
      case 'update':
        const articleId = args[1];
        const updateData = JSON.parse(args[2] || '{}');
        await updateArticle(articleId, updateData);
        break;
        
      case 'delete':
        await deleteArticle(args[1]);
        break;
        
      case 'publish':
        await publishArticle(args[1]);
        break;
        
      default:
        console.log('📰 Webflow Articles Manager\n');
        console.log('Usage:');
        console.log('  node manage-webflow-articles.js list');
        console.log('  node manage-webflow-articles.js create-sample');
        console.log('  node manage-webflow-articles.js create \'{"hero-headline":"My Article"}\'');
        console.log('  node manage-webflow-articles.js update <article-id> \'{"hero-headline":"Updated"}\'');
        console.log('  node manage-webflow-articles.js delete <article-id>');
        console.log('  node manage-webflow-articles.js publish <article-id>');
        console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export functions for use as module
module.exports = {
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  publishArticle,
  createSampleArticle
};

// Run CLI if called directly
if (require.main === module) {
  main();
}

