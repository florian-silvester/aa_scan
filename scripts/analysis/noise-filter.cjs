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
  .filter(([term, count]) => count >= 5); // Only terms with 5+ occurrences

// NOISE FILTERS - Remove obvious non-material/non-medium terms

// 1. Years (4-digit numbers)
const isYear = (term) => /^\d{4}$/.test(term);

// 2. Common stop words (English/German)
const stopWords = new Set([
  'the', 'and', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'from',
  'der', 'die', 'das', 'und', 'von', 'zu', 'in', 'mit', 'auf', 'an', 'aus',
  'ein', 'eine', 'einer', 'eines', 'dem', 'den', 'des', 'sich', 'nicht',
  'ist', 'sind', 'war', 'waren', 'hat', 'haben', 'wird', 'werden'
]);

// 3. Photo/credit terms
const photoCreditTerms = new Set([
  'photo', 'foto', 'courtesy', 'copyright', 'image', 'picture', 'pic',
  'photographer', 'fotograf', 'aufnahme', 'bild', 'abbildung'
]);

// 4. Generic descriptive words (not materials/mediums)
const genericWords = new Set([
  'new', 'old', 'large', 'small', 'big', 'little', 'good', 'bad', 'beautiful',
  'modern', 'contemporary', 'traditional', 'classic', 'unique', 'special',
  'neu', 'alt', 'groß', 'klein', 'gut', 'schlecht', 'schön', 'modern',
  'zeitgenössisch', 'traditionell', 'klassisch', 'einzigartig', 'besonders'
]);

// 5. Measurements and dimensions
const isMeasurement = (term) => /\d+(cm|mm|m|inch|"|')/.test(term);

// 6. Common first names (basic list)
const commonNames = new Set([
  'anna', 'eva', 'maria', 'sara', 'lisa', 'nina', 'tom', 'max', 'alex',
  'frank', 'peter', 'paul', 'hans', 'klaus', 'werner', 'stefan', 'thomas',
  'shin', 'te-hsin', 'ulrike', 'brigitte', 'claudia', 'bettina', 'beate'
]);

// 7. Awards/status terms
const statusTerms = new Set([
  'award', 'winner', 'prize', 'certified', 'exhibition', 'show', 'gallery',
  'museum', 'collection', 'preis', 'gewinner', 'ausstellung', 'sammlung'
]);

// 8. Website/tech terms
const techTerms = new Set([
  'www', 'http', 'https', 'com', 'de', 'net', 'org', 'jpg', 'png', 'gif',
  'html', 'pdf', 'link', 'url', 'website', 'email', 'mail'
]);

// MAIN FILTER FUNCTION
function isNoiseTerm(term) {
  const lower = term.toLowerCase();
  
  // Check all noise categories
  if (isYear(term)) return true;
  if (stopWords.has(lower)) return true;
  if (photoCreditTerms.has(lower)) return true;
  if (genericWords.has(lower)) return true;
  if (isMeasurement(term)) return true;
  if (commonNames.has(lower)) return true;
  if (statusTerms.has(lower)) return true;
  if (techTerms.has(lower)) return true;
  
  // Filter out very short terms (likely noise)
  if (term.length <= 2) return true;
  
  // Filter out terms that are mostly numbers
  if (/^\d+$/.test(term)) return true;
  
  return false;
}

// Apply filter
const filteredTerms = allTerms.filter(([term, count]) => !isNoiseTerm(term));
const noiseTerms = allTerms.filter(([term, count]) => isNoiseTerm(term));

// Sort by frequency
filteredTerms.sort((a, b) => b[1] - a[1]);
noiseTerms.sort((a, b) => b[1] - a[1]);

console.log('=== NOISE FILTER RESULTS ===');
console.log(`Original terms: ${allTerms.length}`);
console.log(`After noise filtering: ${filteredTerms.length}`);
console.log(`Noise terms removed: ${noiseTerms.length}`);

// Show top filtered terms for manual review
console.log('\n=== TOP 50 FILTERED TERMS (for manual categorization) ===');
filteredTerms.slice(0, 50).forEach(([term, count]) => {
  console.log(`${term} ${count}`);
});

// Save results
const filteredOutput = filteredTerms.map(([term, count]) => `${term} ${count}`).join('\n');
const noiseOutput = noiseTerms.map(([term, count]) => `${term} ${count}`).join('\n');

fs.writeFileSync(path.join(__dirname, 'filtered-terms.txt'), filteredOutput);
fs.writeFileSync(path.join(__dirname, 'noise-terms.txt'), noiseOutput);

console.log('\n=== FILES CREATED ===');
console.log('✓ filtered-terms.txt - Terms after noise removal');
console.log('✓ noise-terms.txt - Removed noise terms');
console.log('\nNow you can manually categorize the filtered terms into materials/mediums!'); 