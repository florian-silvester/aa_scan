const { createClient } = require('@sanity/client');
const crypto = require('crypto');
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

function generateKey() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Convert text to portable text blocks
 */
function textToBlocks(text) {
  if (!text) return [];
  
  // If already blocks, return with keys
  if (Array.isArray(text)) {
    return text.map(block => ({
      ...block,
      _key: block._key || generateKey(),
      children: block.children?.map(child => ({
        ...child,
        _key: child._key || generateKey()
      })) || []
    }));
  }
  
  // If string, convert to block
  return [{
    _key: generateKey(),
    _type: 'block',
    children: [{_key: generateKey(), _type: 'span', text}],
    markDefs: [],
    style: 'normal'
  }];
}

/**
 * Build fullText structure from old fields
 */
function buildFullText(article) {
  const fullText = {de: [], en: []};
  
  ['de', 'en'].forEach(lang => {
    const blocks = [];
    
    // 1. Add heroHeadline as H1
    if (article.heroHeadline?.[lang]?.[0]) {
      const headlineBlock = {...article.heroHeadline[lang][0]};
      headlineBlock.style = 'h1';
      headlineBlock._key = generateKey();
      if (headlineBlock.children) {
        headlineBlock.children = headlineBlock.children.map(c => ({...c, _key: c._key || generateKey()}));
      }
      blocks.push(headlineBlock);
    }
    
    // 2. Add intro as H2
    if (article.intro?.[lang]?.[0]) {
      const introBlock = {...article.intro[lang][0]};
      introBlock.style = 'h2';
      introBlock._key = generateKey();
      if (introBlock.children) {
        introBlock.children = introBlock.children.map(c => ({...c, _key: c._key || generateKey()}));
      }
      blocks.push(introBlock);
    }
    
    // 3-6. Add section texts and imageMarkers
    for (let i = 1; i <= 4; i++) {
      const sectionText = article[`section${i}Text`]?.[lang];
      const sectionImages = article[`section${i}Images`];
      
      // Add section text blocks
      if (sectionText && Array.isArray(sectionText)) {
        sectionText.forEach(block => {
          blocks.push({
            ...block,
            _key: block._key || generateKey(),
            children: block.children?.map(c => ({...c, _key: c._key || generateKey()})) || []
          });
        });
      }
      
      // Add imageMarker if section has images
      if (sectionImages && sectionImages.length > 0) {
        blocks.push({
          _type: 'imageMarker',
          _key: generateKey(),
          group: i.toString()
        });
      }
    }
    
    fullText[lang] = blocks;
  });
  
  return fullText;
}

/**
 * Migrate a single article
 */
async function migrateArticle(article, dryRun = false) {
  const name = article.name?.en || article.name?.de || article._id;
  
  try {
    // Build new fullText
    const fullText = buildFullText(article);
    
    if (dryRun) {
      console.log(`\n📄 ${name}`);
      console.log(`   DE blocks: ${fullText.de.length} (${fullText.de.filter(b => b._type === 'imageMarker').length} image markers)`);
      console.log(`   EN blocks: ${fullText.en.length} (${fullText.en.filter(b => b._type === 'imageMarker').length} image markers)`);
      return {success: true, dryRun: true};
    }
    
    // Update article - set new fullText
    await client
      .patch(article._id)
      .set({fullText})
      .commit();
    
    // Remove old fields in a separate transaction
    await client
      .patch(article._id)
      .unset([
        'heroHeadline',
        'intro',
        'section1Text',
        'section2Text',
        'section3Text',
        'section4Text'
      ])
      .commit();
    
    console.log(`✅ ${name}`);
    return {success: true};
    
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    return {success: false, error: err.message};
  }
}

/**
 * Main migration function
 */
async function migrate(options = {}) {
  const {dryRun = false, testOnly = false, testIds = []} = options;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Article Text Consolidation Migration`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Fetch articles
  let query = `*[_type == 'article']{
    _id,
    name,
    heroHeadline,
    intro,
    section1Text, section2Text, section3Text, section4Text,
    section1Images, section2Images, section3Images, section4Images
  }`;
  
  if (testOnly && testIds.length > 0) {
    query = `*[_type == 'article' && _id in ${JSON.stringify(testIds)}]{
      _id, name, heroHeadline, intro,
      section1Text, section2Text, section3Text, section4Text,
      section1Images, section2Images, section3Images, section4Images
    }`;
  }
  
  const articles = await client.fetch(query);
  
  console.log(`Found ${articles.length} articles to migrate\n`);
  
  if (testOnly) {
    console.log(`🧪 TEST MODE: Only migrating ${testIds.length} specified articles\n`);
  }
  
  const results = {
    total: articles.length,
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const article of articles) {
    const result = await migrateArticle(article, dryRun);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({id: article._id, error: result.error});
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration ${dryRun ? 'Preview' : 'Complete'}!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total: ${results.total}`);
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    results.errors.forEach(e => console.log(`   ${e.id}: ${e.error}`));
  }
  
  if (dryRun) {
    console.log(`\n💡 This was a dry run. Run without --dry-run to apply changes.`);
  }
  
  console.log();
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const testMode = args.includes('--test');

// For test mode, get test article IDs from arguments
let testIds = [];
if (testMode) {
  const testIdsIndex = args.indexOf('--test-ids');
  if (testIdsIndex !== -1 && args[testIdsIndex + 1]) {
    testIds = args[testIdsIndex + 1].split(',');
  }
}

migrate({dryRun, testOnly: testMode, testIds})
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

