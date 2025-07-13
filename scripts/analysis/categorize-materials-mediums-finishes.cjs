const fs = require('fs');
const path = require('path');

// Load the artwork captions data
const artworkCaptionsPath = path.join(__dirname, '../../archive/migration-data/artwork-captions-2025-07-10.json');
const artworkData = JSON.parse(fs.readFileSync(artworkCaptionsPath, 'utf8'));

// Extract all captions from the nested structure
const allCaptions = [];
if (artworkData.designers && Array.isArray(artworkData.designers)) {
  artworkData.designers.forEach(designer => {
    if (designer.images && Array.isArray(designer.images)) {
      designer.images.forEach(image => {
        if (image.rawCaption) {
          allCaptions.push(image.rawCaption);
        }
        if (image.rawCaption_en) {
          allCaptions.push(image.rawCaption_en);
        }
      });
    }
  });
}

console.log(`Analyzing ${allCaptions.length} artwork captions...`);

// Function to extract and normalize text
function extractAndNormalize(text) {
  if (!text) return [];
  
  // Remove HTML tags, special characters, and normalize
  const cleaned = text
    .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
    .replace(/[^\w\säöüÄÖÜß\-\/]/g, ' ')  // Keep only word chars, German chars, hyphens, slashes
    .replace(/\s+/g, ' ')  // Multiple spaces to single space
    .trim()
    .toLowerCase();
  
  // Split into words/terms
  const terms = cleaned.split(/\s+/).filter(term => term.length > 2);
  
  return terms;
}

// Collect all terms from all captions
const allTerms = new Map();

allCaptions.forEach(caption => {
  const terms = extractAndNormalize(caption);
  terms.forEach(term => {
    allTerms.set(term, (allTerms.get(term) || 0) + 1);
  });
});

console.log(`Found ${allTerms.size} unique terms`);

// Filter out noise terms (numbers, common words, etc.)
const noiseTerms = new Set([
  'und', 'oder', 'mit', 'ohne', 'von', 'für', 'auf', 'in', 'an', 'zu', 'bei', 'nach', 'vor', 'über', 'unter', 'durch', 'gegen', 'um', 'das', 'die', 'der', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'and', 'or', 'with', 'without', 'from', 'for', 'on', 'in', 'at', 'to', 'by', 'after', 'before', 'over', 'under', 'through', 'against', 'around', 'the', 'a', 'an',
  'cm', 'mm', 'inch', 'inches', 'diameter', 'height', 'width', 'length', 'durchmesser', 'höhe', 'breite', 'länge',
  'foto', 'photo', 'photography', 'image', 'bild', 'picture', 'photographer', 'fotograf',
  'copyright', 'rights', 'reserved', 'all', 'alle', 'rechte', 'vorbehalten',
  'courtesy', 'galerie', 'gallery', 'museum', 'collection', 'sammlung', 'private', 'privat',
  'website', 'www', 'http', 'https', 'com', 'org', 'net', 'de',
  'titel', 'title', 'name', 'artist', 'künstler', 'creator', 'author', 'autor',
  'year', 'jahr', 'date', 'datum', 'century', 'jahrhundert',
  'size', 'größe', 'format', 'dimension', 'dimensions', 'dimensionen',
  'price', 'preis', 'euro', 'eur', 'usd', 'dollar', 'cost', 'kosten',
  'available', 'verfügbar', 'sold', 'verkauft', 'exhibition', 'ausstellung',
  'about', 'über', 'contact', 'kontakt', 'info', 'information', 'informationen',
  'work', 'arbeit', 'piece', 'stück', 'artwork', 'kunstwerk', 'object', 'objekt',
  'more', 'mehr', 'other', 'andere', 'weitere', 'similar', 'ähnlich',
  'new', 'neu', 'old', 'alt', 'modern', 'contemporary', 'zeitgenössisch',
  'beautiful', 'schön', 'nice', 'lovely', 'great', 'toll', 'wonderful', 'wunderbar',
  'unique', 'einzigartig', 'special', 'besonders', 'rare', 'selten',
  'please', 'bitte', 'thank', 'danke', 'welcome', 'willkommen'
]);

// Filter terms - keep only those that appear 2+ times and aren't noise
const filteredTerms = new Map();
for (const [term, count] of allTerms) {
  if (count >= 2 && !noiseTerms.has(term) && !/^\d+$/.test(term)) {
    filteredTerms.set(term, count);
  }
}

console.log(`After filtering: ${filteredTerms.size} meaningful terms`);

// Define material keywords (substances)
const materialKeywords = new Set([
  'gold', 'silver', 'silber', 'bronze', 'copper', 'kupfer', 'brass', 'messing', 'steel', 'stahl', 'iron', 'eisen', 'aluminum', 'aluminium',
  'platinum', 'palladium', 'titanium', 'titan',
  'diamond', 'diamant', 'ruby', 'rubin', 'sapphire', 'saphir', 'emerald', 'smaragd', 'pearl', 'perle', 'turquoise', 'türkis',
  'quartz', 'quarz', 'crystal', 'kristall', 'jade', 'amber', 'bernstein', 'coral', 'koralle', 'onyx', 'opal', 'garnet', 'granat',
  'glass', 'glas', 'ceramic', 'keramik', 'porcelain', 'porzellan', 'clay', 'ton', 'terracotta', 'terrakotta',
  'wood', 'holz', 'oak', 'eiche', 'pine', 'kiefer', 'birch', 'birke', 'maple', 'ahorn', 'walnut', 'nussbaum', 'cherry', 'kirsch',
  'ebony', 'ebenholz', 'mahogany', 'mahagoni', 'bamboo', 'bambus', 'cork', 'kork',
  'leather', 'leder', 'silk', 'seide', 'cotton', 'baumwolle', 'wool', 'wolle', 'linen', 'leinen', 'felt', 'filz',
  'cashmere', 'kaschmir', 'velvet', 'samt', 'canvas', 'leinwand', 'denim', 'jeans', 'lace', 'spitze',
  'plastic', 'kunststoff', 'plexiglas', 'acrylic', 'acryl', 'resin', 'harz', 'rubber', 'gummi',
  'stone', 'stein', 'marble', 'marmor', 'granite', 'granit', 'slate', 'schiefer', 'limestone', 'kalkstein',
  'sandstone', 'sandstein', 'concrete', 'beton', 'plaster', 'gips', 'chalk', 'kreide',
  'paper', 'papier', 'cardboard', 'karton', 'parchment', 'pergament', 'canvas', 'leinwand',
  'metal', 'metall', 'alloy', 'legierung', 'wire', 'draht', 'mesh', 'gitter', 'chain', 'kette',
  'enamel', 'email', 'lacquer', 'lack', 'paint', 'farbe', 'pigment', 'ink', 'tinte',
  'carbon', 'kohlenstoff', 'graphite', 'graphit', 'charcoal', 'kohle', 'wax', 'wachs',
  'bone', 'knochen', 'horn', 'horn', 'ivory', 'elfenbein', 'shell', 'muschel',
  'sand', 'salt', 'salz', 'clay', 'lehm', 'mud', 'schlamm', 'earth', 'erde',
  'merino', 'alpaca', 'alpaka', 'mohair', 'angora', 'fleece', 'vlies'
]);

// Define medium keywords (object types)
const mediumKeywords = new Set([
  'ring', 'necklace', 'halskette', 'bracelet', 'armband', 'armreif', 'bangle', 'earring', 'ohrring', 'ohrhänger',
  'brooch', 'brosche', 'pin', 'nadel', 'cufflink', 'manschettenknopf', 'pendant', 'anhänger',
  'chain', 'kette', 'choker', 'collar', 'halsband', 'tiara', 'diadem', 'crown', 'krone',
  'vase', 'bowl', 'schale', 'cup', 'tasse', 'mug', 'becher', 'plate', 'teller', 'dish', 'schüssel',
  'pot', 'topf', 'jar', 'glas', 'bottle', 'flasche', 'pitcher', 'krug', 'jug', 'kanne',
  'sculpture', 'skulptur', 'statue', 'figur', 'bust', 'büste', 'relief', 'installation',
  'painting', 'gemälde', 'drawing', 'zeichnung', 'sketch', 'skizze', 'print', 'druck',
  'chair', 'stuhl', 'table', 'tisch', 'desk', 'schreibtisch', 'stool', 'hocker', 'bench', 'bank',
  'lamp', 'lampe', 'light', 'licht', 'candle', 'kerze', 'chandelier', 'kronleuchter',
  'mirror', 'spiegel', 'frame', 'rahmen', 'box', 'schachtel', 'chest', 'truhe', 'cabinet', 'schrank',
  'vessel', 'gefäß', 'container', 'behälter', 'basket', 'korb', 'bag', 'tasche', 'purse', 'geldbeutel',
  'clock', 'uhr', 'watch', 'armbanduhr', 'timepiece', 'zeitmesser',
  'tool', 'werkzeug', 'instrument', 'utensil', 'besteck', 'cutlery', 'knife', 'messer', 'spoon', 'löffel', 'fork', 'gabel',
  'tile', 'fliese', 'brick', 'ziegel', 'panel', 'platte', 'sheet', 'blatt', 'plate', 'platte',
  'carpet', 'teppich', 'rug', 'läufer', 'tapestry', 'wandteppich', 'curtain', 'vorhang', 'blind', 'jalousie',
  'quilt', 'decke', 'blanket', 'steppdecke', 'pillow', 'kissen', 'cushion', 'polster',
  'garment', 'kleidungsstück', 'dress', 'kleid', 'shirt', 'hemd', 'blouse', 'bluse', 'jacket', 'jacke',
  'hat', 'hut', 'cap', 'mütze', 'scarf', 'schal', 'shawl', 'umhang', 'belt', 'gürtel',
  'shoe', 'schuh', 'boot', 'stiefel', 'sandal', 'sandale', 'slipper', 'pantoffel'
]);

// Define finish keywords (surface treatments/processes)
const finishKeywords = new Set([
  'polished', 'poliert', 'matte', 'matt', 'brushed', 'gebürstet', 'satin', 'satiniert',
  'hammered', 'gehämmert', 'textured', 'strukturiert', 'smooth', 'glatt', 'rough', 'rau',
  'glossy', 'glänzend', 'shiny', 'poliert', 'dull', 'stumpf', 'frosted', 'mattiert',
  'oxidized', 'oxidiert', 'patinated', 'patiniert', 'aged', 'gealtert', 'weathered', 'verwittert',
  'burnished', 'poliert', 'filed', 'gefeilt', 'sanded', 'geschliffen', 'ground', 'geschliffen',
  'etched', 'geätzt', 'engraved', 'graviert', 'carved', 'geschnitzt', 'embossed', 'geprägt',
  'stamped', 'gestempelt', 'pressed', 'gepresst', 'forged', 'geschmiedet', 'cast', 'gegossen',
  'welded', 'geschweißt', 'soldered', 'gelötet', 'brazed', 'hartgelötet', 'riveted', 'genietet',
  'threaded', 'gewunden', 'twisted', 'gedreht', 'bent', 'gebogen', 'curved', 'gekrümmt',
  'folded', 'gefaltet', 'pleated', 'gefaltet', 'crimped', 'gecrimpt', 'fluted', 'gerillt',
  'beaded', 'perlenbesetzt', 'studded', 'besetzt', 'inlaid', 'eingelegt', 'mounted', 'montiert',
  'plated', 'plattiert', 'gilded', 'vergoldet', 'silvered', 'versilbert', 'coated', 'beschichtet',
  'painted', 'bemalt', 'lacquered', 'lackiert', 'varnished', 'lackiert', 'waxed', 'gewachst',
  'oiled', 'geölt', 'stained', 'gebeizt', 'dyed', 'gefärbt', 'colored', 'gefärbt',
  'bleached', 'gebleicht', 'tinted', 'getönt', 'glazed', 'glasiert', 'fired', 'gebrannt',
  'annealed', 'geglüht', 'tempered', 'gehärtet', 'hardened', 'gehärtet', 'softened', 'weichgemacht',
  'stretched', 'gestreckt', 'compressed', 'komprimiert', 'rolled', 'gerollt', 'flattened', 'abgeflacht',
  'perforated', 'perforiert', 'punched', 'gestanzt', 'drilled', 'gebohrt', 'cut', 'geschnitten',
  'filed', 'gefeilt', 'ground', 'geschliffen', 'polished', 'poliert', 'finished', 'fertig',
  'raw', 'roh', 'unfinished', 'unbehandelt', 'natural', 'natürlich', 'plain', 'einfach'
]);

// Categorize terms
const materials = new Map();
const mediums = new Map();
const finishes = new Map();
const uncategorized = new Map();

for (const [term, count] of filteredTerms) {
  const termLower = term.toLowerCase();
  
  if (materialKeywords.has(termLower)) {
    materials.set(term, count);
  } else if (mediumKeywords.has(termLower)) {
    mediums.set(term, count);
  } else if (finishKeywords.has(termLower)) {
    finishes.set(term, count);
  } else {
    uncategorized.set(term, count);
  }
}

// Sort by count (descending)
const sortedMaterials = Array.from(materials.entries()).sort((a, b) => b[1] - a[1]);
const sortedMediums = Array.from(mediums.entries()).sort((a, b) => b[1] - a[1]);
const sortedFinishes = Array.from(finishes.entries()).sort((a, b) => b[1] - a[1]);
const sortedUncategorized = Array.from(uncategorized.entries()).sort((a, b) => b[1] - a[1]);

console.log('\n=== ANALYSIS RESULTS ===');
console.log(`Materials: ${sortedMaterials.length}`);
console.log(`Mediums: ${sortedMediums.length}`);
console.log(`Finishes: ${sortedFinishes.length}`);
console.log(`Uncategorized: ${sortedUncategorized.length}`);

// Create human-readable output
const outputLines = [];
outputLines.push('=== MATERIALS, MEDIUMS & FINISHES ANALYSIS ===');
outputLines.push(`Analyzed ${allCaptions.length} artwork captions`);
outputLines.push(`Found ${allTerms.size} total unique terms`);
outputLines.push(`Filtered to ${filteredTerms.size} meaningful terms`);
outputLines.push('');

outputLines.push('=== MATERIALS ===');
outputLines.push(`Found ${sortedMaterials.length} materials:`);
outputLines.push('');
sortedMaterials.forEach(([term, count]) => {
  outputLines.push(`${term} ${count}`);
});
outputLines.push('');

outputLines.push('=== MEDIUMS ===');
outputLines.push(`Found ${sortedMediums.length} mediums:`);
outputLines.push('');
sortedMediums.forEach(([term, count]) => {
  outputLines.push(`${term} ${count}`);
});
outputLines.push('');

outputLines.push('=== FINISHES ===');
outputLines.push(`Found ${sortedFinishes.length} finishes:`);
outputLines.push('');
sortedFinishes.forEach(([term, count]) => {
  outputLines.push(`${term} ${count}`);
});
outputLines.push('');

outputLines.push('=== UNCATEGORIZED TERMS (Top 100) ===');
outputLines.push(`Found ${sortedUncategorized.length} uncategorized terms (showing top 100):`);
outputLines.push('');
sortedUncategorized.slice(0, 100).forEach(([term, count]) => {
  outputLines.push(`${term} ${count}`);
});

// Write output file
const outputPath = path.join(__dirname, 'materials-mediums-finishes-analysis.txt');
fs.writeFileSync(outputPath, outputLines.join('\n'));

console.log(`\nAnalysis complete! Results saved to: ${outputPath}`);
console.log(`\nSummary:`);
console.log(`- Materials: ${sortedMaterials.length}`);
console.log(`- Mediums: ${sortedMediums.length}`);
console.log(`- Finishes: ${sortedFinishes.length}`);
console.log(`- Uncategorized: ${sortedUncategorized.length}`); 