const fs = require('fs');
const path = require('path');
const sanityClient = require('@sanity/client');
require('dotenv').config({ path: '../.env.bak' });

const client = sanityClient.createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

const CONTENT_DIR = path.join(__dirname, '..', 'Content', 'WEBSITE_STORIES');

// Extract credits from text
function extractCredits(text) {
  const credits = {
    authors: [],
    photographers: []
  };
  
  // Look for the specific pattern: "Text: Name Photos: Name" or "Photos: Name Text: Name"
  // Names should be relatively short (2-5 words max)
  
  // Match: Text: [1-5 words]
  const textMatch = text.match(/Text:\s*([A-Z][a-zA-ZäöüÄÖÜß\-'\s]{1,50})(?=\s*(?:Photos?|Foto):|$)/i);
  
  // Match: Photos/Foto/Fotografie: [1-5 words, can have commas for multiple names]
  const photoMatch = text.match(/(?:Photos?|Foto(?:s|grafie)?):\s*([A-Z][a-zA-ZäöüÄÖÜß\-',\s]{1,100})(?=\s*Text:|$)/i);
  
  if (textMatch) {
    const rawText = textMatch[1].trim();
    // Only accept if it looks like a name (2-5 words, no weird characters)
    if (rawText.split(/\s+/).length <= 5 && !rawText.match(/[.!?;]/)) {
      const names = rawText.split(/,/).map(n => n.trim()).filter(Boolean);
      credits.authors.push(...names);
    }
  }
  
  if (photoMatch) {
    const rawText = photoMatch[1].trim();
    // Can have multiple photographers separated by comma
    const names = rawText.split(/,/).map(n => n.trim()).filter(n => {
      const words = n.split(/\s+/).length;
      return words >= 2 && words <= 5 && !n.match(/[.!?;]/);
    });
    credits.photographers.push(...names);
  }
  
  return credits;
}

// Scan all source files
async function scanAllFiles() {
  console.log('🔍 Scanning source files for credits...\n');
  
  const allAuthors = new Set();
  const allPhotographers = new Set();
  const articleCredits = {}; // folder -> credits
  
  const folders = fs.readdirSync(CONTENT_DIR).filter(f => {
    const fullPath = path.join(CONTENT_DIR, f);
    return fs.statSync(fullPath).isDirectory();
  });
  
  for (const folder of folders) {
    const folderPath = path.join(CONTENT_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.txt'));
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const credits = extractCredits(content);
      
      if (credits.authors.length > 0 || credits.photographers.length > 0) {
        console.log(`📄 ${folder}/${file}`);
        if (credits.authors.length > 0) {
          console.log(`   ✍️  Authors: ${credits.authors.join(', ')}`);
          credits.authors.forEach(a => allAuthors.add(a));
        }
        if (credits.photographers.length > 0) {
          console.log(`   📷 Photographers: ${credits.photographers.join(', ')}`);
          credits.photographers.forEach(p => allPhotographers.add(p));
        }
        
        // Store for article linking
        if (!articleCredits[folder]) {
          articleCredits[folder] = { authors: new Set(), photographers: new Set() };
        }
        credits.authors.forEach(a => articleCredits[folder].authors.add(a));
        credits.photographers.forEach(p => articleCredits[folder].photographers.add(p));
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   ✍️  Unique authors: ${allAuthors.size}`);
  console.log(`   📷 Unique photographers: ${allPhotographers.size}`);
  console.log('='.repeat(60));
  
  return {
    authors: Array.from(allAuthors).sort(),
    photographers: Array.from(allPhotographers).sort(),
    articleCredits
  };
}

// Create authors in Sanity
async function createAuthors(names) {
  console.log('\n✍️  Creating authors in Sanity...');
  const created = [];
  
  for (const name of names) {
    try {
      const doc = await client.create({
        _type: 'author',
        name: {
          en: name,
          de: name
        },
        slug: {
          _type: 'slug',
          current: name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        }
      });
      console.log(`   ✅ Created: ${name} (${doc._id})`);
      created.push({ name, id: doc._id });
    } catch (err) {
      console.log(`   ❌ Failed: ${name} - ${err.message}`);
    }
  }
  
  return created;
}

// Create photographers in Sanity
async function createPhotographers(names) {
  console.log('\n📷 Creating photographers in Sanity...');
  const created = [];
  
  for (const name of names) {
    try {
      const doc = await client.create({
        _type: 'photographer',
        name: {
          en: name,
          de: name
        },
        slug: {
          _type: 'slug',
          current: name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        }
      });
      console.log(`   ✅ Created: ${name} (${doc._id})`);
      created.push({ name, id: doc._id });
    } catch (err) {
      console.log(`   ❌ Failed: ${name} - ${err.message}`);
    }
  }
  
  return created;
}

// Link credits to articles
async function linkCreditsToArticles(articleCredits, authorMap, photographerMap) {
  console.log('\n🔗 Linking credits to articles...');
  
  // Get all articles
  const articles = await client.fetch(`
    *[_type == "article"] {
      _id,
      creatorName,
      slug,
      authors,
      photographers
    }
  `);
  
  let linked = 0;
  
  for (const article of articles) {
    const slug = article.slug?.current || '';
    
    // Try to match by slug to folder name
    const matchingFolder = Object.keys(articleCredits).find(folder => {
      const folderLower = folder.toLowerCase();
      const slugLower = slug.toLowerCase();
      return folderLower.includes(slugLower) || slugLower.includes(folderLower);
    });
    
    if (!matchingFolder) continue;
    
    const credits = articleCredits[matchingFolder];
    const authorIds = [];
    const photographerIds = [];
    
    // Map names to IDs
    credits.authors.forEach(name => {
      const match = authorMap.find(a => a.name === name);
      if (match) authorIds.push({ _type: 'reference', _ref: match.id, _key: match.id });
    });
    
    credits.photographers.forEach(name => {
      const match = photographerMap.find(p => p.name === name);
      if (match) photographerIds.push({ _type: 'reference', _ref: match.id, _key: match.id });
    });
    
    if (authorIds.length > 0 || photographerIds.length > 0) {
      const updates = {};
      if (authorIds.length > 0) updates.authors = authorIds;
      if (photographerIds.length > 0) updates.photographers = photographerIds;
      
      await client.patch(article._id).set(updates).commit();
      
      console.log(`   ✅ ${article.creatorName || article._id}`);
      if (authorIds.length > 0) {
        console.log(`      ✍️  Authors: ${Array.from(credits.authors).join(', ')}`);
      }
      if (photographerIds.length > 0) {
        console.log(`      📷 Photographers: ${Array.from(credits.photographers).join(', ')}`);
      }
      linked++;
    }
  }
  
  console.log(`\n📊 Linked ${linked} articles`);
}

// Main
async function main() {
  console.log('🚀 Starting author/photographer extraction and linking...\n');
  
  // Step 1: Scan files
  const { authors, photographers, articleCredits } = await scanAllFiles();
  
  if (authors.length === 0 && photographers.length === 0) {
    console.log('\n⚠️  No credits found in source files.');
    return;
  }
  
  // Step 2: Create in Sanity
  const authorMap = await createAuthors(authors);
  const photographerMap = await createPhotographers(photographers);
  
  // Step 3: Link to articles
  await linkCreditsToArticles(articleCredits, authorMap, photographerMap);
  
  console.log('\n✅ Complete!');
}

main().catch(console.error);

