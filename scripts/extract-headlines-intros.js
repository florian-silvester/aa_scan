const { createClient } = require('@sanity/client');
const mammoth = require('mammoth');
const textract = require('textract');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function generateKey() { return crypto.randomBytes(8).toString('hex'); }
function textToBlocks(text) {
  return [{
    _key: generateKey(),
    _type: 'block',
    children: [{_key: generateKey(), _type: 'span', text: text}],
    markDefs: [],
    style: 'normal'
  }];
}

async function getText(file, type) {
  if (type === 'docx') {
    return await mammoth.extractRawText({path: file}).then(r => r.value);
  }
  return await new Promise((res, rej) => {
    textract.fromFileWithPath(file, (e, t) => e ? rej(e) : res(t));
  });
}

// Extract first meaningful paragraph after title as intro (roughly 1-3 sentences)
function extractIntro(text, afterTitle = 0) {
  // Skip title, find first paragraph
  const afterTitleText = text.substring(afterTitle);
  const lines = afterTitleText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Find first substantial paragraph (not just byline/credits)
  for (const line of lines) {
    // Skip short lines, photo credits, bylines
    if (line.length < 50) continue;
    if (/^(text|foto|photo|bild)/i.test(line)) continue;
    
    // Take first 1-2 sentences (up to 300 chars or first 2 periods)
    const sentences = line.split(/\.\s+/);
    if (sentences.length >= 2) {
      return sentences.slice(0, 2).join('. ') + '.';
    }
    return line.substring(0, 300);
  }
  
  return lines[0] || '';
}

const articles = [
  {name:'Künzli', slug:'*kuenzli*', file:'Content/WEBSITE_STORIES/2016_AA25_HUBER_KUENZLI_JAPAN/Beindruckt von Künzlis Ironie.odt', type:'odt',
   deSplit:-1, enSplit:'Struck by Künzli', deTitle:'Beeindruckt von Künzlis Ironie', enTitle:'Struck by Künzli\'s Wit'},
  
  {name:'Raimer', slug:'*raimer*', file:'Content/WEBSITE_STORIES/2019_AA37_RAIMER_JOACHIM/Raimer Jochims_EN copy.doc', type:'doc',
   deSplit:-1, enSplit:'Color, Earth, Community', deTitle:'Farbe, Erde, Gemeinschaft', enTitle:'Color, Earth, Community'},
  
  {name:'Fulle', slug:'*fulle*', file:'Content/WEBSITE_STORIES/2020_AA39_FULLE_KARL/Karl Fulle_Der mit dem Ton tanzt_EN copy.doc', type:'doc',
   deSplit:-1, enSplit:'Dances with Clay', deTitle:'Der mit dem Ton tanzt', enTitle:'Dances with Clay'},
  
  {name:'Bott', slug:'*bott*', file:'Content/WEBSITE_STORIES/2020_AA41_BOTT/Reportage Rudolf Bott_ART AUREA-red_neu copy.doc', type:'doc',
   deSplit:-1, enSplit:'Craftsmanship with Attitude', deTitle:'Handwerk mit Haltung', enTitle:'Craftsmanship with Attitude'},
  
  {name:'Factomesser', slug:'factomesser', file:'Content/WEBSITE_STORIES/2020_AA42_FACTOMESSER/Schimmel_Engl copy.docx', type:'docx',
   deSplit:-1, enSplit:'Joint Smithing Projects', deTitle:'Gemeinsame Schmiedeprojekte', enTitle:'Joint Smithing Projects'},
  
  {name:'Kamata', slug:'*kamata*', file:'Content/WEBSITE_STORIES/2020_AA42_KAMATA_JIRO/AA42_JIRO_KAMATA_Ein zweites Leben_engl copy.docx', type:'docx',
   deSplit:-1, enSplit:'A Second Life', deTitle:'Ein zweites Leben', enTitle:'A Second Life'},
  
  {name:'Baier', slug:'*baier*', file:'Content/WEBSITE_STORIES/2021_AA45_BAIER_OTTO/Otto Baier_EN copy.docx', type:'docx',
   deSplit:-1, enSplit:'Creative Freedom and Tradition', deTitle:'Freiheit mit Tradition', enTitle:'Creative Freedom and Tradition'},
  
  {name:'Kippenberger', slug:'*kippenberg*', file:'Content/WEBSITE_STORIES/2021_AA45_KIPPENBERGER_HEIDI/Heidi Kippenberg (lang) copy.docx', type:'docx',
   deSplit:-1, enSplit:'Experimentation & Classicism', deTitle:'Experiment & Klassizität', enTitle:'Experimentation & Classicism'},
  
  {name:'Schloss', slug:'*schloss*', file:'Content/WEBSITE_STORIES/2022_AA48_SCHLOSS_JULIANE/AA_Portrat Juliane Scholß_Die mit dem Silber tanzt NEU copy.docx', type:'docx',
   deSplit:-1, enSplit:'Silver with a Kink', deTitle:'Silber mit Knick', enTitle:'Silver with a Kink'},
  
  {name:'Young-Jae', slug:'*young*jae*', file:'Content/WEBSITE_STORIES/2022_AA50_YOUNG_JAE/Young-Jae Lee Text_Engl copy.docx', type:'docx',
   deSplit:-1, enSplit:'Contemporary Craft', deTitle:'Zeitgenössisches Kunsthandwerk', enTitle:'Contemporary Craft'},
  
  {name:'Maisch', slug:'*maisch*', file:'Content/WEBSITE_STORIES/2023_AA51_MAISCH_EVA/Eva Maisch Text_Engl copy.docx', type:'docx',
   deSplit:-1, enSplit:'A Blooming Oasis', deTitle:'Eine blühende Oase', enTitle:'A Blooming Oasis'},
  
  {name:'Delarue', slug:'*delarue*', file:'Content/WEBSITE_STORIES/2023_AA53_DELARUE_MARION/2023_3 Marion Delarue_korrigiert copy.docx', type:'docx',
   deSplit:-1, enSplit:'With Hide and Hair', deTitle:'Mit Haut und Haar', enTitle:'With Hide and Hair'},
  
  {name:'Kaapke', slug:'laapke', file:'Content/WEBSITE_STORIES/2024_AA57_LAAPKE/AA 2024 Lena Kaapke_Engl copy.docx', type:'docx',
   deSplit:-1, enSplit:'Thinking', deTitle:'Mit Material denken', enTitle:'Thinking with Materials'},
  
  {name:'Bury', slug:'*bury*', file:'Content/WEBSITE_STORIES/2024_AA56_BURY-CLAUS/2024_04 Art Aurea_Claus Bury 2 copy.docx', type:'docx',
   deSplit:-1, enSplit:'It\'s About Seeing', deTitle:'Es geht ums Sehen', enTitle:'It\'s About Seeing'},
  
  {name:'Lamberts', slug:'*lambert*', file:'Content/WEBSITE_STORIES/2024_AA58_LAMBERTS_GLAS/Glashütte Lamberts_Engl copy.docx', type:'docx',
   deSplit:-1, enSplit:'The Sensuality of the Handcrafted', deTitle:'Die Sinnlichkeit des Handgemachten', enTitle:'The Sensuality of the Handcrafted'},
  
  {name:'Nogueira', slug:'*nogueira*', file:'Content/WEBSITE_STORIES/2021_AA46_NOGUEIRA_KIMBERLY/Kimberly Nogueira.odt', type:'odt',
   deSplit:-1, enSplit:'Dear Kim', deTitle:'Liebe Kim Nogueira', enTitle:'Dear Kim Nogueira'},
  
  {name:'Brunner/Petzold', slug:'*brunner*', file:'Content/WEBSITE_STORIES/2021_AA46_BRUNNER_PETZOLD/Gudrun Petzold und W. Jo Brunner copy.docx', type:'docx',
   deSplit:-1, enSplit:'Emergence, Growth, Decay', deTitle:'Entstehen, Wachsen, Vergehen', enTitle:'Emergence, Growth, Decay'},
  
  {name:'Visintin', slug:'*visintin*', file:'Content/WEBSITE_STORIES/2024_AA58_VISINTIN_GRAZIANO/Graziano Visintin_red 2 2 copy.docx', type:'docx',
   deSplit:-1, enSplit:'Between Minimalism and Art Informel', deTitle:'Zwischen Minimalismus und Art Informel', enTitle:'Between Minimalism and Art Informel'}
];

async function processArticle(art) {
  const text = await getText(art.file, art.type);
  const enIdx = text.indexOf(art.enSplit);
  
  const deText = text.substring(0, enIdx).trim();
  const enText = text.substring(enIdx).trim();
  
  // Extract intros (skip title, find first paragraph)
  const deTitleEnd = deText.indexOf('\n');
  const enTitleEnd = enText.indexOf('\n');
  
  const deIntro = extractIntro(deText, deTitleEnd);
  const enIntro = extractIntro(enText, enTitleEnd);
  
  console.log(`\n${art.name}:`);
  console.log(`  DE Headline: "${art.deTitle}"`);
  console.log(`  DE Intro: "${deIntro.substring(0, 100)}..."`);
  console.log(`  EN Headline: "${art.enTitle}"`);
  console.log(`  EN Intro: "${enIntro.substring(0, 100)}..."`);
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match ${JSON.stringify(art.slug)}][0]{_id}`);
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks(art.deTitle),
      en: textToBlocks(art.enTitle)
    },
    intro: {
      de: textToBlocks(deIntro),
      en: textToBlocks(enIntro)
    }
  }).commit();
  
  console.log(`  ✅ Updated`);
}

async function run() {
  console.log('Extracting heroHeadline and intro for all articles...\n');
  
  for (const art of articles) {
    try {
      await processArticle(art);
    } catch (err) {
      console.log(`❌ ${art.name}: ${err.message}`);
    }
  }
  
  console.log('\n🎉 All headlines and intros extracted!');
}

run().catch(console.error);

