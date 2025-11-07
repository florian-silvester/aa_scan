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

function extractTitleAndIntro(fullTextBlocks) {
  if (!fullTextBlocks || !Array.isArray(fullTextBlocks) || fullTextBlocks.length === 0) {
    return { title: null, intro: null, restBlocks: fullTextBlocks };
  }
  
  const firstBlock = fullTextBlocks[0];
  if (!firstBlock || firstBlock._type !== 'block') {
    return { title: null, intro: null, restBlocks: fullTextBlocks };
  }
  
  const fullText = firstBlock.children?.map(c => c.text || '').join('') || '';
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
  
  if (lines.length === 0) {
    return { title: null, intro: null, restBlocks: fullTextBlocks };
  }
  
  // First line is likely the title (short, < 100 chars)
  const firstLine = lines[0];
  const title = firstLine.length < 100 ? firstLine : null;
  
  // Find where the actual body text starts (after title and blank lines)
  let bodyStartIndex = 1;
  while (bodyStartIndex < lines.length && lines[bodyStartIndex].length < 100) {
    bodyStartIndex++;
  }
  
  // The first long paragraph is likely the intro
  const intro = lines[bodyStartIndex] || null;
  
  // Find where to start the cleaned text (after title, intro, blank lines)
  const textAfterTitle = fullText.split('\n\n\n').slice(1).join('\n\n\n');
  
  // If we extracted title/intro, remove them from first block
  if ((title || intro) && textAfterTitle) {
    const cleanedBlocks = [...fullTextBlocks];
    cleanedBlocks[0] = {
      ...firstBlock,
      children: [{
        ...firstBlock.children[0],
        text: textAfterTitle.trim()
      }]
    };
    return { title, intro, restBlocks: cleanedBlocks };
  }
  
  return { title, intro, restBlocks: fullTextBlocks };
}

async function moveDuplicates() {
  console.log('🔄 Moving duplicates from fullText to title/intro fields...\n');
  
  const articles = await client.fetch(`*[_type == 'article']{
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
    
    // Check if title is just the creator name (needs to be extracted)
    const needsTitleEn = !titleEn || titleEn === article.creatorName;
    const needsIntroEn = !introEn;
    
    if (!needsTitleEn && !needsIntroEn) {
      continue; // Already has proper title and intro
    }
    
    // Check if fullText has duplicates
    const firstBlock = article.fullText?.en?.[0];
    if (!firstBlock || firstBlock._type !== 'block') continue;
    
    const firstText = firstBlock.children?.map(c => c.text || '').join('') || '';
    if (!firstText || firstText.length < 50) continue;
    
    console.log(`\n${article.creatorName}:`);
    console.log(`  Current title: "${titleEn}"`);
    console.log(`  Current intro: "${introEn.substring(0, 60)}..."`);
    
    // Extract from English fullText
    const extractedEn = extractTitleAndIntro(article.fullText?.en);
    const extractedDe = extractTitleAndIntro(article.fullText?.de);
    
    const patch = {};
    let changes = false;
    
    if (needsTitleEn && extractedEn.title) {
      console.log(`  → Moving title EN: "${extractedEn.title}"`);
      patch['title.en'] = extractedEn.title;
      patch['fullText.en'] = extractedEn.restBlocks;
      changes = true;
    }
    
    if (needsTitleEn && extractedDe.title) {
      console.log(`  → Moving title DE: "${extractedDe.title}"`);
      patch['title.de'] = extractedDe.title;
      patch['fullText.de'] = extractedDe.restBlocks;
      changes = true;
    }
    
    if (needsIntroEn && extractedEn.intro) {
      console.log(`  → Moving intro EN: "${extractedEn.intro.substring(0, 60)}..."`);
      patch['intro.en'] = extractedEn.intro;
      if (!patch['fullText.en']) patch['fullText.en'] = extractedEn.restBlocks;
      changes = true;
    }
    
    if (needsIntroEn && extractedDe.intro) {
      console.log(`  → Moving intro DE: "${extractedDe.intro.substring(0, 60)}..."`);
      patch['intro.de'] = extractedDe.intro;
      if (!patch['fullText.de']) patch['fullText.de'] = extractedDe.restBlocks;
      changes = true;
    }
    
    if (changes) {
      await client.patch(article._id).set(patch).commit();
      console.log(`✅ Updated`);
      updated++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Updated: ${updated} articles`);
  console.log(`${'='.repeat(60)}\n`);
}

moveDuplicates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });

