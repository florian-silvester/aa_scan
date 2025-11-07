const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const textract = require('textract');

const STORIES_DIR = '/Users/florian.ludwig/Documents/aa_scan/Content/WEBSITE_STORIES';

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

function extractText(filePath) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
}

// Find article slug from folder name
function parseSlugFromFolder(folderName) {
  // "2020_AA39_FULLE_KARL" -> "karl-fulle"
  const parts = folderName.split('_');
  if (parts.length >= 3) {
    const nameParts = parts.slice(2);
    return nameParts.reverse()
      .map(p => p.toLowerCase())
      .join('-');
  }
  return folderName.toLowerCase();
}

// Detect language split in text
function detectLanguageSplit(text) {
  // Common English article starts
  const markers = [
    'Under the Auspices of Euclid',
    'A Jewelry Designer in the City of Gold',
    'The Multivalence of Vascular Ceramics',
    "Daniel Kruger's World of Wonders",
    'Quite Simply Silent Magnitude',
    'A Japanese Gut Person',
    'Successful Union',
    'A Time of Seeing',
    'How Spoons Become Creatures',
    'Paul Derrez and Willem Hoogstede Founded in 1976',
    'Jewelry Designer in the Gold City',
    'jewelry designer in the gold city'
  ];
  
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      return idx;
    }
  }
  
  // Try to find common patterns like a capitalized English title after German text
  // Look for pattern: German period + newlines + Capital English Title
  const lines = text.split('\n');
  for (let i = 1; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line.length > 10 && line.length < 100) {
      // Check if it looks like an English title (starts with capital, no German umlauts)
      if (/^[A-Z][a-zA-Z\s\-']+$/.test(line) && !/[äöüßÄÖÜ]/.test(line)) {
        const precedingText = lines.slice(0, i).join('\n');
        if (precedingText.length > 500) {
          return text.indexOf(line);
        }
      }
    }
  }
  
  return -1;
}

// Find text documents in folder
function findTextDocs(folderPath) {
  const docs = [];
  try {
    const files = fs.readdirSync(folderPath);
    files.forEach(file => {
      if (/\.(doc|docx|odt|rtf)$/i.test(file) && !file.includes('BU') && !file.includes('Caption')) {
        docs.push(path.join(folderPath, file));
      }
    });
  } catch (err) {
    // Ignore
  }
  return docs;
}

async function processArticle(folderName) {
  console.log(`\n📝 ${folderName}`);
  
  const folderPath = path.join(STORIES_DIR, folderName);
  const slug = parseSlugFromFolder(folderName);
  
  // Find article in Sanity
  const article = await client.fetch(
    `*[_type == 'article' && slug.current match $slug][0]{_id, name, section1Text}`,
    { slug: `*${slug}*` }
  );
  
  if (!article) {
    console.log(`   ⚠️  Not found in Sanity (slug: ${slug})`);
    return { status: 'not_found', folder: folderName };
  }
  
  // Check if already processed (has section1Text with content)
  if (article.section1Text?.de?.[0]?.children?.[0]?.text?.length > 1000 ||
      article.section1Text?.en?.[0]?.children?.[0]?.text?.length > 1000) {
    console.log(`   ⏭️  Already processed`);
    return { status: 'skipped', folder: folderName };
  }
  
  // Find text documents
  const docs = findTextDocs(folderPath);
  if (docs.length === 0) {
    console.log(`   ⚠️  No text documents found`);
    return { status: 'no_docs', folder: folderName };
  }
  
  console.log(`   📄 Found ${docs.length} doc(s): ${docs.map(d => path.basename(d)).join(', ')}`);
  
  // Read the largest/main document
  let mainDoc = docs[0];
  if (docs.length > 1) {
    // Prefer files with "EN" or without "BU" in name
    const enDoc = docs.find(d => /engl?/i.test(d) && !/bu/i.test(d));
    if (enDoc) mainDoc = enDoc;
  }
  
  console.log(`   📖 Reading: ${path.basename(mainDoc)}`);
  
  let fullText;
  try {
    fullText = await extractText(mainDoc);
  } catch (err) {
    console.log(`   ❌ Extract error: ${err.message}`);
    return { status: 'error', folder: folderName };
  }
  
  console.log(`   📊 Total: ${fullText.length} chars`);
  
  // Detect language split
  const splitPoint = detectLanguageSplit(fullText);
  
  let deText = null;
  let enText = null;
  
  if (splitPoint > 0) {
    deText = fullText.substring(0, splitPoint).trim();
    enText = fullText.substring(splitPoint).trim();
    console.log(`   🔀 Split detected: DE ${deText.length} chars, EN ${enText.length} chars`);
  } else {
    // Single language - detect which
    if (/[äöüßÄÖÜ]/.test(fullText.substring(0, 1000))) {
      deText = fullText;
      console.log(`   🇩🇪 German only: ${deText.length} chars`);
    } else {
      enText = fullText;
      console.log(`   🇬🇧 English only: ${enText.length} chars`);
    }
  }
  
  // Update Sanity
  const update = {
    section1Text: {}
  };
  
  if (deText) update.section1Text.de = textToBlocks(deText);
  if (enText) update.section1Text.en = textToBlocks(enText);
  
  try {
    await client.patch(article._id).set(update).commit();
    console.log(`   ✅ Updated!`);
    return { status: 'success', folder: folderName, deChars: deText?.length || 0, enChars: enText?.length || 0 };
  } catch (err) {
    console.log(`   ❌ Update error: ${err.message}`);
    return { status: 'error', folder: folderName };
  }
}

async function main() {
  console.log('🚀 Processing Remaining Articles');
  console.log('='.repeat(60));
  
  const folders = fs.readdirSync(STORIES_DIR)
    .filter(f => {
      const fullPath = path.join(STORIES_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort();
  
  console.log(`\n📁 Found ${folders.length} article folders\n`);
  
  const results = {
    success: 0,
    skipped: 0,
    no_docs: 0,
    not_found: 0,
    error: 0
  };
  
  for (const folder of folders) {
    const result = await processArticle(folder);
    results[result.status]++;
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Processing Complete!');
  console.log(`   Success: ${results.success}`);
  console.log(`   Skipped (already done): ${results.skipped}`);
  console.log(`   No docs: ${results.no_docs}`);
  console.log(`   Not found: ${results.not_found}`);
  console.log(`   Errors: ${results.error}`);
}

main().catch(console.error);

