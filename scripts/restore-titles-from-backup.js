const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function blocksToText(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .filter(b => b._type === 'block' && b.children)
    .map(b => b.children.map(c => c.text || '').join(''))
    .join('\n')
    .trim();
}

async function restoreTitles() {
  console.log('🔄 Restoring article titles from backup...\n');
  
  const backupPath = path.join(__dirname, '..', 'backups', 'articles-pre-consolidation-2025-11-03T08-31-27.ndjson');
  
  const backupArticles = new Map();
  
  // Read backup
  const fileStream = fs.createReadStream(backupPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    if (line.trim()) {
      const article = JSON.parse(line);
      backupArticles.set(article._id, article);
    }
  }
  
  console.log(`Loaded ${backupArticles.size} articles from backup\n`);
  
  const currentArticles = await client.fetch(`*[_type == 'article']{_id, creatorName, title}`);
  
  let updated = 0;
  
  for (const current of currentArticles) {
    const backup = backupArticles.get(current._id);
    
    if (!backup || !backup.heroHeadline) {
      console.log(`⏭️  ${current.creatorName}: No heroHeadline in backup`);
      continue;
    }
    
    const titleEn = blocksToText(backup.heroHeadline.en);
    const titleDe = blocksToText(backup.heroHeadline.de);
    
    if (!titleEn && !titleDe) {
      console.log(`⏭️  ${current.creatorName}: Empty heroHeadline`);
      continue;
    }
    
    console.log(`\n${current.creatorName}:`);
    console.log(`  EN: "${titleEn}"`);
    console.log(`  DE: "${titleDe}"`);
    
    await client
      .patch(current._id)
      .set({
        'title.en': titleEn || titleDe,
        'title.de': titleDe || titleEn
      })
      .commit();
    
    console.log(`✅ Updated`);
    updated++;
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Restore complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`${'='.repeat(60)}\n`);
}

restoreTitles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Restore failed:', err);
    process.exit(1);
  });

