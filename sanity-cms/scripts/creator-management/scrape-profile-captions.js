import puppeteer from 'puppeteer'
import fs from 'fs'

/**
 * SCRAPE ART AUREA PROFILE IMAGE CAPTIONS
 * 
 * This script scrapes all the detailed image captions from artaurea.com/profiles/
 * to recover valuable metadata like materials, dimensions, prices, and artwork titles
 */

async function scrapeProfileCaptions() {
  console.log('🔍 SCRAPING ART AUREA PROFILE IMAGE CAPTIONS\n')
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const page = await browser.newPage()
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
    
    console.log('📄 Loading Art Aurea profiles page...')
    await page.goto('https://artaurea.com/profiles/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    console.log('✅ Page loaded successfully')
    
    // Extract all image captions and metadata
    const imageData = await page.evaluate(() => {
      const results = []
      
      // Find all image containers with captions
      const imageContainers = document.querySelectorAll('[data-caption], .image-caption, .artwork-caption, .caption')
      
      imageContainers.forEach(container => {
        const img = container.querySelector('img')
        const caption = container.getAttribute('data-caption') || 
                       container.textContent?.trim() || 
                       container.querySelector('.caption')?.textContent?.trim()
        
        if (img && caption && caption.length > 10) {
          results.push({
            imageUrl: img.src,
            imageSrc: img.getAttribute('src'),
            imageAlt: img.getAttribute('alt') || '',
            caption: caption,
            containerHtml: container.outerHTML.substring(0, 500) // First 500 chars for debugging
          })
        }
      })
      
      // Also look for images with title attributes
      const allImages = document.querySelectorAll('img[title], img[alt]')
      allImages.forEach(img => {
        const title = img.getAttribute('title')
        const alt = img.getAttribute('alt')
        const caption = title || alt
        
        if (caption && caption.length > 10 && !caption.toLowerCase().includes('logo')) {
          // Check if we already have this image
          const exists = results.some(item => item.imageSrc === img.getAttribute('src'))
          if (!exists) {
            results.push({
              imageUrl: img.src,
              imageSrc: img.getAttribute('src'),
              imageAlt: alt || '',
              caption: caption,
              source: 'title_alt'
            })
          }
        }
      })
      
      // Look for structured artwork information in the page content
      const artworkElements = document.querySelectorAll('p, div, span')
      artworkElements.forEach(element => {
        const text = element.textContent?.trim()
        if (text && text.match(/\d{3,4}\s*(rose|white|yellow)?\s*gold|silver|platinum|diamond|€|Euro/i)) {
          // This looks like artwork metadata
          const nearbyImg = element.closest('div, article, section')?.querySelector('img')
          if (nearbyImg) {
            const exists = results.some(item => item.imageSrc === nearbyImg.getAttribute('src'))
            if (!exists) {
              results.push({
                imageUrl: nearbyImg.src,
                imageSrc: nearbyImg.getAttribute('src'),
                imageAlt: nearbyImg.getAttribute('alt') || '',
                caption: text,
                source: 'nearby_metadata'
              })
            }
          }
        }
      })
      
      return results
    })
    
    console.log(`📊 Found ${imageData.length} images with captions`)
    
    // Parse and categorize the captions
    const parsedData = imageData.map(item => {
      const parsed = parseArtworkCaption(item.caption)
      return {
        ...item,
        parsed
      }
    })
    
    // Group by artist/profile
    const byArtist = {}
    parsedData.forEach(item => {
      const artist = extractArtistFromCaption(item.caption) || 'Unknown'
      if (!byArtist[artist]) {
        byArtist[artist] = []
      }
      byArtist[artist].push(item)
    })
    
    // Display results
    console.log('\n📈 SCRAPING RESULTS:')
    console.log(`✅ Total images with captions: ${imageData.length}`)
    console.log(`👥 Artists identified: ${Object.keys(byArtist).length}`)
    
    console.log('\n👑 TOP ARTISTS BY IMAGE COUNT:')
    Object.entries(byArtist)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 10)
      .forEach(([artist, items]) => {
        console.log(`  ${artist}: ${items.length} images`)
      })
    
    // Show sample captions
    console.log('\n💎 SAMPLE ARTWORK CAPTIONS:')
    parsedData.slice(0, 5).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.caption.substring(0, 100)}...`)
      if (item.parsed.materials.length > 0) {
        console.log(`   Materials: ${item.parsed.materials.join(', ')}`)
      }
      if (item.parsed.price) {
        console.log(`   Price: ${item.parsed.price}`)
      }
    })
    
    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      source: 'https://artaurea.com/profiles/',
      summary: {
        totalImages: imageData.length,
        artistsFound: Object.keys(byArtist).length,
        topArtists: Object.entries(byArtist)
          .sort(([,a], [,b]) => b.length - a.length)
          .slice(0, 20)
          .map(([name, items]) => ({name, count: items.length}))
      },
      imageData: parsedData,
      byArtist
    }
    
    // Save report
    const reportPath = `profile-captions-scraped-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
    
    console.log(`\n💾 Detailed report saved: ${reportPath}`)
    
    return reportData
    
  } catch (error) {
    console.error('❌ Scraping error:', error.message)
  } finally {
    await browser.close()
  }
}

// Helper function to parse artwork captions
function parseArtworkCaption(caption) {
  const parsed = {
    title: '',
    materials: [],
    price: '',
    dimensions: '',
    year: '',
    description: caption
  }
  
  // Extract title (usually at the beginning, often in quotes or emphasis)
  const titleMatch = caption.match(/^([^.]+)\./)
  if (titleMatch) {
    parsed.title = titleMatch[1].trim()
  }
  
  // Extract materials
  const materialPatterns = [
    /(\d{3,4})\s*(rose|white|yellow)?\s*gold/gi,
    /(silver|platinum|bronze|copper|steel)/gi,
    /(diamond|ruby|emerald|sapphire|opal|quartz|amethyst)/gi,
    /(ceramic|porcelain|glass|wood|paper|textile)/gi
  ]
  
  materialPatterns.forEach(pattern => {
    const matches = caption.match(pattern)
    if (matches) {
      parsed.materials.push(...matches.map(m => m.trim()))
    }
  })
  
  // Extract price
  const priceMatch = caption.match(/(\d+(?:,\d+)*)\s*(?:€|Euro)/i)
  if (priceMatch) {
    parsed.price = priceMatch[0]
  }
  
  // Extract dimensions
  const dimensionMatch = caption.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(?:[×x]\s*(\d+(?:[.,]\d+)?))?\s*(cm|mm)/i)
  if (dimensionMatch) {
    parsed.dimensions = dimensionMatch[0]
  }
  
  // Extract year
  const yearMatch = caption.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) {
    parsed.year = yearMatch[0]
  }
  
  return parsed
}

// Helper function to extract artist name from caption
function extractArtistFromCaption(caption) {
  // Look for common patterns like "Artist Name, jewelry" at the end
  const artistMatch = caption.match(/([A-Z][a-z]+ [A-Z][a-z]+),\s*(jewelry|ceramic|glass|art)$/i)
  if (artistMatch) {
    return artistMatch[1]
  }
  
  return null
}

// Check if we need to install puppeteer
try {
  await import('puppeteer')
  scrapeProfileCaptions()
} catch (error) {
  console.log('📦 Installing puppeteer...')
  console.log('Please run: npm install puppeteer')
  console.log('Then run this script again.')
} 