const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');
const crypto = require('crypto');

// Helper to generate unique key
function generateKey() {
  return crypto.randomBytes(8).toString('hex');
}

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

const STORIES_DIR = '/Users/florian.ludwig/Documents/aa_scan/Content/WEBSITE_STORIES';

// Helper to generate slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to parse folder name to article name
function parseArticleName(folderName) {
  // Example: "2020_AA39_FULLE_KARL" -> "Karl Fulle"
  const parts = folderName.split('_');
  if (parts.length >= 3) {
    // Get name parts (everything after year_issue, starting at index 2)
    const nameParts = parts.slice(2);
    // Reverse and capitalize: FULLE_KARL -> Karl Fulle
    return nameParts.reverse()
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ');
  }
  return folderName;
}

// Helper to detect if file is English or German
function detectLanguage(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('_en') || lower.includes('_eng') || lower.includes('engl')) {
    return 'en';
  }
  if (lower.includes('_de') || lower.includes('_dt') || lower.includes('deutsch')) {
    return 'de';
  }
  // Default: try to parse content or use as both
  return 'unknown';
}

// Find all images in folder
function findImages(folderPath) {
  const images = [];
  const imageDirs = ['BILDER', '_BILDER', '_BILDER_SELECTION', '_BILDER_AUSWAHL', 'BILDER_SELECTION'];
  
  for (const dir of imageDirs) {
    const imageDir = path.join(folderPath, dir);
    if (fs.existsSync(imageDir)) {
      const files = fs.readdirSync(imageDir);
      files.forEach(file => {
        if (/\.(jpg|jpeg|png|tif|tiff)$/i.test(file)) {
          images.push(path.join(imageDir, file));
        }
      });
    }
  }
  
  // Also check root folder for images
  if (images.length === 0) {
    const files = fs.readdirSync(folderPath);
    files.forEach(file => {
      if (/\.(jpg|jpeg|png|tif|tiff)$/i.test(file)) {
        images.push(path.join(folderPath, file));
      }
    });
  }
  
  return images;
}

// Find text documents
function findTextDocuments(folderPath) {
  const docs = [];
  const files = fs.readdirSync(folderPath);
  
  files.forEach(file => {
    if (/\.(doc|docx|odt|pdf|rtf|txt)$/i.test(file)) {
      const lang = detectLanguage(file);
      docs.push({
        path: path.join(folderPath, file),
        filename: file,
        language: lang
      });
    }
  });
  
  return docs;
}

// Upload image to Sanity
async function uploadImageToSanity(imagePath, articleName) {
  try {
    console.log(`  📤 Uploading: ${path.basename(imagePath)}`);
    const imageBuffer = fs.readFileSync(imagePath);
    const filename = path.basename(imagePath);
    
    const asset = await client.assets.upload('image', imageBuffer, {
      filename: filename,
      title: `${articleName} - ${filename}`
    });
    
    return asset._id;
  } catch (error) {
    console.error(`  ❌ Failed to upload ${path.basename(imagePath)}:`, error.message);
    return null;
  }
}

// Distribute images across sections
function distributeImages(imageAssetIds) {
  const distribution = {
    hero: null,
    section1: [],
    section2: [],
    section3: [],
    section4: [],
    sectionFinal: null
  };
  
  if (imageAssetIds.length === 0) return distribution;
  
  // 1st image -> hero
  distribution.hero = imageAssetIds[0];
  
  if (imageAssetIds.length === 1) return distribution;
  
  // Last image -> section final
  distribution.sectionFinal = imageAssetIds[imageAssetIds.length - 1];
  
  if (imageAssetIds.length === 2) return distribution;
  
  // Rest -> distribute equally across sections 1-4
  const remaining = imageAssetIds.slice(1, -1);
  const perSection = Math.ceil(remaining.length / 4);
  
  for (let i = 0; i < remaining.length; i++) {
    const sectionNum = Math.floor(i / perSection) + 1;
    if (sectionNum <= 4) {
      distribution[`section${sectionNum}`].push(remaining[i]);
    }
  }
  
  return distribution;
}

// Get layout based on number of images
function getLayout(imageCount) {
  if (imageCount === 0 || imageCount === 1) return 'Small';
  if (imageCount <= 3) return 'Main';
  return 'Full';
}

// Create article in Sanity
async function createArticle(folderName, folderPath) {
  console.log(`\n📝 Processing: ${folderName}`);
  
  const articleName = parseArticleName(folderName);
  const slug = generateSlug(articleName);
  console.log(`  📄 Article name: ${articleName}`);
  
  // Check if article already exists
  const existing = await client.fetch(
    `*[_type == "article" && slug.current == $slug][0]`,
    { slug }
  );
  
  if (existing) {
    console.log(`  ⏭️  SKIPPED: Article already exists (${existing._id})`);
    return existing;
  }
  
  // Find images
  const imagePaths = findImages(folderPath);
  console.log(`  🖼️  Found ${imagePaths.length} images`);
  
  // Find text documents
  const textDocs = findTextDocuments(folderPath);
  console.log(`  📋 Found ${textDocs.length} text documents`);
  textDocs.forEach(doc => {
    console.log(`     - ${doc.filename} (${doc.language})`);
  });
  
  // Upload images
  const imageAssetIds = [];
  for (const imagePath of imagePaths) {
    const assetId = await uploadImageToSanity(imagePath, articleName);
    if (assetId) {
      imageAssetIds.push(assetId);
    }
  }
  
  console.log(`  ✅ Uploaded ${imageAssetIds.length} images`);
  
  // Distribute images
  const distribution = distributeImages(imageAssetIds);
  
  // Create article document
  const articleDoc = {
    _type: 'article',
    name: {
      en: articleName,
      de: articleName // TODO: Add German translation if available
    },
    slug: {
      _type: 'slug',
      current: slug
    },
    date: new Date().toISOString(),
    
    // Hero section
    heroImage: distribution.hero ? {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: distribution.hero
      },
      alt: {
        en: articleName,
        de: articleName
      }
    } : undefined,
    
    heroHeadline: {
      en: [{
        _key: generateKey(),
        _type: 'block',
        children: [{_key: generateKey(), _type: 'span', text: articleName}],
        markDefs: [],
        style: 'normal'
      }],
      de: [{
        _key: generateKey(),
        _type: 'block',
        children: [{_key: generateKey(), _type: 'span', text: articleName}],
        markDefs: [],
        style: 'normal'
      }]
    },
    
    intro: {
      en: [{
        _key: generateKey(),
        _type: 'block',
        children: [{_key: generateKey(), _type: 'span', text: `Article about ${articleName}. Content to be added.`}],
        markDefs: [],
        style: 'normal'
      }],
      de: [{
        _key: generateKey(),
        _type: 'block',
        children: [{_key: generateKey(), _type: 'span', text: `Artikel über ${articleName}. Inhalt wird hinzugefügt.`}],
        markDefs: [],
        style: 'normal'
      }]
    },
    
    // Sections with images
    ...(distribution.section1.length > 0 ? {
      section1Images: distribution.section1.map(assetId => ({
        _key: generateKey(),
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: assetId
        },
        alt: { en: articleName, de: articleName }
      })),
      section1Layout: getLayout(distribution.section1.length),
      section1Text: {
        en: [{
          _key: generateKey(),
          _type: 'block',
          children: [{_key: generateKey(), _type: 'span', text: 'Section 1 content to be added from documents.'}],
          markDefs: [],
          style: 'normal'
        }],
        de: [{
          _key: generateKey(),
          _type: 'block',
          children: [{_key: generateKey(), _type: 'span', text: 'Abschnitt 1 Inhalt wird hinzugefügt.'}],
          markDefs: [],
          style: 'normal'
        }]
      }
    } : {}),
    
    ...(distribution.section2.length > 0 ? {
      section2Images: distribution.section2.map(assetId => ({
        _key: generateKey(),
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: assetId
        },
        alt: { en: articleName, de: articleName }
      })),
      section2Layout: getLayout(distribution.section2.length),
      section2Text: {
        en: [{
          _key: generateKey(),
          _type: 'block',
          children: [{_key: generateKey(), _type: 'span', text: 'Section 2 content to be added.'}],
          markDefs: [],
          style: 'normal'
        }],
        de: [{
          _key: generateKey(),
          _type: 'block',
          children: [{_key: generateKey(), _type: 'span', text: 'Abschnitt 2 Inhalt wird hinzugefügt.'}],
          markDefs: [],
          style: 'normal'
        }]
      }
    } : {}),
    
    ...(distribution.section3.length > 0 ? {
      section3Images: distribution.section3.map(assetId => ({
        _key: generateKey(),
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: assetId
        },
        alt: { en: articleName, de: articleName }
      })),
      section3Layout: getLayout(distribution.section3.length),
      section3Text: {
        en: [{
          _key: generateKey(),
          _type: 'block',
          children: [{_key: generateKey(), _type: 'span', text: 'Section 3 content to be added.'}],
          markDefs: [],
          style: 'normal'
        }],
        de: [{
          _key: generateKey(),
          _type: 'block',
          children: [{_key: generateKey(), _type: 'span', text: 'Abschnitt 3 Inhalt wird hinzugefügt.'}],
          markDefs: [],
          style: 'normal'
        }]
      }
    } : {}),
    
    ...(distribution.section4.length > 0 ? {
      section4Images: distribution.section4.map(assetId => ({
        _key: generateKey(),
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: assetId
        },
        alt: { en: articleName, de: articleName }
      })),
      section4Layout: getLayout(distribution.section4.length),
      section4Text: {
        en: [{
          _key: generateKey(),
          _type: 'block',
          children: [{_key: generateKey(), _type: 'span', text: 'Section 4 content to be added.'}],
          markDefs: [],
          style: 'normal'
        }],
        de: [{
          _key: generateKey(),
          _type: 'block',
          children: [{_key: generateKey(), _type: 'span', text: 'Abschnitt 4 Inhalt wird hinzugefügt.'}],
          markDefs: [],
          style: 'normal'
        }]
      }
    } : {}),
    
    // Final section
    ...(distribution.sectionFinal ? {
      sectionFinalImage1: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: distribution.sectionFinal
        },
        alt: { en: articleName, de: articleName }
      }
    } : {})
  };
  
  // Create in Sanity
  const result = await client.create(articleDoc);
  console.log(`  ✅ Created article: ${result._id}`);
  
  return result;
}

// Main function
async function main() {
  const testMode = process.argv.includes('--test');
  const limit = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  
  console.log('🚀 Importing Articles from WEBSITE_STORIES');
  if (testMode) console.log('   [TEST MODE: First folder only]');
  if (limit) console.log(`   [LIMIT: ${limit} folders]`);
  console.log('='.repeat(60));
  
  let folders = fs.readdirSync(STORIES_DIR)
    .filter(f => {
      const fullPath = path.join(STORIES_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort(); // Sort alphabetically
  
  if (testMode) {
    folders = folders.slice(0, 1);
  } else if (limit) {
    folders = folders.slice(0, parseInt(limit));
  }
  
  console.log(`\n📁 Found ${folders.length} article folder(s) to process\n`);
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const folder of folders) {
    try {
      const folderPath = path.join(STORIES_DIR, folder);
      const result = await createArticle(folder, folderPath);
      
      // Check if it was newly created or skipped
      if (result && result._createdAt) {
        const createdDate = new Date(result._createdAt);
        const now = new Date();
        const isNew = (now - createdDate) < 60000; // Created in last minute
        
        if (isNew) {
          created++;
        } else {
          skipped++;
        }
      }
    } catch (error) {
      console.error(`❌ Failed to create article from ${folder}:`, error.message);
      console.error(error.stack);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Import complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
}

// Run
main().catch(console.error);

