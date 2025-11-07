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

async function fixKessler() {
  console.log('\n📝 Beppe Kessler - FIXING with BOTH languages');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2020_AA39_KESSLER_BEPPE/Beppe Kessler_Engl copy.odt', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  const splitPoint = fullDoc.indexOf('A Time of Seeing');
  const deText = fullDoc.substring(0, splitPoint).trim();
  const enText = fullDoc.substring(splitPoint).trim();
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*kessler*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Eine Zeit des Sehens'),
      en: textToBlocks('A Time of Seeing')
    },
    intro: {
      de: textToBlocks('Beppe Kessler zählt zu den nachhaltigsten Stimmen im zeitgenössischen Schmuck. Von ihrem Amsterdamer Atelier in einer ehemaligen Grundschule öffnet sich der Blick auf das ruhige Wasser eines Kanals, den Wittenburgervaart.'),
      en: textToBlocks('Beppe Kessler is one of the most authentic and enduring voices in contemporary jewellery. Sitting in her beautiful Amsterdam studio, hidden behind the sturdy door of a former primary school and facing the placid water of the Wittenburgervaart.')
    },
    section1Text: {
      de: textToBlocks(deText),
      en: textToBlocks(enText)
    }
  }).commit();
  
  console.log('   ✅ Fixed with BOTH full texts!');
}

async function fixVeit() {
  console.log('\n📝 Gabi Veit - FIXING with BOTH languages');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2020_AA40_VEIT_GABI/Gabi Veit 2020_Antworten_EN copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  const splitPoint = fullDoc.indexOf('How Spoons Become Creatures');
  const deText = fullDoc.substring(0, splitPoint).trim();
  const enText = fullDoc.substring(splitPoint).trim();
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*veit*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Not found');
    return;
  }
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Wie Löffel zu Geschöpfen werden'),
      en: textToBlocks('How Spoons Become Creatures')
    },
    intro: {
      de: textToBlocks('Eines Tages kam Gabi Veit von einer Reise zurück und zeigte einer Freundin ihre Schätze: sechs Löffel aus Holz und einen aus Silber. Es war dieser Moment, als die 1968 in Bozen geborene Schmuckkünstlerin begann, sich mit dem Alltagsgegenstand auseinanderzusetzen.'),
      en: textToBlocks('One day, Gabi Veit came back from a trip, and showed a friend her treasures: six wooden spoons and one made of silver. This was the moment when the jewelry artist, who was born in Bolzano in 1968, began to engage intensely with this object of daily use.')
    },
    section1Text: {
      de: textToBlocks(deText),
      en: textToBlocks(enText)
    }
  }).commit();
  
  console.log('   ✅ Fixed with BOTH full texts!');
}

async function main() {
  console.log('🔄 CORRECTING Kessler & Veit with BOTH languages');
  console.log('='.repeat(60));
  
  await fixKessler();
  await fixVeit();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ NOW all 11 articles have correct full texts!');
}

main().catch(console.error);

