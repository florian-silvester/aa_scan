const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const textract = require('textract');

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

function textToBlocks(text) {
  if (!text || text.trim().length === 0) return null;
  return [{
    _key: generateKey(),
    _type: 'block',
    children: [{_key: generateKey(), _type: 'span', text: text}],
    markDefs: [],
    style: 'normal'
  }];
}

function splitIntoFourSections(text) {
  const words = text.split(/\s+/);
  const totalWords = words.length;
  
  if (totalWords < 100) {
    return { s1: text, s2: '', s3: '', s4: '' };
  }
  
  const wordsPerSection = Math.ceil(totalWords / 4);
  
  return {
    s1: words.slice(0, wordsPerSection).join(' '),
    s2: words.slice(wordsPerSection, wordsPerSection * 2).join(' '),
    s3: words.slice(wordsPerSection * 2, wordsPerSection * 3).join(' '),
    s4: words.slice(wordsPerSection * 3).join(' ')
  };
}

function extractText(filePath) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
}

// FRANCESCO PAVAN
async function updatePavan() {
  console.log('\n📝 6/40: Francesco Pavan');
  
  const enText = await extractText('Content/WEBSITE_STORIES/2019_AA37_PAVAN_FRANCESCO/Francesco Pavan_Porträt_EN copy.doc');
  
  console.log(`   EN: ${enText.length} chars`);
  
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*pavan*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    intro: {
      en: textToBlocks(enText.substring(0, 300)),
      de: textToBlocks(enText.substring(0, 300))
    },
    section1Text: {
      en: textToBlocks(enSections.s1),
      de: textToBlocks(enSections.s1)
    },
    section2Text: {
      en: textToBlocks(enSections.s2),
      de: textToBlocks(enSections.s2)
    },
    section3Text: {
      en: textToBlocks(enSections.s3),
      de: textToBlocks(enSections.s3)
    },
    section4Text: {
      en: textToBlocks(enSections.s4),
      de: textToBlocks(enSections.s4)
    }
  }).commit();
  
  console.log(`   ✅ Done`);
}

// OLIVER SCHMIDT
async function updateSchmidt() {
  console.log('\n📝 7/40: Oliver Schmidt');
  
  const enText = await extractText('Content/WEBSITE_STORIES/2019_AA37_SCHMIDT_OLIVER/Oliver Schmidt_EN copy.doc');
  
  console.log(`   EN: ${enText.length} chars`);
  
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*schmidt*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    intro: {
      en: textToBlocks(enText.substring(0, 300)),
      de: textToBlocks(enText.substring(0, 300))
    },
    section1Text: {
      en: textToBlocks(enSections.s1),
      de: textToBlocks(enSections.s1)
    },
    section2Text: {
      en: textToBlocks(enSections.s2),
      de: textToBlocks(enSections.s2)
    },
    section3Text: {
      en: textToBlocks(enSections.s3),
      de: textToBlocks(enSections.s3)
    },
    section4Text: {
      en: textToBlocks(enSections.s4),
      de: textToBlocks(enSections.s4)
    }
  }).commit();
  
  console.log(`   ✅ Done`);
}

// JULIAN STAIR
async function updateStair() {
  console.log('\n📝 8/40: Julian Stair');
  
  const deText = await extractText('Content/WEBSITE_STORIES/2019_AA37_STAIR_JULIAN/Julian Stair – Multivalenz der Gefäßkeramik copy.doc');
  
  console.log(`   DE: ${deText.length} chars`);
  
  const deSections = splitIntoFourSections(deText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*stair*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    intro: {
      de: textToBlocks(deText.substring(0, 300)),
      en: textToBlocks(deText.substring(0, 300))
    },
    section1Text: {
      de: textToBlocks(deSections.s1),
      en: textToBlocks(deSections.s1)
    },
    section2Text: {
      de: textToBlocks(deSections.s2),
      en: textToBlocks(deSections.s2)
    },
    section3Text: {
      de: textToBlocks(deSections.s3),
      en: textToBlocks(deSections.s3)
    },
    section4Text: {
      de: textToBlocks(deSections.s4),
      en: textToBlocks(deSections.s4)
    }
  }).commit();
  
  console.log(`   ✅ Done`);
}

async function main() {
  console.log('🚀 Batch 2: Processing 3 articles');
  console.log('='.repeat(60));
  
  await updatePavan();
  await updateSchmidt();
  await updateStair();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Batch 2 complete! (6-8/40)');
}

main().catch(console.error);

