const fs = require('fs');
const path = require('path');

// Define German-English translation pairs
const translationMap = {
  // Materials
  'silber': 'silver',
  'glas': 'glass',
  'farbe': 'paint',
  'perle': 'pearl',
  'koralle': 'coral',
  'acryl': 'acrylic',
  'messing': 'brass',
  'metall': 'metal',
  'aluminium': 'aluminum',
  'saphir': 'sapphire',
  'diamant': 'diamond',
  'holz': 'wood',
  'eiche': 'oak',
  'kristall': 'crystal',
  'email': 'enamel',
  'lack': 'lacquer',
  'bronze': 'bronze',
  'draht': 'wire',
  'kohle': 'charcoal',
  'harz': 'resin',
  'leder': 'leather',
  'seide': 'silk',
  'baumwolle': 'cotton',
  'wolle': 'wool',
  'leinen': 'linen',
  'filz': 'felt',
  'kaschmir': 'cashmere',
  'samt': 'velvet',
  'leinwand': 'canvas',
  'spitze': 'lace',
  'kunststoff': 'plastic',
  'gummi': 'rubber',
  'stein': 'stone',
  'marmor': 'marble',
  'granit': 'granite',
  'schiefer': 'slate',
  'kalkstein': 'limestone',
  'sandstein': 'sandstone',
  'beton': 'concrete',
  'gips': 'plaster',
  'kreide': 'chalk',
  'papier': 'paper',
  'karton': 'cardboard',
  'pergament': 'parchment',
  'legierung': 'alloy',
  'gitter': 'mesh',
  'kette': 'chain',
  'tinte': 'ink',
  'kohlenstoff': 'carbon',
  'graphit': 'graphite',
  'wachs': 'wax',
  'knochen': 'bone',
  'elfenbein': 'ivory',
  'muschel': 'shell',
  'salz': 'salt',
  'lehm': 'clay',
  'schlamm': 'mud',
  'erde': 'earth',
  'alpaka': 'alpaca',
  'vlies': 'fleece',
  'kork': 'cork',
  'bambus': 'bamboo',
  'birke': 'birch',
  'ahorn': 'maple',
  'nussbaum': 'walnut',
  'kirsch': 'cherry',
  'ebenholz': 'ebony',
  'mahagoni': 'mahogany',
  'kiefer': 'pine',
  'eisen': 'iron',
  'stahl': 'steel',
  'kupfer': 'copper',
  'titan': 'titanium',
  'rubin': 'ruby',
  'smaragd': 'emerald',
  'türkis': 'turquoise',
  'quarz': 'quartz',
  'bernstein': 'amber',
  'onyx': 'onyx',
  'granat': 'garnet',
  'keramik': 'ceramic',
  'porzellan': 'porcelain',
  'ton': 'clay',
  'terrakotta': 'terracotta',
  
  // Mediums
  'halskette': 'necklace',
  'ohrhänger': 'earring',
  'ohrring': 'earring',
  'gefäß': 'vessel',
  'anhänger': 'pendant',
  'teppich': 'carpet',
  'rahmen': 'frame',
  'löffel': 'spoon',
  'tasche': 'bag',
  'kanne': 'jug',
  'armband': 'bracelet',
  'armreif': 'bangle',
  'brosche': 'brooch',
  'nadel': 'pin',
  'manschettenknopf': 'cufflink',
  'halsband': 'collar',
  'krone': 'crown',
  'schale': 'bowl',
  'tasse': 'cup',
  'becher': 'mug',
  'teller': 'plate',
  'schüssel': 'dish',
  'topf': 'pot',
  'flasche': 'bottle',
  'krug': 'pitcher',
  'skulptur': 'sculpture',
  'figur': 'statue',
  'büste': 'bust',
  'gemälde': 'painting',
  'zeichnung': 'drawing',
  'skizze': 'sketch',
  'druck': 'print',
  'stuhl': 'chair',
  'tisch': 'table',
  'schreibtisch': 'desk',
  'hocker': 'stool',
  'bank': 'bench',
  'lampe': 'lamp',
  'licht': 'light',
  'kerze': 'candle',
  'kronleuchter': 'chandelier',
  'spiegel': 'mirror',
  'schachtel': 'box',
  'truhe': 'chest',
  'schrank': 'cabinet',
  'behälter': 'container',
  'korb': 'basket',
  'geldbeutel': 'purse',
  'uhr': 'clock',
  'armbanduhr': 'watch',
  'zeitmesser': 'timepiece',
  'werkzeug': 'tool',
  'besteck': 'cutlery',
  'messer': 'knife',
  'gabel': 'fork',
  'fliese': 'tile',
  'ziegel': 'brick',
  'platte': 'panel',
  'blatt': 'sheet',
  'läufer': 'rug',
  'wandteppich': 'tapestry',
  'vorhang': 'curtain',
  'jalousie': 'blind',
  'decke': 'quilt',
  'steppdecke': 'blanket',
  'kissen': 'pillow',
  'polster': 'cushion',
  'kleidungsstück': 'garment',
  'kleid': 'dress',
  'hemd': 'shirt',
  'bluse': 'blouse',
  'jacke': 'jacket',
  'hut': 'hat',
  'mütze': 'cap',
  'schal': 'scarf',
  'umhang': 'shawl',
  'gürtel': 'belt',
  'schuh': 'shoe',
  'stiefel': 'boot',
  'sandale': 'sandal',
  'pantoffel': 'slipper',
  
  // Finishes
  'geschmiedet': 'forged',
  'montiert': 'mounted',
  'gegossen': 'cast',
  'plattiert': 'plated',
  'poliert': 'polished',
  'matt': 'matte',
  'gebürstet': 'brushed',
  'satiniert': 'satin',
  'gehämmert': 'hammered',
  'strukturiert': 'textured',
  'glatt': 'smooth',
  'rau': 'rough',
  'glänzend': 'glossy',
  'stumpf': 'dull',
  'mattiert': 'frosted',
  'oxidiert': 'oxidized',
  'patiniert': 'patinated',
  'gealtert': 'aged',
  'verwittert': 'weathered',
  'gefeilt': 'filed',
  'geschliffen': 'ground',
  'geätzt': 'etched',
  'graviert': 'engraved',
  'geschnitzt': 'carved',
  'geprägt': 'embossed',
  'gestempelt': 'stamped',
  'gepresst': 'pressed',
  'geschweißt': 'welded',
  'gelötet': 'soldered',
  'hartgelötet': 'brazed',
  'genietet': 'riveted',
  'gewunden': 'threaded',
  'gedreht': 'twisted',
  'gebogen': 'bent',
  'gekrümmt': 'curved',
  'gefaltet': 'folded',
  'gecrimpt': 'crimped',
  'gerillt': 'fluted',
  'perlenbesetzt': 'beaded',
  'besetzt': 'studded',
  'eingelegt': 'inlaid',
  'vergoldet': 'gilded',
  'versilbert': 'silvered',
  'beschichtet': 'coated',
  'bemalt': 'painted',
  'lackiert': 'lacquered',
  'gewachst': 'waxed',
  'geölt': 'oiled',
  'gebeizt': 'stained',
  'gefärbt': 'dyed',
  'gebleicht': 'bleached',
  'getönt': 'tinted',
  'glasiert': 'glazed',
  'gebrannt': 'fired',
  'geglüht': 'annealed',
  'gehärtet': 'hardened',
  'weichgemacht': 'softened',
  'gestreckt': 'stretched',
  'komprimiert': 'compressed',
  'gerollt': 'rolled',
  'abgeflacht': 'flattened',
  'perforiert': 'perforated',
  'gestanzt': 'punched',
  'gebohrt': 'drilled',
  'geschnitten': 'cut',
  'fertig': 'finished',
  'roh': 'raw',
  'unbehandelt': 'unfinished',
  'natürlich': 'natural',
  'einfach': 'plain'
};

// Load the analysis results
const analysisPath = path.join(__dirname, 'materials-mediums-finishes-analysis.txt');
const analysisContent = fs.readFileSync(analysisPath, 'utf8');

// Parse the analysis results
function parseAnalysisResults(content) {
  const lines = content.split('\n');
  let currentSection = null;
  const sections = {
    materials: new Map(),
    mediums: new Map(),
    finishes: new Map()
  };
  
  for (const line of lines) {
    if (line.includes('=== MATERIALS ===')) {
      currentSection = 'materials';
      continue;
    } else if (line.includes('=== MEDIUMS ===')) {
      currentSection = 'mediums';
      continue;
    } else if (line.includes('=== FINISHES ===')) {
      currentSection = 'finishes';
      continue;
    } else if (line.includes('=== UNCATEGORIZED') || line.includes('===') && currentSection) {
      // Stop parsing when we hit uncategorized or any other section
      currentSection = null;
      continue;
    }
    
    if (currentSection && line.trim() && !line.startsWith('Found ')) {
      const match = line.match(/^(\S+)\s+(\d+)$/);
      if (match) {
        const [, term, count] = match;
        sections[currentSection].set(term, parseInt(count));
      }
    }
  }
  
  return sections;
}

// Merge duplicates
function mergeDuplicates(termMap, translationMap) {
  const merged = new Map();
  const processed = new Set();
  
  for (const [term, count] of termMap) {
    if (processed.has(term)) continue;
    
    let mergedCount = count;
    let preferredTerm = term;
    
    // Check if this term has a translation
    const translation = translationMap[term];
    if (translation && termMap.has(translation)) {
      // This is a German term with an English equivalent
      mergedCount += termMap.get(translation);
      preferredTerm = translation; // Prefer English
      processed.add(translation);
    } else {
      // Check if this term is an English term with a German equivalent
      const germanTerm = Object.keys(translationMap).find(key => translationMap[key] === term);
      if (germanTerm && termMap.has(germanTerm)) {
        mergedCount += termMap.get(germanTerm);
        processed.add(germanTerm);
      }
    }
    
    merged.set(preferredTerm, mergedCount);
    processed.add(term);
  }
  
  return merged;
}

// Parse the results
const results = parseAnalysisResults(analysisContent);

// Merge duplicates for each section
const mergedMaterials = mergeDuplicates(results.materials, translationMap);
const mergedMediums = mergeDuplicates(results.mediums, translationMap);
const mergedFinishes = mergeDuplicates(results.finishes, translationMap);

// Sort by count (descending)
const sortedMaterials = Array.from(mergedMaterials.entries()).sort((a, b) => b[1] - a[1]);
const sortedMediums = Array.from(mergedMediums.entries()).sort((a, b) => b[1] - a[1]);
const sortedFinishes = Array.from(mergedFinishes.entries()).sort((a, b) => b[1] - a[1]);

// Report duplicates found
console.log('=== DUPLICATE ANALYSIS ===');
console.log('Original counts:');
console.log(`- Materials: ${results.materials.size}`);
console.log(`- Mediums: ${results.mediums.size}`);
console.log(`- Finishes: ${results.finishes.size}`);
console.log('');
console.log('After merging duplicates:');
console.log(`- Materials: ${sortedMaterials.length}`);
console.log(`- Mediums: ${sortedMediums.length}`);
console.log(`- Finishes: ${sortedFinishes.length}`);
console.log('');

// Generate cleaned output
const outputLines = [];
outputLines.push('=== CLEANED MATERIALS, MEDIUMS & FINISHES ANALYSIS ===');
outputLines.push('Language duplicates have been merged (German terms consolidated with English equivalents)');
outputLines.push('');

outputLines.push('=== MATERIALS ===');
outputLines.push(`Found ${sortedMaterials.length} materials (after merging duplicates):`);
outputLines.push('');
sortedMaterials.forEach(([term, count]) => {
  outputLines.push(`${term} ${count}`);
});
outputLines.push('');

outputLines.push('=== MEDIUMS ===');
outputLines.push(`Found ${sortedMediums.length} mediums (after merging duplicates):`);
outputLines.push('');
sortedMediums.forEach(([term, count]) => {
  outputLines.push(`${term} ${count}`);
});
outputLines.push('');

outputLines.push('=== FINISHES ===');
outputLines.push(`Found ${sortedFinishes.length} finishes (after merging duplicates):`);
outputLines.push('');
sortedFinishes.forEach(([term, count]) => {
  outputLines.push(`${term} ${count}`);
});

// Write cleaned output
const cleanedOutputPath = path.join(__dirname, 'cleaned-materials-mediums-finishes-analysis.txt');
fs.writeFileSync(cleanedOutputPath, outputLines.join('\n'));

console.log(`Cleaned analysis saved to: ${cleanedOutputPath}`);

// Show some examples of merged duplicates
console.log('\n=== EXAMPLES OF MERGED DUPLICATES ===');
const duplicateExamples = [
  ['silver', 'silber'],
  ['glass', 'glas'],
  ['necklace', 'halskette'],
  ['forged', 'geschmiedet'],
  ['mounted', 'montiert'],
  ['cast', 'gegossen'],
  ['plated', 'plattiert'],
  ['vessel', 'gefäß'],
  ['earring', 'ohrhänger'],
  ['spoon', 'löffel']
];

duplicateExamples.forEach(([english, german]) => {
  const englishCount = results.materials.get(english) || results.mediums.get(english) || results.finishes.get(english) || 0;
  const germanCount = results.materials.get(german) || results.mediums.get(german) || results.finishes.get(german) || 0;
  const mergedCount = englishCount + germanCount;
  
  if (englishCount > 0 && germanCount > 0) {
    console.log(`${english} ${englishCount} + ${german} ${germanCount} = ${english} ${mergedCount}`);
  }
}); 