import puppeteer from 'puppeteer';

async function testBiographyDates() {
  console.log('🧪 Testing updated biography scraper with dates...');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test on Friedrich Becker's profile
  const testUrl = 'https://artaurea.com/profiles/becker-friedrich/';
  
  try {
    await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const content = await page.evaluate(() => {
      // Updated biography extraction logic
      function extractBiography() {
        // Look for tables that contain date patterns (years like 1922, 1940, etc)
        const allTables = document.querySelectorAll('table');
        
        for (const table of allTables) {
          const tableText = table.innerText?.trim();
          if (tableText && tableText.match(/19\\d{2}|20\\d{2}/)) { // Contains years
            // Clean up the text - remove extra whitespace and "Website Link" footer
            const cleanText = tableText
              .replace(/Website Link.*$/s, '') // Remove "Website Link" and everything after
              .replace(/\\s+/g, ' ') // Replace multiple spaces with single space
              .replace(/(\\d{4})\\s+/g, '$1\\t') // Replace space after year with tab for formatting
              .trim();
              
            if (cleanText.length > 50) {
              return cleanText;
            }
          }
        }
        
        // Fallback to original td.entry method if no table with dates found
        const bioEntries = document.querySelectorAll('td.entry');
        if (bioEntries.length > 0) {
          return Array.from(bioEntries)
            .map(td => td.innerText?.trim())
            .filter(text => text && text.length > 10)
            .join('\\n');
        }
        
        return null;
      }
      
      return {
        newBiography: extractBiography(),
        foundTables: Array.from(document.querySelectorAll('table')).length
      };
    });
    
    console.log('\\n📊 Test Results:');
    console.log('Tables found:', content.foundTables);
    console.log('\\n📅 Biography with dates:');
    console.log(content.newBiography);
    
    // Check if dates are present
    const hasDates = content.newBiography && content.newBiography.match(/19\\d{2}|20\\d{2}/);
    console.log('\\n✅ Dates captured:', hasDates ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testBiographyDates(); 