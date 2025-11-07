const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');

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

// Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

async function deleteArticles() {
  console.log('🗑️  Fetching all articles...\n');
  
  const articles = await client.fetch(`*[_type == "article"]{_id, name, _createdAt}`);
  
  console.log(`Found ${articles.length} articles:\n`);
  
  articles.forEach((article, i) => {
    const created = new Date(article._createdAt).toLocaleString();
    console.log(`${i + 1}. ${article.name?.en || 'Untitled'} (${article._id})`);
    console.log(`   Created: ${created}\n`);
  });
  
  if (articles.length === 0) {
    console.log('✅ No articles to delete');
    return;
  }
  
  console.log('🗑️  Deleting articles...\n');
  
  for (const article of articles) {
    try {
      await client.delete(article._id);
      console.log(`✅ Deleted: ${article.name?.en || 'Untitled'} (${article._id})`);
    } catch (error) {
      console.error(`❌ Failed to delete ${article._id}:`, error.message);
    }
  }
  
  console.log('\n✅ Cleanup complete!');
}

deleteArticles().catch(console.error);

