import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import csv from 'csv-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../../.env') })

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

const DRY_RUN = process.argv[2] !== '--execute'
const DELAY_MS = 1000

// Load German captions from CSV
async function loadGermanCaptions() {
  return new Promise((resolve) => {
    const data = []
    fs.createReadStream('/Users/florian.ludwig/Documents/aa_scan/reports/ready-to-create-artworks-2025-10-29.csv')
      .pipe(csv())
      .on('data', (row) => data.push(row))
      .on('end', () => resolve(data))
  })
}

// Scrape English profile for captions
async function scrapeEnglishCaptions(profileUrl) {
  const englishUrl = profileUrl.replace('artaurea.de', 'artaurea.com')
  
  try {
    const response = await fetch(englishUrl)
    if (!response.ok) return null
    
    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    const artworks = []
    const imageLinks = document.querySelectorAll('.carousel_slide a[data-fancybox="gallery"]')
    
    imageLinks.forEach((link) => {
      const dataSrc = link.getAttribute('data-src')
      const caption = link.getAttribute('data-caption') || ''
      const img = link.querySelector('img')
      const imgSrc = img?.getAttribute('src')
      
      const imageUrl = dataSrc || imgSrc
      if (imageUrl) {
        const filename = imageUrl.split('/').pop()
        artworks.push({
          filename,
          captionEN: caption.replace(/<[^>]+>/g, '')
        })
      }
    })
    
    return artworks
  } catch (error) {
    return null
  }
}

// Parse structured data from caption
function parseCaption(caption, language = 'de') {
  if (!caption) return {}
  
  const result = {
    fullCaption: caption,
    title: '',
    size: null,
    year: null,
    materials: []
  }
  
  // Extract year (4-digit number)
  const yearMatch = caption.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) {
    result.year = yearMatch[0]
  }
  
  // Extract dimensions (H, W, Ø, cm, mm patterns)
  const sizePatterns = [
    /[HhØøø]\s*\d+[^.]*?cm/gi,
    /\d+\s*[x×]\s*\d+\s*(?:[x×]\s*\d+\s*)?cm/gi,
    /\d+\s*cm/gi
  ]
  
  let sizeMatches = []
  sizePatterns.forEach(pattern => {
    const matches = caption.match(pattern)
    if (matches) sizeMatches = sizeMatches.concat(matches)
  })
  
  if (sizeMatches.length > 0) {
    result.size = sizeMatches.join(', ')
  }
  
  // Extract materials (common terms)
  const materialKeywords = language === 'de' ? [
    'Porzellan', 'Keramik', 'Steinzeug', 'Ton', 'Glas', 'Holz', 'Metall',
    'Silber', 'Gold', 'Platin', 'Bronze', 'Kupfer', 'Messing',
    'Textil', 'Wolle', 'Seide', 'Baumwolle', 'Leder'
  ] : [
    'Porcelain', 'Ceramic', 'Stoneware', 'Clay', 'Glass', 'Wood', 'Metal',
    'Silver', 'Gold', 'Platinum', 'Bronze', 'Copper', 'Brass',
    'Textile', 'Wool', 'Silk', 'Cotton', 'Leather'
  ]
  
  materialKeywords.forEach(material => {
    const regex = new RegExp(`\\b${material}\\b`, 'i')
    if (regex.test(caption)) {
      result.materials.push(material)
    }
  })
  
  // Extract clean title (before year, dimensions, or material keywords)
  let title = caption
  
  // Remove everything after first period followed by material/year/size
  const splitPatterns = [
    /\.\s+(?:Glas|Keramik|Holz|Metall|Schmuck|Textil|Silber|Gold|Porzellan|Steinzeug)/i,
    /\.\s+(?:Glass|Ceramic|Wood|Metal|Jewelry|Textile|Silver|Gold|Porcelain|Stoneware)/i,
    /\,\s+\d{4}/,  // , 2015
    /\d+\s*[x×]\s*\d+/  // dimensions
  ]
  
  for (const pattern of splitPatterns) {
    const match = title.match(pattern)
    if (match) {
      title = title.substring(0, match.index)
      break
    }
  }
  
  // Clean up
  title = title
    .replace(/[.,;:]$/, '')  // Remove trailing punctuation
    .replace(/\s+/g, ' ')
    .trim()
  
  result.title = title
  
  return result
}

// Main update function
async function updateStructuredData() {
  console.log('🔧 Parsing and Updating Structured Data\n')
  console.log('=' .repeat(80))
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
    console.log('   Run with --execute to apply updates')
  } else {
    console.log('⚠️  EXECUTE MODE - Will update artworks!')
  }
  console.log('=' .repeat(80) + '\n')
  
  try {
    // Load German captions
    console.log('📥 Loading German captions from CSV...\n')
    const germanData = await loadGermanCaptions()
    console.log(`   Loaded ${germanData.length} rows\n`)
    
    // Get recently created artworks
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const artworks = await client.fetch(`
      *[_type == "artwork" && _createdAt >= $today]{
        _id,
        name,
        workTitle,
        'creator': creator->{_id, name},
        'imageFilename': images[0].asset->originalFilename
      } | order(_createdAt asc)
    `, { today: today.toISOString() })
    
    console.log(`📊 Found ${artworks.length} artworks to process\n`)
    
    // Load audit data for profile URLs
    const auditData = JSON.parse(
      fs.readFileSync('/Users/florian.ludwig/Documents/aa_scan/reports/profile-audit-complete-2025-10-28.json', 'utf8')
    )
    
    // Group by creator and scrape English
    const byCreator = new Map()
    artworks.forEach(aw => {
      const creatorName = aw.creator?.name
      if (!creatorName) return
      
      if (!byCreator.has(creatorName)) {
        byCreator.set(creatorName, [])
      }
      byCreator.get(creatorName).push(aw)
    })
    
    console.log(`   ${byCreator.size} unique creators\n`)
    console.log('🌐 Scraping English profiles for captions...\n')
    
    const englishCaptions = new Map()
    
    for (const [creatorName, creatorArtworks] of byCreator) {
      const profileMatch = auditData.creatorMatches.find(m =>
        m.creatorName.toLowerCase() === creatorName.toLowerCase()
      )
      
      if (!profileMatch?.profileUrl) {
        console.log(`   ⚠️  ${creatorName}: No profile URL`)
        continue
      }
      
      console.log(`   ${creatorName}...`)
      const englishData = await scrapeEnglishCaptions(profileMatch.profileUrl)
      
      if (englishData) {
        englishData.forEach(item => {
          const key = item.filename.toLowerCase().replace(/^\d+_/, '')
          englishCaptions.set(key, item.captionEN)
        })
      }
      
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
    
    console.log(`\\n   ✓ Scraped ${englishCaptions.size} English captions\n`)
    
    // Process each artwork
    console.log('🔧 Processing artworks...\n')
    
    let updated = 0
    const updates = []
    
    for (const artwork of artworks) {
      // Find German caption from CSV
      const germanRow = germanData.find(row => {
        const rowFilename = (row['Media Filename'] || '').toLowerCase()
        const artworkFilename = (artwork.imageFilename || '').toLowerCase()
        return rowFilename === artworkFilename
      })
      
      if (!germanRow) continue
      
      const captionDE = germanRow.Caption
      const captionEN = englishCaptions.get(
        (artwork.imageFilename || '').toLowerCase().replace(/^\d+_/, '')
      )
      
      // Parse both
      const parsedDE = parseCaption(captionDE, 'de')
      const parsedEN = captionEN ? parseCaption(captionEN, 'en') : {}
      
      // Build update
      const update = {
        _id: artwork._id,
        changes: {
          name: `${artwork.creator.name}_${parsedDE.title}`.slice(0, 100),
          'workTitle.en': parsedEN.title || parsedDE.title,
          'workTitle.de': parsedDE.title,
          'description.en': parsedEN.fullCaption || null,
          'description.de': parsedDE.fullCaption,
          size: parsedDE.size || parsedEN.size || null,
          year: parsedDE.year || parsedEN.year || null
        },
        materials: [...new Set([...(parsedDE.materials || []), ...(parsedEN.materials || [])])]
      }
      
      updates.push(update)
    }
    
    // Show preview
    console.log('📋 PREVIEW (first 5):\n')
    updates.slice(0, 5).forEach((upd, i) => {
      console.log(`${i + 1}. ID: ${upd._id}`)
      console.log(`   Name: ${upd.changes.name}`)
      console.log(`   Title EN: ${upd.changes['workTitle.en']}`)
      console.log(`   Title DE: ${upd.changes['workTitle.de']}`)
      console.log(`   Size: ${upd.changes.size || 'N/A'}`)
      console.log(`   Year: ${upd.changes.year || 'N/A'}`)
      console.log(`   Materials: ${upd.materials.join(', ') || 'N/A'}`)
      console.log('')
    })
    
    if (DRY_RUN) {
      console.log('=' .repeat(80))
      console.log('✨ DRY RUN COMPLETE')
      console.log('=' .repeat(80))
      console.log(`\\nWould update ${updates.length} artworks`)
      console.log('\\n💡 Run with --execute to apply changes\n')
      
      // Save preview
      fs.writeFileSync(
        '/Users/florian.ludwig/Documents/aa_scan/reports/structured-data-preview.json',
        JSON.stringify(updates.slice(0, 20), null, 2)
      )
      console.log('💾 Preview saved to: structured-data-preview.json\n')
      
    } else {
      // Execute updates
      console.log('=' .repeat(80))
      console.log('🚀 EXECUTING UPDATES...')
      console.log('=' .repeat(80) + '\n')
      
      for (const update of updates) {
        try {
          await client
            .patch(update._id)
            .set(update.changes)
            .commit()
          updated++
          
          if (updated % 50 === 0) {
            console.log(`   Updated ${updated}/${updates.length}...`)
          }
        } catch (error) {
          console.error(`   ✗ Failed to update ${update._id}: ${error.message}`)
        }
      }
      
      console.log(`\\n✅ Updated ${updated} artworks\n`)
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error.stack)
  }
}

updateStructuredData()

