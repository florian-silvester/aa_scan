import puppeteer from 'puppeteer'
import fs from 'fs'

/**
 * FIXED CAPTION SCRAPER - Direct .caption targeting
 */

async function scrapeWithDirectCaptions() {
  console.log('🎯 FIXED SCRAPER - Direct .caption targeting\n')
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  })
  
  try {
    const results = {
      designers: [],
      summary: { totalImages: 0 },
      extractedAt: new Date().toISOString()
    }
    
    // Test with one profile first
    const testProfile = {
      designerName: "Sofia Beilharz",
      urls: {
        en: "https://artaurea.com/profiles/sofia-beilharz/",
        de: "https://artaurea.de/profiles/sofia-beilharz/"
      }
    }
    
    console.log(`🔍 Testing with: ${testProfile.designerName}`)
    
    const designerData = await scrapeDesignerDirectCaptions(browser, testProfile)
    results.designers.push(designerData)
    results.summary.totalImages = designerData.images.length
    
    // Save results
    const filename = `fixed-captions-test-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(filename, JSON.stringify(results, null, 2))
    console.log(`\n💾 Test data saved to: ${filename}`)
    console.log(`📊 Found ${designerData.images.length} images`)
    
    return results
    
  } finally {
    await browser.close()
  }
}

async function scrapeDesignerDirectCaptions(browser, profile) {
  const page = await browser.newPage()
  
  try {
    const designerData = {
      designerName: profile.designerName,
      images: []
    }
    
    // Scrape each language
    for (const [lang, url] of Object.entries(profile.urls)) {
      console.log(`  📄 Scraping ${lang}: ${url}`)
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
        
        // Close cookie banner
        try {
          await page.waitForSelector('.cmplz-close', { timeout: 3000 })
          await page.click('.cmplz-close')
        } catch (e) {}
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Wait for carousel to load
        await page.waitForSelector('.cycle-carousel-wrap', { timeout: 10000 })
        
        // CAROUSEL caption extraction
        const pageData = await page.evaluate((lang) => {
          const images = []
          
          // Find carousel container
          const carousel = document.querySelector('.cycle-carousel-wrap')
          if (!carousel) return images
          
          // Find all slides/items in carousel
          const slides = Array.from(carousel.querySelectorAll('.cycle-slide, .slide, .carousel-item, div'))
          
          slides.forEach(slide => {
            const img = slide.querySelector('img')
            if (!img || img.width < 100 || img.height < 100) return
            
            const filename = img.src.split('/').pop().split('?')[0]
            if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return
            
            // Look for caption in this slide
            const captionEl = slide.querySelector('.caption')
            if (!captionEl) return
            
            const captionText = captionEl.textContent.trim()
            if (!captionText || captionText.length < 5) return
            
            images.push({
              filename: filename,
              imageUrl: img.src,
              rawCaption: captionText
            })
          })
          
          return images
        }, lang)
        
        console.log(`    ✅ Found ${pageData.length} captions in ${lang}`)
        
        // Merge with existing
        pageData.forEach(newImage => {
          const existingIndex = designerData.images.findIndex(img => img.filename === newImage.filename)
          if (existingIndex >= 0) {
            // Add language caption
            if (lang === 'en') {
              designerData.images[existingIndex].rawCaption_en = newImage.rawCaption
            } else {
              designerData.images[existingIndex].rawCaption_de = newImage.rawCaption
            }
          } else {
            // New image
            if (lang === 'en') {
              newImage.rawCaption_en = newImage.rawCaption
            } else {
              newImage.rawCaption_de = newImage.rawCaption
            }
            designerData.images.push(newImage)
          }
        })
        
      } catch (error) {
        console.log(`   ❌ Error scraping ${lang}: ${error.message}`)
      }
    }
    
    return designerData
    
  } finally {
    await page.close()
  }
}

// Run test
scrapeWithDirectCaptions().catch(console.error) 