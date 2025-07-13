import puppeteer from 'puppeteer';

async function testFixedBiography() {
  console.log('🧪 Testing FIXED biography scraper with year + entry columns...');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test on Friedrich Becker's profile
  const testUrl = 'https://artaurea.com/profiles/becker-friedrich/';
  
  try {
    await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const content = await page.evaluate(() => {
      // Fixed biography extraction logic
      function extractBiography() {
        // First try to extract from year + entry columns structure
        const yearCells = document.querySelectorAll('td.year');
        const entryCells = document.querySelectorAll('td.entry');
        
        if (yearCells.length > 0 && entryCells.length > 0) {
          const cvEntries = [];
          
          // Handle mismatched counts by using the minimum length
          const maxEntries = Math.min(yearCells.length, entryCells.length);
          
          for (let i = 0; i < maxEntries; i++) {
            const year = yearCells[i].innerText?.trim();
            const entry = entryCells[i].innerText?.trim();
            
            if (year && entry) {
              cvEntries.push(`${year}\\t${entry}`);
            } else if (entry) {
              cvEntries.push(entry);
            }
          }
          
          // If there are extra year cells without corresponding entries, add them
          if (yearCells.length > entryCells.length) {
            for (let i = entryCells.length; i < yearCells.length; i++) {
              const year = yearCells[i].innerText?.trim();
              if (year) {
                cvEntries.push(year);
              }
            }
          }
          
          if (cvEntries.length > 0) {
            return cvEntries.join('\\n');
          }
        }
        
        return null;
      }
      
      return {
        yearCells: document.querySelectorAll('td.year').length,
        entryCells: document.querySelectorAll('td.entry').length,
        biography: extractBiography()
      };
    });
    
    console.log('\\n📊 Test Results:');
    console.log('Year cells found:', content.yearCells);
    console.log('Entry cells found:', content.entryCells);
    console.log('\\n📅 Biography with dates:');
    console.log(content.biography);
    
    // Check if temporal information is present (more flexible)
    const hasTemporalInfo = content.biography && content.biography.match(/19\d{2}|20\d{2}|from|till|since|until|–|—|-/i);
    console.log('\\n✅ Temporal info captured:', hasTemporalInfo ? 'YES! 🎉' : 'NO ❌');
    
    if (hasTemporalInfo) {
      // Extract all temporal patterns
      const temporalPatterns = content.biography.match(/\b(19\d{2}|20\d{2}|from \d{4}|till \d{4}|since \d{4}|until \d{4}|\d{4}–\d{4}|\d{4}—\d{4}|\d{4}-\d{4})\b/gi);
      console.log('🎯 Found temporal patterns:', temporalPatterns);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testFixedBiography(); 