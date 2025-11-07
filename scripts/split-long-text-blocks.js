import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.bak
const envPath = path.join(__dirname, '..', '.env.bak');
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

// Generate a unique key for Sanity blocks
function generateKey() {
  return Math.random().toString(36).substring(2, 11);
}

// Split a long text block into multiple shorter blocks at sentence boundaries
function splitLongTextBlock(block, numParts) {
  if (!block.children || block.children.length === 0) return [block];
  
  const fullText = block.children.map(c => c.text || '').join('');
  
  // Split at sentence boundaries (. ! ?)
  const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
  
  if (sentences.length <= 1) {
    return [block]; // Can't split further
  }
  
  // Calculate how many sentences per part
  const sentencesPerPart = Math.ceil(sentences.length / numParts);
  const parts = [];
  
  for (let i = 0; i < numParts; i++) {
    const start = i * sentencesPerPart;
    const end = Math.min(start + sentencesPerPart, sentences.length);
    const partSentences = sentences.slice(start, end);
    
    if (partSentences.length > 0) {
      parts.push({
        ...block,
        _key: generateKey(),
        children: [
          {
            _key: generateKey(),
            _type: 'span',
            text: partSentences.join(' '),
            marks: []
          }
        ]
      });
    }
  }
  
  return parts;
}

// Insert image markers and split text to distribute evenly
function splitAndInsertMarkers(portableTextBlocks, imageSections) {
  if (!portableTextBlocks || portableTextBlocks.length === 0) {
    return portableTextBlocks;
  }
  
  if (imageSections.length === 0) {
    return portableTextBlocks;
  }
  
  // Filter out existing imageMarker blocks
  const textBlocks = portableTextBlocks.filter(block => block._type !== 'imageMarker');
  
  if (textBlocks.length === 0) {
    return portableTextBlocks;
  }
  
  // If only 1 text block and multiple images needed, split the text
  if (textBlocks.length === 1 && imageSections.length > 1) {
    const numSections = imageSections.length + 1; // +1 for sections
    const splitBlocks = splitLongTextBlock(textBlocks[0], numSections);
    
    const result = [];
    for (let i = 0; i < splitBlocks.length; i++) {
      result.push(splitBlocks[i]);
      if (i < imageSections.length) {
        result.push({
          _key: generateKey(),
          _type: 'imageMarker',
          reference: `images${imageSections[i]}`
        });
      }
    }
    return result;
  }
  
  // Otherwise, distribute markers evenly among existing text blocks
  const result = [];
  const interval = Math.floor(textBlocks.length / (imageSections.length + 1));
  let imageIndex = 0;
  
  for (let i = 0; i < textBlocks.length; i++) {
    result.push(textBlocks[i]);
    
    const shouldInsert = interval > 0 && (i + 1) % interval === 0 && imageIndex < imageSections.length;
    
    if (shouldInsert) {
      result.push({
        _key: generateKey(),
        _type: 'imageMarker',
        reference: `images${imageSections[imageIndex]}`
      });
      imageIndex++;
    }
  }
  
  // Add remaining markers at the end
  while (imageIndex < imageSections.length) {
    result.push({
      _key: generateKey(),
      _type: 'imageMarker',
      reference: `images${imageSections[imageIndex]}`
    });
    imageIndex++;
  }
  
  return result;
}

// Get image section numbers
function getImageSectionNumbers(article) {
  const sections = [];
  for (let i = 1; i <= 4; i++) {
    const images = article[`section${i}Images`];
    if (images && images.length > 0) {
      sections.push(i);
    }
  }
  return sections;
}

async function splitTextAndDistribute(dryRun = false) {
  console.log('🔍 Fetching all articles from Sanity...\n');
  
  const articles = await client.fetch(
    `*[_type == "article"] | order(creatorName asc) {
      _id,
      creatorName,
      "titleEn": title.en,
      fullText,
      section1Images,
      section2Images,
      section3Images,
      section4Images
    }`
  );
  
  console.log(`📊 Found ${articles.length} articles\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    const displayName = article.creatorName || article.titleEn || article._id;
    
    const imageSections = getImageSectionNumbers(article);
    const hasText = article.fullText?.en?.length > 0 || article.fullText?.de?.length > 0;
    
    if (imageSections.length === 0 || !hasText) {
      console.log(`  ⏭️  ${displayName} - No images or no text, skipping`);
      skipped++;
      continue;
    }
    
    const enText = article.fullText?.en || [];
    const deText = article.fullText?.de || [];
    
    const newEnText = splitAndInsertMarkers(enText, imageSections);
    const newDeText = splitAndInsertMarkers(deText, imageSections);
    
    const enChanged = JSON.stringify(enText) !== JSON.stringify(newEnText);
    const deChanged = JSON.stringify(deText) !== JSON.stringify(newDeText);
    
    if (enChanged || deChanged) {
      const enBlocks = enText.filter(b => b._type === 'block').length;
      const newEnBlocks = newEnText.filter(b => b._type === 'block').length;
      console.log(`  ✅ ${displayName} - Split ${enBlocks} → ${newEnBlocks} text blocks, ${imageSections.length} images`);
      
      if (!dryRun) {
        const updates = {};
        if (enChanged) updates['fullText.en'] = newEnText;
        if (deChanged) updates['fullText.de'] = newDeText;
        
        await client
          .patch(article._id)
          .set(updates)
          .commit();
      }
      
      updated++;
    } else {
      skipped++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('Run without --dry-run to apply changes');
  }
}

const dryRun = process.argv.includes('--dry-run');
splitTextAndDistribute(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

