const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const textract = require('textract');
const mammoth = require('mammoth');

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

// 1. GERD ROTHMANN
async function updateRothmann() {
  console.log('\n📝 1/3: Gerd Rothmann');
  
  const deText = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2016_AA25_ROTHMAN_GERD/Gerd Rothmann Interview copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  console.log(`   DE: ${deText.length} chars`);
  
  // For Rothmann, it's an interview - keep it all in section1
  const article = await client.fetch(`*[_type == 'article' && slug.current match 'gerd-rothmann'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Article not found');
    return;
  }
  
  const deSections = splitIntoFourSections(deText);
  
  await client.patch(article._id).set({
    section1Text: {
      de: textToBlocks(deSections.s1),
      en: textToBlocks(deSections.s1) // Using same for now
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
  
  console.log('   ✅ Updated with full text');
}

// 2. FELIX & SABINE MÜLLER
async function updateMueller() {
  console.log('\n📝 2/3: Felix & Sabine Müller');
  
  const deText = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2018_AA35_MUELLER_FELIX_SABINE/1 Sabine und Felix MUEller copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  const enText = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2018_AA35_MUELLER_FELIX_SABINE/s_f_mueller_ENG.rtf', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  // Split into sections
  const deSections = splitIntoFourSections(deText.substring(0, deText.indexOf('Successful Union'))); // Get only German part
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*mueller*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Article not found');
    return;
  }
  
  await client.patch(article._id).set({
    section1Text: {
      de: textToBlocks(deSections.s1),
      en: textToBlocks(enSections.s1)
    },
    section2Text: {
      de: textToBlocks(deSections.s2),
      en: textToBlocks(enSections.s2)
    },
    section3Text: {
      de: textToBlocks(deSections.s3),
      en: textToBlocks(enSections.s3)
    },
    section4Text: {
      de: textToBlocks(deSections.s4),
      en: textToBlocks(enSections.s4)
    }
  }).commit();
  
  console.log('   ✅ Updated with full text');
}

// 3. EMIL HEGER
async function updateHeger() {
  console.log('\n📝 3/3: Emil Heger');
  
  const enFullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2014_AA19_HEGER_EMIL/Emil Heger_EN.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  console.log(`   Full doc: ${enFullDoc.length} chars`);
  
  // Split DE and EN (they're both in the same file)
  const splitPoint = enFullDoc.indexOf('Quite Simply Silent Magnitude');
  const deText = enFullDoc.substring(0, splitPoint).trim();
  const enText = enFullDoc.substring(splitPoint).trim();
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  const deSections = splitIntoFourSections(deText);
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match 'emil-heger'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Article not found');
    return;
  }
  
  await client.patch(article._id).set({
    section1Text: {
      de: textToBlocks(deSections.s1),
      en: textToBlocks(enSections.s1)
    },
    section2Text: {
      de: textToBlocks(deSections.s2),
      en: textToBlocks(enSections.s2)
    },
    section3Text: {
      de: textToBlocks(deSections.s3),
      en: textToBlocks(enSections.s3)
    },
    section4Text: {
      de: textToBlocks(deSections.s4),
      en: textToBlocks(enSections.s4)
    }
  }).commit();
  
  console.log('   ✅ Updated with full text');
}

async function main() {
  console.log('🔄 Re-processing articles with FULL TEXTS...');
  console.log('='.repeat(60));
  
  await updateRothmann();
  await updateMueller();
  await updateHeger();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All 3 articles re-processed with COMPLETE texts!');
}

main().catch(console.error);

