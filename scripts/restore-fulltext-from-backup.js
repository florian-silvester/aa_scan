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

function generateKey() {
  return Math.random().toString(36).substring(2, 15);
}

function buildFullText(section1, section2, section3, section4) {
  const blocks = [];
  
  // Section 1 text
  if (section1 && Array.isArray(section1) && section1.length > 0) {
    blocks.push(...section1);
  }
  
  // Image marker 1
  blocks.push({
    _key: generateKey(),
    _type: 'imageMarker',
    group: '1'
  });
  
  // Section 2 text
  if (section2 && Array.isArray(section2) && section2.length > 0) {
    blocks.push(...section2);
  }
  
  // Image marker 2
  blocks.push({
    _key: generateKey(),
    _type: 'imageMarker',
    group: '2'
  });
  
  // Section 3 text
  if (section3 && Array.isArray(section3) && section3.length > 0) {
    blocks.push(...section3);
  }
  
  // Image marker 3
  blocks.push({
    _key: generateKey(),
    _type: 'imageMarker',
    group: '3'
  });
  
  // Section 4 text
  if (section4 && Array.isArray(section4) && section4.length > 0) {
    blocks.push(...section4);
  }
  
  // Image marker 4
  blocks.push({
    _key: generateKey(),
    _type: 'imageMarker',
    group: '4'
  });
  
  return blocks;
}

async function restoreFromBackup() {
  console.log('🔄 Restoring clean fullText from backup...\n');
  
  const backupPath = path.join(__dirname, '..', 'backups', 'articles-pre-consolidation-2025-11-03T08-31-27.ndjson');
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  console.log(`Reading backup: ${backupPath}\n`);
  
  const backupArticles = new Map();
  
  // Read backup file line by line
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
  
  // Get current articles
  const currentArticles = await client.fetch(`*[_type == 'article']{_id, creatorName}`);
  
  console.log(`Found ${currentArticles.length} current articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const current of currentArticles) {
    const backup = backupArticles.get(current._id);
    
    if (!backup) {
      console.log(`⚠️  ${current.creatorName || current._id}: No backup found, skipping`);
      skipped++;
      continue;
    }
    
    console.log(`\nProcessing: ${current.creatorName || current._id}`);
    
    // Build fullText from section texts
    const fullTextEn = buildFullText(
      backup.section1Text?.en,
      backup.section2Text?.en,
      backup.section3Text?.en,
      backup.section4Text?.en
    );
    
    const fullTextDe = buildFullText(
      backup.section1Text?.de,
      backup.section2Text?.de,
      backup.section3Text?.de,
      backup.section4Text?.de
    );
    
    console.log(`  EN: ${fullTextEn.length} blocks`);
    console.log(`  DE: ${fullTextDe.length} blocks`);
    
    // Update Sanity
    await client
      .patch(current._id)
      .set({
        'fullText.en': fullTextEn,
        'fullText.de': fullTextDe
      })
      .commit();
    
    console.log(`✅ Updated`);
    updated++;
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Restore complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`${'='.repeat(60)}\n`);
}

restoreFromBackup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Restore failed:', err);
    process.exit(1);
  });

