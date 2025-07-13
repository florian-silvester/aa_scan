import fs from 'fs';
import path from 'path';

// Helper function to convert plain text to Sanity blocks (rich text format)
function textToBlocks(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Split by newlines and create paragraphs
  const paragraphs = text.split('\n').filter(para => para.trim().length > 0);
  
  return paragraphs.map(paragraph => ({
    _type: 'block',
    _key: `block_${Math.random().toString(36).substr(2, 9)}`,
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `span_${Math.random().toString(36).substr(2, 9)}`,
        text: paragraph.trim(),
        marks: []
      }
    ]
  }));
}

// Helper function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

async function convertBiographiesToNDJSON() {
  console.log('🔄 Converting biographical data to NDJSON format...');
  
  // Read the biographical data
  const biographyPath = path.join('..', 'profile-biographies-2025-07-10.json');
  
  if (!fs.existsSync(biographyPath)) {
    console.error('❌ Biography file not found:', biographyPath);
    return;
  }
  
  const biographyData = JSON.parse(fs.readFileSync(biographyPath, 'utf8'));
  console.log(`📚 Found ${biographyData.length} creators with biographical data`);
  
  const ndjsonLines = [];
  
  for (const creator of biographyData) {
    const document = {
      _type: 'creator',
      _id: `creator-${createSlug(creator.name)}`,
      name: creator.name,
      slug: {
        _type: 'slug',
        current: createSlug(creator.name)
      },
      // Add bilingual biographical data
      biography: {
        en: textToBlocks(creator.biography?.en || ''),
        de: textToBlocks(creator.biography?.de || '')
      },
      portrait: {
        en: textToBlocks(creator.portrait?.en || ''),
        de: textToBlocks(creator.portrait?.de || '')
      },
      // Add source URLs for reference
      sourceUrls: {
        en: creator.sourceUrls?.en || '',
        de: creator.sourceUrls?.de || ''
      }
    };
    
    ndjsonLines.push(JSON.stringify(document));
  }
  
  // Write NDJSON file
  const outputPath = 'creators-import.ndjson';
  fs.writeFileSync(outputPath, ndjsonLines.join('\n'));
  
  console.log(`✅ Created NDJSON file: ${outputPath}`);
  console.log(`📊 ${ndjsonLines.length} creator documents ready for import`);
  console.log('');
  console.log('🚀 Now run: sanity dataset import creators-import.ndjson');
}

// Run the conversion
convertBiographiesToNDJSON().catch(console.error); 