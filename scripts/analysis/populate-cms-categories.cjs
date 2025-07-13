const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');

// Initialize Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_TOKEN // Set in environment
});

// Read the cleaned analysis results
const analysisPath = path.join(__dirname, 'cleaned-materials-mediums-finishes-analysis.txt');
const analysisContent = fs.readFileSync(analysisPath, 'utf8');

// Parse the analysis file
function parseAnalysisFile(content) {
  const sections = content.split('=== ')[1].split('===');
  const results = { materials: [], mediums: [], finishes: [] };
  
  let currentSection = '';
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '=== MATERIALS ===') {
      currentSection = 'materials';
      continue;
    } else if (line === '=== MEDIUMS ===') {
      currentSection = 'mediums';
      continue;
    } else if (line === '=== FINISHES ===') {
      currentSection = 'finishes';
      continue;
    }
    
    // Parse term lines (format: "term count")
    if (currentSection && line && !line.startsWith('Found') && !line.startsWith('=')) {
      const match = line.match(/^(.+?)\s+(\d+)$/);
      if (match) {
        const [, term, count] = match;
        results[currentSection].push({ term: term.trim(), count: parseInt(count) });
      }
    }
  }
  
  return results;
}

// Create slug from term
function createSlug(term) {
  return term.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Create documents for each category
async function populateCategories() {
  try {
    const data = parseAnalysisFile(analysisContent);
    
    console.log('🔄 Populating Sanity CMS with categories...');
    
    // Populate Materials
    console.log('\n📦 Creating materials...');
    for (const [index, { term, count }] of data.materials.entries()) {
      const doc = {
        _type: 'material',
        name: {
          en: term,
          de: term // Could be enhanced with German translations
        },
        slug: createSlug(term),
        description: {
          en: `Material found in ${count} artworks`,
          de: `Material in ${count} Kunstwerken gefunden`
        },
        sortOrder: index + 1,
        usageCount: count
      };
      
      const result = await client.create(doc);
      console.log(`✅ Created material: ${term} (${count} usages)`);
    }
    
    // Populate Mediums
    console.log('\n🎨 Creating mediums...');
    for (const [index, { term, count }] of data.mediums.entries()) {
      const doc = {
        _type: 'medium',
        name: {
          en: term,
          de: term // Could be enhanced with German translations
        },
        slug: createSlug(term),
        description: {
          en: `Medium found in ${count} artworks`,
          de: `Medium in ${count} Kunstwerken gefunden`
        },
        sortOrder: index + 1,
        usageCount: count
      };
      
      const result = await client.create(doc);
      console.log(`✅ Created medium: ${term} (${count} usages)`);
    }
    
    // Populate Finishes
    console.log('\n🔧 Creating finishes...');
    for (const [index, { term, count }] of data.finishes.entries()) {
      const doc = {
        _type: 'finish',
        name: {
          en: term,
          de: term // Could be enhanced with German translations
        },
        slug: createSlug(term),
        description: {
          en: `Finish found in ${count} artworks`,
          de: `Oberflächenbehandlung in ${count} Kunstwerken gefunden`
        },
        sortOrder: index + 1,
        usageCount: count
      };
      
      const result = await client.create(doc);
      console.log(`✅ Created finish: ${term} (${count} usages)`);
    }
    
    console.log('\n🎉 Successfully populated all categories!');
    console.log(`📊 Summary:`);
    console.log(`   Materials: ${data.materials.length}`);
    console.log(`   Mediums: ${data.mediums.length}`);
    console.log(`   Finishes: ${data.finishes.length}`);
    
  } catch (error) {
    console.error('❌ Error populating categories:', error);
  }
}

// Run the population
populateCategories(); 