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

async function fix() {
  const fullText = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2019_AA37_RAIMER_JOACHIM/Raimer Jochims_EN copy.doc', (e,t) => {
      if (e) reject(e);
      else resolve(t);
    });
  });
  
  const splitPoint = fullText.indexOf('Color, Earth, Community');
  const deText = fullText.substring(0, splitPoint).trim();
  const enText = fullText.substring(splitPoint).trim();
  
  console.log('DE:', deText.length, 'chars');
  console.log('EN:', enText.length, 'chars');
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*raimer*' || slug.current match '*jochim*'][0]{_id}`);
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Farbe, Erde, Gemeinschaft'),
      en: textToBlocks('Color, Earth, Community')
    },
    intro: {
      de: textToBlocks('Zu Beginn der 1980er Jahre zog Raimer Jochims mit seiner Frau von Frankfurt ins beschauliche Hochstadt. Sein künstlerisches Werk, seine beeindruckende Sammlung von Werken aus der Steinzeit bis zur Gegenwart, und sein Leben in einer christlichen Gemeinschaft sind beispielhaft für eine ganzheitliche Kultur des Lebens.'),
      en: textToBlocks('In the early 1980s, Raimer Jochims and his wife moved from Frankfurt to the tranquil small town of Hochstadt. His artistic oeuvre, his impressive collection of objects from the Stone Age to the present day, and his life as a member of a Christian community are exemplary of a holistic culture of life.')
    },
    section1Text: {
      de: textToBlocks(deText),
      en: textToBlocks(enText)
    }
  }).commit();
  
  console.log('✅ Fixed!');
}

fix().catch(console.error);

