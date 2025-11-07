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

function extractFromFullText(fullTextBlocks) {
  if (!fullTextBlocks || !Array.isArray(fullTextBlocks) || fullTextBlocks.length === 0) {
    return { title: null, intro: null, cleanedBlocks: fullTextBlocks };
  }
  
  const firstBlock = fullTextBlocks[0];
  if (!firstBlock || firstBlock._type !== 'block') {
    return { title: null, intro: null, cleanedBlocks: fullTextBlocks };
  }
  
  const fullText = firstBlock.children?.map(c => c.text || '').join('') || '';
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
  
  if (lines.length < 2) {
    return { title: null, intro: null, cleanedBlocks: fullTextBlocks };
  }
  
  // First non-empty line is the title
  let title = lines[0];
  
  // Second substantial line is the intro
  let introIndex = 1;
  while (introIndex < lines.length && lines[introIndex].length < 50) {
    introIndex++;
  }
  const intro = lines[introIndex] || null;
  
  // Find where body text starts (after title and intro)
  let bodyStartLine = introIndex + 1;
  const bodyLines = lines.slice(bodyStartLine);
  const cleanedText = bodyLines.join('\n\n');
  
  if (!cleanedText) {
    return { title, intro, cleanedBlocks: fullTextBlocks };
  }
  
  // Create cleaned blocks
  const cleanedBlocks = [...fullTextBlocks];
  cleanedBlocks[0] = {
    ...firstBlock,
    children: [{
      ...firstBlock.children[0],
      text: cleanedText
    }]
  };
  
  return { title, intro, cleanedBlocks };
}

async function extractAndClean() {
  console.log('🔄 Extracting titles/intros and cleaning duplicates...\n');
  
  const articles = await client.fetch(`*[_type == 'article'] | order(creatorName asc) {
    _id, 
    creatorName, 
    title, 
    intro,
    fullText
  }`);
  
  let updated = 0;
  
  for (const article of articles) {
    const titleEn = article.title?.en || '';
    const titleDe = article.title?.de || '';
    const introEn = article.intro?.en || '';
    const introDe = article.intro?.de || '';
    
    // Check if title is just the creator name (placeholder, needs extraction)
    const titleIsPlaceholder = titleEn === article.creatorName || titleDe === article.creatorName;
    const needsIntro = !introEn || !introDe;
    
    // Also check if title appears in fullText (duplicate)
    const firstBlock = article.fullText?.en?.[0];
    if (!firstBlock || firstBlock._type !== 'block') continue;
    
    const firstText = firstBlock.children?.map(c => c.text || '').join('') || '';
    const hasDuplicate = titleEn && firstText.includes(titleEn);
    
    if (!titleIsPlaceholder && !needsIntro && !hasDuplicate) {
      continue; // Skip if already good
    }
    
    console.log(`\n${article.creatorName}:`);
    console.log(`  Current title EN: "${titleEn}"`);
    console.log(`  Current intro EN: "${introEn.substring(0, 50)}..."`);
    
    const patch = {};
    let needsUpdate = false;
    
    // Extract from English
    if (article.fullText?.en) {
      const extracted = extractFromFullText(article.fullText.en);
      
      if (titleIsPlaceholder && extracted.title) {
        console.log(`  → Extract title EN: "${extracted.title}"`);
        patch['title.en'] = extracted.title;
        needsUpdate = true;
      }
      
      if (!introEn && extracted.intro) {
        console.log(`  → Extract intro EN: "${extracted.intro.substring(0, 60)}..."`);
        patch['intro.en'] = extracted.intro;
        needsUpdate = true;
      }
      
      if (hasDuplicate || titleIsPlaceholder) {
        console.log(`  → Clean fullText EN`);
        patch['fullText.en'] = extracted.cleanedBlocks;
        needsUpdate = true;
      }
    }
    
    // Extract from German
    if (article.fullText?.de) {
      const extracted = extractFromFullText(article.fullText.de);
      
      if (titleIsPlaceholder && extracted.title) {
        console.log(`  → Extract title DE: "${extracted.title}"`);
        patch['title.de'] = extracted.title;
        needsUpdate = true;
      }
      
      if (!introDe && extracted.intro) {
        console.log(`  → Extract intro DE: "${extracted.intro.substring(0, 60)}..."`);
        patch['intro.de'] = extracted.intro;
        needsUpdate = true;
      }
      
      if (hasDuplicate || titleIsPlaceholder) {
        console.log(`  → Clean fullText DE`);
        patch['fullText.de'] = extracted.cleanedBlocks;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      await client.patch(article._id).set(patch).commit();
      console.log(`✅ Updated`);
      updated++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Updated: ${updated} articles`);
  console.log(`${'='.repeat(60)}\n`);
}

extractAndClean()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });

