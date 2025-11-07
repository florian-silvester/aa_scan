const fs = require('fs');
const path = require('path');

const baseDir = '/Users/florian.ludwig/Documents/aa_scan/Content/WEBSITE_STORIES';

// Simple language detection
function detectLanguage(text) {
  const germanWords = ['und', 'der', 'die', 'das', 'ist', 'sich', 'von', 'für', 'mit', 'auch', 'auf', 'eine', 'dem'];
  const englishWords = ['the', 'and', 'is', 'was', 'are', 'for', 'with', 'from', 'his', 'her', 'that', 'this'];
  
  const words = text.toLowerCase().split(/\s+/).slice(0, 100);
  
  const germanCount = words.filter(w => germanWords.includes(w)).length;
  const englishCount = words.filter(w => englishWords.includes(w)).length;
  
  if (germanCount > englishCount * 2) return 'DE';
  if (englishCount > germanCount * 2) return 'EN';
  return 'BOTH';
}

// Detect if bilingual in same file
function isBilingual(text) {
  const chunks = text.split(/\n\n+/);
  const firstHalf = chunks.slice(0, Math.floor(chunks.length / 2)).join(' ');
  const secondHalf = chunks.slice(Math.floor(chunks.length / 2)).join(' ');
  
  const lang1 = detectLanguage(firstHalf);
  const lang2 = detectLanguage(secondHalf);
  
  return (lang1 === 'DE' && lang2 === 'EN') || (lang1 === 'EN' && lang2 === 'DE');
}

// Find intro (first substantial paragraph after credits)
function findIntro(text) {
  const lines = text.split('\n').filter(l => l.trim());
  
  // Skip title, credits (usually first 3-5 lines)
  const contentStart = lines.slice(3);
  
  // Find first paragraph > 100 chars
  for (let i = 0; i < contentStart.length; i++) {
    const line = contentStart[i].trim();
    if (line.length > 100 && !line.startsWith('Photo') && !line.startsWith('Text')) {
      return {
        text: line.substring(0, 150) + '...',
        length: line.length,
        index: i + 3
      };
    }
  }
  return null;
}

// Check if interview format (has Q&A pattern)
function isInterview(text) {
  const patterns = [
    /Art Aurea[:\s]/i,
    /AA[:\s]/,
    /Q:/,
    /Fragen:/
  ];
  
  return patterns.some(p => p.test(text.substring(0, 2000)));
}

// Check if file is captions
function isCaptionFile(filename, text) {
  const captionIndicators = ['BU ', 'Bildbeschreibung', 'Caption', 'Unterschrift'];
  
  if (captionIndicators.some(ind => filename.includes(ind))) return true;
  
  // Short lines, many image references
  const lines = text.split('\n').filter(l => l.trim());
  const avgLength = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;
  
  return avgLength < 100 && text.length < 2000;
}

// Analyze single article file
function analyzeFile(folderName, filename) {
  const filepath = path.join(baseDir, folderName, filename);
  const text = fs.readFileSync(filepath, 'utf8');
  
  // Skip if already marked up
  if (text.includes('[TITLE_')) {
    return { status: 'MARKED_UP' };
  }
  
  // Check if captions
  if (isCaptionFile(filename, text)) {
    return {
      status: 'CAPTIONS',
      filename,
      length: text.length
    };
  }
  
  const bilingual = isBilingual(text);
  const interview = isInterview(text);
  const intro = findIntro(text);
  const primaryLang = detectLanguage(text.substring(0, 1000));
  
  return {
    status: 'NEEDS_MARKUP',
    filename,
    folderName,
    bilingual,
    interview,
    primaryLang,
    intro,
    textLength: text.length,
    pattern: `${interview ? 'INTERVIEW' : 'NARRATIVE'}_${bilingual ? 'BILINGUAL' : 'SINGLE'}`
  };
}

// Main analysis
function analyzeAllArticles() {
  const folders = fs.readdirSync(baseDir).filter(f => {
    const stat = fs.statSync(path.join(baseDir, f));
    return stat.isDirectory() && !f.startsWith('.');
  });
  
  const results = {
    markedUp: [],
    captions: [],
    needsMarkup: [],
    patterns: {}
  };
  
  console.log(`📊 Analyzing ${folders.length} folders...\n`);
  
  folders.forEach(folder => {
    const folderPath = path.join(baseDir, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.txt'));
    
    files.forEach(file => {
      const analysis = analyzeFile(folder, file);
      
      if (analysis.status === 'MARKED_UP') {
        results.markedUp.push({ folder, file });
      } else if (analysis.status === 'CAPTIONS') {
        results.captions.push({ folder, file, ...analysis });
      } else if (analysis.status === 'NEEDS_MARKUP') {
        results.needsMarkup.push(analysis);
        
        // Group by pattern
        const pattern = analysis.pattern;
        if (!results.patterns[pattern]) {
          results.patterns[pattern] = [];
        }
        results.patterns[pattern].push(analysis);
      }
    });
  });
  
  return results;
}

// Display results
const results = analyzeAllArticles();

console.log('═══════════════════════════════════════════════════════════\n');
console.log('📋 ANALYSIS SUMMARY\n');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Already marked up: ${results.markedUp.length} files`);
results.markedUp.forEach(({folder, file}) => {
  console.log(`   • ${folder}/${file}`);
});

console.log(`\n📷 Caption files: ${results.captions.length} files`);
results.captions.forEach(({folder, filename}) => {
  console.log(`   • ${folder}/${filename}`);
});

console.log(`\n📝 Needs markup: ${results.needsMarkup.length} files\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('PATTERNS IDENTIFIED:');
console.log('═══════════════════════════════════════════════════════════\n');

Object.entries(results.patterns).forEach(([pattern, articles]) => {
  console.log(`\n🔹 ${pattern} (${articles.length} articles):\n`);
  
  articles.forEach(article => {
    console.log(`   ${article.folderName}/${article.filename}`);
    console.log(`     Lang: ${article.primaryLang} | Bilingual: ${article.bilingual ? 'YES' : 'NO'}`);
    
    if (article.intro) {
      console.log(`     Intro: ${article.intro.text}`);
      console.log(`     Intro length: ${article.intro.length} chars`);
      
      // ⚠️ Warnings
      if (article.intro.length < 200) {
        console.log(`     ⚠️  WARNING: Short intro`);
      }
      if (article.intro.length > 1500) {
        console.log(`     ⚠️  WARNING: Very long intro (might include body text)`);
      }
    } else {
      console.log(`     ⚠️  WARNING: No clear intro found`);
    }
    
    console.log('');
  });
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('RECOMMENDATIONS:');
console.log('═══════════════════════════════════════════════════════════\n');

Object.entries(results.patterns).forEach(([pattern, articles]) => {
  if (articles.length > 0) {
    console.log(`✓ Batch process ${articles.length} files with pattern: ${pattern}`);
  }
});

console.log('\n');

