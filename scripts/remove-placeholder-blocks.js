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

function removePlaceholders(blocks, lang) {
  if (!blocks || !Array.isArray(blocks)) return blocks;
  
  return blocks.filter((block, i) => {
    // Keep image markers
    if (block._type === 'imageMarker') {
      return true;
    }
    
    // Remove placeholder blocks
    if (block._type === 'block' && block.children) {
      const text = block.children.map(c => c.text || '').join('');
      if (text.includes('content to be added') || 
          text.includes('Inhalt wird hinzugefügt') ||
          text.includes('Abschnitt') && text.includes('hinzugefügt')) {
        console.log(`  [${lang}] Removing placeholder: "${text.substring(0, 50)}..."`);
        return false;
      }
    }
    
    // Keep everything else
    return true;
  });
}

async function cleanPlaceholders() {
  console.log('🔄 Removing placeholder blocks...\n');
  
  const articles = await client.fetch(`*[_type == 'article']{_id, creatorName, fullText}`);
  
  console.log(`Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    const name = article.creatorName || article._id;
    
    let needsUpdate = false;
    const patch = {};
    
    // Clean English
    if (article.fullText?.en) {
      const cleanedEn = removePlaceholders(article.fullText.en, 'EN');
      if (cleanedEn.length !== article.fullText.en.length) {
        console.log(`\n${name}`);
        console.log(`  EN: ${article.fullText.en.length} → ${cleanedEn.length} blocks`);
        patch['fullText.en'] = cleanedEn;
        needsUpdate = true;
      }
    }
    
    // Clean German
    if (article.fullText?.de) {
      const cleanedDe = removePlaceholders(article.fullText.de, 'DE');
      if (cleanedDe.length !== article.fullText.de.length) {
        if (!needsUpdate) console.log(`\n${name}`);
        console.log(`  DE: ${article.fullText.de.length} → ${cleanedDe.length} blocks`);
        patch['fullText.de'] = cleanedDe;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      await client.patch(article._id).set(patch).commit();
      console.log(`✅ Updated`);
      updated++;
    } else {
      skipped++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Cleanup complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`${'='.repeat(60)}\n`);
}

cleanPlaceholders()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  });

