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

async function fixSchmidt() {
  console.log('📝 Oliver Schmidt');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2019_AA37_SCHMIDT_OLIVER/Oliver Schmidt_EN copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  const splitPoint = fullDoc.indexOf('A Jewelry Designer in the City of Gold');
  const deText = fullDoc.substring(0, splitPoint).trim();
  const enText = fullDoc.substring(splitPoint).trim();
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*schmidt*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Schmuckdesigner in der Goldstadt'),
      en: textToBlocks('A Jewelry Designer in the City of Gold')
    },
    intro: {
      de: textToBlocks('Als Oliver Schmidt Mitte der 1990er Jahre nach Pforzheim kam, ging es mit der traditionsreichen Schmuckindustrie gerade steil nach unten. Doch genau dies eröffnete dem frischgebackenen Goldschmied ungeahnte Räume für seine Entwicklung als international erfolgreicher Schmuckdesigner.'),
      en: textToBlocks('When Oliver Schmidt came to Pforzheim in the mid-1990s, the city\'s traditional jewelry industry was going downhill. But this was exactly what opened up unanticipated scope for the newly qualified goldsmith\'s development to become an internationally successful jewelry designer.')
    },
    section1Text: {
      de: textToBlocks(deText),
      en: textToBlocks(enText)
    }
  }).commit();
  
  console.log('   ✅ Fixed with BOTH full texts!');
}

fixSchmidt().catch(console.error);

