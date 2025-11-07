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

async function updateArticle() {
  console.log('📝 Daniel Krüger');
  console.log('   Extracting full text...');
  
  const fullDoc = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2019_AA36_KRUGER_DANIEL/Daniel Kruger_EN copy.doc', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  // Split DE and EN (both in same file)
  const splitPoint = fullDoc.indexOf("Daniel Kruger's World of Wonders");
  const deText = fullDoc.substring(0, splitPoint).trim();
  const enText = fullDoc.substring(splitPoint).trim();
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  const deSections = splitIntoFourSections(deText);
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*kruger*' || slug.current match '*krüger*'][0]{_id}`);
  
  if (!article) {
    console.log('   ⚠️  Article not found');
    return;
  }
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Daniel Krugers Wunderwelt'),
      en: textToBlocks("Daniel Kruger's World of Wonders")
    },
    intro: {
      de: textToBlocks('In der Wohnung des Künstlers in München führt ein Raum in den nächsten, wie bei einem Fuchsbau. Von der Küche geht es direkt ins Arbeitszimmer. Eine extra Werkstatt hat Daniel Kruger nicht mehr, Arbeit und Leben mischen sich.'),
      en: textToBlocks("In the artist's apartment in Munich, one room leads to the next one, just like in a fox's den. The kitchen leads right to his workroom. Daniel Kruger no longer has a separate workshop. His apartment is a place for both living and working.")
    },
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
  
  const stored = deSections.s1.length + deSections.s2.length + deSections.s3.length + deSections.s4.length;
  const coverage = ((stored / deText.length) * 100).toFixed(1);
  
  console.log(`   ✅ Updated! Coverage: ${coverage}%`);
}

updateArticle().catch(console.error);

