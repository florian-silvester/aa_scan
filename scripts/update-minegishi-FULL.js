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

// Split text into 4 roughly equal parts
function splitIntoFourSections(text) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const totalParas = paragraphs.length;
  
  if (totalParas <= 4) {
    return {
      s1: paragraphs[0] || text,
      s2: paragraphs[1] || '',
      s3: paragraphs[2] || '',
      s4: paragraphs[3] || ''
    };
  }
  
  const parasPerSection = Math.ceil(totalParas / 4);
  
  return {
    s1: paragraphs.slice(0, parasPerSection).join('\n\n'),
    s2: paragraphs.slice(parasPerSection, parasPerSection * 2).join('\n\n'),
    s3: paragraphs.slice(parasPerSection * 2, parasPerSection * 3).join('\n\n'),
    s4: paragraphs.slice(parasPerSection * 3).join('\n\n')
  };
}

async function updateArticle() {
  console.log('📄 Extracting FULL texts...');
  
  // Extract full texts
  const deText = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2018_AA33_MINEGISHI_YUKATA/Minegishi_DE.odt', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  const enText = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2018_AA33_MINEGISHI_YUKATA/Minegishi_ENG.odt', (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
  
  console.log(`   DE: ${deText.length} chars`);
  console.log(`   EN: ${enText.length} chars`);
  
  // Split into sections
  const deSections = splitIntoFourSections(deText);
  const enSections = splitIntoFourSections(enText);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match 'yukata-minegishi'][0]{_id}`);
  
  if (!article) {
    console.log('Article not found');
    return;
  }
  
  console.log('📝 Updating with COMPLETE text...');
  
  const update = {
    heroHeadline: {
      de: textToBlocks('Ein japanischer Bauchmensch'),
      en: textToBlocks('A Japanese Gut Person')
    },
    intro: {
      de: textToBlocks('Yutaka Minegishi geht gerne auf Flohmärkte. Er kauft Dinge, weil sie eine interessante Form oder eine schöne Oberfläche haben. Aufgewachsen ist er in dem Bewusstsein, dass Dinge eine Geschichte und einen ästhetischen Wert haben.'),
      en: textToBlocks('Yutaka Minegishi likes to go to flea markets, buying objects because they have an interesting shape or an appealing surface texture. He grew up aware of the fact that objects have a history and an intrinsic aesthetic value.')
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
  };
  
  await client.patch(article._id).set(update).commit();
  
  // Verify
  const stored = deSections.s1.length + deSections.s2.length + deSections.s3.length + deSections.s4.length;
  const coverage = ((stored / deText.length) * 100).toFixed(1);
  
  console.log(`✅ Updated! Coverage: ${coverage}%`);
}

updateArticle().catch(console.error);

