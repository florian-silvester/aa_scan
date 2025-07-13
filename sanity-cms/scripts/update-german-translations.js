import sanityClient from '../sanity-client.js';

// Comprehensive German translations for materials
const materialTranslations = {
  'silver': 'silber',
  'gold': 'gold',
  'glass': 'glas',
  'porcelain': 'porzellan',
  'steel': 'stahl',
  'ceramic': 'keramik',
  'copper': 'kupfer',
  'silk': 'seide',
  'paper': 'papier',
  'clay': 'ton',
  'wool': 'wolle',
  'bronze': 'bronze',
  'metal': 'metall',
  'cotton': 'baumwolle',
  'platinum': 'platin',
  'wood': 'holz',
  'oak': 'eiche',
  'crystal': 'kristall',
  'enamel': 'email',
  'lacquer': 'lack',
  'sand': 'sand',
  'wire': 'draht',
  'charcoal': 'kohle',
  'plastic': 'kunststoff',
  'resin': 'harz',
  'pigment': 'pigment',
  'pearl': 'perle',
  'diamond': 'diamant',
  'merino': 'merino',
  'alloy': 'legierung',
  'brass': 'messing',
  'paint': 'farbe',
  'cork': 'kork',
  'coral': 'koralle',
  'onyx': 'onyx',
  'chain': 'kette',
  'acrylic': 'acryl',
  'aluminum': 'aluminium',
  'leather': 'leder',
  'walnut': 'nussbaum',
  'shell': 'muschel',
  'palladium': 'palladium',
  'rubber': 'gummi',
  'quartz': 'quarz',
  'iron': 'eisen',
  'turquoise': 'türkis',
  'stone': 'stein',
  'bone': 'knochen',
  'opal': 'opal',
  'amber': 'bernstein',
  'maple': 'ahorn',
  'graphite': 'graphit',
  'pine': 'kiefer',
  'ebony': 'ebenholz',
  'bamboo': 'bambus',
  'linen': 'leinen',
  'birch': 'birke',
  'titanium': 'titan',
  'concrete': 'beton',
  'cashmere': 'kaschmir',
  'ruby': 'rubin',
  'garnet': 'granat',
  'earth': 'erde',
  'velvet': 'samt',
  'limestone': 'kalkstein',
  'ivory': 'elfenbein',
  'granite': 'granit',
  'sandstone': 'sandstein',
  'felt': 'filz',
  'wax': 'wachs',
  'plaster': 'gips',
  'alpaca': 'alpaka',
  'jade': 'jade',
  'saphir': 'saphir'
};

// German translations for mediums
const mediumTranslations = {
  'necklace': 'halskette',
  'ring': 'ring',
  'vessel': 'gefäß',
  'brooch': 'brosche',
  'vase': 'vase',
  'bowl': 'schale',
  'pendant': 'anhänger',
  'bracelet': 'armband',
  'scarf': 'schal',
  'bangle': 'armreif',
  'light': 'licht',
  'carpet': 'teppich',
  'quilt': 'steppdecke',
  'bag': 'tasche',
  'lamp': 'lampe',
  'installation': 'installation',
  'mirror': 'spiegel',
  'painting': 'gemälde',
  'cup': 'tasse',
  'print': 'druck',
  'box': 'box',
  'plate': 'teller',
  'chair': 'stuhl',
  'cutlery': 'besteck',
  'rug': 'teppich',
  'earring': 'ohrring',
  'table': 'tisch',
  'spoon': 'löffel',
  'jug': 'krug',
  'container': 'behälter',
  'blanket': 'decke',
  'bottle': 'flasche',
  'drawing': 'zeichnung',
  'jacket': 'jacke',
  'pin': 'anstecknadel',
  'candle': 'kerze',
  'shoe': 'schuh',
  'pot': 'topf',
  'mug': 'becher',
  'dress': 'kleid',
  'cushion': 'kissen',
  'frame': 'rahmen',
  'crown': 'krone',
  'collar': 'kragen',
  'cabinet': 'schrank',
  'jar': 'glas',
  'chandelier': 'kronleuchter',
  'hat': 'hut',
  'desk': 'schreibtisch',
  'shirt': 'hemd',
  'dish': 'schüssel',
  'cap': 'mütze',
  'sketch': 'skizze'
};

// German translations for finishes
const finishTranslations = {
  'plated': 'plattiert',
  'colored': 'gefärbt',
  'forged': 'geschmiedet',
  'oxidized': 'oxidiert',
  'mounted': 'montiert',
  'polished': 'poliert',
  'natural': 'natürlich',
  'matt': 'matt',
  'ground': 'geschliffen',
  'patinated': 'patiniert',
  'lacquered': 'lackiert',
  'folded': 'gefaltet',
  'brushed': 'gebürstet',
  'cut': 'geschnitten',
  'oiled': 'geölt',
  'twisted': 'gedreht',
  'coated': 'beschichtet',
  'engraved': 'graviert',
  'waxed': 'gewachst',
  'tinted': 'getönt',
  'cast': 'gegossen',
  'beaded': 'mit perlen',
  'glazed': 'glasiert',
  'burnished': 'poliert',
  'pressed': 'gepresst',
  'riveted': 'genietet',
  'finished': 'bearbeitet',
  'plain': 'schlicht',
  'carved': 'geschnitzt',
  'painted': 'bemalt',
  'satin': 'satiniert',
  'raw': 'roh'
};

// Update function
async function updateTranslations() {
  console.log('🔄 Updating German translations...');
  
  try {
    // Update materials
    console.log('\n📦 Updating materials...');
    const materials = await sanityClient.fetch('*[_type == "material"]');
    for (const material of materials) {
      const englishName = material.name.en;
      const germanName = materialTranslations[englishName] || englishName;
      
      if (germanName !== englishName) {
        await sanityClient.patch(material._id).set({
          'name.de': germanName
        }).commit();
        console.log(`✅ Updated material: ${englishName} → ${germanName}`);
      }
    }
    
    // Update mediums
    console.log('\n🎨 Updating mediums...');
    const mediums = await sanityClient.fetch('*[_type == "medium"]');
    for (const medium of mediums) {
      const englishName = medium.name.en;
      const germanName = mediumTranslations[englishName] || englishName;
      
      if (germanName !== englishName) {
        await sanityClient.patch(medium._id).set({
          'name.de': germanName
        }).commit();
        console.log(`✅ Updated medium: ${englishName} → ${germanName}`);
      }
    }
    
    // Update finishes
    console.log('\n🔧 Updating finishes...');
    const finishes = await sanityClient.fetch('*[_type == "finish"]');
    for (const finish of finishes) {
      const englishName = finish.name.en;
      const germanName = finishTranslations[englishName] || englishName;
      
      if (germanName !== englishName) {
        await sanityClient.patch(finish._id).set({
          'name.de': germanName
        }).commit();
        console.log(`✅ Updated finish: ${englishName} → ${germanName}`);
      }
    }
    
    console.log('\n🎉 All translations updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating translations:', error);
  }
}

// Run the update
updateTranslations(); 