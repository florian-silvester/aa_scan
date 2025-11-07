const { createClient } = require('@sanity/client');
const mammoth = require('mammoth');
const textract = require('textract');
const fs = require('fs');
const path = require('path');

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

const articles = [
  {name:'Künzli',slug:'*kuenzli*',file:'Content/WEBSITE_STORIES/2016_AA25_HUBER_KUENZLI_JAPAN/Beindruckt von Künzlis Ironie.odt',type:'odt'},
  {name:'Raimer',slug:'*raimer*',file:'Content/WEBSITE_STORIES/2019_AA37_RAIMER_JOACHIM/Raimer Jochims_EN copy.doc',type:'doc'},
  {name:'Fulle',slug:'*fulle*',file:'Content/WEBSITE_STORIES/2020_AA39_FULLE_KARL/Karl Fulle_Der mit dem Ton tanzt_EN copy.doc',type:'doc'},
  {name:'Bott',slug:'*bott*',file:'Content/WEBSITE_STORIES/2020_AA41_BOTT/Reportage Rudolf Bott_ART AUREA-red_neu copy.doc',type:'doc'},
  {name:'Factomesser',slug:'factomesser',file:'Content/WEBSITE_STORIES/2020_AA42_FACTOMESSER/Schimmel_Engl copy.docx',type:'docx'},
  {name:'Kamata',slug:'*kamata*',file:'Content/WEBSITE_STORIES/2020_AA42_KAMATA_JIRO/AA42_JIRO_KAMATA_Ein zweites Leben_engl copy.docx',type:'docx'},
  {name:'Baier',slug:'*baier*',file:'Content/WEBSITE_STORIES/2021_AA45_BAIER_OTTO/Otto Baier_EN copy.docx',type:'docx'},
  {name:'Kippenberger',slug:'*kippenberg*',file:'Content/WEBSITE_STORIES/2021_AA45_KIPPENBERGER_HEIDI/Heidi Kippenberg (lang) copy.docx',type:'docx'},
  {name:'Reitzner',slug:'*reitzner*',files:{de:'Content/WEBSITE_STORIES/2021_AA46_REITZNER_BILLA/AA46_BILLA_REITZNER_DE copy.docx',en:'Content/WEBSITE_STORIES/2021_AA46_REITZNER_BILLA/AA46_BILLA_REITZNER_EN copy.docx'},type:'separate'},
  {name:'Fischer',slug:'*fischer*',files:{de:'Content/WEBSITE_STORIES/2022_AA47_FISCHER_HANS_MARIA/AA_47_Fischer_DE copy.doc',en:'Content/WEBSITE_STORIES/2022_AA47_FISCHER_HANS_MARIA/AA_47_Fischer_EN copy.doc'},type:'separate'},
  {name:'Schloss',slug:'*schloss*',file:'Content/WEBSITE_STORIES/2022_AA48_SCHLOSS_JULIANE/AA_Portrat Juliane Scholß_Die mit dem Silber tanzt NEU copy.docx',type:'docx'},
  {name:'Smit',slug:'*smit*',files:{de:'Content/WEBSITE_STORIES/2022_AA49_SMIT_ROBERT/Robert Smit _deutsch copy.docx',en:'Content/WEBSITE_STORIES/2022_AA49_SMIT_ROBERT/Robert Smit_Art Aurea copy.docx'},type:'separate'},
  {name:'Young-Jae',slug:'*young*jae*',file:'Content/WEBSITE_STORIES/2022_AA50_YOUNG_JAE/Young-Jae Lee Text_Engl copy.docx',type:'docx'},
  {name:'Maisch',slug:'*maisch*',file:'Content/WEBSITE_STORIES/2023_AA51_MAISCH_EVA/Eva Maisch Text_Engl copy.docx',type:'docx'},
  {name:'Delarue',slug:'*delarue*',file:'Content/WEBSITE_STORIES/2023_AA53_DELARUE_MARION/2023_3 Marion Delarue_korrigiert copy.docx',type:'docx'},
  {name:'Kaapke',slug:'laapke',file:'Content/WEBSITE_STORIES/2024_AA57_LAAPKE/AA 2024 Lena Kaapke_Engl copy.docx',type:'docx'},
  {name:'Bury',slug:'*bury*',file:'Content/WEBSITE_STORIES/2024_AA56_BURY-CLAUS/2024_04 Art Aurea_Claus Bury 2 copy.docx',type:'docx'},
  {name:'Lamberts',slug:'*lambert*',file:'Content/WEBSITE_STORIES/2024_AA58_LAMBERTS_GLAS/Glashütte Lamberts_Engl copy.docx',type:'docx'},
  {name:'Nogueira',slug:'*nogueira*',file:'Content/WEBSITE_STORIES/2021_AA46_NOGUEIRA_KIMBERLY/Kimberly Nogueira.odt',type:'odt'},
  {name:'Brunner/Petzold',slug:'*brunner*',file:'Content/WEBSITE_STORIES/2021_AA46_BRUNNER_PETZOLD/Gudrun Petzold und W. Jo Brunner copy.docx',type:'docx'},
  {name:'Visintin',slug:'*visintin*',file:'Content/WEBSITE_STORIES/2024_AA58_VISINTIN_GRAZIANO/Graziano Visintin_red 2 2 copy.docx',type:'docx'}
];

async function getText(file, type) {
  if (type === 'docx') {
    return await mammoth.extractRawText({path: file}).then(r => r.value);
  }
  return await new Promise((res, rej) => {
    textract.fromFileWithPath(file, (e, t) => e ? rej(e) : res(t));
  });
}

async function verify() {
  console.log('Verifying all 21 articles...\n');
  let allGood = true;
  
  for (const art of articles) {
    try {
      const sanityArt = await client.fetch(`*[_type == 'article' && slug.current match ${JSON.stringify(art.slug)}][0]{section1Text}`);
      
      let sourceLen, sanityLen;
      
      if (art.type === 'separate') {
        const deTxt = await getText(art.files.de, art.files.de.endsWith('.docx') ? 'docx' : 'doc');
        const enTxt = await getText(art.files.en, art.files.en.endsWith('.docx') ? 'docx' : 'doc');
        sourceLen = deTxt.length + enTxt.length;
      } else {
        const txt = await getText(art.file, art.type);
        sourceLen = txt.length;
      }
      
      const sanityDe = sanityArt?.section1Text?.de?.[0]?.children?.[0]?.text || '';
      const sanityEn = sanityArt?.section1Text?.en?.[0]?.children?.[0]?.text || '';
      sanityLen = sanityDe.length + sanityEn.length;
      
      const coverage = ((sanityLen / sourceLen) * 100).toFixed(1);
      const status = coverage >= 95 ? '✅' : '❌';
      
      console.log(`${status} ${art.name.padEnd(20)} Source: ${sourceLen.toString().padStart(5)} | Sanity: ${sanityLen.toString().padStart(5)} | Coverage: ${coverage}%`);
      
      if (coverage < 95) allGood = false;
      
    } catch (err) {
      console.log(`❌ ${art.name.padEnd(20)} ERROR: ${err.message}`);
      allGood = false;
    }
  }
  
  console.log('\n' + (allGood ? '🎉 ALL ARTICLES 100% COMPLETE!' : '⚠️  Some articles need fixing'));
}

verify().catch(console.error);

