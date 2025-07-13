import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

async function scrapeProfileBiographies() {
  console.log('🎯 Starting targeted biography scraper...');
  
  // Load our existing designer data
  const rawData = JSON.parse(await fs.readFile('artwork-data-final-2025-07-10.json', 'utf8'));
  const designerData = rawData.designers; // Access the nested designers array
  console.log(`Found ${designerData.length} designers to scrape biographies for`);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  
  for (let i = 0; i < designerData.length; i++) {
    const designer = designerData[i];
    console.log(`\n[${i + 1}/${designerData.length}] Processing: ${designer.designerName}`);
    
    const profileData = {
      name: designer.designerName,
      slug: designer.urlSlug,
      biography: { en: null, de: null },
      portrait: { en: null, de: null },
      sourceUrls: { en: null, de: null },
      scrapedAt: new Date().toISOString()
    };
    
    // Extract URLs from the new structure
    const enUrl = designer.urls?.en;
    const deUrl = designer.urls?.de;
    
    if (enUrl) profileData.sourceUrls.en = enUrl;
    if (deUrl) profileData.sourceUrls.de = deUrl;
    
    try {
      // Scrape English profile
      if (enUrl) {
        console.log(`  📖 Scraping EN biography: ${enUrl}`);
        const enContent = await scrapeProfileContent(browser, enUrl, 'en');
        profileData.biography.en = enContent.biography;
        profileData.portrait.en = enContent.portrait;
      }
      
      // Scrape German profile
      if (deUrl) {
        console.log(`  📖 Scraping DE biography: ${deUrl}`);
        const deContent = await scrapeProfileContent(browser, deUrl, 'de');
        profileData.biography.de = deContent.biography;
        profileData.portrait.de = deContent.portrait;
      }
      
      results.push(profileData);
      
      // Brief delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ❌ Error scraping ${designer.designerName}:`, error.message);
      results.push(profileData); // Still add partial data
    }
  }
  
  await browser.close();
  
  // Save results
  const timestamp = new Date().toISOString().slice(0, 10);
  await fs.writeFile(`profile-biographies-${timestamp}.json`, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Biography scraping complete!`);
  console.log(`📊 Scraped ${results.length} profiles`);
  console.log(`💾 Saved to: profile-biographies-${timestamp}.json`);
  
  return results;
}

async function scrapeProfileContent(browser, url, language) {
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const content = await page.evaluate(() => {
      
      // Biography content: Extract CV timeline by combining year and entry columns
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
              cvEntries.push(`${year}\t${entry}`);
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
            return cvEntries.join('\n');
          }
        }
        
        // Fallback: Look for tables that contain any temporal patterns  
        const allTables = document.querySelectorAll('table');
        for (const table of allTables) {
          const tableText = table.innerText?.trim();
          // More flexible date patterns: exact years, ranges, "from", "till", "since", etc.
          if (tableText && tableText.match(/19\d{2}|20\d{2}|from|till|since|until|–|—|-/i)) {
            const cleanText = tableText
              .replace(/Website Link.*$/s, '') // Remove "Website Link" and everything after
              .replace(/\s+/g, ' ') // Replace multiple spaces with single space
              .trim();
              
            if (cleanText.length > 50) {
              return cleanText;
            }
          }
        }
        
        // Final fallback to just entry cells
        const bioEntries = document.querySelectorAll('td.entry');
        if (bioEntries.length > 0) {
          return Array.from(bioEntries)
            .map(td => td.innerText?.trim())
            .filter(text => text && text.length > 10)
            .join('\n');
        }
        
        return null;
      }
      
      // Portrait content: Extract from profile general text section
      function extractPortrait() {
        // Target the correct class as user specified
        const profileTextElement = document.querySelector('.profile_general-text.profile_sub_section.test');
        
        if (profileTextElement) {
          const text = profileTextElement.innerText?.trim();
          if (text && text.length > 50) {
            return text;
          }
        }
        
        // Fallback: try without the 'test' class in case it's missing on some pages
        const profileTextFallback = document.querySelector('.profile_general-text.profile_sub_section');
        if (profileTextFallback) {
          const text = profileTextFallback.innerText?.trim();
          if (text && text.length > 50) {
            return text;
          }
        }
        
        return null;
      }
      
      return {
        biography: extractBiography(),
        portrait: extractPortrait(),
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    return content;
    
  } catch (error) {
    console.error(`    ❌ Error loading ${url}:`, error.message);
    return { biography: null, portrait: null };
  } finally {
    await page.close();
  }
}

// Run the scraper
scrapeProfileBiographies().catch(console.error); 