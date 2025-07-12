import sanity from './sanity-client.js';

// Comprehensive material detection patterns
const MATERIAL_PATTERNS = {
  // Metals (English and German)
  metals: [
    'gold', 'silver', 'silber', 'platinum', 'platin', 'brass', 'messing',
    'bronze', 'copper', 'kupfer', 'steel', 'stahl', 'iron', 'eisen',
    'titanium', 'aluminium', 'aluminum', 'nickel', 'pewter', 'zinn',
    'rose gold', 'white gold', 'yellow gold', 'rosegold', 'weißgold', 'gelbgold',
    '18k', '14k', '925', 'sterling', 'fine silver', 'feinsilber'
  ],
  
  // Gems and stones
  stones: [
    'diamond', 'diamant', 'ruby', 'rubin', 'emerald', 'smaragd', 'sapphire', 'saphir',
    'pearl', 'perle', 'coral', 'koralle', 'amber', 'bernstein', 'jade',
    'opal', 'turquoise', 'türkis', 'garnet', 'granat', 'amethyst', 'topaz',
    'quartz', 'quarz', 'crystal', 'kristall', 'stone', 'stein', 'gem',
    'agate', 'achat', 'onyx', 'malachite', 'malachit', 'lapis lazuli',
    'moonstone', 'mondstein', 'sunstone', 'sonnenstein', 'aventurine',
    'carnelian', 'karneol', 'hematite', 'hämatit', 'obsidian', 'jasper',
    'labradorite', 'prehnite', 'peridot', 'citrine', 'zitrin', 'aquamarine',
    'tanzanite', 'iolite', 'zirconia', 'zirkon', 'spinel', 'spinell'
  ],
  
  // Ceramics and glass
  ceramics: [
    'ceramic', 'keramik', 'porcelain', 'porzellan', 'clay', 'ton', 'terracotta',
    'stoneware', 'steinzeug', 'earthenware', 'steingut', 'glass', 'glas',
    'crystal glass', 'kristallglas', 'borosilicate', 'borosilikat', 'enamel', 'email'
  ],
  
  // Organic materials
  organic: [
    'wood', 'holz', 'oak', 'eiche', 'maple', 'ahorn', 'walnut', 'nuss',
    'ebony', 'ebenholz', 'bamboo', 'bambus', 'cork', 'kork',
    'leather', 'leder', 'suede', 'wildleder', 'cordovan', 'patent leather',
    'horn', 'bone', 'knochen', 'ivory', 'elfenbein', 'shell', 'muschel',
    'paper', 'papier', 'cardboard', 'pappe', 'parchment', 'pergament',
    'cotton', 'baumwolle', 'silk', 'seide', 'wool', 'wolle', 'linen', 'leinen',
    'hemp', 'hanf', 'jute', 'felt', 'filz', 'velvet', 'samt', 'canvas', 'leinwand'
  ],
  
  // Synthetic materials
  synthetic: [
    'plastic', 'kunststoff', 'acrylic', 'acryl', 'resin', 'harz', 'epoxy',
    'polyester', 'nylon', 'vinyl', 'rubber', 'gummi', 'silicone', 'silikon',
    'fiberglass', 'fiberglas', 'carbon fiber', 'kohlefaser', 'plexiglass'
  ],
  
  // Treatments and finishes
  treatments: [
    'oxidized', 'oxidiert', 'patina', 'lacquer', 'lack', 'varnish', 'firnis',
    'polished', 'poliert', 'brushed', 'gebürstet', 'matte', 'matt',
    'glossy', 'glänzend', 'sandblasted', 'sandgestrahlt', 'anodized', 'anodisiert',
    'galvanized', 'galvanisiert', 'plated', 'plattiert', 'gilded', 'vergoldet',
    'rhodium', 'rhodium-plated', 'rhodiniert'
  ]
};

class MaterialExtractor {
  constructor() {
    this.allPatterns = Object.values(MATERIAL_PATTERNS).flat();
    this.materialStats = new Map();
    this.discoveredMaterials = new Set();
  }

  extractMaterialsFromText(text) {
    if (!text) return [];
    
    const lowerText = text.toLowerCase();
    const found = new Set();
    
    // Check each pattern
    this.allPatterns.forEach(pattern => {
      const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(lowerText)) {
        found.add(this.normalizeMaterial(pattern));
        this.discoveredMaterials.add(pattern);
        this.materialStats.set(pattern, (this.materialStats.get(pattern) || 0) + 1);
      }
    });
    
    // Also look for common material combinations
    const combinations = [
      'sterling silver', 'fine silver', 'rose gold', 'white gold', 'yellow gold',
      'stainless steel', 'carbon steel', 'tool steel', 'cast iron',
      'lead crystal', 'borosilicate glass', 'tempered glass',
      'oxidized silver', 'blackened silver', 'rhodium plated'
    ];
    
    combinations.forEach(combo => {
      if (lowerText.includes(combo.toLowerCase())) {
        found.add(this.normalizeMaterial(combo));
        this.discoveredMaterials.add(combo);
        this.materialStats.set(combo, (this.materialStats.get(combo) || 0) + 1);
      }
    });
    
    return Array.from(found);
  }
  
  normalizeMaterial(material) {
    // Convert German to English and normalize
    const translations = {
      'silber': 'silver',
      'stahl': 'steel',
      'eisen': 'iron',
      'kupfer': 'copper',
      'messing': 'brass',
      'keramik': 'ceramic',
      'porzellan': 'porcelain',
      'holz': 'wood',
      'leder': 'leather',
      'glas': 'glass',
      'stein': 'stone',
      'kunststoff': 'plastic',
      'baumwolle': 'cotton',
      'seide': 'silk',
      'wolle': 'wool'
    };
    
    const normalized = translations[material.toLowerCase()] || material.toLowerCase();
    return normalized.replace(/[^a-z0-9\s-]/g, '').trim();
  }
  
  getTopMaterials(limit = 50) {
    return Array.from(this.materialStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
}

async function discoverAndExtractMaterials() {
  try {
    console.log('🔍 DISCOVERING MATERIALS FROM ALL ARTWORK DESCRIPTIONS...\n');
    
    // Get all artworks with descriptions
    const artworks = await sanity.fetch(`
      *[_type == "artwork" && defined(description)]{
        _id,
        name,
        workTitle,
        description,
        materials
      }
    `);
    
    console.log(`📊 Analyzing ${artworks.length} artworks with descriptions...`);
    
    const extractor = new MaterialExtractor();
    const artworksToUpdate = [];
    let processedCount = 0;
    
    // First pass: discover all materials
    console.log('\n🔍 DISCOVERY PHASE:');
    artworks.forEach((artwork, index) => {
      if (index % 100 === 0) {
        console.log(`  Processing ${index + 1}/${artworks.length}...`);
      }
      
      const allText = [
        artwork.description?.en || '',
        artwork.description?.de || ''
      ].join(' ');
      
      const foundMaterials = extractor.extractMaterialsFromText(allText);
      
      if (foundMaterials.length > 0) {
        artworksToUpdate.push({
          artwork,
          materials: foundMaterials,
          materialText: foundMaterials.join(', ')
        });
      }
      
      processedCount++;
    });
    
    console.log(`\n📈 DISCOVERY RESULTS:`);
    console.log(`   🎯 Artworks with materials: ${artworksToUpdate.length}/${processedCount}`);
    console.log(`   📋 Unique materials found: ${extractor.discoveredMaterials.size}`);
    
    // Show top materials
    const topMaterials = extractor.getTopMaterials(20);
    console.log(`\n🏆 TOP 20 MATERIALS BY FREQUENCY:`);
    topMaterials.forEach(([material, count], index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}. ${material.padEnd(20)} (${count}×)`);
    });
    
    // Get existing materials from database
    const existingMaterials = await sanity.fetch(`
      *[_type == "material"]{
        _id,
        name,
        slug,
        category
      }
    `);
    
    const materialLookup = new Map();
    existingMaterials.forEach(material => {
      materialLookup.set(material.slug.current, material._id);
      materialLookup.set(material.name.en.toLowerCase(), material._id);
    });
    
    console.log(`\n📚 Found ${existingMaterials.length} existing materials in database`);
    
    // Second pass: assign material references
    console.log(`\n🔗 ASSIGNMENT PHASE:`);
    console.log(`Assigning material references to ${artworksToUpdate.length} artworks...`);
    
    let assignedCount = 0;
    let skippedCount = 0;
    
    for (const {artwork, materials} of artworksToUpdate) {
      const materialRefs = [];
      
      materials.forEach(materialName => {
        const materialId = materialLookup.get(materialName) || materialLookup.get(materialName.toLowerCase());
        if (materialId) {
          materialRefs.push({
            _type: 'reference',
            _ref: materialId,
            _key: `material-${materialId.slice(-8)}-${Date.now()}`
          });
        }
      });
      
      if (materialRefs.length > 0) {
        try {
          await sanity.patch(artwork._id).set({
            materials: materialRefs
          }).commit();
          
          assignedCount++;
          
          const title = artwork.name || artwork.workTitle?.en || artwork.workTitle?.de || 'Untitled';
          console.log(`   ✅ ${title}: ${materialRefs.length} materials assigned`);
          
        } catch (error) {
          console.log(`   ❌ Failed to update ${artwork._id}: ${error.message}`);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
      
      // Progress update
      if ((assignedCount + skippedCount) % 50 === 0) {
        console.log(`   📊 Progress: ${assignedCount + skippedCount}/${artworksToUpdate.length}`);
      }
    }
    
    console.log(`\n🎉 MATERIAL ASSIGNMENT COMPLETE!`);
    console.log(`   ✅ Successfully assigned: ${assignedCount} artworks`);
    console.log(`   ⏭️  Skipped (no matching materials): ${skippedCount} artworks`);
    console.log(`   📊 Total processed: ${assignedCount + skippedCount} artworks`);
    
    // Show materials that need to be added to database
    const missingMaterials = Array.from(extractor.discoveredMaterials)
      .filter(material => {
        const normalized = extractor.normalizeMaterial(material);
        return !materialLookup.has(normalized) && !materialLookup.has(normalized.toLowerCase());
      })
      .sort();
    
    if (missingMaterials.length > 0) {
      console.log(`\n📋 MATERIALS NOT IN DATABASE (${missingMaterials.length}):`);
      console.log('Consider adding these to expand coverage:');
      missingMaterials.slice(0, 20).forEach((material, index) => {
        const count = extractor.materialStats.get(material) || 0;
        console.log(`   ${(index + 1).toString().padStart(2)}. ${material} (${count}×)`);
      });
      if (missingMaterials.length > 20) {
        console.log(`   ... and ${missingMaterials.length - 20} more`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during material discovery and extraction:', error);
  }
}

discoverAndExtractMaterials(); 