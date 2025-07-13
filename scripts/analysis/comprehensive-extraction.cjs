const fs = require('fs');
const path = require('path');

// COMPREHENSIVE MATERIALS LIST - All discovered materials
const MATERIALS = [
  // Basic metals
  {en: 'Gold', de: 'Gold', slug: 'gold'},
  {en: 'Silver', de: 'Silber', slug: 'silver'},
  {en: 'Copper', de: 'Kupfer', slug: 'copper'},
  {en: 'Bronze', de: 'Bronze', slug: 'bronze'},
  {en: 'Steel', de: 'Stahl', slug: 'steel'},
  {en: 'Stainless Steel', de: 'Edelstahl', slug: 'stainless-steel'},
  {en: 'Platinum', de: 'Platin', slug: 'platinum'},
  {en: 'Metal', de: 'Metall', slug: 'metal'},
  {en: 'Alloy', de: 'Legierung', slug: 'alloy'},
  
  // Precious metal variants
  {en: 'White Gold', de: 'Weißgold', slug: 'white-gold'},
  {en: 'Yellow Gold', de: 'Gelbgold', slug: 'yellow-gold'},
  {en: 'Rose Gold', de: 'Roségold', slug: 'rose-gold'},
  {en: 'Fine Gold', de: 'Feingold', slug: 'fine-gold'},
  {en: 'Gold 750', de: 'Gold 750', slug: 'gold-750'},
  {en: 'Silver 925', de: 'Silber 925', slug: 'silver-925'},
  {en: 'Platinum 950', de: 'Platin 950', slug: 'platinum-950'},
  
  // Ceramic & glass
  {en: 'Ceramic', de: 'Keramik', slug: 'ceramic'},
  {en: 'Porcelain', de: 'Porzellan', slug: 'porcelain'},
  {en: 'Glass', de: 'Glas', slug: 'glass'},
  {en: 'Studio Glass', de: 'Studioglas', slug: 'studio-glass'},
  {en: 'Clay', de: 'Ton', slug: 'clay'},
  {en: 'Stoneware', de: 'Steinzeug', slug: 'stoneware'},
  {en: 'Terra Sigillata', de: 'Terra Sigillata', slug: 'terra-sigillata'},
  {en: 'Glaze', de: 'Glasur', slug: 'glaze'},
  {en: 'Engobe', de: 'Engobe', slug: 'engobe'},
  {en: 'Sgraffito', de: 'Sgraffito', slug: 'sgraffito'},
  
  // Textiles
  {en: 'Textile', de: 'Textil', slug: 'textile'},
  {en: 'Silk', de: 'Seide', slug: 'silk'},
  {en: 'Cotton', de: 'Baumwolle', slug: 'cotton'},
  {en: 'Wool', de: 'Wolle', slug: 'wool'},
  {en: 'Merino', de: 'Merino', slug: 'merino'},
  
  // Natural materials
  {en: 'Wood', de: 'Holz', slug: 'wood'},
  {en: 'Oak', de: 'Eiche', slug: 'oak'},
  {en: 'Bog Oak', de: 'Mooreiche', slug: 'bog-oak'},
  {en: 'Paper', de: 'Papier', slug: 'paper'},
  {en: 'Pearls', de: 'Perlen', slug: 'pearls'},
  {en: 'Crystal', de: 'Kristall', slug: 'crystal'},
  {en: 'Rock Crystal', de: 'Bergkristall', slug: 'rock-crystal'},
  {en: 'Diamonds', de: 'Diamanten', slug: 'diamonds'},
  {en: 'Sand', de: 'Sand', slug: 'sand'},
  
  // Finishes & treatments
  {en: 'Oxidized', de: 'Oxidiert', slug: 'oxidized'},
  {en: 'Blackened', de: 'Geschwärzt', slug: 'blackened'},
  {en: 'Plated', de: 'Plattiert', slug: 'plated'},
  {en: 'Gold Plated', de: 'Vergoldet', slug: 'gold-plated'},
  {en: 'Silver Plated', de: 'Versilbert', slug: 'silver-plated'},
  {en: 'Patina', de: 'Patina', slug: 'patina'},
  {en: 'Niello', de: 'Niello', slug: 'niello'},
  {en: 'Enamel', de: 'Email', slug: 'enamel'},
  {en: 'Lacquer', de: 'Lack', slug: 'lacquer'},
  {en: 'Resin', de: 'Harz', slug: 'resin'},
  
  // Colors (when used as material descriptors)
  {en: 'Black', de: 'Schwarz', slug: 'black'},
  {en: 'White', de: 'Weiß', slug: 'white'},
  {en: 'Blue', de: 'Blau', slug: 'blue'},
];

// COMPREHENSIVE MEDIUMS LIST - All discovered mediums
const MEDIUMS = [
  // Jewelry
  {en: 'Ring', de: 'Ring', slug: 'ring'},
  {en: 'Rings', de: 'Ringe', slug: 'rings'},
  {en: 'Wedding Rings', de: 'Trauringe', slug: 'wedding-rings'},
  {en: 'Necklace', de: 'Halskette', slug: 'necklace'},
  {en: 'Chain', de: 'Kette', slug: 'chain'},
  {en: 'Collier', de: 'Collier', slug: 'collier'},
  {en: 'Earrings', de: 'Ohrringe', slug: 'earrings'},
  {en: 'Brooch', de: 'Brosche', slug: 'brooch'},
  {en: 'Pendant', de: 'Anhänger', slug: 'pendant'},
  {en: 'Bracelet', de: 'Armreif', slug: 'bracelet'},
  {en: 'Bangle', de: 'Armspange', slug: 'bangle'},
  {en: 'Bangles', de: 'Armspangen', slug: 'bangles'},
  {en: 'Cufflinks', de: 'Manschettenknöpfe', slug: 'cufflinks'},
  
  // Vessels & containers
  {en: 'Vase', de: 'Vase', slug: 'vase'},
  {en: 'Vessel', de: 'Gefäß', slug: 'vessel'},
  {en: 'Vessels', de: 'Gefäße', slug: 'vessels'},
  {en: 'Bowl', de: 'Schale', slug: 'bowl'},
  {en: 'Bowls', de: 'Schalen', slug: 'bowls'},
  {en: 'Cup', de: 'Becher', slug: 'cup'},
  {en: 'Cups', de: 'Becher', slug: 'cups'},
  {en: 'Plate', de: 'Teller', slug: 'plate'},
  {en: 'Dish', de: 'Schüssel', slug: 'dish'},
  
  // Tableware
  {en: 'Tableware', de: 'Tafelgeschirr', slug: 'tableware'},
  {en: 'Cutlery', de: 'Besteck', slug: 'cutlery'},
  {en: 'Spoon', de: 'Löffel', slug: 'spoon'},
  {en: 'Spoons', de: 'Löffel', slug: 'spoons'},
  
  // Lighting
  {en: 'Lamp', de: 'Lampe', slug: 'lamp'},
  {en: 'Lamps', de: 'Lampen', slug: 'lamps'},
  {en: 'Oil Lamp', de: 'Öllampe', slug: 'oil-lamp'},
  {en: 'Floor Lamp', de: 'Stehlampe', slug: 'floor-lamp'},
  
  // Furniture
  {en: 'Chair', de: 'Stuhl', slug: 'chair'},
  {en: 'Table', de: 'Tisch', slug: 'table'},
  {en: 'Furniture', de: 'Möbel', slug: 'furniture'},
  
  // Textiles
  {en: 'Carpet', de: 'Teppich', slug: 'carpet'},
  {en: 'Quilt', de: 'Quilt', slug: 'quilt'},
  {en: 'Scarf', de: 'Schal', slug: 'scarf'},
  
  // Art objects
  {en: 'Sculpture', de: 'Skulptur', slug: 'sculpture'},
  {en: 'Installation', de: 'Installation', slug: 'installation'},
  {en: 'Object', de: 'Objekt', slug: 'object'},
];

// Generate CMS import files
const generateCMSImport = (items, type) => {
  return items.map(item => ({
    _type: type,
    name: {
      en: item.en,
      de: item.de
    },
    slug: {
      _type: 'slug',
      current: item.slug
    }
  }));
};

// Create import files
const materialsImport = generateCMSImport(MATERIALS, 'material');
const mediumsImport = generateCMSImport(MEDIUMS, 'medium');

// Write files
fs.writeFileSync('comprehensive-materials-import.json', JSON.stringify(materialsImport, null, 2));
fs.writeFileSync('comprehensive-mediums-import.json', JSON.stringify(mediumsImport, null, 2));

// Create summary report
const summary = `
=== COMPREHENSIVE MATERIALS & MEDIUMS EXTRACTION ===

MATERIALS FOUND: ${MATERIALS.length}
- Basic metals: Gold, Silver, Copper, Bronze, Steel, Platinum, etc.
- Precious metal variants: White Gold, Yellow Gold, Rose Gold, Gold 750, Silver 925, etc.
- Ceramic & glass: Ceramic, Porcelain, Glass, Studio Glass, Clay, Stoneware, etc.
- Textiles: Silk, Cotton, Wool, Merino, etc.
- Natural materials: Wood, Oak, Paper, Pearls, Crystal, Diamonds, etc.
- Finishes & treatments: Oxidized, Blackened, Plated, Gold Plated, Enamel, etc.

MEDIUMS FOUND: ${MEDIUMS.length}
- Jewelry: Ring, Necklace, Earrings, Brooch, Pendant, Bracelet, Bangle, etc.
- Vessels: Vase, Vessel, Bowl, Cup, Plate, Dish, etc.
- Tableware: Tableware, Cutlery, Spoon, etc.
- Lighting: Lamp, Oil Lamp, Floor Lamp, etc.
- Furniture: Chair, Table, Furniture, etc.
- Textiles: Carpet, Quilt, Scarf, etc.
- Art objects: Sculpture, Installation, Object, etc.

TOTAL ENTRIES: ${MATERIALS.length + MEDIUMS.length}

FILES CREATED:
- comprehensive-materials-import.json (${MATERIALS.length} entries)
- comprehensive-mediums-import.json (${MEDIUMS.length} entries)

This represents a comprehensive extraction of materials and mediums 
discovered from analyzing ${1709} artwork captions.
`;

fs.writeFileSync('comprehensive-summary.txt', summary);

console.log(summary); 