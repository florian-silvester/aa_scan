import puppeteer from 'puppeteer'
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables - try both locations
dotenv.config({ path: path.join(__dirname, '../../.env') }) // sanity-cms/.env
dotenv.config({ path: path.join(__dirname, '../../../.env') }) // root .env

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-12-01',
  useCdn: false,
})

/**
 * PROFILE LOCATIONS SCRAPER
 * 
 * Scrapes the "Vertreten von" (Represented by) section from Art Aurea profiles
 * and connects locations (galleries, museums, shops) to creator profiles in Sanity
 */

async function scrapeProfileLocations() {
  console.log('🏛️  PROFILE LOCATIONS SCRAPER\n')
  console.log('This will scrape associated locations from Art Aurea profiles')
  console.log('and connect them to creator documents in Sanity.\n')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  })

  try {
    // Get all creators from Sanity
    console.log('📦 Fetching creators from Sanity...')
    const creators = await sanity.fetch(`
      *[_type == "creator" && defined(slug.current)] {
        _id,
        name,
        "slug": slug.current,
        associatedLocations
      }
    `)
    console.log(`Found ${creators.length} creators\n`)

    const stats = {
      processed: 0,
      locationsFound: 0,
      locationsLinked: 0,
      errors: 0,
      skipped: 0
    }

    const results = []

    // Process each creator
    for (const creator of creators) {
      stats.processed++
      console.log(`\n[${stats.processed}/${creators.length}] ${creator.name}`)

      try {
        // Try both German and English profile URLs
        const profileUrls = [
          `https://artaurea.de/profiles/${creator.slug}/`,
          `https://artaurea.com/profiles/${creator.slug}/`
        ]

        let locations = null
        let profileUrl = null

        for (const url of profileUrls) {
          try {
            console.log(`  🌐 Trying ${url}`)
            locations = await scrapeLocationsFromProfile(browser, url)
            if (locations && locations.length > 0) {
              profileUrl = url
              break
            }
          } catch (error) {
            console.log(`  ⚠️  Could not access ${url}: ${error.message}`)
          }
        }

        if (!locationNames || locationNames.length === 0) {
          console.log(`  ℹ️  No locations found`)
          stats.skipped++
          continue
        }

        console.log(`  ✅ Found ${locationNames.length} location(s)`)
        stats.locationsFound += locationNames.length

        // Process each location - try to find it in Sanity
        const locationRefs = []
        for (const locationName of locationNames) {
          try {
            const existingLocation = await findLocationByName(locationName)
            
            if (existingLocation) {
              locationRefs.push({ 
                _type: 'reference', 
                _ref: existingLocation._id, 
                _key: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
              })
              console.log(`    ✅ Matched: ${locationName}`)
              stats.locationsLinked++
            } else {
              console.log(`    ⚠️  Not in CMS: ${locationName}`)
            }
          } catch (error) {
            console.log(`    ❌ Error matching location: ${error.message}`)
            stats.errors++
          }
        }

        // Update creator with location references
        if (locationRefs.length > 0) {
          // Merge with existing locations (avoid duplicates)
          const existingRefs = creator.associatedLocations || []
          const existingIds = new Set(existingRefs.map(ref => ref._ref))
          
          const newRefs = locationRefs.filter(ref => !existingIds.has(ref._ref))
          
          if (newRefs.length > 0) {
            await sanity
              .patch(creator._id)
              .set({ associatedLocations: [...existingRefs, ...newRefs] })
              .commit()
            
            console.log(`  ✅ Linked ${newRefs.length} new location(s) to creator`)
          } else {
            console.log(`  ℹ️  All locations already linked`)
          }
        }

        results.push({
          creator: creator.name,
          profileUrl,
          locationsFound: locationNames.length,
          locationsMatched: locationRefs.length
        })

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`)
        stats.errors++
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Print summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 SUMMARY')
    console.log('='.repeat(50))
    console.log(`Creators processed: ${stats.processed}`)
    console.log(`Location names found on profiles: ${stats.locationsFound}`)
    console.log(`Locations matched in CMS: ${stats.locationsLinked}`)
    console.log(`Creators with no locations: ${stats.skipped}`)
    console.log(`Errors: ${stats.errors}`)

    return { stats, results }

  } finally {
    await browser.close()
  }
}

async function scrapeLocationsFromProfile(browser, profileUrl) {
  const page = await browser.newPage()

  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 15000 })

    // Check if page loaded successfully
    const pageTitle = await page.title()
    if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
      throw new Error('Profile not found (404)')
    }

    // Close cookie banner if present
    try {
      await page.waitForSelector('.cmplz-close', { timeout: 2000 })
      await page.click('.cmplz-close')
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (e) {
      // No cookie banner
    }

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Extract location NAMES from the places_section
    const locationNames = await page.evaluate(() => {
      const results = []
      
      // Look for the places_section
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

    return locationNames

  } finally {
    await page.close()
  }
}

async function findLocationByName(locationName) {
  // Search for location by name (try both EN and DE fields)
  const location = await sanity.fetch(
    `*[_type == "location" && (name.en match $name || name.de match $name)][0]`,
    { name: `*${locationName}*` }
  )

  return location || null
}

// Run the script
scrapeProfileLocations()
  .then(result => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

