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

function addKeysToBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return blocks;
  
  return blocks.map(block => {
    if (!block._key) block._key = generateKey();
    if (block.children && Array.isArray(block.children)) {
      block.children = block.children.map(child => {
        if (!child._key) child._key = generateKey();
        return child;
      });
    }
    if (block.markDefs && Array.isArray(block.markDefs)) {
      block.markDefs = block.markDefs.map(mark => {
        if (!mark._key) mark._key = generateKey();
        return mark;
      });
    }
    return block;
  });
}

function addKeysToImages(images) {
  if (!images || !Array.isArray(images)) return images;
  
  return images.map(img => {
    if (!img._key) img._key = generateKey();
    return img;
  });
}

async function fixAllArticles() {
  console.log('Fetching all articles...\n');
  
  const articles = await client.fetch(`*[_type == 'article']{
    _id,
    name,
    heroHeadline,
    intro,
    section1Text,
    section2Text,
    section3Text,
    section4Text,
    section1Images,
    section2Images,
    section3Images,
    section4Images
  }`);
  
  console.log(`Processing ${articles.length} articles...\n`);
  
  for (const art of articles) {
    const patches = {};
    let needsUpdate = false;
    
    // Fix all text fields (English and German)
    const textFields = ['heroHeadline', 'intro', 'section1Text', 'section2Text', 'section3Text', 'section4Text'];
    for (const field of textFields) {
      if (art[field]) {
        if (art[field].de) {
          const fixed = addKeysToBlocks(art[field].de);
          if (JSON.stringify(fixed) !== JSON.stringify(art[field].de)) {
            patches[`${field}.de`] = fixed;
            needsUpdate = true;
          }
        }
        if (art[field].en) {
          const fixed = addKeysToBlocks(art[field].en);
          if (JSON.stringify(fixed) !== JSON.stringify(art[field].en)) {
            patches[`${field}.en`] = fixed;
            needsUpdate = true;
          }
        }
      }
    }
    
    // Fix all image fields
    const imageFields = ['section1Images', 'section2Images', 'section3Images', 'section4Images'];
    for (const field of imageFields) {
      if (art[field]) {
        const fixed = addKeysToImages(art[field]);
        if (JSON.stringify(fixed) !== JSON.stringify(art[field])) {
          patches[field] = fixed;
          needsUpdate = true;
        }
      }
    }
    
    if (needsUpdate) {
      await client.patch(art._id).set(patches).commit();
      console.log(`✅ Fixed: ${art.name?.en || art.name?.de}`);
    } else {
      console.log(`⏭️  OK: ${art.name?.en || art.name?.de}`);
    }
  }
  
  console.log('\n🎉 ALL ARTICLES FIXED!');
}

fixAllArticles().catch(console.error);

