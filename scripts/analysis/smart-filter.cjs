const fs = require('fs');
const path = require('path');

// Load the raw data
const allTermsPath = path.join(__dirname, 'all-terms-with-counts.txt');
const allTermsData = fs.readFileSync(allTermsPath, 'utf8');

// Parse terms and counts
const allTerms = allTermsData.split('\n')
  .filter(line => line.trim())
  .map(line => {
    const parts = line.trim().split(' ');
    const count = parseInt(parts[parts.length - 1]);
    const term = parts.slice(0, -1).join(' ');
    return [term, count];
  })
  .filter(([term, count]) => count >= 10); // Only terms with 10+ occurrences

// NOISE BLACKLIST - Terms to completely exclude
const noiseWords = new Set([
  // People names (common in captions)
  'shin', 'te-hsin', 'ulrike', 'eva', 'stefanie', 'frank', 'kleinbach', 'martin', 'thomas', 'michael', 'peter', 'anna',
  'sebastian', 'robert', 'anke', 'hennig', 'claudia', 'ria', 'lins', 'annette', 'lechler', 'babette', 'susanne',
  'mirjam', 'hiller', 'angelika', 'jansen', 'gitta', 'pielcke', 'tanja', 'friedrichs', 'sofia', 'beilharz',
  
  // Photo credits & metadata
  'photo', 'foto', 'courtesy', 'detail', 'made', 'approx', 'cm', 'mm', 'height', 'width', 'diameter',
  
  // Awards & status
  'certified', 'winner', 'award', 'euro', 'mjc', 'german', 'design', 'aurea', 'art', 'winner',
  
  // Years
  '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022',
  
  // Generic words
  'the', 'and', 'von', 'aus', 'with', 'from', 'der', 'und', 'mit', 'auf', 'series', 'serie', 'collection', 'kollektion',
  'object', 'objekt', 'studio', 'jewelry', 'schmuck', 'schmuckdesign', 'design', 'kunst', 'art'
]);

// VALID MATERIAL PATTERNS
const validMaterials = new Set([
  // Pure single materials
  'gold', 'silver', 'silber', 'copper', 'kupfer', 'bronze', 'brass', 'steel', 'stahl', 'iron', 'eisen',
  'platinum', 'platin', 'titanium', 'aluminum', 'pewter', 'zinn', 'lead', 'nickel', 'chrome', 'zinc',
  
  // Glass & ceramics
  'glass', 'glas', 'ceramic', 'keramik', 'porcelain', 'porzellan', 'clay', 'ton', 'stoneware', 'steinzeug',
  'enamel', 'emaille', 'glaze', 'glasur', 'engobe',
  
  // Textiles
  'textile', 'textil', 'silk', 'seide', 'cotton', 'baumwolle', 'wool', 'wolle', 'linen', 'nylon', 'polyester',
  'leather', 'leder', 'fabric',
  
  // Organic materials
  'wood', 'holz', 'oak', 'eiche', 'paper', 'papier', 'bone', 'knochen', 'horn', 'shell', 'muschel',
  'pearl', 'perle', 'coral', 'koralle', 'amber', 'bernstein',
  
  // Stones & gems
  'stone', 'stein', 'marble', 'marmor', 'granite', 'crystal', 'kristall', 'quartz', 'quarz', 'diamond', 'diamant',
  'ruby', 'sapphire', 'emerald', 'amethyst', 'onyx', 'jade', 'turquoise', 'opal', 'agate',
  
  // Synthetic materials
  'plastic', 'plastik', 'rubber', 'gummi', 'resin', 'harz', 'lacquer', 'lack'
]);

// VALID MEDIUM PATTERNS
const validMediums = new Set([
  // Jewelry
  'ring', 'necklace', 'halskette', 'kette', 'earrings', 'ohrringe', 'bracelet', 'armband', 'armreif',
  'brooch', 'brosche', 'pendant', 'anhänger', 'bangle',
  
  // Vessels & containers
  'vase', 'bowl', 'schale', 'vessel', 'gefäß', 'cup', 'tasse', 'plate', 'teller', 'dish', 'schüssel',
  'pot', 'topf', 'jar', 'bottle', 'flasche', 'box', 'kasten', 'container',
  
  // Furniture
  'chair', 'stuhl', 'table', 'tisch', 'stool', 'hocker', 'bench', 'bank', 'cabinet', 'schrank',
  'chest', 'truhe', 'frame', 'rahmen', 'mirror', 'spiegel',
  
  // Lighting
  'lamp', 'lampe', 'light', 'licht', 'chandelier', 'candle',
  
  // Cutlery & tools
  'cutlery', 'besteck', 'spoon', 'löffel', 'fork', 'gabel', 'knife', 'messer',
  
  // Art objects
  'sculpture', 'skulptur', 'figurine', 'figur', 'installation', 'tile', 'fliese'
]);

// VALID 2-WORD COMBINATIONS
const validTwoWordMaterials = new Set([
  'yellow gold', 'white gold', 'rose gold', 'red gold', 'green gold', 'grey gold',
  'gelbgold', 'weißgold', 'roségold', 'rotgold',
  'fine gold', 'pure gold', 'feingold',
  'sterling silver', 'fine silver', 'pure silver', 'oxidized silver', 'blackened silver',
  'stainless steel', 'carbon steel', 'corten steel', 'edelstahl',
  'blown glass', 'cast glass', 'fused glass', 'studio glass',
  'bone china', 'fine porcelain', 'white porcelain', 'weißes porzellan',
  'natural stone', 'precious stone', 'semi-precious stone',
  'organic cotton', 'silk thread', 'wool felt', 'cotton fabric',
  'leather cord', 'suede leather',
  'recycled gold', 'recycled silver', 'fair gold'
]);

const validTwoWordMediums = new Set([
  'wedding ring', 'engagement ring', 'signet ring', 'cocktail ring',
  'statement necklace', 'chain necklace', 'beaded necklace',
  'drop earrings', 'stud earrings', 'hoop earrings',
  'charm bracelet', 'tennis bracelet', 'bangle bracelet',
  'dinner plate', 'salad plate', 'soup bowl', 'serving bowl',
  'wine glass', 'champagne flute', 'coffee cup', 'tea cup',
  'floor lamp', 'table lamp', 'desk lamp', 'pendant light',
  'dining chair', 'office chair', 'lounge chair', 'bar stool',
  'coffee table', 'side table', 'dining table', 'work table',
  'jewelry box', 'storage box', 'decorative box',
  'wall mirror', 'hand mirror', 'vanity mirror',
  'sculpture base', 'art piece', 'decorative object'
]);

// SMART FILTER FUNCTION
function smartFilter(term, count) {
  const words = term.toLowerCase().split(' ');
  
  // Skip if contains noise words
  if (words.some(word => noiseWords.has(word))) {
    return 'noise';
  }
  
  // Skip if contains numbers (likely measurements or years)
  if (words.some(word => /^\d+$/.test(word))) {
    return 'noise';
  }
  
  // Skip if contains obvious photo credits
  if (words.some(word => ['photo', 'foto', 'courtesy', 'detail', 'made'].includes(word))) {
    return 'noise';
  }
  
  // Single word evaluation
  if (words.length === 1) {
    const word = words[0];
    if (validMaterials.has(word)) return 'material';
    if (validMediums.has(word)) return 'medium';
    return 'not-sure';
  }
  
  // Two word evaluation
  if (words.length === 2) {
    const twoWord = words.join(' ');
    if (validTwoWordMaterials.has(twoWord)) return 'material';
    if (validTwoWordMediums.has(twoWord)) return 'medium';
    
    // Pattern recognition for 2-word combinations
    const [first, second] = words;
    
    // Metal + type patterns (yellow gold, white gold, etc.)
    if (['yellow', 'white', 'rose', 'red', 'green', 'grey', 'black'].includes(first) && 
        ['gold', 'silver', 'silber'].includes(second)) {
      return 'material';
    }
    
    // Purity + metal patterns (925 silver, 750 gold, etc.)
    if (['925', '750', '585', '999', '900'].includes(first) && 
        ['gold', 'silver', 'silber'].includes(second)) {
      return 'material';
    }
    
    // Modifier + material patterns (fine gold, pure silver, etc.)
    if (['fine', 'pure', 'oxidized', 'blackened', 'recycled', 'fair'].includes(first) && 
        validMaterials.has(second)) {
      return 'material';
    }
    
    // Material + form patterns (blown glass, cast iron, etc.)
    if (['blown', 'cast', 'fused', 'forged', 'hammered'].includes(first) && 
        validMaterials.has(second)) {
      return 'material';
    }
    
    // If it's a person name + object pattern, it's likely noise
    if (first.length > 3 && first[0] === first[0].toLowerCase() && 
        validMediums.has(second)) {
      return 'noise';
    }
    
    return 'not-sure';
  }
  
  // Skip 3+ word combinations for now
  if (words.length >= 3) {
    return 'noise';
  }
  
  return 'not-sure';
}

// PROCESS ALL TERMS
const results = {
  materials: [],
  mediums: [],
  notSure: [],
  noise: []
};

allTerms.forEach(([term, count]) => {
  const category = smartFilter(term, count);
  const key = category === 'not-sure' ? 'notSure' : category;
  results[key].push([term, count]);
});

// SORT BY FREQUENCY
Object.keys(results).forEach(key => {
  results[key].sort((a, b) => b[1] - a[1]);
});

// GENERATE OUTPUT
console.log('🎯 SMART FILTER RESULTS');
console.log('=======================\n');

console.log('✅ MATERIALS (confirmed):');
results.materials.forEach(([term, count]) => {
  console.log(`${term} ${count}`);
});

console.log('\n🏺 MEDIUMS (confirmed):');
results.mediums.forEach(([term, count]) => {
  console.log(`${term} ${count}`);
});

console.log('\n❓ NOT SURE (needs human review):');
results.notSure.slice(0, 50).forEach(([term, count]) => {
  console.log(`${term} ${count}`);
});

console.log('\n🚫 NOISE (filtered out):');
results.noise.slice(0, 20).forEach(([term, count]) => {
  console.log(`${term} ${count}`);
});

// SAVE TO FILES
fs.writeFileSync('confirmed-materials.txt', 
  results.materials.map(([term, count]) => `${term} ${count}`).join('\n'));

fs.writeFileSync('confirmed-mediums.txt', 
  results.mediums.map(([term, count]) => `${term} ${count}`).join('\n'));

fs.writeFileSync('needs-review.txt', 
  results.notSure.map(([term, count]) => `${term} ${count}`).join('\n'));

console.log('\n📁 FILES CREATED:');
console.log('✓ confirmed-materials.txt');
console.log('✓ confirmed-mediums.txt');
console.log('✓ needs-review.txt');

console.log(`\n📊 SUMMARY:`);
console.log(`Materials: ${results.materials.length}`);
console.log(`Mediums: ${results.mediums.length}`);
console.log(`Needs Review: ${results.notSure.length}`);
console.log(`Noise Filtered: ${results.noise.length}`); 