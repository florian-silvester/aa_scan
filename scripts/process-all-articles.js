const { createClient } = require('@sanity/client');
const textract = require('textract');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORIES_DIR = '/Users/florian.ludwig/Documents/aa_scan/Content/WEBSITE_STORIES';

// Load env
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
  if (!text || text.trim().length === 0) {
    return [{
      _key: generateKey(),
      _type: 'block',
      children: [{_key: generateKey(), _type: 'span', text: 'Content to be added.'}],
      markDefs: [],
      style: 'normal'
    }];
  }
  
  return [{
    _key: generateKey(),
    _type: 'block',
    children: [{_key: generateKey(), _type: 'span', text: text}],
    markDefs: [],
    style: 'normal'
  }];
}

// Detect language from filename
function detectLanguage(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('_en') || lower.includes('engl') || lower.includes('english')) return 'en';
  if (lower.includes('_de') || lower.includes('_dt') || lower.includes('deutsch') || lower.includes('german')) return 'de';
  return 'unknown';
}

// Find text documents
function findTextDocuments(folderPath) {
  const docs = [];
  try {
    const files = fs.readdirSync(folderPath);
    files.forEach(file => {
      if (/\.(doc|docx|odt|rtf)$/i.test(file)) {
        docs.push({
          path: path.join(folderPath, file),
          filename: file,
          language: detectLanguage(file)
        });
      }
    });
  } catch (err) {
    console.error(`  ⚠️  Error reading folder: ${err.message}`);
  }
  return docs;
}

// Extract text from a document
function extractText(docPath) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(docPath, { preserveLineBreaks: true }, (err, text) => {
      if (err) reject(err);
      else resolve(text || '');
    });
  });
}

// Split long text into sections (rough split by length)
function splitIntoSections(text) {
  if (!text || text.length < 500) {
    return { section1: text };
  }
  
  const words = text.split(' ');
  const totalWords = words.length;
  
  if (totalWords < 200) {
    return { section1: text };
  }
  
  const wordsPerSection = Math.ceil(totalWords / 4);
  
  return {
    section1: words.slice(0, wordsPerSection).join(' '),
    section2: words.slice(wordsPerSection, wordsPerSection * 2).join(' '),
    section3: words.slice(wordsPerSection * 2, wordsPerSection * 3).join(' '),
    section4: words.slice(wordsPerSection * 3).join(' ')
  };
}

// Generate slug from article name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Process single article
async function processArticle(folderName, folderPath) {
  console.log(`\n📝 Processing: ${folderName}`);
  
  // Find article in Sanity
  const slug = generateSlug(folderName.replace(/_/g, ' '));
  const article = await client.fetch(
    `*[_type == "article" && slug.current == $slug][0]{_id, name}`,
    { slug }
  );
  
  if (!article) {
    console.log(`  ⚠️  Article not found in Sanity (slug: ${slug})`);
    return { status: 'not_found', folder: folderName };
  }
  
  console.log(`  📄 Article: ${article.name?.en || 'Untitled'}`);
  
  // Find documents
  const docs = findTextDocuments(folderPath);
  console.log(`  📋 Found ${docs.length} documents`);
  
  if (docs.length === 0) {
    console.log(`  ⏭️  No text documents found, skipping`);
    return { status: 'no_docs', folder: folderName };
  }
  
  // Extract text from all documents
  const extractedTexts = { en: [], de: [], unknown: [] };
  
  for (const doc of docs) {
    try {
      console.log(`     - ${doc.filename} (${doc.language})`);
      const text = await extractText(doc.path);
      
      if (doc.language === 'en') {
        extractedTexts.en.push(text);
      } else if (doc.language === 'de') {
        extractedTexts.de.push(text);
      } else {
        extractedTexts.unknown.push(text);
      }
    } catch (err) {
      console.log(`     ⚠️  Failed to extract: ${err.message}`);
    }
  }
  
  // Combine texts
  let enText = extractedTexts.en.join('\n\n');
  let deText = extractedTexts.de.join('\n\n');
  
  // If unknown, try to split (assume bilingual document)
  if (extractedTexts.unknown.length > 0 && !enText && !deText) {
    const combined = extractedTexts.unknown.join('\n\n');
    // Simple heuristic: if very long, assume EN is in second half
    if (combined.length > 2000) {
      const mid = Math.floor(combined.length / 2);
      deText = combined.substring(0, mid);
      enText = combined.substring(mid);
    } else {
      enText = combined;
      deText = combined;
    }
  }
  
  // If only one language, use it for both
  if (!enText && deText) enText = deText;
  if (!deText && enText) deText = enText;
  
  // Extract intro (first ~300 chars)
  const enIntro = enText.substring(0, 300).trim() + (enText.length > 300 ? '...' : '');
  const deIntro = deText.substring(0, 300).trim() + (deText.length > 300 ? '...' : '');
  
  // Split into sections
  const enSections = splitIntoSections(enText);
  const deSections = splitIntoSections(deText);
  
  // Update Sanity
  const update = {
    intro: {
      en: textToBlocks(enIntro),
      de: textToBlocks(deIntro)
    },
    section1Text: {
      en: textToBlocks(enSections.section1 || enText),
      de: textToBlocks(deSections.section1 || deText)
    }
  };
  
  // Add section 2-4 if they exist
  if (enSections.section2 && enSections.section2.trim().length > 50) {
    update.section2Text = {
      en: textToBlocks(enSections.section2),
      de: textToBlocks(deSections.section2 || enSections.section2)
    };
  }
  
  if (enSections.section3 && enSections.section3.trim().length > 50) {
    update.section3Text = {
      en: textToBlocks(enSections.section3),
      de: textToBlocks(deSections.section3 || enSections.section3)
    };
  }
  
  if (enSections.section4 && enSections.section4.trim().length > 50) {
    update.section4Text = {
      en: textToBlocks(enSections.section4),
      de: textToBlocks(deSections.section4 || enSections.section4)
    };
  }
  
  await client.patch(article._id).set(update).commit();
  console.log(`  ✅ Updated successfully!`);
  
  return { status: 'success', folder: folderName };
}

// Main function
async function main() {
  console.log('🚀 Processing All Articles with Text Content');
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
    no_docs: 0,
    not_found: 0,
    failed: 0
  };
  
  for (const folder of folders) {
    try {
      const folderPath = path.join(STORIES_DIR, folder);
      const result = await processArticle(folder, folderPath);
      
      if (result.status === 'success') results.success++;
      else if (result.status === 'no_docs') results.no_docs++;
      else if (result.status === 'not_found') results.not_found++;
      
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      results.failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Processing Complete!');
  console.log(`   Success: ${results.success}`);
  console.log(`   No Docs: ${results.no_docs}`);
  console.log(`   Not Found: ${results.not_found}`);
  console.log(`   Failed: ${results.failed}`);
}

main().catch(console.error);

