const fs = require('fs');
const path = require('path');

// Load the artwork captions data
const captionsPath = path.join(__dirname, '../../../archive/migration-data/artwork-captions-2025-07-10.json');
const captionsData = JSON.parse(fs.readFileSync(captionsPath, 'utf8'));

console.log(`📊 Analyzing ${captionsData.length} artwork records...`);

// Materials we're looking for (with both English and German terms)
const materialPatterns = [
  // Metals
  { terms: ['silver', 'silber', 'ag'], type: 'Metals', material: 'Silver' },
  { terms: ['gold', 'au'], type: 'Metals', material: 'Gold' },
  { terms: ['copper', 'kupfer', 'cu'], type: 'Metals', material: 'Copper' },
  { terms: ['brass', 'messing'], type: 'Metals', material: 'Brass' },
  { terms: ['bronze'], type: 'Metals', material: 'Bronze' },
  { terms: ['steel', 'stahl'], type: 'Metals', material: 'Steel' },
  { terms: ['iron', 'eisen'], type: 'Metals', material: 'Iron' },
  { terms: ['titanium', 'titan'], type: 'Metals', material: 'Titanium' },
  { terms: ['aluminium', 'aluminum'], type: 'Metals', material: 'Aluminum' },
  { terms: ['platinum', 'platin'], type: 'Metals', material: 'Platinum' },
  { terms: ['nickel'], type: 'Metals', material: 'Nickel' },
  { terms: ['tin', 'zinn'], type: 'Metals', material: 'Tin' },
  { terms: ['lead', 'blei'], type: 'Metals', material: 'Lead' },
  { terms: ['pewter', 'zinn'], type: 'Metals', material: 'Pewter' },
  { terms: ['metall', 'metal'], type: 'Metals', material: 'Metal (unspecified)' },
  
  // Stones & Minerals
  { terms: ['diamond', 'diamant'], type: 'Stones & Minerals', material: 'Diamond' },
  { terms: ['ruby', 'rubin'], type: 'Stones & Minerals', material: 'Ruby' },
  { terms: ['sapphire', 'saphir'], type: 'Stones & Minerals', material: 'Sapphire' },
  { terms: ['emerald', 'smaragd'], type: 'Stones & Minerals', material: 'Emerald' },
  { terms: ['pearl', 'perle'], type: 'Stones & Minerals', material: 'Pearl' },
  { terms: ['quartz', 'quarz'], type: 'Stones & Minerals', material: 'Quartz' },
  { terms: ['crystal', 'kristall'], type: 'Stones & Minerals', material: 'Crystal' },
  { terms: ['agate', 'achat'], type: 'Stones & Minerals', material: 'Agate' },
  { terms: ['jade'], type: 'Stones & Minerals', material: 'Jade' },
  { terms: ['onyx'], type: 'Stones & Minerals', material: 'Onyx' },
  { terms: ['turquoise', 'türkis'], type: 'Stones & Minerals', material: 'Turquoise' },
  { terms: ['garnet', 'granat'], type: 'Stones & Minerals', material: 'Garnet' },
  { terms: ['amethyst'], type: 'Stones & Minerals', material: 'Amethyst' },
  { terms: ['opal'], type: 'Stones & Minerals', material: 'Opal' },
  { terms: ['moonstone', 'mondstein'], type: 'Stones & Minerals', material: 'Moonstone' },
  { terms: ['stone', 'stein'], type: 'Stones & Minerals', material: 'Stone (unspecified)' },
  
  // Organic Materials
  { terms: ['wood', 'holz'], type: 'Organic', material: 'Wood' },
  { terms: ['leather', 'leder'], type: 'Organic', material: 'Leather' },
  { terms: ['bone', 'knochen'], type: 'Organic', material: 'Bone' },
  { terms: ['horn'], type: 'Organic', material: 'Horn' },
  { terms: ['ivory', 'elfenbein'], type: 'Organic', material: 'Ivory' },
  { terms: ['coral', 'koralle'], type: 'Organic', material: 'Coral' },
  { terms: ['shell', 'muschel'], type: 'Organic', material: 'Shell' },
  { terms: ['amber', 'bernstein'], type: 'Organic', material: 'Amber' },
  { terms: ['cotton', 'baumwolle'], type: 'Organic', material: 'Cotton' },
  { terms: ['silk', 'seide'], type: 'Organic', material: 'Silk' },
  { terms: ['wool', 'wolle'], type: 'Organic', material: 'Wool' },
  { terms: ['linen', 'leinen'], type: 'Organic', material: 'Linen' },
  { terms: ['hemp', 'hanf'], type: 'Organic', material: 'Hemp' },
  { terms: ['paper', 'papier'], type: 'Organic', material: 'Paper' },
  { terms: ['cardboard', 'karton'], type: 'Organic', material: 'Cardboard' },
  
  // Ceramics & Glass
  { terms: ['ceramic', 'keramik'], type: 'Ceramics & Glass', material: 'Ceramic' },
  { terms: ['porcelain', 'porzellan'], type: 'Ceramics & Glass', material: 'Porcelain' },
  { terms: ['clay', 'ton'], type: 'Ceramics & Glass', material: 'Clay' },
  { terms: ['glass', 'glas'], type: 'Ceramics & Glass', material: 'Glass' },
  { terms: ['crystal', 'kristall'], type: 'Ceramics & Glass', material: 'Crystal Glass' },
  { terms: ['enamel', 'email'], type: 'Ceramics & Glass', material: 'Enamel' },
  
  // Textiles
  { terms: ['fabric', 'stoff'], type: 'Textiles', material: 'Fabric' },
  { terms: ['textile', 'textil'], type: 'Textiles', material: 'Textile' },
  { terms: ['canvas', 'leinwand'], type: 'Textiles', material: 'Canvas' },
  { terms: ['felt', 'filz'], type: 'Textiles', material: 'Felt' },
  { terms: ['velvet', 'samt'], type: 'Textiles', material: 'Velvet' },
  
  // Synthetic Materials
  { terms: ['plastic', 'plastik'], type: 'Synthetic', material: 'Plastic' },
  { terms: ['resin', 'harz'], type: 'Synthetic', material: 'Resin' },
  { terms: ['acrylic', 'acryl'], type: 'Synthetic', material: 'Acrylic' },
  { terms: ['rubber', 'gummi'], type: 'Synthetic', material: 'Rubber' },
  { terms: ['vinyl'], type: 'Synthetic', material: 'Vinyl' },
  { terms: ['nylon'], type: 'Synthetic', material: 'Nylon' },
  { terms: ['polyester'], type: 'Synthetic', material: 'Polyester' },
  { terms: ['fiberglass', 'fiberglas'], type: 'Synthetic', material: 'Fiberglass' },
  
  // Treatments/Finishes
  { terms: ['painted', 'bemalt', 'lackiert'], type: 'Treatments', material: 'Painted' },
  { terms: ['gilded', 'vergoldet'], type: 'Treatments', material: 'Gilded' },
  { terms: ['oxidized', 'oxidiert'], type: 'Treatments', material: 'Oxidized' },
  { terms: ['patina'], type: 'Treatments', material: 'Patina' },
  { terms: ['polished', 'poliert'], type: 'Treatments', material: 'Polished' },
  { terms: ['matte', 'matt'], type: 'Treatments', material: 'Matte Finish' },
  { terms: ['glossy', 'glänzend'], type: 'Treatments', material: 'Glossy Finish' },
  { terms: ['textured', 'texturiert'], type: 'Treatments', material: 'Textured' },
];

// Medium patterns (both English and German)
const mediumPatterns = [
  // Jewelry
  { terms: ['ring', 'ringe'], type: 'Jewelry', medium: 'Ring' },
  { terms: ['necklace', 'kette', 'halskette'], type: 'Jewelry', medium: 'Necklace' },
  { terms: ['bracelet', 'armband'], type: 'Jewelry', medium: 'Bracelet' },
  { terms: ['earrings', 'ohrringe'], type: 'Jewelry', medium: 'Earrings' },
  { terms: ['brooch', 'brosche'], type: 'Jewelry', medium: 'Brooch' },
  { terms: ['pendant', 'anhänger'], type: 'Jewelry', medium: 'Pendant' },
  { terms: ['bangle', 'armreif'], type: 'Jewelry', medium: 'Bangle' },
  { terms: ['cufflinks', 'manschettenknöpfe'], type: 'Jewelry', medium: 'Cufflinks' },
  { terms: ['stick pin', 'anstecknadel'], type: 'Jewelry', medium: 'Stick Pin' },
  { terms: ['hoop earrings', 'creolen'], type: 'Jewelry', medium: 'Hoop Earrings' },
  { terms: ['earstuds', 'ohrstecker'], type: 'Jewelry', medium: 'Earstuds' },
  { terms: ['chain', 'kette'], type: 'Jewelry', medium: 'Chain' },
  { terms: ['choker'], type: 'Jewelry', medium: 'Choker' },
  { terms: ['tiara', 'diadem'], type: 'Jewelry', medium: 'Tiara' },
  { terms: ['crown', 'krone'], type: 'Jewelry', medium: 'Crown' },
  
  // Vessels & Containers
  { terms: ['vase', 'vase'], type: 'Vessels', medium: 'Vase' },
  { terms: ['bowl', 'schale'], type: 'Vessels', medium: 'Bowl' },
  { terms: ['cup', 'tasse'], type: 'Vessels', medium: 'Cup' },
  { terms: ['mug', 'becher'], type: 'Vessels', medium: 'Mug' },
  { terms: ['vessel', 'gefäß'], type: 'Vessels', medium: 'Vessel' },
  { terms: ['can', 'dose'], type: 'Vessels', medium: 'Can' },
  { terms: ['jar', 'glas'], type: 'Vessels', medium: 'Jar' },
  { terms: ['bottle', 'flasche'], type: 'Vessels', medium: 'Bottle' },
  { terms: ['teapot', 'teekanne'], type: 'Vessels', medium: 'Teapot' },
  { terms: ['coffee pot', 'kaffeekanne'], type: 'Vessels', medium: 'Coffee Pot' },
  { terms: ['pitcher', 'krug'], type: 'Vessels', medium: 'Pitcher' },
  { terms: ['jug', 'krug'], type: 'Vessels', medium: 'Jug' },
  { terms: ['plate', 'teller'], type: 'Vessels', medium: 'Plate' },
  { terms: ['dish', 'schüssel'], type: 'Vessels', medium: 'Dish' },
  { terms: ['platter', 'platte'], type: 'Vessels', medium: 'Platter' },
  
  // Furniture
  { terms: ['chair', 'stuhl'], type: 'Furniture', medium: 'Chair' },
  { terms: ['table', 'tisch'], type: 'Furniture', medium: 'Table' },
  { terms: ['stool', 'hocker'], type: 'Furniture', medium: 'Stool' },
  { terms: ['bench', 'bank'], type: 'Furniture', medium: 'Bench' },
  { terms: ['cabinet', 'schrank'], type: 'Furniture', medium: 'Cabinet' },
  { terms: ['shelf', 'regal'], type: 'Furniture', medium: 'Shelf' },
  { terms: ['desk', 'schreibtisch'], type: 'Furniture', medium: 'Desk' },
  { terms: ['bed', 'bett'], type: 'Furniture', medium: 'Bed' },
  { terms: ['sofa', 'sofa'], type: 'Furniture', medium: 'Sofa' },
  { terms: ['armchair', 'sessel'], type: 'Furniture', medium: 'Armchair' },
  
  // Lighting
  { terms: ['lamp', 'lampe'], type: 'Lighting', medium: 'Lamp' },
  { terms: ['light', 'licht'], type: 'Lighting', medium: 'Light' },
  { terms: ['chandelier', 'kronleuchter'], type: 'Lighting', medium: 'Chandelier' },
  { terms: ['candle', 'kerze'], type: 'Lighting', medium: 'Candle' },
  { terms: ['candlestick', 'kerzenständer'], type: 'Lighting', medium: 'Candlestick' },
  { terms: ['candle holder', 'kerzenhalter'], type: 'Lighting', medium: 'Candle Holder' },
  { terms: ['lantern', 'laterne'], type: 'Lighting', medium: 'Lantern' },
  { terms: ['sconce', 'wandleuchte'], type: 'Lighting', medium: 'Sconce' },
  
  // Art Objects
  { terms: ['sculpture', 'skulptur'], type: 'Art Objects', medium: 'Sculpture' },
  { terms: ['figurine', 'figur'], type: 'Art Objects', medium: 'Figurine' },
  { terms: ['statue', 'statue'], type: 'Art Objects', medium: 'Statue' },
  { terms: ['relief'], type: 'Art Objects', medium: 'Relief' },
  { terms: ['bust', 'büste'], type: 'Art Objects', medium: 'Bust' },
  { terms: ['installation', 'installation'], type: 'Art Objects', medium: 'Installation' },
  { terms: ['wall installation', 'wandinstallation'], type: 'Art Objects', medium: 'Wall Installation' },
  { terms: ['mobile'], type: 'Art Objects', medium: 'Mobile' },
  { terms: ['kinetic', 'kinetisch'], type: 'Art Objects', medium: 'Kinetic Object' },
  
  // Decorative Objects
  { terms: ['mirror', 'spiegel'], type: 'Decorative Objects', medium: 'Mirror' },
  { terms: ['clock', 'uhr'], type: 'Decorative Objects', medium: 'Clock' },
  { terms: ['frame', 'rahmen'], type: 'Decorative Objects', medium: 'Frame' },
  { terms: ['box', 'box'], type: 'Decorative Objects', medium: 'Box' },
  { terms: ['tray', 'tablett'], type: 'Decorative Objects', medium: 'Tray' },
  { terms: ['ornament', 'ornament'], type: 'Decorative Objects', medium: 'Ornament' },
  { terms: ['decoration', 'dekoration'], type: 'Decorative Objects', medium: 'Decoration' },
  
  // Clothing & Accessories
  { terms: ['shoes', 'schuhe'], type: 'Clothing & Accessories', medium: 'Shoes' },
  { terms: ['hat', 'hut'], type: 'Clothing & Accessories', medium: 'Hat' },
  { terms: ['bag', 'tasche'], type: 'Clothing & Accessories', medium: 'Bag' },
  { terms: ['purse', 'handtasche'], type: 'Clothing & Accessories', medium: 'Purse' },
  { terms: ['belt', 'gürtel'], type: 'Clothing & Accessories', medium: 'Belt' },
  { terms: ['scarf', 'schal'], type: 'Clothing & Accessories', medium: 'Scarf' },
  { terms: ['gloves', 'handschuhe'], type: 'Clothing & Accessories', medium: 'Gloves' },
  
  // Cutlery & Utensils
  { terms: ['cutlery', 'besteck'], type: 'Cutlery & Utensils', medium: 'Cutlery' },
  { terms: ['spoon', 'löffel'], type: 'Cutlery & Utensils', medium: 'Spoon' },
  { terms: ['fork', 'gabel'], type: 'Cutlery & Utensils', medium: 'Fork' },
  { terms: ['knife', 'messer'], type: 'Cutlery & Utensils', medium: 'Knife' },
  { terms: ['ladle', 'schöpfkelle'], type: 'Cutlery & Utensils', medium: 'Ladle' },
  { terms: ['spatula', 'spatel'], type: 'Cutlery & Utensils', medium: 'Spatula' },
  { terms: ['serving spoon', 'servierlöffel'], type: 'Cutlery & Utensils', medium: 'Serving Spoon' },
];

// Results storage
const foundMaterials = new Map();
const foundMediums = new Map();
const processedCaptions = [];

// Helper function to normalize text for searching
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to check if a term exists in text
function findTermInText(text, terms) {
  const normalizedText = normalizeText(text);
  return terms.some(term => {
    const normalizedTerm = normalizeText(term);
    return normalizedText.includes(normalizedTerm);
  });
}

// Process each artwork caption
let processedCount = 0;
let captionsWithContent = 0;

captionsData.forEach((artwork, index) => {
  processedCount++;
  
  // Get English and German captions
  const captionEN = artwork.rawCaption_en || '';
  const captionDE = artwork.rawCaption_de || '';
  
  // Skip if no caption content
  if (!captionEN.trim() && !captionDE.trim()) {
    return;
  }
  
  captionsWithContent++;
  
  // Combine both captions for analysis
  const combinedCaption = `${captionEN} ${captionDE}`;
  
  // Track this caption
  const captionData = {
    id: artwork._id,
    captionEN,
    captionDE,
    foundMaterials: [],
    foundMediums: []
  };
  
  // Search for materials
  materialPatterns.forEach(pattern => {
    if (findTermInText(combinedCaption, pattern.terms)) {
      const key = `${pattern.type}::${pattern.material}`;
      if (!foundMaterials.has(key)) {
        foundMaterials.set(key, {
          type: pattern.type,
          material: pattern.material,
          count: 0,
          examples: []
        });
      }
      
      const materialData = foundMaterials.get(key);
      materialData.count++;
      
      // Add example if we have fewer than 3
      if (materialData.examples.length < 3) {
        materialData.examples.push({
          id: artwork._id,
          captionEN: captionEN.substring(0, 100) + (captionEN.length > 100 ? '...' : ''),
          captionDE: captionDE.substring(0, 100) + (captionDE.length > 100 ? '...' : '')
        });
      }
      
      captionData.foundMaterials.push(pattern.material);
    }
  });
  
  // Search for mediums
  mediumPatterns.forEach(pattern => {
    if (findTermInText(combinedCaption, pattern.terms)) {
      const key = `${pattern.type}::${pattern.medium}`;
      if (!foundMediums.has(key)) {
        foundMediums.set(key, {
          type: pattern.type,
          medium: pattern.medium,
          count: 0,
          examples: []
        });
      }
      
      const mediumData = foundMediums.get(key);
      mediumData.count++;
      
      // Add example if we have fewer than 3
      if (mediumData.examples.length < 3) {
        mediumData.examples.push({
          id: artwork._id,
          captionEN: captionEN.substring(0, 100) + (captionEN.length > 100 ? '...' : ''),
          captionDE: captionDE.substring(0, 100) + (captionDE.length > 100 ? '...' : '')
        });
      }
      
      captionData.foundMediums.push(pattern.medium);
    }
  });
  
  // Only store if we found something
  if (captionData.foundMaterials.length > 0 || captionData.foundMediums.length > 0) {
    processedCaptions.push(captionData);
  }
  
  // Progress indicator
  if (processedCount % 500 === 0) {
    console.log(`📊 Processed ${processedCount}/${captionsData.length} records...`);
  }
});

// Sort results by frequency
const sortedMaterials = Array.from(foundMaterials.values())
  .sort((a, b) => b.count - a.count);

const sortedMediums = Array.from(foundMediums.values())
  .sort((a, b) => b.count - a.count);

// Generate comprehensive report
const report = {
  summary: {
    totalRecords: captionsData.length,
    captionsWithContent: captionsWithContent,
    recordsWithMaterials: processedCaptions.filter(c => c.foundMaterials.length > 0).length,
    recordsWithMediums: processedCaptions.filter(c => c.foundMediums.length > 0).length,
    uniqueMaterials: sortedMaterials.length,
    uniqueMediums: sortedMediums.length,
  },
  materials: sortedMaterials,
  mediums: sortedMediums,
  examples: processedCaptions.slice(0, 20) // First 20 examples
};

// Output results
console.log('\n🔍 COMPREHENSIVE MATERIALS & MEDIUMS ANALYSIS');
console.log('================================================');
console.log(`📊 Total Records: ${report.summary.totalRecords}`);
console.log(`📝 Captions with Content: ${report.summary.captionsWithContent}`);
console.log(`🎨 Records with Materials: ${report.summary.recordsWithMaterials}`);
console.log(`🏺 Records with Mediums: ${report.summary.recordsWithMediums}`);
console.log(`💎 Unique Materials Found: ${report.summary.uniqueMaterials}`);
console.log(`🎭 Unique Mediums Found: ${report.summary.uniqueMediums}`);

console.log('\n📈 TOP 20 MATERIALS BY FREQUENCY:');
console.log('==================================');
sortedMaterials.slice(0, 20).forEach((material, index) => {
  console.log(`${index + 1}. ${material.material} (${material.type}) - ${material.count} times`);
});

console.log('\n🏺 TOP 20 MEDIUMS BY FREQUENCY:');
console.log('===============================');
sortedMediums.slice(0, 20).forEach((medium, index) => {
  console.log(`${index + 1}. ${medium.medium} (${medium.type}) - ${medium.count} times`);
});

console.log('\n📝 MATERIALS BY CATEGORY:');
console.log('=========================');
const materialsByType = {};
sortedMaterials.forEach(material => {
  if (!materialsByType[material.type]) {
    materialsByType[material.type] = [];
  }
  materialsByType[material.type].push(material);
});

Object.keys(materialsByType).forEach(type => {
  console.log(`\n${type}:`);
  materialsByType[type].forEach(material => {
    console.log(`  • ${material.material} (${material.count})`);
  });
});

console.log('\n🎭 MEDIUMS BY CATEGORY:');
console.log('=======================');
const mediumsByType = {};
sortedMediums.forEach(medium => {
  if (!mediumsByType[medium.type]) {
    mediumsByType[medium.type] = [];
  }
  mediumsByType[medium.type].push(medium);
});

Object.keys(mediumsByType).forEach(type => {
  console.log(`\n${type}:`);
  mediumsByType[type].forEach(medium => {
    console.log(`  • ${medium.medium} (${medium.count})`);
  });
});

// Save detailed report to file
const reportPath = path.join(__dirname, 'comprehensive-materials-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n💾 Detailed report saved to: ${reportPath}`);

// Save CSV for easy import
const csvLines = ['Type,Category,Name,Count,Examples'];
sortedMaterials.forEach(material => {
  const examples = material.examples.map(ex => `"${ex.captionEN || ex.captionDE}"`).join('; ');
  csvLines.push(`Material,${material.type},"${material.material}",${material.count},"${examples}"`);
});
sortedMediums.forEach(medium => {
  const examples = medium.examples.map(ex => `"${ex.captionEN || ex.captionDE}"`).join('; ');
  csvLines.push(`Medium,${medium.type},"${medium.medium}",${medium.count},"${examples}"`);
});

const csvPath = path.join(__dirname, 'materials-mediums-analysis.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'));
console.log(`📊 CSV report saved to: ${csvPath}`);

console.log('\n✅ Analysis complete!'); 