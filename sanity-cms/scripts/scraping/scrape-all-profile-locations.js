import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DELAY_MS = 1000
const OUTPUT_FILE = '/Users/florian.ludwig/Documents/aa_scan/reports/profile-locations.txt'

// Load audit data to get all profile URLs
const auditData = JSON.parse(
  fs.readFileSync('/Users/florian.ludwig/Documents/aa_scan/reports/profile-audit-complete-2025-10-28.json', 'utf8')
)

// Scrape location from profile page
async function scrapeLocation(profileUrl) {
  try {
    const response = await fetch(profileUrl)
    if (!response.ok) return null
    
    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Location is in the format: "City, Country" right after profile image
    // Usually in a div or span near the top of the profile
    const locationSelectors = [
      '.profile-location',
      '.location',
      'h2 + p',
      '.entry-header p'
    ]
    
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent.trim()
        // Check if it looks like a location (contains comma or country name)
        if (text && (text.includes(',') || text.match(/Germany|Italy|Austria|Switzerland|France|Netherlands|Belgium|USA|UK/i))) {
          return text
        }
      }
    }
    
    // Fallback: Look for location pattern in the page text
    // Location appears right after the profile image, before the biography
    const bodyText = document.body.textContent
    const locationMatch = bodyText.match(/([A-Z][a-zäöüß-]+(?:\s+[A-Z][a-zäöüß-]+)*,\s*(?:Germany|Italy|Austria|Switzerland|France|Netherlands|Belgium|USA|UK|Denmark|Sweden|Norway|Finland|Spain|Portugal|Czech Republic|Poland)[^\n]*)/i)
    
    if (locationMatch) {
      return locationMatch[1].trim()
    }
    
    return null
  } catch (error) {
    console.error(`   ✗ Error scraping ${profileUrl}: ${error.message}`)
    return null
  }
}

// Main function
async function scrapeAllLocations() {
  console.log('📍 SCRAPING Profile Locations\n')
  console.log('=' .repeat(80))
  console.log(`Total profiles: ${auditData.creatorMatches.length}`)
  console.log('=' .repeat(80) + '\n')
  
  const results = []
  let scraped = 0
  let found = 0
  let notFound = 0
  
  for (const profile of auditData.creatorMatches) {
    if (!profile.profileUrl) {
      notFound++
      continue
    }
    
    scraped++
    console.log(`[${scraped}/${auditData.creatorMatches.length}] ${profile.creatorName}`)
    
    const location = await scrapeLocation(profile.profileUrl)
    
    if (location) {
      console.log(`   ✓ ${location}`)
      found++
      results.push({
        creator: profile.creatorName,
        location: location,
        profileUrl: profile.profileUrl
      })
    } else {
      console.log(`   ⚠️  Location not found`)
      notFound++
      results.push({
        creator: profile.creatorName,
        location: 'NOT FOUND',
        profileUrl: profile.profileUrl
      })
    }
    
    await new Promise(resolve => setTimeout(resolve, DELAY_MS))
  }
  
  // Generate output
  console.log('\n' + '=' .repeat(80))
  console.log('✅ SCRAPING COMPLETE')
  console.log('=' .repeat(80))
  console.log(`Total scraped: ${scraped}`)
  console.log(`Locations found: ${found}`)
  console.log(`Not found: ${notFound}`)
  console.log('=' .repeat(80) + '\n')
  
  // Write to text file
  const outputLines = [
    '# Profile Locations',
    '# Scraped from artaurea.de profiles',
    `# Generated: ${new Date().toISOString()}`,
    `# Total: ${results.length} profiles`,
    '',
    ...results.map(r => `${r.creator}\t${r.location}\t${r.profileUrl}`)
  ]
  
  fs.writeFileSync(OUTPUT_FILE, outputLines.join('\n'), 'utf8')
  console.log(`💾 Saved to: ${OUTPUT_FILE}\n`)
  
  // Also save as JSON
  const jsonFile = OUTPUT_FILE.replace('.txt', '.json')
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2), 'utf8')
  console.log(`💾 Saved JSON: ${jsonFile}\n`)
}

scrapeAllLocations()




