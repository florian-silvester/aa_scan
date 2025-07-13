const fs = require('fs');
const path = require('path');

// SYNONYM GROUPS - One entry per concept
const MATERIAL_CONCEPTS = [
  {en: 'Gold', de: 'Gold', slug: 'gold'},
  {en: 'Silver', de: 'Silber', slug: 'silver'},
  {en: 'Glass', de: 'Glas', slug: 'glass'},
  {en: 'Ceramic', de: 'Keramik', slug: 'ceramic'},
  {en: 'Porcelain', de: 'Porzellan', slug: 'porcelain'},
  {en: 'Steel', de: 'Stahl', slug: 'steel'},
  {en: 'Stainless Steel', de: 'Edelstahl', slug: 'stainless-steel'},
  {en: 'Copper', de: 'Kupfer', slug: 'copper'},
  {en: 'Textile', de: 'Textil', slug: 'textile'},
  {en: 'Silk', de: 'Seide', slug: 'silk'},
  {en: 'Paper', de: 'Papier', slug: 'paper'},
  {en: 'Bronze', de: 'Bronze', slug: 'bronze'},
  {en: 'Clay', de: 'Ton', slug: 'clay'},
  {en: 'Wool', de: 'Wolle', slug: 'wool'},
  {en: 'Cotton', de: 'Baumwolle', slug: 'cotton'},
  {en: 'Platinum', de: 'Platin', slug: 'platinum'},
  {en: 'Pearls', de: 'Perlen', slug: 'pearls'},
  {en: 'Diamonds', de: 'Diamanten', slug: 'diamonds'},
  {en: 'Stoneware', de: 'Steinzeug', slug: 'stoneware'},
  {en: 'Studio Glass', de: 'Studioglas', slug: 'studio-glass'},
  {en: 'Terra Cotta', de: 'Terrakotta', slug: 'terra-cotta'},
  {en: 'Glaze', de: 'Glasur', slug: 'glaze'},
  {en: 'Engobe', de: 'Engobe', slug: 'engobe'},
  {en: 'Metal', de: 'Metall', slug: 'metal'},
  
  // Material variants
  {en: 'Yellow Gold', de: 'Gelbgold', slug: 'yellow-gold'},
  {en: 'Rose Gold', de: 'Rotgold', slug: 'rose-gold'},
  {en: '18k Gold', de: '750 Gold', slug: '18k-gold'},
  {en: 'Sterling Silver', de: '925 Silber', slug: 'sterling-silver'},
  {en: 'Fine Gold', de: 'Feingold', slug: 'fine-gold'},
  {en: 'Gold Plated', de: 'Vergoldet', slug: 'gold-plated'},
  {en: 'Blackened', de: 'Geschwärzt', slug: 'blackened'},
  {en: 'Plated', de: 'Plattiert', slug: 'plated'}
];

const MEDIUM_CONCEPTS = [
  // Jewelry
  {en: 'Ring', de: 'Ring', slug: 'ring'},
  {en: 'Rings', de: 'Ringe', slug: 'rings'},
  {en: 'Necklace', de: 'Halskette', slug: 'necklace'},
  {en: 'Chain', de: 'Kette', slug: 'chain'},
  {en: 'Earrings', de: 'Ohrringe', slug: 'earrings'},
  {en: 'Ear Jewelry', de: 'Ohrschmuck', slug: 'ear-jewelry'},
  {en: 'Brooch', de: 'Brosche', slug: 'brooch'},
  {en: 'Pendant', de: 'Anhänger', slug: 'pendant'},
  {en: 'Bracelet', de: 'Armreif', slug: 'bracelet'},
  {en: 'Neck Jewelry', de: 'Halsschmuck', slug: 'neck-jewelry'},
  
  // Vessels/containers
  {en: 'Vase', de: 'Vase', slug: 'vase'},
  {en: 'Vessel', de: 'Gefäß', slug: 'vessel'},
  {en: 'Bowl', de: 'Schale', slug: 'bowl'},
  {en: 'Bowls', de: 'Schalen', slug: 'bowls'},
  {en: 'Vessels', de: 'Gefäße', slug: 'vessels'},
  
  // Textiles
  {en: 'Scarf', de: 'Schal', slug: 'scarf'},
  {en: 'Quilt', de: 'Quilt', slug: 'quilt'},
  {en: 'Carpet', de: 'Teppich', slug: 'carpet'}
];

// Create CMS entries
function createCMSEntries(concepts, type) {
  return concepts.map(concept => ({
    _type: type,
    name: {
      en: concept.en,
      de: concept.de
    },
    slug: {
      _type: 'slug',
      current: concept.slug
    }
  }));
}

// Create CMS import data
const materialEntries = createCMSEntries(MATERIAL_CONCEPTS, 'material');
const mediumEntries = createCMSEntries(MEDIUM_CONCEPTS, 'medium');

console.log('=== FIXED CMS IMPORT DATA ===');
console.log(`Materials: ${materialEntries.length} entries (NO DUPLICATES)`);
console.log(`Mediums: ${mediumEntries.length} entries (NO DUPLICATES)`);

// Save as NDJSON for Sanity import
const materialsNDJSON = materialEntries.map(entry => JSON.stringify(entry)).join('\n');
const mediumsNDJSON = mediumEntries.map(entry => JSON.stringify(entry)).join('\n');

fs.writeFileSync(path.join(__dirname, 'materials-import-fixed.ndjson'), materialsNDJSON);
fs.writeFileSync(path.join(__dirname, 'mediums-import-fixed.ndjson'), mediumsNDJSON);

// Save as readable JSON
fs.writeFileSync(path.join(__dirname, 'materials-import-fixed.json'), JSON.stringify(materialEntries, null, 2));
fs.writeFileSync(path.join(__dirname, 'mediums-import-fixed.json'), JSON.stringify(mediumEntries, null, 2));

console.log('\n=== FILES CREATED ===');
console.log('✓ materials-import-fixed.ndjson - No duplicates');
console.log('✓ mediums-import-fixed.ndjson - No duplicates');
console.log('✓ materials-import-fixed.json - Human readable');
console.log('✓ mediums-import-fixed.json - Human readable');

// Display sample entries
console.log('\n=== SAMPLE ENTRIES (ONE PER CONCEPT) ===');
materialEntries.slice(0, 5).forEach(entry => {
  console.log(`${entry.name.en} / ${entry.name.de} (${entry.slug.current})`);
});

console.log('\n=== IMPORT COMMANDS ===');
console.log('cd ../../sanity-cms');
console.log('sanity dataset import ../scripts/analysis/materials-import-fixed.ndjson');
console.log('sanity dataset import ../scripts/analysis/mediums-import-fixed.ndjson'); 