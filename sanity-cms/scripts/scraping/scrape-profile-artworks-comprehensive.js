import puppeteer from 'puppeteer'
import fs from 'fs'

/**
 * COMPREHENSIVE ART AUREA PROFILE SCRAPER
 * 
 * Strategy:
 * 1. Find ALL profile URLs from /profiles/ pages (EN + DE)
 * 2. Visit EVERY single profile page
 * 3. Extract ALL metadata for EVERY image found
 * 4. Result: Complete dataset matching wordpress-all-images/ to metadata
 */

async function scrapeAllProfilesComprehensive() {
  console.log('🎨 COMPREHENSIVE ART AUREA PROFILE SCRAPER\n')
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  })
  
  try {
    const results = {
      profileUrls: {
        english: [],
        german: []
      },
      designers: [],
      summary: {},
      extractedAt: new Date().toISOString()
    }
    
    // STEP 1: Find ALL profile URLs from both languages
    console.log('🔍 STEP 1: Finding ALL profile URLs...')
    results.profileUrls.english = await findAllProfileUrls(browser, 'https://artaurea.com/profiles/', 'en')
    results.profileUrls.german = await findAllProfileUrls(browser, 'https://artaurea.de/profiles/', 'de')
    
    console.log(`✅ Found ${results.profileUrls.english.length} English profile URLs`)
    console.log(`✅ Found ${results.profileUrls.german.length} German profile URLs`)
    
    // STEP 2: Create master list of unique profiles
    const allProfileUrls = mergeProfileUrls(results.profileUrls.english, results.profileUrls.german)
    console.log(`🎯 Total unique profiles to scrape: ${allProfileUrls.length}`)
    
    // STEP 3: Scrape EVERY profile page
    console.log('\n📸 STEP 2: Scraping ALL profile pages...')
    results.designers = await scrapeAllDesignerProfiles(browser, allProfileUrls)
    
    // STEP 4: Generate summary
    results.summary = {
      totalProfiles: allProfileUrls.length,
      successfullyScraped: results.designers.length,
      totalImages: results.designers.reduce((sum, designer) => sum + designer.images.length, 0),
      imagesWithFullMetadata: results.designers.reduce((sum, designer) => 
        sum + designer.images.filter(img => img.title && img.materials).length, 0),
      extractedAt: new Date().toISOString()
    }
    
    console.log('\n📊 FINAL SUMMARY:')
    console.log(`   Total profiles found: ${results.summary.totalProfiles}`)
    console.log(`   Successfully scraped: ${results.summary.successfullyScraped}`)
    console.log(`   Total images extracted: ${results.summary.totalImages}`)
    console.log(`   Images with full metadata: ${results.summary.imagesWithFullMetadata}`)
    
    // Save comprehensive results
    const filename = `profile-artworks-comprehensive-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(filename, JSON.stringify(results, null, 2))
    console.log(`\n💾 Saved comprehensive results to ${filename}`)
    
    return results
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await browser.close()
  }
}

async function findAllProfileUrls(browser, profilesPageUrl, language) {
  const page = await browser.newPage()
  
  try {
    console.log(`🌐 Loading ${profilesPageUrl}...`)
    await page.goto(profilesPageUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Handle cookie banner
    try {
      await page.waitForSelector('.cmplz-close', { timeout: 3000 })
      await page.click('.cmplz-close')
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (e) {
      // No cookie banner
    }
    
    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Extract ALL profile links
    const profileUrls = await page.evaluate((lang) => {
      const links = []
      const domain = window.location.hostname
      
      // Find all links that look like profile pages
      const allLinks = document.querySelectorAll('a[href]')
      
      allLinks.forEach(link => {
        const href = link.href
        
        // Look for various profile URL patterns
        const isProfile = href.includes('/profiles/') ||
                         href.includes('/profile/') ||
                         href.includes('/designer/') ||
                         href.includes('/artist/') ||
                         (href.includes(domain) && href.match(/\/[a-z-]+\/$/) && 
                          !href.includes('/about') && !href.includes('/contact') &&
                          !href.includes('/impress') && !href.includes('/gallery'))
        
        if (isProfile && !links.some(existing => existing.url === href)) {
          // Extract designer name from link text or URL
          const designerName = link.textContent.trim() || 
                              href.split('/').filter(p => p).pop().replace(/-/g, ' ')
          
          if (designerName && designerName.length > 2 && designerName.length < 100) {
            links.push({
              url: href,
              designerName: designerName,
              language: lang,
              linkText: link.textContent.trim()
            })
          }
        }
      })
      
      return links
    }, language)
    
    console.log(`   Found ${profileUrls.length} profile URLs for ${language}`)
    return profileUrls
    
  } finally {
    await page.close()
  }
}

function mergeProfileUrls(englishUrls, germanUrls) {
  const merged = []
  const urlMap = new Map()
  
  // Add English URLs
  englishUrls.forEach(profile => {
    const key = profile.designerName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!urlMap.has(key)) {
      urlMap.set(key, {
        designerName: profile.designerName,
        urls: { en: profile.url },
        languages: ['en']
      })
    }
  })
  
  // Merge German URLs
  germanUrls.forEach(profile => {
    const key = profile.designerName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (urlMap.has(key)) {
      urlMap.get(key).urls.de = profile.url
      urlMap.get(key).languages.push('de')
    } else {
      urlMap.set(key, {
        designerName: profile.designerName,
        urls: { de: profile.url },
        languages: ['de']
      })
    }
  })
  
  return Array.from(urlMap.values())
}

async function scrapeAllDesignerProfiles(browser, allProfiles) {
  const results = []
  let completed = 0
  
  for (const profile of allProfiles) {
    completed++
    console.log(`\n👤 [${completed}/${allProfiles.length}] Scraping ${profile.designerName}...`)
    
    try {
      const designerData = await scrapeDesignerProfileComprehensive(browser, profile)
      results.push(designerData)
      
      console.log(`   ✅ Found ${designerData.images.length} images`)
      
      // Brief delay between profiles
      await new Promise(resolve => setTimeout(resolve, 1500))
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
      results.push({
        designerName: profile.designerName,
        urls: profile.urls,
        images: [],
        error: error.message
      })
    }
  }
  
  return results
}

async function scrapeDesignerProfileComprehensive(browser, profile) {
  const page = await browser.newPage()
  
  try {
    const designerData = {
      designerName: profile.designerName,
      urls: profile.urls,
      images: [],
      metadata: {}
    }
    
    // Try both language versions if available
    for (const [lang, url] of Object.entries(profile.urls)) {
      console.log(`   🌐 Loading ${lang}: ${url}`)
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 })
        
        // Check if page loaded successfully
        const pageTitle = await page.title()
        if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
          console.log(`   ⚠️  404 for ${lang}`)
          continue
        }
        
        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Extract ALL metadata from this page
        const pageData = await extractAllPageData(page, profile.designerName, lang)
        
        // Merge images (avoiding duplicates)
        pageData.images.forEach(newImage => {
          const existingIndex = designerData.images.findIndex(img => 
            img.filename === newImage.filename
          )
          
          if (existingIndex >= 0) {
            // Merge language-specific data
            designerData.images[existingIndex] = mergeImageData(
              designerData.images[existingIndex], 
              newImage, 
              lang
            )
          } else {
            designerData.images.push(newImage)
          }
        })
        
        // Merge metadata
        designerData.metadata[lang] = pageData.metadata
        
        console.log(`     → ${pageData.images.length} images from ${lang}`)
        
      } catch (error) {
        console.log(`     → Error loading ${lang}: ${error.message}`)
      }
    }
    
    return designerData
    
  } finally {
    await page.close()
  }
}

async function extractAllPageData(page, designerName, language) {
  return await page.evaluate((designer, lang) => {
    const images = []
    const metadata = {
      language: lang,
      pageTitle: document.title,
      designerBio: '',
      location: '',
      website: '',
      contact: ''
    }
    
    // Extract designer bio/info
    const bioSelectors = [
      '.bio', '.biography', '.about', '.description', '.profile-text',
      '.artist-info', '.designer-info', '.content p', '.entry-content p'
    ]
    
    for (const selector of bioSelectors) {
      const bioEl = document.querySelector(selector)
      if (bioEl && bioEl.textContent.trim().length > 50) {
        metadata.designerBio = bioEl.textContent.trim()
        break
      }
    }
    
    // Extract contact info
    const emailLinks = document.querySelectorAll('a[href^="mailto:"]')
    if (emailLinks.length > 0) {
      metadata.contact = emailLinks[0].href.replace('mailto:', '')
    }
    
    // Extract website
    const websiteLinks = document.querySelectorAll('a[href^="http"]:not([href*="artaurea"])')
    if (websiteLinks.length > 0) {
      metadata.website = websiteLinks[0].href
    }
    
    // Extract ALL images
    const allImages = document.querySelectorAll('img')
    
    allImages.forEach(img => {
      if (!img.src || img.src.includes('logo') || img.src.includes('icon') || 
          img.src.includes('avatar') || img.width < 100 || img.height < 100) {
        return
      }
      
      const filename = img.src.split('/').pop().split('?')[0]
      if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return
      
      // Extract ALL possible metadata
      const imageData = {
        filename: filename,
        imageUrl: img.src,
        designerName: designer,
        language: lang,
        alt: img.alt || '',
        title: img.title || '',
        
        // Metadata to be extracted
        workTitle: '',
        workTitle_en: '',
        workTitle_de: '',
        materials: '',
        materials_en: '',
        materials_de: '',
        dimensions: '',
        price: '',
        year: '',
        copyright: '',
        description: '',
        description_en: '',
        description_de: '',
        category: '',
        technique: '',
        edition: '',
        
        // Raw caption for debugging
        rawCaption: ''
      }
      
      // Look for caption/metadata in various places
      const container = img.closest('figure, .slide, .carousel-item, .gallery-item, .artwork, .image-container, .wp-caption, div')
      
      if (container) {
        // Try different caption selectors
        const captionSelectors = [
          'figcaption', '.caption', '.description', '.artwork-info', 
          '.image-caption', '.wp-caption-text', '.slide-caption',
          '.title', '.work-title', '.artwork-title'
        ]
        
        let caption = ''
        for (const selector of captionSelectors) {
          const captionEl = container.querySelector(selector)
          if (captionEl) {
            caption = captionEl.textContent.trim()
            break
          }
        }
        
        // If no caption element, look for nearby text
        if (!caption) {
          const textNodes = []
          const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            node => {
              const text = node.textContent.trim()
              return text && text.length > 5 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
            },
            false
          )
          
          let node
          while (node = walker.nextNode()) {
            const text = node.textContent.trim()
            if (text && !textNodes.includes(text)) {
              textNodes.push(text)
            }
          }
          caption = textNodes.join(' ')
        }
        
        imageData.rawCaption = caption
        
        // Parse structured data from caption
        if (caption) {
          // Extract work title (often in quotes, emphasis, or first capitalized phrase)
          const titlePatterns = [
            /['""]([^'""]+)['""]/, // Quoted
            /<em>([^<]+)<\/em>/, // Emphasized
            /<strong>([^<]+)<\/strong>/, // Strong
            /^([A-Z][^.]+)\./, // First sentence starting with capital
            /(?:title|work|piece):\s*([^,.\n]+)/i // "Title: ..."
          ]
          
          for (const pattern of titlePatterns) {
            const match = caption.match(pattern)
            if (match) {
              imageData.workTitle = match[1].trim()
              break
            }
          }
          
          // Extract materials
          const materialPatterns = [
            /(?:materials?|medium):\s*([^,.\n]+)/i,
            /\.\s*([^.]+)\.\s*(?:approx\.|ca\.|etwa|\d+)/i,
            /(gold|silver|bronze|copper|steel|wood|ceramic|glass|diamond|pearl|stone)[^.]*\./i
          ]
          
          for (const pattern of materialPatterns) {
            const match = caption.match(pattern)
            if (match) {
              imageData.materials = match[1].trim()
              break
            }
          }
          
          // Extract price
          const priceMatch = caption.match(/(?:price|approx\.|ca\.|etwa)\s*([0-9,]+)\s*(?:Euro|€|EUR|USD|\$)/i)
          if (priceMatch) {
            imageData.price = priceMatch[0].trim()
          }
          
          // Extract dimensions
          const dimensionsMatch = caption.match(/(\d+(?:[.,]\d+)?\s*(?:×|x)\s*\d+(?:[.,]\d+)?\s*(?:×|x)?\s*\d*(?:[.,]\d+)?\s*(?:cm|mm|m))/i)
          if (dimensionsMatch) {
            imageData.dimensions = dimensionsMatch[1].trim()
          }
          
          // Extract year
          const yearMatch = caption.match(/(19|20)\d{2}/)
          if (yearMatch) {
            imageData.year = yearMatch[0]
          }
          
          // Extract copyright
          const copyrightMatch = caption.match(/©\s*([^,.\n]+)/i)
          if (copyrightMatch) {
            imageData.copyright = copyrightMatch[1].trim()
          }
          
          // Set description as full caption
          imageData.description = caption
        }
      }
      
      // Set language-specific fields
      if (lang === 'en') {
        imageData.workTitle_en = imageData.workTitle
        imageData.materials_en = imageData.materials
        imageData.description_en = imageData.description
      } else if (lang === 'de') {
        imageData.workTitle_de = imageData.workTitle
        imageData.materials_de = imageData.materials
        imageData.description_de = imageData.description
      }
      
      images.push(imageData)
    })
    
    return { images, metadata }
  }, designerName, language)
}

function mergeImageData(existing, newData, language) {
  const merged = { ...existing }
  
  // Merge language-specific fields
  if (language === 'en') {
    merged.workTitle_en = newData.workTitle || existing.workTitle_en
    merged.materials_en = newData.materials || existing.materials_en
    merged.description_en = newData.description || existing.description_en
  } else if (language === 'de') {
    merged.workTitle_de = newData.workTitle || existing.workTitle_de
    merged.materials_de = newData.materials || existing.materials_de
    merged.description_de = newData.description || existing.description_de
  }
  
  // Update general fields if not set or if new data is more complete
  if (!merged.price && newData.price) merged.price = newData.price
  if (!merged.dimensions && newData.dimensions) merged.dimensions = newData.dimensions
  if (!merged.year && newData.year) merged.year = newData.year
  if (!merged.copyright && newData.copyright) merged.copyright = newData.copyright
  
  return merged
}

// Run the comprehensive scraper
scrapeAllProfilesComprehensive() 