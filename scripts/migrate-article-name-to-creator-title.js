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

// Parse article name to extract creator name and title
// Assumes format like "Petzold Brunner – Emergence, Growth, Decay" or just "Petzold Brunner"
function parseArticleName(fullName) {
  if (!fullName) return { creatorName: '', title: '' };
  
  // Check if there's a separator (em dash, en dash, hyphen)
  const separators = ['–', '—', '-', '|'];
  for (const sep of separators) {
    if (fullName.includes(sep)) {
      const parts = fullName.split(sep, 2);
      return {
        creatorName: parts[0].trim(),
        title: parts[1]?.trim() || ''
      };
    }
  }
  
  // No separator found - assume entire string is creator name
  return {
    creatorName: fullName.trim(),
    title: ''
  };
}

async function migrateArticles() {
  console.log('🔄 Migrating article names to creatorName + title...\n');
  
  const articles = await client.fetch(`*[_type == 'article']{_id, name, creatorName, title}`);
  
  console.log(`Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    // Skip if already migrated
    if (article.creatorName || article.title) {
      console.log(`⏭️  ${article._id}: Already has creatorName/title`);
      skipped++;
      continue;
    }
    
    // Skip if no name data
    if (!article.name) {
      console.log(`⚠️  ${article._id}: No name data to migrate`);
      skipped++;
      continue;
    }
    
    const nameEn = article.name?.en || article.name?.de || '';
    const nameDe = article.name?.de || article.name?.en || '';
    
    const parsedEn = parseArticleName(nameEn);
    const parsedDe = parseArticleName(nameDe);
    
    // Use German creator name as the single creatorName (or English if German not available)
    const creatorName = parsedDe.creatorName || parsedEn.creatorName || 'Unknown';
    
    const patch = {
      creatorName: creatorName,
      title: {
        en: parsedEn.title || parsedEn.creatorName,
        de: parsedDe.title || parsedDe.creatorName
      }
    };
    
    await client
      .patch(article._id)
      .set(patch)
      .commit();
    
    console.log(`✅ ${article._id}:`);
    console.log(`   Creator: "${creatorName}"`);
    console.log(`   Title EN: "${patch.title.en}"`);
    console.log(`   Title DE: "${patch.title.de}"`);
    console.log();
    
    updated++;
  }
  
  console.log(`${'='.repeat(60)}`);
  console.log(`Migration complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`${'='.repeat(60)}\n`);
}

migrateArticles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

