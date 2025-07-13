const fs = require('fs');
const path = require('path');

// Load the artwork captions data
const dataPath = path.join(__dirname, '../../archive/migration-data/artwork-captions-2025-07-10.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Extract all captions for analysis
const allCaptions = [];
data.designers.forEach(designer => {
  designer.images.forEach(image => {
    if (image.rawCaption_en) {
      allCaptions.push({
        designer: designer.designerName,
        filename: image.filename,
        caption_en: image.rawCaption_en,
        caption_de: image.rawCaption_de || ''
      });
    }
  });
});

console.log(`Found ${allCaptions.length} captions to analyze`);

// Function to extract potential materials and mediums from text
function extractTermsFromText(text) {
  if (!text) return [];
  
  // Clean the text - remove HTML tags, punctuation, convert to lowercase
  const cleanText = text
    .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
    .replace(/[.,;:!?()[\]{}]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .toLowerCase()
    .trim();
  
  // Split into words
  const words = cleanText.split(' ').filter(word => word.length > 2);
  
  // Extract potential compound terms (2-3 words)
  const terms = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    terms.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      terms.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }
  
  return terms;
}

// Extract all terms from all captions
const allTerms = new Map();
const termsByLanguage = { en: new Map(), de: new Map() };

allCaptions.forEach(caption => {
  // Extract from English captions
  const englishTerms = extractTermsFromText(caption.caption_en);
  englishTerms.forEach(term => {
    allTerms.set(term, (allTerms.get(term) || 0) + 1);
    termsByLanguage.en.set(term, (termsByLanguage.en.get(term) || 0) + 1);
  });
  
  // Extract from German captions
  const germanTerms = extractTermsFromText(caption.caption_de);
  germanTerms.forEach(term => {
    allTerms.set(term, (allTerms.get(term) || 0) + 1);
    termsByLanguage.de.set(term, (termsByLanguage.de.get(term) || 0) + 1);
  });
});

// Sort terms by frequency
const sortedTerms = Array.from(allTerms.entries())
  .sort((a, b) => b[1] - a[1])
  .filter(([term, count]) => count >= 3); // Only include terms that appear at least 3 times

console.log('\n=== TOP TERMS BY FREQUENCY ===');
sortedTerms.slice(0, 100).forEach(([term, count]) => {
  console.log(`${count.toString().padStart(3)}: ${term}`);
});

// Function to identify potential materials vs mediums based on common patterns
function categorizeTerm(term) {
  const materialIndicators = [
    'gold', 'silver', 'bronze', 'copper', 'platinum', 'steel', 'iron', 'metal', 'metall',
    'diamond', 'pearl', 'ruby', 'emerald', 'sapphire', 'stone', 'crystal', 'glass', 'glas',
    'wood', 'leather', 'ceramic', 'porcelain', 'clay', 'fabric', 'textile', 'plastic',
    'enamel', 'lacquer', 'resin', 'amber', 'coral', 'ivory', 'bone', 'horn',
    'titanium', 'aluminum', 'brass', 'pewter', 'zinc'
  ];
  
  const mediumIndicators = [
    'ring', 'necklace', 'bracelet', 'earring', 'pendant', 'brooch', 'cufflink',
    'vase', 'bowl', 'cup', 'plate', 'vessel', 'sculpture', 'pendant', 'chain',
    'bangle', 'anklet', 'tiara', 'crown', 'watch', 'clock', 'lamp', 'light',
    'chair', 'table', 'cabinet', 'shelf', 'mirror', 'frame', 'box', 'container',
    'schmuck', 'kette', 'armband', 'ohrringe', 'anhänger', 'brosche', 'schale',
    'gefäß', 'skulptur', 'leuchte', 'lampe', 'spiegel', 'rahmen', 'dose'
  ];
  
  const isMaterial = materialIndicators.some(indicator => term.includes(indicator));
  const isMedium = mediumIndicators.some(indicator => term.includes(indicator));
  
  if (isMaterial && !isMedium) return 'material';
  if (isMedium && !isMaterial) return 'medium';
  if (isMaterial && isMedium) return 'both';
  return 'unknown';
}

// Categorize the top terms
const categorizedTerms = {
  materials: [],
  mediums: [],
  both: [],
  unknown: []
};

sortedTerms.forEach(([term, count]) => {
  const category = categorizeTerm(term);
  // Add debugging to see what's happening
  if (!categorizedTerms[category]) {
    console.error(`Unknown category: ${category} for term: ${term}`);
    categorizedTerms.unknown.push([term, count]);
  } else {
    categorizedTerms[category].push([term, count]);
  }
});

console.log('\n=== POTENTIAL MATERIALS ===');
categorizedTerms.materials.slice(0, 50).forEach(([term, count]) => {
  console.log(`${count.toString().padStart(3)}: ${term}`);
});

console.log('\n=== POTENTIAL MEDIUMS ===');
categorizedTerms.mediums.slice(0, 50).forEach(([term, count]) => {
  console.log(`${count.toString().padStart(3)}: ${term}`);
});

console.log('\n=== TERMS THAT COULD BE BOTH ===');
categorizedTerms.both.slice(0, 20).forEach(([term, count]) => {
  console.log(`${count.toString().padStart(3)}: ${term}`);
});

// Export results to CSV files
function exportToCSV(data, filename) {
  const csv = ['Term,Count\n'];
  data.forEach(([term, count]) => {
    csv.push(`"${term}",${count}\n`);
  });
  
  fs.writeFileSync(filename, csv.join(''));
  console.log(`\nExported to ${filename}`);
}

exportToCSV(sortedTerms, 'all-terms-frequency.csv');
exportToCSV(categorizedTerms.materials, 'potential-materials.csv');
exportToCSV(categorizedTerms.mediums, 'potential-mediums.csv');

// Sample some captions to show context
console.log('\n=== SAMPLE CAPTIONS FOR CONTEXT ===');
const sampleCaptions = allCaptions.slice(0, 10);
sampleCaptions.forEach((caption, index) => {
  console.log(`\n${index + 1}. ${caption.designer} - ${caption.filename}`);
  console.log(`EN: ${caption.caption_en}`);
  if (caption.caption_de) {
    console.log(`DE: ${caption.caption_de}`);
  }
});

console.log('\n=== ANALYSIS COMPLETE ===');
console.log(`Total captions analyzed: ${allCaptions.length}`);
console.log(`Unique terms found: ${allTerms.size}`);
console.log(`Terms appearing 3+ times: ${sortedTerms.length}`);
console.log(`Potential materials: ${categorizedTerms.materials.length}`);
console.log(`Potential mediums: ${categorizedTerms.mediums.length}`);

// REFINED ANALYSIS - Focus on single-word terms
console.log('\n=== REFINED ANALYSIS FOR CMS ===');
console.log('Looking at single-word terms that could be materials or mediums...\n');

// Extract single-word terms only
const singleWordTerms = sortedTerms.filter(([term]) => !term.includes(' '));

// Manually categorize the most important single-word terms
const knownMaterials = new Map();
const knownMediums = new Map();

singleWordTerms.forEach(([term, count]) => {
  // Materials
  if (['gold', 'silver', 'silber', 'copper', 'brass', 'bronze', 'steel', 'iron', 'titanium', 'aluminum', 'platinum', 'nickel', 'tin', 'pewter', 'metal', 'metall'].includes(term)) {
    knownMaterials.set(term, count);
  }
  if (['diamond', 'ruby', 'sapphire', 'emerald', 'pearl', 'perle', 'quartz', 'crystal', 'kristall', 'agate', 'jade', 'onyx', 'turquoise', 'garnet', 'amethyst', 'opal', 'stone', 'stein'].includes(term)) {
    knownMaterials.set(term, count);
  }
  if (['wood', 'holz', 'leather', 'leder', 'bone', 'horn', 'ivory', 'coral', 'shell', 'amber', 'bernstein'].includes(term)) {
    knownMaterials.set(term, count);
  }
  if (['ceramic', 'keramik', 'porcelain', 'porzellan', 'clay', 'glass', 'glas', 'enamel', 'email'].includes(term)) {
    knownMaterials.set(term, count);
  }
  if (['fabric', 'textile', 'textil', 'cotton', 'silk', 'seide', 'wool', 'linen', 'felt'].includes(term)) {
    knownMaterials.set(term, count);
  }
  if (['plastic', 'resin', 'rubber', 'vinyl', 'nylon', 'polyester'].includes(term)) {
    knownMaterials.set(term, count);
  }
  
  // Mediums
  if (['ring', 'rings', 'ringe', 'necklace', 'kette', 'halskette', 'bracelet', 'armband', 'earrings', 'ohrringe', 'brooch', 'brosche', 'pendant', 'anhänger', 'bangle', 'armreif'].includes(term)) {
    knownMediums.set(term, count);
  }
  if (['vase', 'bowl', 'schale', 'cup', 'mug', 'vessel', 'gefäß', 'plate', 'teller', 'dish', 'jar'].includes(term)) {
    knownMediums.set(term, count);
  }
  if (['sculpture', 'skulptur', 'figurine', 'statue', 'relief', 'installation'].includes(term)) {
    knownMediums.set(term, count);
  }
  if (['lamp', 'lampe', 'light', 'licht', 'chandelier', 'candle', 'kerze'].includes(term)) {
    knownMediums.set(term, count);
  }
  if (['chair', 'stuhl', 'table', 'tisch', 'stool', 'bench', 'cabinet', 'shelf'].includes(term)) {
    knownMediums.set(term, count);
  }
  if (['mirror', 'spiegel', 'clock', 'uhr', 'frame', 'rahmen', 'box', 'container'].includes(term)) {
    knownMediums.set(term, count);
  }
});

// Sort by frequency
const sortedMaterials = Array.from(knownMaterials.entries()).sort((a, b) => b[1] - a[1]);
const sortedMediums = Array.from(knownMediums.entries()).sort((a, b) => b[1] - a[1]);

console.log('🎨 MATERIALS FOUND IN CAPTIONS (by frequency):');
console.log('=============================================');
sortedMaterials.forEach(([material, count]) => {
  console.log(`${count.toString().padStart(3)}: ${material}`);
});

console.log('\n🏺 MEDIUMS FOUND IN CAPTIONS (by frequency):');
console.log('===========================================');
sortedMediums.forEach(([medium, count]) => {
  console.log(`${count.toString().padStart(3)}: ${medium}`);
});

// Generate recommendation report
console.log('\n📋 RECOMMENDATIONS FOR CMS:');
console.log('===========================');
console.log('Based on the analysis, here are the materials and mediums that appear');
console.log('frequently in captions and should be considered for the CMS:');

console.log('\n🔹 HIGH-PRIORITY MATERIALS (50+ occurrences):');
sortedMaterials.filter(([, count]) => count >= 50).forEach(([material, count]) => {
  console.log(`   • ${material} (${count} times)`);
});

console.log('\n🔹 HIGH-PRIORITY MEDIUMS (50+ occurrences):');
sortedMediums.filter(([, count]) => count >= 50).forEach(([medium, count]) => {
  console.log(`   • ${medium} (${count} times)`);
});

console.log('\n🔸 MEDIUM-PRIORITY MATERIALS (10-49 occurrences):');
sortedMaterials.filter(([, count]) => count >= 10 && count < 50).forEach(([material, count]) => {
  console.log(`   • ${material} (${count} times)`);
});

console.log('\n🔸 MEDIUM-PRIORITY MEDIUMS (10-49 occurrences):');
sortedMediums.filter(([, count]) => count >= 10 && count < 50).forEach(([medium, count]) => {
  console.log(`   • ${medium} (${count} times)`);
});

// Export refined results
const refinedReport = {
  summary: {
    totalCaptions: allCaptions.length,
    uniqueTerms: allTerms.size,
    frequentTerms: sortedTerms.length,
    identifiedMaterials: sortedMaterials.length,
    identifiedMediums: sortedMediums.length
  },
  materials: sortedMaterials,
  mediums: sortedMediums,
  recommendations: {
    highPriorityMaterials: sortedMaterials.filter(([, count]) => count >= 50),
    highPriorityMediums: sortedMediums.filter(([, count]) => count >= 50),
    mediumPriorityMaterials: sortedMaterials.filter(([, count]) => count >= 10 && count < 50),
    mediumPriorityMediums: sortedMediums.filter(([, count]) => count >= 10 && count < 50)
  }
};

fs.writeFileSync('materials-mediums-recommendations.json', JSON.stringify(refinedReport, null, 2));
console.log('\n💾 Detailed recommendations saved to: materials-mediums-recommendations.json');

// Export CSV for easy review
const csvLines = ['Type,Term,Count,Priority'];
sortedMaterials.forEach(([material, count]) => {
  const priority = count >= 50 ? 'High' : count >= 10 ? 'Medium' : 'Low';
  csvLines.push(`Material,"${material}",${count},${priority}`);
});
sortedMediums.forEach(([medium, count]) => {
  const priority = count >= 50 ? 'High' : count >= 10 ? 'Medium' : 'Low';
  csvLines.push(`Medium,"${medium}",${count},${priority}`);
});

fs.writeFileSync('materials-mediums-recommendations.csv', csvLines.join('\n'));
console.log('📊 CSV recommendations saved to: materials-mediums-recommendations.csv');

// Create comprehensive .txt file with all terms and counts
const txtOutput = sortedTerms
  .map(([term, count]) => `${term} ${count}`)
  .join('\n');

fs.writeFileSync(path.join(__dirname, 'all-terms-with-counts.txt'), txtOutput);

console.log('\n=== FILES CREATED ===');
console.log('✓ all-terms-with-counts.txt - All terms with counts');
console.log('✓ materials-mediums-recommendations.csv - Categorized recommendations');
console.log('✓ detailed-analysis.txt - Full analysis report');

// Also create separate files for materials and mediums
const materialsOnly = sortedTerms.filter(([term]) => {
  const lower = term.toLowerCase();
  // Basic material detection
  return ['gold', 'silver', 'silber', 'ceramic', 'keramik', 'porcelain', 'porzellan', 
          'glass', 'glas', 'steel', 'stahl', 'copper', 'kupfer', 'bronze', 'brass', 
          'messing', 'aluminum', 'aluminium', 'wood', 'holz', 'oak', 'eiche', 
          'textile', 'textil', 'silk', 'seide', 'cotton', 'baumwolle', 'wool', 
          'wolle', 'plastic', 'plastik', 'rubber', 'gummi', 'stone', 'stein', 
          'marble', 'marmor', 'granite', 'granit', 'clay', 'ton', 'leather', 
          'leder', 'paper', 'papier', 'cardboard', 'pappe', 'metal', 'metall', 
          'iron', 'eisen', 'titanium', 'titan', 'platinum', 'platin', 'pewter', 
          'zinn', 'lead', 'blei', 'zinc', 'zink', 'nickel', 'chrome', 'chrom', 
          'enamel', 'emaille', 'lacquer', 'lack', 'resin', 'harz', 'wax', 'wachs',
          'bone', 'knochen', 'horn', 'pearl', 'perle', 'shell', 'muschel', 'coral',
          'koralle', 'amber', 'bernstein', 'jet', 'onyx', 'jade', 'turquoise', 
          'turkis', 'ruby', 'rubin', 'sapphire', 'saphir', 'emerald', 'smaragd',
          'diamond', 'diamant', 'crystal', 'kristall', 'quartz', 'quarz'
  ].some(mat => lower.includes(mat));
});

const mediumsOnly = sortedTerms.filter(([term]) => {
  const lower = term.toLowerCase();
  // Basic medium detection
  return ['ring', 'necklace', 'halskette', 'kette', 'earring', 'ohrring', 'bracelet', 
          'armband', 'brooch', 'brosche', 'pendant', 'anhaenger', 'vase', 'bowl', 
          'schale', 'vessel', 'gefaess', 'cup', 'tasse', 'plate', 'teller', 'dish', 
          'schuessel', 'sculpture', 'skulptur', 'figurine', 'figur', 'lamp', 'lampe', 
          'light', 'licht', 'chair', 'stuhl', 'table', 'tisch', 'stool', 'hocker', 
          'bench', 'bank', 'cabinet', 'schrank', 'chest', 'truhe', 'box', 'kasten', 
          'frame', 'rahmen', 'mirror', 'spiegel', 'clock', 'uhr', 'watch', 'armbanduhr',
          'cutlery', 'besteck', 'spoon', 'loeffel', 'fork', 'gabel', 'knife', 'messer',
          'jewelry', 'schmuck', 'jewellery', 'ornament', 'decoration', 'dekoration',
          'tile', 'fliese', 'bottle', 'flasche', 'jar', 'glas', 'pot', 'topf'
  ].some(med => lower.includes(med));
});

const materialsText = materialsOnly
  .map(([term, count]) => `${term} ${count}`)
  .join('\n');

const mediumsText = mediumsOnly
  .map(([term, count]) => `${term} ${count}`)
  .join('\n');

fs.writeFileSync(path.join(__dirname, 'materials-only.txt'), materialsText);
fs.writeFileSync(path.join(__dirname, 'mediums-only.txt'), mediumsText);

console.log('✓ materials-only.txt - Materials with counts');
console.log('✓ mediums-only.txt - Mediums with counts');

console.log('\n✅ Analysis complete! Check the generated files for detailed recommendations.'); 