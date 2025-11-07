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

async function updatePavan() {
  console.log('📝 Francesco Pavan');
  console.log('   Reading file...');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2019_AA37_PAVAN_FRANCESCO/Francesco Pavan_Porträt_EN copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  // Split at English title
  const splitPoint = fullDoc.indexOf('Under the Auspices of Euclid');
  const deText = fullDoc.substring(0, splitPoint).trim();
  const enText = fullDoc.substring(splitPoint).trim();
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*pavan*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Article not found');
    return;
  }
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Im Zeichen Euklids'),
      en: textToBlocks('Under the Auspices of Euclid')
    },
    intro: {
      de: textToBlocks('Bis zu seiner Pensionierung im Jahr 2000 leitete Francesco Pavan die Goldschmiedeklasse am Istituto d\'Arte Pietro Selvatico. In dieser Zeit hat er eine ganze Generation international renommierter GoldschmiedInnen ausgebildet und den legendären Ruf der Schule von Padua mitbegründet.'),
      en: textToBlocks('Francesco Pavan was in charge of the goldsmithing class at the Istituto d\'Arte Pietro Selvatico until he retired in 2000. During that period he trained an entire generation of internationally renowned goldsmiths, and contributed to the legendary reputation of the Padua School.')
    },
    section1Text: {
      de: textToBlocks(deText),
      en: textToBlocks(enText)
    }
  }).commit();
  
  console.log('   ✅ Updated with FULL texts!');
}

updatePavan().catch(console.error);

