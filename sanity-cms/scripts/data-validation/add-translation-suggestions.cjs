const fs = require('fs');
const path = require('path');

// Translation mappings for common terms
const germanToEnglish = {
  'Objekt': 'Object',
  'Glas': 'Glass',
  'Keramik': 'Ceramic',
  'Silber': 'Silver',
  'Gold': 'Gold',
  'Platin': 'Platinum',
  'Ring': 'Ring',
  'Halskette': 'Necklace',
  'Halsschmuck': 'Neck jewelry',
  'Armschmuck': 'Bracelet',
  'Armreif': 'Bracelet',
  'Ohrhänger': 'Earrings',
  'Ohrring': 'Earring',
  'Brosche': 'Brooch',
  'Anhänger': 'Pendant',
  'Kanne': 'Jug',
  'Gefäß': 'Vessel',
  'Schale': 'Bowl',
  'Tafelgeschirr': 'Tableware',
  'Holz': 'Wood',
  'Metall': 'Metal',
  'Messing': 'Brass',
  'Kupfer': 'Copper',
  'Stahl': 'Steel',
  'Foto': 'Photo',
  'Skizze': 'Sketch',
  'geschmiedet': 'forged',
  'montiert': 'mounted',
  'geschwärzt': 'blackened',
  'gedrückt': 'pressed',
  'galvanisiert': 'galvanized',
  'gebrauchte': 'used',
  'getropft': 'dripped',
  'gegossen': 'cast',
  'feuervergoldet': 'fire-gilded',
  'Feingold': 'fine gold',
  'Brillanten': 'diamonds',
  'Diamanten': 'diamonds',
  'versilbert': 'silver plated',
  'Steinzeug': 'stoneware',
  'Polyurethan': 'polyurethane',
  'Sand': 'sand',
  'Pigment': 'pigment',
  'Lack': 'lacquer',
  'Glasuren': 'glazes',
  'Papierobjekt': 'Paper object',
  'Papierobjekte': 'Paper objects',
  'Lichtobjekt': 'Light object',
  'Pendelleuchte': 'Pendant luminaire',
  'Wandleuchte': 'Wall lamp',
  'Papierschalen': 'Paper bowls',
  'Stehlampe': 'Floor lamp',
  'Gaslampe': 'Gas lamp',
  'Tischgrill': 'Table grill',
  'Espressomaschine': 'espresso maker',
  'Trauringe': 'Wedding rings',
  'Halsreif': 'Neck ring',
  'Würfel': 'Cube',
  'Kube': 'Cube'
};

const englishToGerman = Object.fromEntries(
  Object.entries(germanToEnglish).map(([german, english]) => [english, german])
);

// Additional mappings for specific phrases
const phraseTranslations = {
  'Paper bowls': 'Papierschalen',
  'Paper object': 'Papierobjekt',
  'Paper objects': 'Papierobjekte',
  'Light object': 'Lichtobjekt',
  'Pendant luminaire': 'Pendelleuchte',
  'Wall lamp': 'Wandleuchte',
  'Floor lamp': 'Stehlampe',
  'Gas lamp': 'Gaslampe',
  'Table grill': 'Tischgrill',
  'Wedding rings': 'Trauringe',
  'Neck ring': 'Halsreif',
  'espresso maker': 'Espressomaschine',
  'Neck jewelry': 'Halsschmuck',
  'necklace': 'Halskette',
  'Silver': 'Silber',
  'Glass': 'Glas',
  'Object': 'Objekt',
  'Ceramic': 'Keramik',
  'Photo': 'Foto',
  'sketch': 'Skizze',
  'Tableware': 'Tafelgeschirr',
  'Wood': 'Holz',
  'metal': 'Metall',
  'Earrings': 'Ohrhänger',
  'Bracelet': 'Armreif',
  'Jug': 'Kanne',
  'Brass': 'Messing',
  'silver plated': 'versilbert'
};

function isGermanText(text) {
  // Check for German-specific patterns
  const germanPatterns = [
    /\b(Objekt|Glas|Keramik|Silber|Gold|Platin|Ring|Halskette|Halsschmuck|Armschmuck|Armreif|Ohrhänger|Ohrring|Brosche|Anhänger|Kanne|Gefäß|Schale|Tafelgeschirr|Holz|Metall|Messing|Kupfer|Stahl|Foto|Skizze|geschmiedet|montiert|geschwärzt|gedrückt|galvanisiert|gebrauchte|getropft|gegossen|feuervergoldet|Feingold|Brillanten|Diamanten|versilbert|Steinzeug|Polyurethan|Pigment|Lack|Glasuren|Papierobjekt|Papierobjekte|Lichtobjekt|Pendelleuchte|Wandleuchte|Papierschalen|Stehlampe|Gaslampe|Tischgrill|Espressomaschine|Trauringe|Halsreif|Würfel|Kube)\b/i,
    /\b(aus der Serie|verborgen)\b/i,
    /\b\d+\s*×\s*\d+\s*×\s*\d+\s*cm\b/i // German dimension format
  ];
  
  return germanPatterns.some(pattern => pattern.test(text));
}

function isEnglishText(text) {
  // Check for English-specific patterns
  const englishPatterns = [
    /\b(Object|Glass|Ceramic|Silver|Gold|Platinum|Ring|Necklace|Neck jewelry|Bracelet|Earrings|Earring|Brooch|Pendant|Jug|Vessel|Bowl|Tableware|Wood|Metal|Brass|Copper|Steel|Photo|Sketch|forged|mounted|blackened|pressed|galvanized|used|dripped|cast|fire-gilded|fine gold|diamonds|silver plated|stoneware|polyurethane|sand|pigment|lacquer|glazes|Paper object|Paper objects|Light object|Pendant luminaire|Wall lamp|Paper bowls|Floor lamp|Gas lamp|Table grill|espresso maker|Wedding rings|Neck ring|Cube)\b/i,
    /\b(from the.*series|hidden)\b/i,
    /\b\d+\s*x\s*\d+\s*x\s*\d+\s*cm\b/i // English dimension format
  ];
  
  return englishPatterns.some(pattern => pattern.test(text));
}

function translateText(text, fromLang, toLang) {
  let translated = text;
  
  if (fromLang === 'de' && toLang === 'en') {
    // German to English
    Object.entries(germanToEnglish).forEach(([german, english]) => {
      const regex = new RegExp(`\\b${german}\\b`, 'gi');
      translated = translated.replace(regex, english);
    });
    
    // Handle specific phrases
    Object.entries(phraseTranslations).forEach(([english, german]) => {
      if (text.includes(german)) {
        translated = translated.replace(new RegExp(german, 'gi'), english);
      }
    });
    
    // Fix common patterns
    translated = translated.replace(/(\d+)\s*×\s*(\d+)\s*×\s*(\d+)/g, '$1 x $2 x $3');
    translated = translated.replace(/Foto\s/g, 'Photo ');
    translated = translated.replace(/\bca\.\s/g, 'approx. ');
    
  } else if (fromLang === 'en' && toLang === 'de') {
    // English to German
    Object.entries(englishToGerman).forEach(([english, german]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translated = translated.replace(regex, german);
    });
    
    // Handle specific phrases
    Object.entries(phraseTranslations).forEach(([english, german]) => {
      if (text.includes(english)) {
        translated = translated.replace(new RegExp(english, 'gi'), german);
      }
    });
    
    // Fix common patterns
    translated = translated.replace(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/g, '$1 × $2 × $3');
    translated = translated.replace(/Photo\s/g, 'Foto ');
    translated = translated.replace(/\bapprox\.\s/g, 'ca. ');
  }
  
  return translated;
}

function processFile() {
  const filePath = path.join(__dirname, '../../language-mismatch-report.txt');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let modified = false;
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    newLines.push(line);
    
    // Check if this line contains EN: or DE: with potential mismatch
    if (line.includes('EN: "') || line.includes('DE: "')) {
      const match = line.match(/(EN|DE): "([^"]+)"/);
      if (match) {
        const [, lang, text] = match;
        const nextLineIndex = i + 1;
        
        // Check if there's already a suggestion for this line
        if (nextLineIndex < lines.length && lines[nextLineIndex].includes('## SUGGESTED')) {
          continue;
        }
        
        let shouldAddSuggestion = false;
        let suggestedText = '';
        let suggestedLang = '';
        
        if (lang === 'EN' && isGermanText(text)) {
          // German text in EN field
          shouldAddSuggestion = true;
          suggestedText = translateText(text, 'de', 'en');
          suggestedLang = 'EN';
        } else if (lang === 'DE' && isEnglishText(text)) {
          // English text in DE field
          shouldAddSuggestion = true;
          suggestedText = translateText(text, 'en', 'de');
          suggestedLang = 'DE';
        }
        
        if (shouldAddSuggestion && suggestedText !== text) {
          newLines.push(`## SUGGESTED ${suggestedLang}: "${suggestedText}"`);
          modified = true;
          console.log(`Added suggestion for line ${i + 1}: ${lang} field with ${lang === 'EN' ? 'German' : 'English'} text`);
        }
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log('File updated with translation suggestions!');
  } else {
    console.log('No new suggestions needed.');
  }
}

// Run the script
processFile(); 