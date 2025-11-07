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

// PAUL WILHELM
async function updateWilhelm() {
  console.log('\n📝 9/40: Paul Wilhelm');
  
  const enText = await extractText('Content/WEBSITE_STORIES/2019_AA37_WILHELM_PAUL/Paul Wilhelm_EN copy.doc');
  
  console.log(`   EN: ${enText.length} chars`);
  
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*wilhelm*'][0]{_id}`);
  
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

// BEPPE KESSLER
async function updateKessler() {
  console.log('\n📝 10/40: Beppe Kessler');
  
  const enText = await extractText('Content/WEBSITE_STORIES/2020_AA39_KESSLER_BEPPE/BeppeKessler_EN copy.doc');
  
  console.log(`   EN: ${enText.length} chars`);
  
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*kessler*'][0]{_id}`);
  
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

// GABI VEIT
async function updateVeit() {
  console.log('\n📝 11/40: Gabi Veit');
  
  const enText = await extractText('Content/WEBSITE_STORIES/2020_AA40_VEIT_GABI/Gabi Veit EN copy.doc');
  
  console.log(`   EN: ${enText.length} chars`);
  
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*veit*'][0]{_id}`);
  
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

async function main() {
  console.log('🚀 Batch 3: Processing 3 articles');
  console.log('='.repeat(60));
  
  await updateWilhelm();
  await updateKessler();
  await updateVeit();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Batch 3 complete! (9-11/40)');
}

main().catch(console.error);

