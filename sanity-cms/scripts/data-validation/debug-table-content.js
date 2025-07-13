import puppeteer from 'puppeteer';

async function debugTableContent() {
  console.log('🔍 Debugging table content for date extraction...');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test on Friedrich Becker's profile
  const testUrl = 'https://artaurea.com/profiles/becker-friedrich/';
  
  try {
    await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const content = await page.evaluate(() => {
      const allTables = document.querySelectorAll('table');
      const results = [];
      
      allTables.forEach((table, index) => {
        const rawText = table.innerText;
        const hasDatePattern = rawText && rawText.match(/19\\d{2}|20\\d{2}/);
        
        results.push({
          index,
          rawText: rawText?.substring(0, 400) + (rawText?.length > 400 ? '...' : ''),
          hasDatePattern: !!hasDatePattern,
          innerHTML: table.innerHTML.substring(0, 200) + '...'
        });
      });
      
      return {
        tableCount: allTables.length,
        tables: results
      };
    });
    
    console.log(`\\n📊 Found ${content.tableCount} tables:`);
    
    content.tables.forEach(table => {
      console.log(`\\n[Table ${table.index}]`);
      console.log('Has date pattern:', table.hasDatePattern);
      console.log('Raw text:', table.rawText);
      console.log('HTML snippet:', table.innerHTML);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugTableContent(); 