const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

async function migrateArticleNames() {
  console.log('🔄 Migrating article names from {en, de} to string...\n');
  
  // Fetch all articles with old name structure
  const articles = await client.fetch(`*[_type == 'article']{_id, name}`);
  
  console.log(`Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    // Check if name is object (old structure)
    if (typeof article.name === 'object' && article.name !== null) {
      const newName = article.name.en || article.name.de || 'Untitled';
      
      await client
        .patch(article._id)
        .set({ name: newName })
        .commit();
      
      console.log(`✅ ${article._id}: "${article.name.en || article.name.de}" → "${newName}"`);
      updated++;
    } else {
      console.log(`⏭️  ${article._id}: Already string format`);
      skipped++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`${'='.repeat(60)}\n`);
}

migrateArticleNames()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

