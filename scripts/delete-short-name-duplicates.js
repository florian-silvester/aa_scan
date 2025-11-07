const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');

const envBak = fs.readFileSync(path.join(__dirname, '..', '.env.bak'), 'utf8');
let token = null;
envBak.split('\n').forEach(line => {
  if (line.startsWith('SANITY_API_TOKEN=')) {
    token = line.split('=')[1].trim();
  }
});

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: token
});

// Short names to delete (keeping the longer/full versions)
const shortNamesToDelete = [
  'Marion',
  'Tone',
  'Jae',
  'Glas',
  'Graziano',
  'Bott',
  'Laapke'
];

async function deleteShortNames() {
  console.log('🗑️  Deleting short-name duplicate articles...\n');
  
  const articles = await client.fetch(`*[_type == 'article']{_id, creatorName, title}`);
  
  console.log(`Total articles: ${articles.length}\n`);
  
  let deleted = 0;
  
  for (const article of articles) {
    if (shortNamesToDelete.includes(article.creatorName)) {
      console.log(`Deleting: ${article.creatorName} (${article._id})`);
      console.log(`  Title: ${article.title?.en || article.title?.de || 'No title'}`);
      
      await client.delete(article._id);
      deleted++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Deletion complete!`);
  console.log(`  Deleted: ${deleted}`);
  console.log(`${'='.repeat(60)}\n`);
}

deleteShortNames()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Deletion failed:', err);
    process.exit(1);
  });

