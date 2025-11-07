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

async function fixStair() {
  console.log('📝 Julian Stair');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2019_AA37_STAIR_JULIAN/Julian Stair – Multivalenz der Gefäßkeramik copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  const splitPoint = fullDoc.indexOf('The Multivalence of Vascular Ceramics');
  const deText = fullDoc.substring(0, splitPoint).trim();
  const enText = fullDoc.substring(splitPoint).trim();
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*stair*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Die Multivalenz der Gefäßkeramik'),
      en: textToBlocks('The Multivalence of Vascular Ceramics')
    },
    intro: {
      de: textToBlocks('Wenn heutige Kunst überdimensional auftritt, steckt dahinter oft eine Strategie der Überwältigung. Sie lässt dem um Atem ringenden Publikum kaum die Chance, eine kritisch abwägende Distanz einzunehmen. Nicht so bei dem britischen Keramikkünstler Julian Stair. Seine Schöpfungen in ungewohnt mächtigen Proportionen laden über das Körperlich-Sinnliche hinaus zur Reflexion ein.'),
      en: textToBlocks('When contemporary art appears in supersized format, there is often an underlying "strategy of overwhelming." It leaves the breathless audience with little chance to adopt a critical, judicious distance. This is not the case with British ceramic artist Julian Stair. His creations in unusually powerful proportions invite reflection beyond the physical and sensual.')
    },
    section1Text: {
      de: textToBlocks(deText),
      en: textToBlocks(enText)
    }
  }).commit();
  
  console.log('   ✅ Fixed with BOTH full texts!');
}

fixStair().catch(console.error);

