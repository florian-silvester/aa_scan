const fs = require('fs');
const path = require('path');

// FINAL CATEGORIZED LISTS
const MATERIALS = [
  // Base materials
  'gold', 'silver', 'silber', 'glass', 'glas', 'ceramic', 'keramik', 'porcelain', 'porzellan',
  'steel', 'edelstahl', 'stainless steel', 'copper', 'kupfer', 'textile', 'textil', 'silk', 'seide',
  'paper', 'papier', 'metal', 'bronze', 'clay', 'ton', 'wool', 'platinum', 'cotton',
  'terra', 'glaze', 'engobe', 'pearls', 'diamonds', 'stoneware', 'studioglas',
  
  // Colors/finishes
  'yellow', 'white', 'black', 'rose', 'fine', 'geschwärzt', 'blackened', 'plattiert', 'plated',
  
  // Material variants with purity
  'gold 750', 'silber 925', '925 silver', 'silver 925', '750 gold', 'yellow gold', 'gelbgold',
  'fine gold', 'feingold', 'rose gold', 'gold plated', '750 yellow gold', '750 yellow', 'gelbgold 750'
];

const MEDIUMS = [
  // Jewelry
  'ring', 'rings', 'ringe', 'necklace', 'halskette', 'kette', 'earrings', 'ohrringe', 'ohrschmuck',
  'brooch', 'brosche', 'pendant', 'anhänger', 'bracelet', 'armreif', 'halsschmuck',
  
  // Vessels/containers
  'vase', 'vessel', 'gefäß', 'bowl', 'schale', 'bowls', 'vessels', 'gefäße',
  
  // Textiles
  'scarf', 'quilt', 'carpet'
];

// Create bilingual entries for CMS
function createBilingualEntries(terms, type) {
  const entries = [];
  const processed = new Set();
  
  // Translation mappings
  const translations = {
    // Materials
    'gold': {en: 'Gold', de: 'Gold'},
    'silver': {en: 'Silver', de: 'Silber'},
    'silber': {en: 'Silver', de: 'Silber'},
    'glass': {en: 'Glass', de: 'Glas'},
    'glas': {en: 'Glass', de: 'Glas'},
    'ceramic': {en: 'Ceramic', de: 'Keramik'},
    'keramik': {en: 'Ceramic', de: 'Keramik'},
    'porcelain': {en: 'Porcelain', de: 'Porzellan'},
    'porzellan': {en: 'Porcelain', de: 'Porzellan'},
    'steel': {en: 'Steel', de: 'Stahl'},
    'edelstahl': {en: 'Stainless Steel', de: 'Edelstahl'},
    'stainless steel': {en: 'Stainless Steel', de: 'Edelstahl'},
    'copper': {en: 'Copper', de: 'Kupfer'},
    'kupfer': {en: 'Copper', de: 'Kupfer'},
    'textile': {en: 'Textile', de: 'Textil'},
    'textil': {en: 'Textile', de: 'Textil'},
    'silk': {en: 'Silk', de: 'Seide'},
    'seide': {en: 'Silk', de: 'Seide'},
    'paper': {en: 'Paper', de: 'Papier'},
    'papier': {en: 'Paper', de: 'Papier'},
    'bronze': {en: 'Bronze', de: 'Bronze'},
    'clay': {en: 'Clay', de: 'Ton'},
    'ton': {en: 'Clay', de: 'Ton'},
    'wool': {en: 'Wool', de: 'Wolle'},
    'cotton': {en: 'Cotton', de: 'Baumwolle'},
    'platinum': {en: 'Platinum', de: 'Platin'},
    'pearls': {en: 'Pearls', de: 'Perlen'},
    'diamonds': {en: 'Diamonds', de: 'Diamanten'},
    'stoneware': {en: 'Stoneware', de: 'Steinzeug'},
    'studioglas': {en: 'Studio Glass', de: 'Studioglas'},
    
    // Mediums
    'ring': {en: 'Ring', de: 'Ring'},
    'rings': {en: 'Rings', de: 'Ringe'},
    'ringe': {en: 'Rings', de: 'Ringe'},
    'necklace': {en: 'Necklace', de: 'Halskette'},
    'halskette': {en: 'Necklace', de: 'Halskette'},
    'kette': {en: 'Chain', de: 'Kette'},
    'earrings': {en: 'Earrings', de: 'Ohrringe'},
    'ohrringe': {en: 'Earrings', de: 'Ohrringe'},
    'ohrschmuck': {en: 'Ear Jewelry', de: 'Ohrschmuck'},
    'brooch': {en: 'Brooch', de: 'Brosche'},
    'brosche': {en: 'Brooch', de: 'Brosche'},
    'pendant': {en: 'Pendant', de: 'Anhänger'},
    'anhänger': {en: 'Pendant', de: 'Anhänger'},
    'bracelet': {en: 'Bracelet', de: 'Armreif'},
    'armreif': {en: 'Bracelet', de: 'Armreif'},
    'halsschmuck': {en: 'Neck Jewelry', de: 'Halsschmuck'},
    'vase': {en: 'Vase', de: 'Vase'},
    'vessel': {en: 'Vessel', de: 'Gefäß'},
    'gefäß': {en: 'Vessel', de: 'Gefäß'},
    'bowl': {en: 'Bowl', de: 'Schale'},
    'schale': {en: 'Bowl', de: 'Schale'},
    'bowls': {en: 'Bowls', de: 'Schalen'},
    'vessels': {en: 'Vessels', de: 'Gefäße'},
    'gefäße': {en: 'Vessels', de: 'Gefäße'},
    'scarf': {en: 'Scarf', de: 'Schal'},
    'quilt': {en: 'Quilt', de: 'Quilt'},
    'carpet': {en: 'Carpet', de: 'Teppich'}
  };
  
  terms.forEach(term => {
    const lower = term.toLowerCase();
    
    // Skip if already processed or it's a variant
    if (processed.has(lower)) return;
    
    let translation = translations[lower];
    if (!translation) {
      // Create default translation for untranslated terms
      translation = {
        en: term.charAt(0).toUpperCase() + term.slice(1),
        de: term.charAt(0).toUpperCase() + term.slice(1)
      };
    }
    
    entries.push({
      _type: type,
      name: translation,
      slug: {
        _type: 'slug',
        current: lower.replace(/\s+/g, '-')
      }
    });
    
    processed.add(lower);
  });
  
  return entries;
}

// Create CMS import data
const materialEntries = createBilingualEntries(MATERIALS, 'material');
const mediumEntries = createBilingualEntries(MEDIUMS, 'medium');

console.log('=== CMS IMPORT DATA CREATED ===');
console.log(`Materials: ${materialEntries.length} entries`);
console.log(`Mediums: ${mediumEntries.length} entries`);

// Save as NDJSON for Sanity import
const materialsNDJSON = materialEntries.map(entry => JSON.stringify(entry)).join('\n');
const mediumsNDJSON = mediumEntries.map(entry => JSON.stringify(entry)).join('\n');

fs.writeFileSync(path.join(__dirname, 'materials-import.ndjson'), materialsNDJSON);
fs.writeFileSync(path.join(__dirname, 'mediums-import.ndjson'), mediumsNDJSON);

// Save as readable JSON for review
fs.writeFileSync(path.join(__dirname, 'materials-import.json'), JSON.stringify(materialEntries, null, 2));
fs.writeFileSync(path.join(__dirname, 'mediums-import.json'), JSON.stringify(mediumEntries, null, 2));

console.log('\n=== FILES CREATED ===');
console.log('✓ materials-import.ndjson - Sanity import format');
console.log('✓ mediums-import.ndjson - Sanity import format');
console.log('✓ materials-import.json - Human readable');
console.log('✓ mediums-import.json - Human readable');

// Display sample entries
console.log('\n=== SAMPLE MATERIAL ENTRIES ===');
materialEntries.slice(0, 5).forEach(entry => {
  console.log(`${entry.name.en} / ${entry.name.de} (${entry.slug.current})`);
});

console.log('\n=== SAMPLE MEDIUM ENTRIES ===');
mediumEntries.slice(0, 5).forEach(entry => {
  console.log(`${entry.name.en} / ${entry.name.de} (${entry.slug.current})`);
});

console.log('\n=== NEXT STEPS ===');
console.log('1. Review the JSON files to verify entries');
console.log('2. Import using: sanity dataset import materials-import.ndjson');
console.log('3. Import using: sanity dataset import mediums-import.ndjson'); 