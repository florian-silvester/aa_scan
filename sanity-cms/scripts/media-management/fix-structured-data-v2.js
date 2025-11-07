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

// Normalize umlauts and special characters
function normalizeUmlauts(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/ß/g, 'ss')
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/á/g, 'a')
    .replace(/à/g, 'a')
    .replace(/ó/g, 'o')
    .replace(/ò/g, 'o')
}

// Normalize filename for matching
function normalizeFilename(filename) {
  if (!filename) return ''
  return normalizeUmlauts(filename)
    .replace(/^\d+_/, '') // Remove WordPress media ID prefix
    .replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)$/i, '.$1') // Remove size suffixes
    .replace(/\.jpeg$/i, '.jpg')
    .replace(/-e\d+\.(jpg|jpeg|png|gif|webp)$/i, '.$1') // Remove -e1409239158114 suffixes
}

// Try multiple URL variations to find English profile
async function findEnglishProfile(germanUrl) {
  const baseUrl = germanUrl.replace('artaurea.de', 'artaurea.com')
  const slug = germanUrl.split('/profiles/')[1]?.replace('/', '')
  
  if (!slug) return null
  
  // Try variations
  const variations = [
    baseUrl,  // Direct swap
    `https://artaurea.com/profiles/${slug}-2/`,
    `https://artaurea.com/profiles/${slug}-3/`,
    `https://artaurea.com/profiles/${slug}-4/`
  ]
  
  for (const url of variations) {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        redirect: 'manual' // Don't follow redirects
      })
      // Accept 200 OK or 301/302 redirects that stay on .com
      if (response.ok) {
        return url
      }
      // If redirect, check if it's staying on .com
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (location && location.includes('artaurea.com')) {
          return url // Redirect but stays on .com
        }
        // If redirects to .de, this is wrong URL, continue trying
      }
    } catch (error) {
      continue
    }
  }
  
  return null
}

// Scrape English profile for captions
async function scrapeEnglishCaptions(englishUrl) {
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
        const normalizedFilename = normalizeFilename(filename)
        
        artworks.push({
          filename,
          normalizedFilename,
          captionEN: caption.replace(/<[^>]+>/g, '')
        })
      }
    })
    
    return artworks
  } catch (error) {
    return null
  }
}

// IMPROVED: Parse structured data from caption
function parseCaption(caption, language = 'de') {
  if (!caption) return {}
  
  const result = {
    fullCaption: caption,
    title: '',
    size: null,
    year: null,
    materials: []
  }
  
  // Extract year
  const yearMatch = caption.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) {
    result.year = yearMatch[0]
  }
  
  // IMPROVED: Extract dimensions including slash-separated sets
  // Match patterns like: 36 × 6,8 × 9 cm/19 × 12,5 × 9,8 cm/24 × 8,4 × 6,4 cm
  const complexSizePattern = /[\dØø,.\s×xX-]+\s*cm(?:\/[\dØø,.\s×xX-]+\s*cm)*/gi
  const complexMatch = caption.match(complexSizePattern)
  
  if (complexMatch && complexMatch.length > 0) {
    // Take the longest match (most complete)
    result.size = complexMatch.reduce((a, b) => a.length > b.length ? a : b).trim()
  } else {
    // Fallback to simpler patterns
    const sizePatterns = [
      /[HhØø]\s*\d+[^.,]*?cm/gi,
      /\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\s*cm/gi,
    ]
    
    const sizeMatches = new Set()
    sizePatterns.forEach(pattern => {
      const matches = caption.match(pattern)
      if (matches) {
        matches.forEach(m => sizeMatches.add(m.trim()))
      }
    })
    
    if (sizeMatches.size > 0) {
      result.size = Array.from(sizeMatches).join(', ')
    }
  }
  
  // Extract materials
  const materialKeywords = language === 'de' ? [
    'Porzellan', 'Keramik', 'Steinzeug', 'Ton', 'Glas', 'Holz', 'Metall',
    'Silber', 'Gold', 'Platin', 'Bronze', 'Kupfer', 'Messing', 'Tombak',
    'Textil', 'Wolle', 'Seide', 'Baumwolle', 'Leder', 'Ebenholz'
  ] : [
    'Porcelain', 'Ceramic', 'Stoneware', 'Clay', 'Glass', 'Wood', 'Metal',
    'Silver', 'Gold', 'Platinum', 'Bronze', 'Copper', 'Brass', 'Red brass',
    'Textile', 'Wool', 'Silk', 'Cotton', 'Leather', 'Ebony'
  ]
  
  materialKeywords.forEach(material => {
    const regex = new RegExp(`\\b${material}\\b`, 'i')
    if (regex.test(caption)) {
      result.materials.push(material)
    }
  })
  
  // Extract clean title
  let title = caption
  
  const splitPatterns = [
    /\.\s+(?:Glas|Keramik|Holz|Metall|Schmuck|Textil|Silber|Gold|Porzellan|Steinzeug|Tombak)/i,
    /\.\s+(?:Glass|Ceramic|Wood|Metal|Jewelry|Textile|Silver|Gold|Porcelain|Stoneware|Red brass)/i,
    /\,\s+\d{4}/,
    /\d+\s*[x×]\s*\d+/
  ]
  
  for (const pattern of splitPatterns) {
    const match = title.match(pattern)
    if (match) {
      title = title.substring(0, match.index)
      break
    }
  }
  
  title = title
    .replace(/[.,;:]$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  result.title = title
  
  return result
}

// Main fix function
async function fixStructuredData() {
  console.log('🔧 FIXING Structured Data Issues (V2)\n')
  console.log('=' .repeat(80))
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
    console.log('   Run with --execute to apply fixes')
  } else {
    console.log('⚠️  EXECUTE MODE - Will update artworks!')
  }
  console.log('=' .repeat(80) + '\n')
  
  console.log('V2 Improvements:')
  console.log('  1. ✅ Normalize umlauts for filename matching (ü→u, ö→o, ä→a)')
  console.log('  2. ✅ Fix size parsing for slash-separated dimensions')
  console.log('  3. ✅ Better English caption matching\n')
  
  try {
    // Load German captions
    console.log('📥 Loading German captions...\n')
    const germanData = await new Promise((resolve) => {
      const data = []
      fs.createReadStream('/Users/florian.ludwig/Documents/aa_scan/reports/ready-to-create-artworks-2025-10-29.csv')
        .pipe(csv())
        .on('data', (row) => data.push(row))
        .on('end', () => resolve(data))
    })
    
    // Get artworks created today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const artworks = await client.fetch(`
      *[_type == "artwork" && _createdAt >= $today]{
        _id,
        name,
        'creator': creator->{_id, name},
        'imageFilename': images[0].asset->originalFilename
      } | order(_createdAt asc)
    `, { today: today.toISOString() })
    
    console.log(`📊 Found ${artworks.length} artworks to fix\n`)
    
    // Load audit data
    const auditData = JSON.parse(
      fs.readFileSync('/Users/florian.ludwig/Documents/aa_scan/reports/profile-audit-complete-2025-10-28.json', 'utf8')
    )
    
    // Group by creator
    const byCreator = new Map()
    artworks.forEach(aw => {
      const creatorName = aw.creator?.name
      if (!creatorName) return
      
      if (!byCreator.has(creatorName)) {
        byCreator.set(creatorName, [])
      }
      byCreator.get(creatorName).push(aw)
    })
    
    console.log(`🌐 Re-scraping English with improved matching...\n`)
    
    const englishCaptions = new Map()
    let foundUrls = 0
    let notFound = 0
    
    for (const [creatorName, creatorArtworks] of byCreator) {
      const profileMatch = auditData.creatorMatches.find(m =>
        m.creatorName.toLowerCase() === creatorName.toLowerCase()
      )
      
      if (!profileMatch?.profileUrl) {
        notFound++
        continue
      }
      
      // Try to find English profile with URL variations
      const englishUrl = await findEnglishProfile(profileMatch.profileUrl)
      
      if (!englishUrl) {
        console.log(`   ⚠️  ${creatorName}: No English profile found`)
        notFound++
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
        continue
      }
      
      console.log(`   ✓ ${creatorName}: ${englishUrl}`)
      foundUrls++
      
      const englishData = await scrapeEnglishCaptions(englishUrl)
      
      if (englishData) {
        englishData.forEach(item => {
          englishCaptions.set(item.normalizedFilename, item.captionEN)
        })
      }
      
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
    
    console.log(`\n   ✓ Found ${foundUrls} English profiles`)
    console.log(`   ✗ Not found: ${notFound}`)
    console.log(`   📝 Scraped ${englishCaptions.size} English captions\n`)
    
    // Process updates
    console.log('🔧 Processing fixes...\n')
    
    const updates = []
    let matchedEN = 0
    
    for (const artwork of artworks) {
      const germanRow = germanData.find(row => {
        const rowFilename = (row['Media Filename'] || '').toLowerCase()
        const artworkFilename = (artwork.imageFilename || '').toLowerCase()
        return rowFilename === artworkFilename
      })
      
      if (!germanRow) continue
      
      const captionDE = germanRow.Caption
      
      // IMPROVED: Normalize filename for matching
      const normalizedArtworkFilename = normalizeFilename(artwork.imageFilename)
      const captionEN = englishCaptions.get(normalizedArtworkFilename)
      
      if (captionEN) {
        matchedEN++
      }
      
      // Parse - ONLY use DE for size to avoid duplicates
      const parsedDE = parseCaption(captionDE, 'de')
      const parsedEN = captionEN ? parseCaption(captionEN, 'en') : {}
      
      const update = {
        _id: artwork._id,
        changes: {
          name: `${artwork.creator.name}_${parsedDE.title}`.slice(0, 100),
          'workTitle.en': parsedEN.title || parsedDE.title,
          'workTitle.de': parsedDE.title,
          'description.en': parsedEN.fullCaption || null,
          'description.de': parsedDE.fullCaption,
          size: parsedDE.size || null,  // ONLY from DE, with improved parsing
          year: parsedDE.year || parsedEN.year || null
        }
      }
      
      updates.push(update)
    }
    
    console.log(`   ✓ Matched ${matchedEN}/${artworks.length} English captions\n`)
    
    // Preview
    console.log('📋 PREVIEW (first 5 fixes):\n')
    updates.slice(0, 5).forEach((upd, i) => {
      console.log(`${i + 1}. ${upd.changes.name}`)
      console.log(`   Size: ${upd.changes.size || 'N/A'}`)
      console.log(`   EN title: ${upd.changes['workTitle.en']}`)
      console.log(`   Has EN caption: ${upd.changes['description.en'] ? 'Yes ✓' : 'No'}`)
      console.log('')
    })
    
    // Show Basalta example
    const basaltaUpdate = updates.find(u => u.changes.name.includes('Basalta'))
    if (basaltaUpdate) {
      console.log('🎯 BASALTA FIX CHECK:\n')
      console.log(`   Size: ${basaltaUpdate.changes.size}`)
      console.log(`   Has EN: ${basaltaUpdate.changes['description.en'] ? 'Yes ✓' : 'No'}`)
      console.log('')
    }
    
    if (DRY_RUN) {
      console.log('=' .repeat(80))
      console.log('✨ DRY RUN COMPLETE')
      console.log('=' .repeat(80))
      console.log(`\nWould update ${updates.length} artworks`)
      console.log(`English captions matched: ${matchedEN} (${(matchedEN/updates.length*100).toFixed(1)}%)`)
      console.log('\n💡 Run with --execute to apply\n')
      
    } else {
      console.log('=' .repeat(80))
      console.log('🚀 APPLYING FIXES...')
      console.log('=' .repeat(80) + '\n')
      
      let updated = 0
      
      for (const update of updates) {
        try {
          await client
            .patch(update._id)
            .set(update.changes)
            .commit()
          updated++
          
          if (updated % 50 === 0) {
            console.log(`   Fixed ${updated}/${updates.length}...`)
          }
        } catch (error) {
          console.error(`   ✗ Failed ${update._id}: ${error.message}`)
        }
      }
      
      console.log(`\n✅ Fixed ${updated} artworks\n`)
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error.stack)
  }
}

fixStructuredData()

