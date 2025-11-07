const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env
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
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-01-01'
});

// Map folder names to slug patterns and correct creator names
const FOLDER_TO_ARTICLE = {
  '2014_AA19_HEGER_EMIL': { slugPattern: '*heger*', correctName: 'Emil Heger' },
  '2019_AA36_KRUGER_DANIEL': { slugPattern: '*kruger*', correctName: 'Daniel Kruger' },
  '2018_AA35_MUELLER_FELIX_SABINE': { slugPattern: '*mueller*', correctName: 'Sabine und Felix Müller' },
  '2016_AA25_ROTHMAN_GERD': { slugPattern: '*rothman*', correctName: 'Gerd Rothmann' },
  '2024_AA56_BURY-CLAUS': { slugPattern: '*bury*', correctName: 'Claus Bury' },
  '2024_AA57_LAAPKE': { slugPattern: '*2024-aa57-laapke*', correctName: 'Lena Kaapke' },
  '2020_AA39_KESSLER_BEPPE': { slugPattern: '*kessler*', correctName: 'Beppe Kessler' },
  '2019_AA37_PAVAN_FRANCESCO': { slugPattern: '*pavan*', correctName: 'Francesco Pavan' },
  '2020_AA40_VEIT_GABI': { slugPattern: '*veit*', correctName: 'Gabi Veit' },
  '2020_AA39_FULLE_KARL': { slugPattern: '*fulle*', correctName: 'Karl Fulle' },
  '2019_AA37_SCHMIDT_OLIVER': { slugPattern: '*schmidt*', correctName: 'Oliver Schmidt' },
  '2019_AA37_STAIR_JULIAN': { slugPattern: '*stair*', correctName: 'Julian Stair' },
  '2019_AA37_WILHELM_PAUL': { slugPattern: '*paul-wilhelm*', correctName: 'Paul Derrez' },
  '2020_AA42_KAMATA_JIRO': { slugPattern: '*kamata*', correctName: 'Jiro Kamata' },
  '2021_AA46_NOGUEIRA_KIMBERLY': { slugPattern: '*nogueira*', correctName: 'Kimberly Nogueira' },
  '2016_AA25_HUBER_KUENZLI_JAPAN': { slugPattern: '*japan-kuenzli-huber*', correctName: 'Otto Künzli' },
  '2022_AA47_FISCHER_HANS_MARIA': { slugPattern: '*maria-hans-fischer*', correctName: 'Hans und Maria Fischer' },
  '2018_AA33_MINEGISHI_YUKATA': { slugPattern: '*minegishi*', correctName: 'Yutaka Minegishi' }
};

// Map folder to specific txt file
const FOLDER_TO_FILE = {
  '2014_AA19_HEGER_EMIL': 'Emil Heger_EN.txt',
  '2019_AA36_KRUGER_DANIEL': 'Daniel Kruger_EN copy.txt',
  '2018_AA35_MUELLER_FELIX_SABINE': '1 Sabine und Felix MUEller copy.txt',
  '2016_AA25_ROTHMAN_GERD': 'Gerd Rothmann Interview copy.txt',
  '2024_AA56_BURY-CLAUS': '2024_04 Art Aurea_Claus Bury 2 copy.txt',
  '2024_AA57_LAAPKE': 'AA 2024 Lena Kaapke_Engl copy.txt',
  '2020_AA39_KESSLER_BEPPE': 'Beppe Kessler_Engl copy.txt',
  '2019_AA37_PAVAN_FRANCESCO': 'Francesco Pavan_Porträt_EN copy.txt',
  '2020_AA40_VEIT_GABI': 'Gabi Veit 2020_Antworten_EN copy.txt',
  '2020_AA39_FULLE_KARL': 'Karl Fulle_Der mit dem Ton tanzt_EN copy.txt',
  '2019_AA37_SCHMIDT_OLIVER': 'Oliver Schmidt_EN copy.txt',
  '2019_AA37_STAIR_JULIAN': 'Julian Stair – Multivalenz der Gefäßkeramik copy.txt',
  '2019_AA37_WILHELM_PAUL': 'tekst art aurea (1) copy.txt',
  '2020_AA42_KAMATA_JIRO': 'AA42_JIRO_KAMATA_Ein zweites Leben_engl copy.txt',
  '2021_AA46_NOGUEIRA_KIMBERLY': 'Kimberly Nogueira.txt',
  '2016_AA25_HUBER_KUENZLI_JAPAN': 'Beindruckt von Künzlis Ironie.txt',
  '2022_AA47_FISCHER_HANS_MARIA': 'AA_47_Fischer_EN copy.txt',
  '2018_AA33_MINEGISHI_YUKATA': 'Minegishi_ENG.txt'
};

function generateKey() {
  return Math.random().toString(36).substring(2, 15);
}

function parseMarkedUpFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  const sections = {
    titleDE: '',
    titleEN: '',
    subtitleDE: '',
    subtitleEN: '',
    creditsDE: '',
    creditsEN: '',
    introDE: '',
    introEN: '',
    bodyDE: '',
    bodyEN: '',
    captionsDE: '',
    captionsEN: ''
  };

  // Extract sections using markers
  const titleDEMatch = content.match(/\[TITLE_DE\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const titleENMatch = content.match(/\[TITLE_EN\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const subtitleDEMatch = content.match(/\[SUBTITLE_DE\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const subtitleENMatch = content.match(/\[SUBTITLE_EN\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const creditsDEMatch = content.match(/\[CREDITS_DE\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const creditsENMatch = content.match(/\[CREDITS_EN\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const introDEMatch = content.match(/\[INTRO_DE\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const introENMatch = content.match(/\[INTRO_EN\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const bodyDEMatch = content.match(/\[BODY_DE\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const bodyENMatch = content.match(/\[BODY_EN\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const captionsDEMatch = content.match(/\[CAPTIONS_DE\]\s*\n([\s\S]*?)(?=\n\[|$)/);
  const captionsENMatch = content.match(/\[CAPTIONS_EN\]\s*\n([\s\S]*?)(?=\n\[|$)/);

  if (titleDEMatch) sections.titleDE = titleDEMatch[1].trim();
  if (titleENMatch) sections.titleEN = titleENMatch[1].trim();
  if (subtitleDEMatch) sections.subtitleDE = subtitleDEMatch[1].trim();
  if (subtitleENMatch) sections.subtitleEN = subtitleENMatch[1].trim();
  if (creditsDEMatch) sections.creditsDE = creditsDEMatch[1].trim();
  if (creditsENMatch) sections.creditsEN = creditsENMatch[1].trim();
  if (introDEMatch) sections.introDE = introDEMatch[1].trim();
  if (introENMatch) sections.introEN = introENMatch[1].trim();
  if (bodyDEMatch) sections.bodyDE = bodyDEMatch[1].trim();
  if (bodyENMatch) sections.bodyEN = bodyENMatch[1].trim();
  if (captionsDEMatch) sections.captionsDE = captionsDEMatch[1].trim();
  if (captionsENMatch) sections.captionsEN = captionsENMatch[1].trim();

  return sections;
}

function textToPortableText(text) {
  if (!text || text.trim() === '') return null;
  
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map(para => ({
    _type: 'block',
    _key: generateKey(),
    style: 'normal',
    markDefs: [],
    children: [{
      _type: 'span',
      _key: generateKey(),
      text: para.trim(),
      marks: []
    }]
  }));
}

async function updateArticle(articleInfo, folderName) {
  console.log(`\n🔍 Processing: ${articleInfo.correctName}`);
  
  // Find the article by slug pattern
  const articles = await client.fetch(
    `*[_type == "article" && slug.current match $pattern]`,
    { pattern: articleInfo.slugPattern }
  );
  
  if (articles.length === 0) {
    console.log(`   ❌ Article not found in Sanity (slug: ${articleInfo.slugPattern})`);
    return;
  }
  
  const article = articles[0];
  console.log(`   ✓ Found article: ${article._id} (current name: ${article.creatorName || 'none'})`);
  
  // Read and parse the marked-up file
  const filePath = path.join(
    __dirname,
    '..',
    'Content',
    'WEBSITE_STORIES',
    folderName,
    FOLDER_TO_FILE[folderName]
  );
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    return;
  }
  
  const sections = parseMarkedUpFile(filePath);
  console.log(`   ✓ Parsed file`);
  
  // Build the update payload
  const updates = {};
  
  // Update creator name to correct value
  updates['creatorName'] = articleInfo.correctName;
  
  // Title
  if (sections.titleEN || sections.titleDE) {
    updates['title'] = {
      en: sections.titleEN || sections.titleDE || '',
      de: sections.titleDE || sections.titleEN || ''
    };
  }
  
  // Intro (as rich text) - only update languages that exist
  if (sections.introEN) {
    updates['intro.en'] = textToPortableText(sections.introEN);
  }
  if (sections.introDE) {
    updates['intro.de'] = textToPortableText(sections.introDE);
  }
  
  // Full text body - only update languages that exist
  if (sections.bodyEN) {
    updates['fullText.en'] = textToPortableText(sections.bodyEN);
  }
  if (sections.bodyDE) {
    updates['fullText.de'] = textToPortableText(sections.bodyDE);
  }
  
  // Apply updates
  if (Object.keys(updates).length > 0) {
    try {
      await client
        .patch(article._id)
        .set(updates)
        .commit();
      
      console.log(`   ✅ Updated successfully`);
      console.log(`      - Creator name: ${articleInfo.correctName}`);
      console.log(`      - Title: ${sections.titleEN ? 'EN' : ''} ${sections.titleDE ? 'DE' : ''}`);
      console.log(`      - Intro: ${sections.introEN ? 'EN' : ''} ${sections.introDE ? 'DE' : ''}`);
      console.log(`      - Body: ${sections.bodyEN ? 'EN' : ''} ${sections.bodyDE ? 'DE' : ''}`);
    } catch (error) {
      console.log(`   ❌ Update failed: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  No content to update`);
  }
}

async function main() {
  console.log('🚀 Starting article updates from marked-up files...\n');
  
  for (const [folderName, articleInfo] of Object.entries(FOLDER_TO_ARTICLE)) {
    await updateArticle(articleInfo, folderName);
  }
  
  console.log('\n✅ All articles processed!');
}

main().catch(console.error);

