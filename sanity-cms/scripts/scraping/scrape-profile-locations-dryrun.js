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
 * DRY RUN - PROFILE LOCATIONS SCRAPER
 * 
 * Tests location linking on 5 creators without making changes
 */

const LIMIT = 20 // Number of creators to test

async function scrapeProfileLocationsDryRun() {
  console.log('🧪 DRY RUN - PROFILE LOCATIONS SCRAPER\n')
  console.log(`Testing on ${LIMIT} creators (NO changes will be made to Sanity)\n`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  })

  try {
    // Get a sample of creators from Sanity
    console.log('📦 Fetching creators from Sanity...')
    const creators = await sanity.fetch(`
      *[_type == "creator" && defined(slug.current)] | order(_createdAt desc) [0...${LIMIT}] {
        _id,
        name,
        "slug": slug.current,
        associatedLocations[] {
          _ref,
          "locationName": @->name
        }
      }
    `)
    console.log(`Found ${creators.length} creators to test\n`)

    const stats = {
      processed: 0,
      locationsFound: 0,
      locationsMatched: 0,
      locationsNotInCMS: 0,
      errors: 0,
      skipped: 0
    }

    const results = []

    // Process each creator
    for (const creator of creators) {
      stats.processed++
      console.log(`\n${'='.repeat(60)}`)
      console.log(`[${stats.processed}/${creators.length}] ${creator.name}`)
      console.log('='.repeat(60))

      // Show existing locations
      if (creator.associatedLocations && creator.associatedLocations.length > 0) {
        console.log(`📍 Currently linked locations (${creator.associatedLocations.length}):`)
        creator.associatedLocations.forEach(loc => {
          const name = loc.locationName?.en || loc.locationName?.de || '(unnamed)'
          console.log(`   - ${name}`)
        })
      } else {
        console.log(`📍 Currently linked locations: None`)
      }

      try {
        // Try both German and English profile URLs
        const profileUrls = [
          `https://artaurea.de/profiles/${creator.slug}/`,
          `https://artaurea.com/profiles/${creator.slug}/`
        ]

        let locationNames = null
        let profileUrl = null

        for (const url of profileUrls) {
          try {
            console.log(`\n🌐 Checking ${url}`)
            locationNames = await scrapeLocationsFromProfile(browser, url)
            if (locationNames && locationNames.length > 0) {
              profileUrl = url
              break
            }
          } catch (error) {
            console.log(`   ⚠️  ${error.message}`)
          }
        }

        if (!locationNames || locationNames.length === 0) {
          console.log(`\n💭 Result: No locations found on profile`)
          stats.skipped++
          results.push({
            creator: creator.name,
            slug: creator.slug,
            status: 'no_locations'
          })
          continue
        }

        console.log(`\n✅ Found ${locationNames.length} location(s) on profile:`)
        locationNames.forEach(name => console.log(`   - ${name}`))
        stats.locationsFound += locationNames.length

        // Try to match each location in Sanity
        console.log(`\n🔍 Matching in Sanity CMS:`)
        const matches = []
        const notFound = []

        for (const locationName of locationNames) {
          const existingLocation = await findLocationByName(locationName)
          
          if (existingLocation) {
            matches.push({
              name: locationName,
              id: existingLocation._id,
              fullName: existingLocation.name
            })
            stats.locationsMatched++
            console.log(`   ✅ FOUND: "${locationName}"`)
            console.log(`      → CMS name: ${existingLocation.name.en} / ${existingLocation.name.de}`)
          } else {
            notFound.push(locationName)
            stats.locationsNotInCMS++
            console.log(`   ❌ NOT IN CMS: "${locationName}"`)
          }
        }

        // Check if would link new locations
        const existingIds = new Set(creator.associatedLocations?.map(ref => ref._ref) || [])
        const newLinks = matches.filter(m => !existingIds.has(m.id))

        console.log(`\n💭 Result:`)
        if (newLinks.length > 0) {
          console.log(`   ✨ Would link ${newLinks.length} NEW location(s):`)
          newLinks.forEach(loc => console.log(`      - ${loc.name}`))
        }
        if (matches.length > newLinks.length) {
          console.log(`   ℹ️  ${matches.length - newLinks.length} location(s) already linked`)
        }
        if (notFound.length > 0) {
          console.log(`   ⚠️  ${notFound.length} location(s) not found in CMS - would skip`)
        }

        results.push({
          creator: creator.name,
          slug: creator.slug,
          profileUrl,
          status: 'success',
          locationsOnProfile: locationNames.length,
          matched: matches.length,
          wouldLink: newLinks.length,
          notInCMS: notFound,
          matches: matches.map(m => m.name)
        })

      } catch (error) {
        console.log(`\n❌ Error: ${error.message}`)
        stats.errors++
        results.push({
          creator: creator.name,
          slug: creator.slug,
          status: 'error',
          error: error.message
        })
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Print summary
    console.log('\n\n' + '='.repeat(60))
    console.log('📊 DRY RUN SUMMARY')
    console.log('='.repeat(60))
    console.log(`Creators tested: ${stats.processed}`)
    console.log(`Location names found on profiles: ${stats.locationsFound}`)
    console.log(`Locations matched in CMS: ${stats.locationsMatched}`)
    console.log(`Locations NOT in CMS: ${stats.locationsNotInCMS}`)
    console.log(`Creators with no locations: ${stats.skipped}`)
    console.log(`Errors: ${stats.errors}`)
    
    console.log('\n📋 DETAILED RESULTS:')
    results.forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.creator} (${r.slug})`)
      console.log(`   Status: ${r.status}`)
      if (r.status === 'success') {
        console.log(`   Would link: ${r.wouldLink} new location(s)`)
        if (r.notInCMS.length > 0) {
          console.log(`   Not in CMS: ${r.notInCMS.join(', ')}`)
        }
      } else if (r.status === 'error') {
        console.log(`   Error: ${r.error}`)
      }
    })

    console.log('\n💡 This was a DRY RUN - no changes were made to Sanity')
    console.log('   To run for real, use: node scrape-profile-locations.js')

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
    `*[_type == "location" && (name.en match $name || name.de match $name)][0] {
      _id,
      name,
      type,
      "cityName": city->name,
      "countryName": country->name
    }`,
    { name: `*${locationName}*` }
  )

  return location || null
}

// Run the script
scrapeProfileLocationsDryRun()
  .then(result => {
    console.log('\n✅ Dry run completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

