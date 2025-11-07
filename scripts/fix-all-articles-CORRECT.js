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

function extractText(filePath) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
}

async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({path: filePath});
  return result.value;
}

// Articles to process with FULL TEXT in section1Text
const articles = [
  {
    name: 'Minegishi',
    slug: 'yukata-minegishi',
    de: 'Content/WEBSITE_STORIES/2018_AA33_MINEGISHI_YUKATA/Minegishi_DE.odt',
    en: 'Content/WEBSITE_STORIES/2018_AA33_MINEGISHI_YUKATA/Minegishi_ENG.odt'
  },
  {
    name: 'Rothman',
    slug: 'gerd-rothman',
    de: 'Content/WEBSITE_STORIES/2016_AA25_ROTHMAN_GERD/Gerd Rothmann Interview copy.doc',
    en: null // Only has DE
  },
  {
    name: 'Müller',
    slug: '*mueller*',
    de: 'Content/WEBSITE_STORIES/2018_AA35_MUELLER_FELIX_SABINE/1 Sabine und Felix MUEller copy.doc',
    en: 'Content/WEBSITE_STORIES/2018_AA35_MUELLER_FELIX_SABINE/s_f_mueller_ENG.rtf'
  },
  {
    name: 'Heger',
    slug: 'emil-heger',
    combined: 'Content/WEBSITE_STORIES/2014_AA19_HEGER_EMIL/Emil Heger_EN.doc', // Both in one file
    splitAt: 'Quite Simply Silent Magnitude'
  },
  {
    name: 'Krüger',
    slug: '*kruger*',
    combined: 'Content/WEBSITE_STORIES/2019_AA36_KRUGER_DANIEL/Daniel Kruger_EN copy.doc',
    splitAt: "Daniel Kruger's World of Wonders"
  },
  {
    name: 'Pavan',
    slug: '*pavan*',
    en: 'Content/WEBSITE_STORIES/2019_AA37_PAVAN_FRANCESCO/Francesco Pavan_Porträt_EN copy.doc',
    de: null // Only EN
  },
  {
    name: 'Schmidt',
    slug: '*schmidt*',
    en: 'Content/WEBSITE_STORIES/2019_AA37_SCHMIDT_OLIVER/Oliver Schmidt_EN copy.doc',
    de: null
  },
  {
    name: 'Stair',
    slug: '*stair*',
    de: 'Content/WEBSITE_STORIES/2019_AA37_STAIR_JULIAN/Julian Stair – Multivalenz der Gefäßkeramik copy.doc',
    en: null
  },
  {
    name: 'Wilhelm',
    slug: '*wilhelm*',
    en: 'Content/WEBSITE_STORIES/2019_AA37_WILHELM_PAUL/Paul Wilhelm_EN copy.doc',
    de: null
  },
  {
    name: 'Kessler',
    slug: '*kessler*',
    en: 'Content/WEBSITE_STORIES/2020_AA39_KESSLER_BEPPE/BeppeKessler_EN copy.doc',
    de: null
  },
  {
    name: 'Veit',
    slug: '*veit*',
    en: 'Content/WEBSITE_STORIES/2020_AA40_VEIT_GABI/Gabi Veit EN copy.doc',
    de: null
  }
];

async function processArticle(config) {
  console.log(`\n📝 ${config.name}`);
  
  let deText = null;
  let enText = null;
  
  try {
    // Handle combined files (both languages in one)
    if (config.combined) {
      const fullDoc = await extractText(config.combined);
      const splitPoint = fullDoc.indexOf(config.splitAt);
      deText = fullDoc.substring(0, splitPoint).trim();
      enText = fullDoc.substring(splitPoint).trim();
      console.log(`   DE: ${deText.length} chars`);
      console.log(`   EN: ${enText.length} chars`);
    }
    // Handle separate files
    else {
      if (config.de) {
        deText = await extractText(config.de);
        console.log(`   DE: ${deText.length} chars`);
      }
      if (config.en) {
        enText = await extractText(config.en);
        console.log(`   EN: ${enText.length} chars`);
      }
    }
    
    // Find article
    const article = await client.fetch(`*[_type == 'article' && slug.current match ${JSON.stringify(config.slug)}][0]{_id}`);
    
    if (!article) {
      console.log('   ⚠️  Article not found in Sanity');
      return;
    }
    
    // Prepare update - FULL TEXT in section1Text
    const update = {
      intro: {},
      section1Text: {}
    };
    
    if (deText) {
      update.intro.de = textToBlocks(deText.substring(0, 300).trim() + '...');
      update.section1Text.de = textToBlocks(deText);
    }
    
    if (enText) {
      update.intro.en = textToBlocks(enText.substring(0, 300).trim() + '...');
      update.section1Text.en = textToBlocks(enText);
    }
    
    await client.patch(article._id).set(update).commit();
    console.log('   ✅ Updated with FULL text in section1Text');
    
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
}

async function main() {
  console.log('🔄 RE-PROCESSING ALL ARTICLES CORRECTLY');
  console.log('   Strategy: FULL TEXT → section1Text only');
  console.log('='.repeat(60));
  
  for (const config of articles) {
    await processArticle(config);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All articles updated with FULL texts!');
  console.log('   Next step: Splitting can be done separately');
}

main().catch(console.error);

