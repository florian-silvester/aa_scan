import puppeteer from 'puppeteer'

/**
 * TEST SCRIPT FOR LOCATION SCRAPER
 * 
 * Tests the location scraping on a single profile to verify the logic
 * Run with: node test-location-scraper.js
 */

const TEST_PROFILE_URL = 'https://artaurea.de/profiles/pildner-thomas/'

async function testLocationScraping() {
  console.log('🧪 TESTING LOCATION SCRAPER\n')
  console.log(`Profile: ${TEST_PROFILE_URL}\n`)

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  })

  try {
    const page = await browser.newPage()
    
    console.log('🌐 Loading profile page...')
    await page.goto(TEST_PROFILE_URL, { waitUntil: 'networkidle2', timeout: 15000 })

    // Close cookie banner if present
    try {
      await page.waitForSelector('.cmplz-close', { timeout: 2000 })
      await page.click('.cmplz-close')
      console.log('✅ Closed cookie banner')
    } catch (e) {
      console.log('ℹ️  No cookie banner found')
    }

    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if places_section exists
    const hasPlacesSection = await page.evaluate(() => {
      return !!document.querySelector('#places_section')
    })

    console.log(`\n📍 Places section found: ${hasPlacesSection}`)

    if (!hasPlacesSection) {
      console.log('\n⚠️  No #places_section found on this page')
      console.log('Let me check what sections are available...\n')
      
      const sections = await page.evaluate(() => {
        const allSections = document.querySelectorAll('[id*="section"], section, [class*="section"]')
        return Array.from(allSections).map(s => ({
          id: s.id,
          class: s.className,
          text: s.textContent.substring(0, 100).trim()
        }))
      })
      
      console.log('Available sections:')
      sections.forEach((s, i) => {
        console.log(`  ${i + 1}. ID: "${s.id}" Class: "${s.class}"`)
        console.log(`     Text: ${s.text}...`)
      })
    } else {
      // Extract and display the full HTML structure
      console.log('\n📋 Places section HTML structure:')
      const html = await page.evaluate(() => {
        const section = document.querySelector('#places_section')
        return section ? section.innerHTML : ''
      })
      console.log(html.substring(0, 1000))
      console.log('\n...(truncated)\n')
    }

    // Try to extract location NAMES only
    console.log('\n🔍 Attempting to extract location names...\n')
    const locationNames = await page.evaluate(() => {
      const results = []
      
      const placesSection = document.querySelector('#places_section')
      if (!placesSection) {
        return results
      }

      // The structure is: ul.country > li > ul.city > li > ul.portraits > li > table
      // Location names are in h2 > a within the table
      const locationLinks = placesSection.querySelectorAll('h2 a, .portrait-title h2 a, .portrait-title a')
      
      locationLinks.forEach(link => {
        const name = link.textContent.trim()
        if (name && name.length > 2) {
          results.push(name)
        }
      })

      // If that didn't work, try alternative selectors
      if (results.length === 0) {
        const tables = placesSection.querySelectorAll('table')
        tables.forEach(table => {
          const heading = table.querySelector('h1, h2, h3, h4, h5')
          if (heading) {
            const name = heading.textContent.trim()
            if (name && name.length > 2) {
              results.push(name)
            }
          }
        })
      }

      return results
    })

    console.log(`\n✅ Extracted ${locationNames.length} location name(s):\n`)
    locationNames.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`)
    })

    // Keep browser open for inspection
    console.log('\n💡 Browser will stay open for 10 seconds for inspection...')
    await new Promise(resolve => setTimeout(resolve, 10000))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await browser.close()
    console.log('\n✅ Test completed')
  }
}

testLocationScraping()
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

