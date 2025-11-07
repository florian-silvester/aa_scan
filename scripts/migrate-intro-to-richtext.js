const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');

// Load env from .env.bak
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

// Convert plain text to Sanity block format
function textToBlocks(plainText) {
  if (!plainText || typeof plainText !== 'string') return null;
  
  // Split by paragraphs (double newline or single newline)
  const paragraphs = plainText.split(/\n+/).filter(p => p.trim());
  
  return paragraphs.map(para => ({
    _type: 'block',
    _key: generateKey(),
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: generateKey(),
        text: para.trim(),
        marks: []
      }
    ]
  }));
}

async function migrateIntros() {
  console.log('🔄 Migrating intro fields from plain text to rich text...\n');
  
  // Fetch all articles
  const articles = await client.fetch(`
    *[_type == "article"] {
      _id,
      creatorName,
      intro
    }
  `);
  
  console.log(`📄 Found ${articles.length} articles\n`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    const { _id, creatorName, intro } = article;
    
    // Check if intro needs migration (is plain text object)
    const needsMigrationEN = intro?.en && typeof intro.en === 'string';
    const needsMigrationDE = intro?.de && typeof intro.de === 'string';
    
    if (!needsMigrationEN && !needsMigrationDE) {
      console.log(`⏭️  ${creatorName}: intro already in block format`);
      skipped++;
      continue;
    }
    
    const newIntro = {};
    
    if (needsMigrationEN) {
      newIntro.en = textToBlocks(intro.en);
      console.log(`  📝 Converting EN intro: "${intro.en.substring(0, 50)}..."`);
    } else if (intro?.en) {
      newIntro.en = intro.en; // Keep existing blocks
    }
    
    if (needsMigrationDE) {
      newIntro.de = textToBlocks(intro.de);
      console.log(`  📝 Converting DE intro: "${intro.de.substring(0, 50)}..."`);
    } else if (intro?.de) {
      newIntro.de = intro.de; // Keep existing blocks
    }
    
    // Update article
    try {
      await client
        .patch(_id)
        .set({ intro: newIntro })
        .commit();
      
      console.log(`✅ ${creatorName}: migrated intro to block format\n`);
      migrated++;
    } catch (err) {
      console.error(`❌ ${creatorName}: failed to migrate`, err.message, '\n');
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`  ✅ Migrated: ${migrated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📄 Total: ${articles.length}`);
}

migrateIntros().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

