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

async function backupArticles() {
  console.log('Fetching all articles for backup...\n');
  
  const articles = await client.fetch(`*[_type == 'article']{...}`);
  
  console.log(`Found ${articles.length} articles\n`);
  
  // Create backups directory if it doesn't exist
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `articles-pre-consolidation-${timestamp}.ndjson`;
  const filepath = path.join(backupDir, filename);
  
  // Write as NDJSON (one JSON object per line)
  const ndjson = articles.map(doc => JSON.stringify(doc)).join('\n');
  fs.writeFileSync(filepath, ndjson, 'utf8');
  
  console.log(`✅ Backup saved to: ${filepath}`);
  console.log(`   ${articles.length} articles backed up`);
  console.log(`   File size: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB\n`);
  
  return filepath;
}

backupArticles()
  .then(filepath => {
    console.log('🎉 Backup complete!');
    console.log('\nYou can restore from this backup if needed.');
  })
  .catch(err => {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  });

