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
  return [{
    _key: generateKey(),
    _type: 'block',
    children: [{_key: generateKey(), _type: 'span', text: text}],
    markDefs: [],
    style: 'normal'
  }];
}

async function fixWilhelm() {
  console.log('\n📝 Paul Wilhelm (Derrez & Hoogstede)');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2019_AA37_WILHELM_PAUL/tekst art aurea (1) copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  const splitPoint = fullDoc.indexOf('Paul Derrez and Willem Hoogstede Founded in 1976');
  const deText = fullDoc.substring(0, splitPoint).trim();
  const enText = fullDoc.substring(splitPoint).trim();
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*wilhelm*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Paul Derrez und Willem Hoogstede'),
      en: textToBlocks('Paul Derrez and Willem Hoogstede')
    },
    intro: {
      de: textToBlocks('Gegründet 1976 war die Galerie RA in Amsterdam eine der ersten weltweit, die auf höchstem Niveau moderne Schmuckkunst zeigten. Doch ihre Inhaber sind nicht nur Pioniere einer inzwischen eigenständigen Kunstdisziplin. In ihrer Amsterdamer Wohnung offenbart sich die ganze schöpferische Fülle ihrer vielseitigen Interessen.'),
      en: textToBlocks('Founded in 1976, the RA Gallery in Amsterdam was one of the first worldwide to showcase modern jewelry art at the highest level. But its owners are not only pioneers of what has since become an independent art discipline. In their Amsterdam apartment, the full creative abundance of their diverse interests is revealed.')
    },
    section1Text: {
      de: textToBlocks(deText),
      en: textToBlocks(enText)
    }
  }).commit();
  
  console.log('   ✅ Fixed!');
}

async function fixKessler() {
  console.log('\n📝 Beppe Kessler');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2020_AA39_KESSLER_BEPPE/Beppe Kessler_Engl copy.odt', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  console.log(`   EN: ${fullDoc.length} chars`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*kessler*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    intro: {
      en: textToBlocks(fullDoc.substring(0, 300) + '...')
    },
    section1Text: {
      en: textToBlocks(fullDoc)
    }
  }).commit();
  
  console.log('   ✅ Fixed (EN only)');
}

async function fixVeit() {
  console.log('\n📝 Gabi Veit');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2020_AA40_VEIT_GABI/Gabi Veit 2020_Antworten_EN copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  console.log(`   EN: ${fullDoc.length} chars`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*veit*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    intro: {
      en: textToBlocks(fullDoc.substring(0, 300) + '...')
    },
    section1Text: {
      en: textToBlocks(fullDoc)
    }
  }).commit();
  
  console.log('   ✅ Fixed (EN only)');
}

async function main() {
  console.log('🔄 Fixing last 3 articles');
  console.log('='.repeat(60));
  
  await fixWilhelm();
  await fixKessler();
  await fixVeit();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All 11 articles now corrected!');
}

main().catch(console.error);

