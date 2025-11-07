import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../../.env') })

// Load profile audit data
const auditData = JSON.parse(
  fs.readFileSync('/Users/florian.ludwig/Documents/aa_scan/reports/profile-audit-complete-2025-10-28.json', 'utf8')
)

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

const ENGLISH_BASE_URL = 'https://artaurea.com'
const DELAY_MS = 1000

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Scrape English profile page
async function scrapeEnglishProfile(profileUrl) {
  const englishUrl = profileUrl.replace('artaurea.de', 'artaurea.com')
  
  try {
    console.log(`   Fetching: ${englishUrl}`)
    const response = await fetch(englishUrl)
    if (!response.ok) return null
    
    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    const creatorName = document.querySelector('h1')?.textContent?.trim()
    
    const artworks = []
    const imageLinks = document.querySelectorAll('.carousel_slide a[data-fancybox="gallery"]')
    
    imageLinks.forEach((link, index) => {
      const dataSrc = link.getAttribute('data-src')
      const caption = link.getAttribute('data-caption') || ''
      const img = link.querySelector('img')
      const imgSrc = img?.getAttribute('src')
      
      const imageUrl = dataSrc || imgSrc
      if (imageUrl) {
        const filename = imageUrl.split('/').pop()
        const captionText = caption.replace(/<[^>]+>/g, '')
        let title = captionText.split(/\.\s+(?:Glass|Ceramic|Wood|Metal|Jewelry|Textile)/i)[0]
        title = title.split(/\d+\s*[x×]\s*\d+/)[0].trim()
        
        artworks.push({
          index: index + 1,
          filename,
          caption: captionText,
          titleEN: title
        })
      }
    })
    
    return { creatorName, artworks }
    
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`)
    return null
  }
}

// Get recently created artworks (from today)
async function getRecentlyCreatedArtworks() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const artworks = await client.fetch(`
    *[_type == "artwork" && _createdAt >= $today]{
      _id,
      name,
      workTitle,
      'creator': creator->{_id, name, profileUrl},
      'imageFilename': images[0].asset->originalFilename,
      _createdAt
    } | order(_createdAt desc)
  `, { today: today.toISOString() })
  
  return artworks
}

// Main execution
async function updateEnglishTitles() {
  console.log('🌍 Updating English Titles from artaurea.com\n')
  console.log('=' .repeat(80) + '\n')
  
  try {
    // Get artworks created today
    console.log('📥 Fetching recently created artworks...\n')
    const artworks = await getRecentlyCreatedArtworks()
    
    if (artworks.length === 0) {
      console.log('No artworks created today. Exiting.\n')
      return
    }
    
    console.log(`   Found ${artworks.length} artworks created today\n`)
    
    // Group by creator
    const byCreator = new Map()
    artworks.forEach(aw => {
      const creatorId = aw.creator?._id
      if (!creatorId) return
      
      if (!byCreator.has(creatorId)) {
        byCreator.set(creatorId, {
          creator: aw.creator,
          artworks: []
        })
      }
      byCreator.get(creatorId).artworks.push(aw)
    })
    
    console.log(`   ${byCreator.size} unique creators\n`)
    console.log('🌐 Scraping English profiles...\n')
    
    let updated = 0
    let failed = 0
    let skipped = 0
    
    for (const [creatorId, data] of byCreator) {
      const { creator, artworks: creatorArtworks } = data
      
      // Find profile URL from audit data
      const profileMatch = auditData.creatorMatches.find(m => 
        normalize(m.creatorName) === normalize(creator.name)
      )
      
      if (!profileMatch || !profileMatch.profileUrl) {
        console.log(`   ⚠️  ${creator.name}: No profile found in audit data, skipping`)
        skipped += creatorArtworks.length
        continue
      }
      
      console.log(`\n   ${creator.name} (${creatorArtworks.length} artworks)`)
      
      // Scrape English profile
      const englishProfile = await scrapeEnglishProfile(profileMatch.profileUrl)
      await delay(DELAY_MS)
      
      if (!englishProfile) {
        console.log(`      ✗ Failed to scrape English profile`)
        failed += creatorArtworks.length
        continue
      }
      
      console.log(`      ✓ Found ${englishProfile.artworks.length} artworks on English profile`)
      
      // Match and update
      for (const sanityArtwork of creatorArtworks) {
        // Strip WordPress ID prefix from Sanity filename
        let sanityFilename = (sanityArtwork.imageFilename || '')
          .replace(/^\d+_/, '') // Remove prefix like "58527_"
          .toLowerCase()
        
        // Try to match by filename (most reliable)
        const match = englishProfile.artworks.find(en => {
          const enFilename = en.filename.toLowerCase()
          // Exact match or normalized match (without size suffix)
          return enFilename === sanityFilename ||
                 enFilename.replace(/-\d+x\d+\./, '.') === sanityFilename.replace(/-\d+x\d+\./, '.')
        })
        
        if (match && match.titleEN && match.titleEN !== sanityArtwork.workTitle?.de) {
          // Update the EN title
          try {
            await client
              .patch(sanityArtwork._id)
              .set({ 'workTitle.en': match.titleEN })
              .commit()
            
            console.log(`      ✓ Updated: ${match.titleEN}`)
            updated++
          } catch (error) {
            console.log(`      ✗ Failed to update: ${error.message}`)
            failed++
          }
        } else if (match) {
          console.log(`      ○ No change needed (EN = DE)`)
          skipped++
        } else {
          console.log(`      ⚠️  No match found for: ${sanityArtwork.workTitle?.de?.slice(0, 50)}...`)
          failed++
        }
      }
    }
    
    console.log('\n' + '=' .repeat(80))
    console.log('✨ UPDATE COMPLETE')
    console.log('=' .repeat(80))
    console.log(`\n📊 Results:`)
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ○ Skipped (same/no change): ${skipped}`)
    console.log(`   ✗ Failed: ${failed}`)
    console.log(`   📈 Total: ${artworks.length}\n`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error.stack)
  }
}

updateEnglishTitles()

