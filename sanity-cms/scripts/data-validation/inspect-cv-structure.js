import puppeteer from 'puppeteer';

async function inspectCVStructure() {
  console.log('🔍 Inspecting CV structure with dates...');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test on Friedrich Becker's profile
  const testUrl = 'https://artaurea.com/profiles/becker-friedrich/';
  
  try {
    await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const content = await page.evaluate(() => {
      // Check what's in td.entry elements (current selector)
      const tdEntries = document.querySelectorAll('td.entry');
      console.log(`Found ${tdEntries.length} td.entry elements`);
      
      const results = {
        tdEntryContent: [],
        allTablesWithDates: [],
        cvSectionContent: []
      };
      
      // Get current td.entry content
      tdEntries.forEach((td, index) => {
        const text = td.innerText?.trim();
        if (text) {
          results.tdEntryContent.push({
            index,
            text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            fullLength: text.length
          });
        }
      });
      
      // Look for tables that contain dates (years like 1922, 1940, etc)
      const allTables = document.querySelectorAll('table');
      allTables.forEach((table, index) => {
        const tableText = table.innerText;
        if (tableText && tableText.match(/19\d{2}|20\d{2}/)) { // Contains years
          results.allTablesWithDates.push({
            index,
            text: tableText.substring(0, 300) + (tableText.length > 300 ? '...' : ''),
            hasDatePattern: true
          });
        }
      });
      
      // Look specifically for CV section that might contain structured date info
      const cvHeaders = document.querySelectorAll('h2, h3, .cv-header, .biography-header');
      cvHeaders.forEach(header => {
        const headerText = header.innerText?.toLowerCase();
        if (headerText && (headerText.includes('cv') || headerText.includes('biography') || headerText.includes('vita'))) {
          const nextElement = header.nextElementSibling;
          if (nextElement) {
            results.cvSectionContent.push({
              headerText,
              content: nextElement.innerText?.substring(0, 400) + '...'
            });
          }
        }
      });
      
      return results;
    });
    
    console.log('\n📊 Current td.entry content:');
    content.tdEntryContent.forEach(item => {
      console.log(`[${item.index}] ${item.text} (${item.fullLength} chars)`);
    });
    
    console.log('\n📅 Tables with dates:');
    content.allTablesWithDates.forEach(item => {
      console.log(`[${item.index}] ${item.text}`);
    });
    
    console.log('\n📋 CV sections:');
    content.cvSectionContent.forEach(item => {
      console.log(`Header: ${item.headerText}`);
      console.log(`Content: ${item.content}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

inspectCVStructure(); 