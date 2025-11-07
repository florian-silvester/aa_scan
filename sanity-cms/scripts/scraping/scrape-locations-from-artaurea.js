import puppeteer from 'puppeteer'
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })
dotenv.config({ path: path.join(__dirname, '../../../.env') })

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-12-01',
  useCdn: false,
})

/**
 * SCRAPE LOCATIONS FROM ART AUREA WEBSITE
 * 
 * 1. Get all profile URLs from https://artaurea.de/profiles/
 * 2. Visit each profile and extract location names
 * 3. Match creator to Sanity by name
 * 4. Link locations
 */

const DRY_RUN = false // SET TO FALSE - WILL UPDATE SANITY!
const LIMIT = 999 // Process all profiles

async function scrapeLocationsFromArtAurea() {
  console.log('🌐 SCRAPING LOCATIONS FROM ART AUREA WEBSITE\n')
  console.log(DRY_RUN ? '🧪 DRY RUN MODE - No changes will be made\n' : '⚠️  LIVE MODE - Will update Sanity\n')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  })

  try {
    // STEP 1: Get all profile URLs from Art Aurea
    console.log('📋 Step 1: Finding all profiles on Art Aurea...')
    const profileUrls = await getProfileUrlsFromArtAurea(browser)
    console.log(`✅ Found ${profileUrls.length} profile URLs\n`)

    // Limit for testing
    const profilesToProcess = profileUrls.slice(0, LIMIT)
    console.log(`🎯 Processing ${profilesToProcess.length} profiles...\n`)

    const stats = {
      processed: 0,
      withLocations: 0,
      locationsFound: 0,
      matched: 0,
      notInSanity: 0,
      wouldLink: 0,
      errors: 0
    }

    const results = []

    // STEP 2: Process each profile
    for (const profileUrl of profilesToProcess) {
      stats.processed++
      console.log(`\n${'='.repeat(60)}`)
      console.log(`[${stats.processed}/${profilesToProcess.length}] ${profileUrl}`)
      console.log('='.repeat(60))

      try {
        // Extract creator name and locations from profile
        const profileData = await scrapeProfilePage(browser, profileUrl)
        
        if (!profileData.creatorName) {
          console.log('⚠️  Could not extract creator name')
          stats.errors++
          continue
        }

        console.log(`👤 Creator: ${profileData.creatorName}`)

        if (!profileData.locations || profileData.locations.length === 0) {
          console.log('ℹ️  No locations found on profile')
          results.push({ profileUrl, creatorName: profileData.creatorName, status: 'no_locations' })
          continue
        }

        console.log(`📍 Found ${profileData.locations.length} location(s):`)
        profileData.locations.forEach(loc => console.log(`   - ${loc}`))
        stats.withLocations++
        stats.locationsFound += profileData.locations.length

        // STEP 3: Find creator in Sanity by name
        const sanityCreator = await findCreatorByName(profileData.creatorName)
        
        if (!sanityCreator) {
          console.log(`❌ Creator "${profileData.creatorName}" not found in Sanity`)
          stats.notInSanity++
          results.push({
            profileUrl,
            creatorName: profileData.creatorName,
            status: 'not_in_sanity',
            locations: profileData.locations
          })
          continue
        }

        console.log(`✅ Matched to Sanity: ${sanityCreator.name} (${sanityCreator._id})`)
        stats.matched++

        // STEP 4: Match locations to Sanity
        const locationMatches = []
        for (const locationName of profileData.locations) {
          const location = await findLocationByName(locationName)
          if (location) {
            locationMatches.push({ name: locationName, id: location._id })
            console.log(`   ✅ Location matched: ${locationName}`)
          } else {
            console.log(`   ⚠️  Location not in CMS: ${locationName}`)
          }
        }

        if (locationMatches.length > 0) {
          // Check which are new
          const existingIds = new Set(sanityCreator.associatedLocations?.map(ref => ref._ref) || [])
          const newLinks = locationMatches.filter(m => !existingIds.has(m.id))

          if (newLinks.length > 0) {
            console.log(`\n💡 Would link ${newLinks.length} NEW location(s) to creator`)
            stats.wouldLink += newLinks.length

            if (!DRY_RUN) {
              // Actually link them
              const newRefs = newLinks.map(m => ({
                _type: 'reference',
                _ref: m.id,
                _key: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              }))
              
              await sanity
                .patch(sanityCreator._id)
                .set({ associatedLocations: [...(sanityCreator.associatedLocations || []), ...newRefs] })
                .commit()
              
              console.log('✅ Linked locations to creator')
            }
          } else {
            console.log('ℹ️  All locations already linked')
          }
        }

        results.push({
          profileUrl,
          creatorName: profileData.creatorName,
          sanityId: sanityCreator._id,
          status: 'success',
          locations: profileData.locations,
          matched: locationMatches.length,
          wouldLink: locationMatches.length
        })

      } catch (error) {
        console.log(`❌ Error: ${error.message}`)
        stats.errors++
        results.push({ profileUrl, status: 'error', error: error.message })
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Print summary
    console.log('\n\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`Profiles processed: ${stats.processed}`)
    console.log(`Profiles with locations: ${stats.withLocations}`)
    console.log(`Total location names found: ${stats.locationsFound}`)
    console.log(`Matched to Sanity creators: ${stats.matched}`)
    console.log(`Not in Sanity: ${stats.notInSanity}`)
    console.log(`${DRY_RUN ? 'Would link' : 'Linked'}: ${stats.wouldLink} location links`)
    console.log(`Errors: ${stats.errors}`)

    return { stats, results }

  } finally {
    await browser.close()
  }
}

async function getProfileUrlsFromArtAurea(browser) {
  const page = await browser.newPage()
  const allUrls = []

  try {
    console.log('🌐 Loading https://artaurea.de/profiles/')
    await page.goto('https://artaurea.de/profiles/', { waitUntil: 'networkidle2', timeout: 30000 })

    // Close cookie banner
    try {
      await page.waitForSelector('.cmplz-close', { timeout: 3000 })
      await page.click('.cmplz-close')
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (e) {
      // No cookie banner
    }

    // Extract all profile links
    const urls = await page.evaluate(() => {
      const links = []
      const profileLinks = document.querySelectorAll('a[href*="/profiles/"]')
      
      profileLinks.forEach(link => {
        const href = link.href
        // Only actual profile pages, not the listing page itself
        if (href.match(/\/profiles\/[a-z0-9-]+\/$/) && !href.includes('/profiles/?')) {
          if (!links.includes(href)) {
            links.push(href)
          }
        }
      })
      
      return links
    })

    allUrls.push(...urls)
    console.log(`   Found ${urls.length} profile links`)

  } finally {
    await page.close()
  }

  return allUrls
}

async function scrapeProfilePage(browser, profileUrl) {
  const page = await browser.newPage()

  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 15000 })

    // Check if page loaded successfully
    const pageTitle = await page.title()
    if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
      throw new Error('Profile not found (404)')
    }

    // Close cookie banner
    try {
      await page.waitForSelector('.cmplz-close', { timeout: 2000 })
      await page.click('.cmplz-close')
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Extract creator name and locations
    const data = await page.evaluate(() => {
      const result = {
        creatorName: '',
        locations: []
      }

      // Get creator name - usually in h1 or title
      const nameEl = document.querySelector('h1, .profile-name, .creator-name')
      if (nameEl) {
        result.creatorName = nameEl.textContent.trim()
      }

      // If still not found, try to extract from page title
      if (!result.creatorName) {
        const title = document.title
        const match = title.match(/^(.+?)\s*[-–|]/)
        if (match) {
          result.creatorName = match[1].trim()
        }
      }

      // Extract locations from places_section
      const placesSection = document.querySelector('#places_section')
      if (placesSection) {
        const locationLinks = placesSection.querySelectorAll('h2 a, .portrait-title h2 a, .portrait-title a')
        
        locationLinks.forEach(link => {
          const name = link.textContent.trim()
          if (name && name.length > 2) {
            result.locations.push(name)
          }
        })

        // Fallback: try to find location names in tables
        if (result.locations.length === 0) {
          const tables = placesSection.querySelectorAll('table')
          tables.forEach(table => {
            const heading = table.querySelector('h1, h2, h3, h4, h5')
            if (heading) {
              const name = heading.textContent.trim()
              if (name && name.length > 2) {
                result.locations.push(name)
              }
            }
          })
        }
      }

      return result
    })

    return data

  } finally {
    await page.close()
  }
}

async function findCreatorByName(creatorName) {
  // Try exact match first
  let creator = await sanity.fetch(
    `*[_type == "creator" && name == $name][0] {
      _id,
      name,
      associatedLocations[] {
        _ref
      }
    }`,
    { name: creatorName }
  )

  // If not found, try fuzzy match
  if (!creator) {
    creator = await sanity.fetch(
      `*[_type == "creator" && name match $name][0] {
        _id,
        name,
        associatedLocations[] {
          _ref
        }
      }`,
      { name: `*${creatorName}*` }
    )
  }

  return creator
}

async function findLocationByName(locationName) {
  const location = await sanity.fetch(
    `*[_type == "location" && (name.en match $name || name.de match $name)][0] {
      _id,
      name
    }`,
    { name: `*${locationName}*` }
  )

  return location
}

// Run the script
scrapeLocationsFromArtAurea()
  .then(result => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

