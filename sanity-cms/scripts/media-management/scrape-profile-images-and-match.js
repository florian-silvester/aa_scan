import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

// Helper to normalize strings for matching
function normalizeForMatching(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/[äàáâã]/g, 'a')
    .replace(/[öòóô]/g, 'o')
    .replace(/[üùúû]/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract creator name and artwork info from filename
function parseFilename(filename) {
  // Remove extension and size suffixes like -1024x672
  const cleaned = filename
    .replace(/\.[^.]+$/, '')
    .replace(/-\d+x\d+$/, '')
    .replace(/_/g, '-')
  
  const parts = cleaned.split('-')
  return {
    original: filename,
    cleaned,
    parts,
    firstWord: parts[0]?.toLowerCase() || '',
    lastWord: parts[parts.length - 1]?.toLowerCase() || ''
  }
}

// Extract title and details from caption
function parseCaption(caption) {
  if (!caption) return {}
  
  // Remove HTML tags
  const text = caption.replace(/<[^>]+>/g, '')
  
  // Extract year if present
  const yearMatch = text.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? yearMatch[0] : null
  
  // Extract dimensions
  const dimMatch = text.match(/[HhØø]\s*\d+[^.]*cm/g)
  const dimensions = dimMatch ? dimMatch.join(', ') : null
  
  // Extract title (usually before the first period or before dimensions)
  let title = text.split(/\.\s+(?:Glas|Keramik|Holz|Metall)/i)[0]
  title = title.split(/\d+\s*[x×]\s*\d+/)[0] // Remove dimensions
  title = title.trim()
  
  return {
    text,
    title,
    year,
    dimensions,
    normalized: normalizeForMatching(title)
  }
}

async function scrapeProfilePage(profileUrl) {
  console.log(`\n📥 Fetching: ${profileUrl}`)
  
  try {
    const response = await fetch(profileUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Extract creator name from page
    const creatorName = document.querySelector('h1')?.textContent?.trim() || 
                       document.querySelector('.entry-title')?.textContent?.trim()
    
    // Find all carousel images
    const carouselImages = []
    const imageLinks = document.querySelectorAll('.carousel_slide a[data-fancybox="gallery"]')
    
    imageLinks.forEach((link, index) => {
      const dataSrc = link.getAttribute('data-src')
      const caption = link.getAttribute('data-caption')
      const img = link.querySelector('img')
      const imgSrc = img?.getAttribute('src')
      
      if (dataSrc || imgSrc) {
        const imageUrl = dataSrc || imgSrc
        const filename = imageUrl.split('/').pop()
        const parsedFilename = parseFilename(filename)
        const parsedCaption = parseCaption(caption)
        
        carouselImages.push({
          index: index + 1,
          imageUrl,
          filename,
          caption: caption || '',
          parsedFilename,
          parsedCaption
        })
      }
    })
    
    console.log(`   Found ${carouselImages.length} images for ${creatorName}`)
    
    return {
      profileUrl,
      creatorName,
      images: carouselImages
    }
    
  } catch (error) {
    console.error(`   ❌ Error scraping ${profileUrl}:`, error.message)
    return null
  }
}

async function matchImagesToArtworks(profileData) {
  if (!profileData) return null
  
  console.log(`\n🔍 Matching images for ${profileData.creatorName}...`)
  
  // Get creator from Sanity
  const creators = await client.fetch(`
    *[_type == "creator" && name match "*${profileData.creatorName}*"]{
      _id,
      name,
      slug,
      profileUrl
    }
  `)
  
  if (creators.length === 0) {
    console.log(`   ⚠️  Creator not found in Sanity: ${profileData.creatorName}`)
    return { ...profileData, sanityCreator: null, artworks: [], media: [] }
  }
  
  const creator = creators[0]
  console.log(`   ✓ Found creator in Sanity: ${creator.name} (${creator._id})`)
  
  // Get all artworks by this creator
  const artworks = await client.fetch(`
    *[_type == "artwork" && creator._ref == $creatorId]{
      _id,
      name,
      "workTitle": workTitle.en,
      "workTitleDe": workTitle.de,
      slug,
      year,
      "imageCount": count(images),
      "images": images[].asset._ref,
      "mainImage": mainImage.asset._ref,
      originalFilename
    }
  `, { creatorId: creator._id })
  
  console.log(`   Found ${artworks.length} artworks in Sanity`)
  
  // Get all media assets uploaded for this creator (by filename pattern)
  const creatorLastName = creator.name.split(' ').pop().toLowerCase()
  const allMedia = await client.fetch(`
    *[_type == "sanity.imageAsset"]{
      _id,
      originalFilename,
      url,
      size
    }
  `)
  
  // Filter media that might belong to this creator based on filename
  const creatorMedia = allMedia.filter(m => {
    const filename = (m.originalFilename || '').toLowerCase()
    const normalizedCreatorName = normalizeForMatching(creator.name)
    const words = normalizedCreatorName.split(' ')
    return words.some(word => word.length > 3 && filename.includes(word))
  })
  
  console.log(`   Found ${creatorMedia.length} media assets matching creator name pattern`)
  
  // Find orphaned media (not linked to any artwork)
  const allLinkedImageRefs = new Set()
  artworks.forEach(artwork => {
    if (artwork.mainImage) allLinkedImageRefs.add(artwork.mainImage)
    if (artwork.images) artwork.images.forEach(ref => allLinkedImageRefs.add(ref))
  })
  
  const orphanedMedia = creatorMedia.filter(m => !allLinkedImageRefs.has(m._id))
  
  console.log(`   📊 ${orphanedMedia.length} orphaned media assets (not linked to artworks)`)
  
  // Match profile images to Sanity media and artworks
  const matches = []
  
  for (const profileImage of profileData.images) {
    const match = {
      profileImage,
      sanityMedia: null,
      linkedArtwork: null,
      suggestedArtworks: [],
      status: 'unmatched'
    }
    
    // Try to find this image in Sanity media
    const mediaMatch = allMedia.find(m => {
      const sanityFilename = (m.originalFilename || '').toLowerCase()
      const profileFilename = profileImage.filename.toLowerCase()
      // Match by exact filename or filename without size suffix
      return sanityFilename === profileFilename || 
             sanityFilename.replace(/-\d+x\d+/, '') === profileFilename.replace(/-\d+x\d+/, '')
    })
    
    if (mediaMatch) {
      match.sanityMedia = mediaMatch
      
      // Check if this media is already linked to an artwork
      const linkedArtwork = artworks.find(aw => 
        aw.mainImage === mediaMatch._id || 
        (aw.images && aw.images.includes(mediaMatch._id))
      )
      
      if (linkedArtwork) {
        match.linkedArtwork = linkedArtwork
        match.status = 'linked'
      } else {
        match.status = 'orphaned_in_sanity'
      }
    } else {
      match.status = 'missing_in_sanity'
    }
    
    // Suggest artwork matches based on title/caption similarity
    if (profileImage.parsedCaption.title) {
      const captionNormalized = profileImage.parsedCaption.normalized
      
      artworks.forEach(artwork => {
        const titleEn = normalizeForMatching(artwork.workTitle || '')
        const titleDe = normalizeForMatching(artwork.workTitleDe || '')
        const name = normalizeForMatching(artwork.name || '')
        
        // Calculate similarity score
        let score = 0
        
        // Check for word matches
        const captionWords = captionNormalized.split(' ').filter(w => w.length > 3)
        captionWords.forEach(word => {
          if (titleEn.includes(word) || titleDe.includes(word) || name.includes(word)) {
            score += 10
          }
        })
        
        // Year match bonus
        if (profileImage.parsedCaption.year && artwork.year === profileImage.parsedCaption.year) {
          score += 20
        }
        
        // If artwork has no images, higher priority
        if (artwork.imageCount === 0) {
          score += 5
        }
        
        if (score > 10) {
          match.suggestedArtworks.push({
            artwork,
            score,
            reason: `${score} points (title similarity${profileImage.parsedCaption.year === artwork.year ? ' + year match' : ''}${artwork.imageCount === 0 ? ' + needs images' : ''})`
          })
        }
      })
      
      // Sort by score
      match.suggestedArtworks.sort((a, b) => b.score - a.score)
    }
    
    matches.push(match)
  }
  
  return {
    ...profileData,
    sanityCreator: creator,
    artworks,
    creatorMedia,
    orphanedMedia,
    matches
  }
}

async function analyzeProfiles(profileUrls) {
  console.log('🚀 Starting profile image analysis...\n')
  console.log(`Analyzing ${profileUrls.length} profiles...\n`)
  
  const results = []
  
  for (const url of profileUrls) {
    const profileData = await scrapeProfilePage(url)
    if (profileData) {
      const matchedData = await matchImagesToArtworks(profileData)
      results.push(matchedData)
    }
    
    // Be nice to the server
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // Generate report
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 ANALYSIS SUMMARY')
  console.log('='.repeat(80))
  
  let totalProfileImages = 0
  let totalLinked = 0
  let totalOrphaned = 0
  let totalMissing = 0
  let totalSuggestions = 0
  
  results.forEach(result => {
    if (!result) return
    
    console.log(`\n${result.creatorName}:`)
    console.log(`  Profile images: ${result.images.length}`)
    
    const linked = result.matches.filter(m => m.status === 'linked').length
    const orphaned = result.matches.filter(m => m.status === 'orphaned_in_sanity').length
    const missing = result.matches.filter(m => m.status === 'missing_in_sanity').length
    const withSuggestions = result.matches.filter(m => m.suggestedArtworks.length > 0).length
    
    console.log(`  ✅ Linked to artworks: ${linked}`)
    console.log(`  ⚠️  In Sanity but orphaned: ${orphaned}`)
    console.log(`  ❌ Missing from Sanity: ${missing}`)
    console.log(`  💡 With match suggestions: ${withSuggestions}`)
    
    totalProfileImages += result.images.length
    totalLinked += linked
    totalOrphaned += orphaned
    totalMissing += missing
    totalSuggestions += withSuggestions
  })
  
  console.log('\n' + '='.repeat(80))
  console.log('TOTALS:')
  console.log(`  Total profile images analyzed: ${totalProfileImages}`)
  console.log(`  Already linked: ${totalLinked} (${(totalLinked/totalProfileImages*100).toFixed(1)}%)`)
  console.log(`  Orphaned in Sanity: ${totalOrphaned} (${(totalOrphaned/totalProfileImages*100).toFixed(1)}%)`)
  console.log(`  Missing from Sanity: ${totalMissing} (${(totalMissing/totalProfileImages*100).toFixed(1)}%)`)
  console.log(`  With suggestions: ${totalSuggestions}`)
  console.log('='.repeat(80))
  
  // Save detailed reports
  const timestamp = new Date().toISOString().split('T')[0]
  
  // Save JSON report
  const jsonFilename = `/Users/florian.ludwig/Documents/aa_scan/reports/profile-image-analysis-${timestamp}.json`
  fs.writeFileSync(jsonFilename, JSON.stringify(results, null, 2))
  console.log(`\n💾 Detailed JSON report: ${jsonFilename}`)
  
  // Save CSV of orphaned media with suggestions
  const csvRows = []
  results.forEach(result => {
    if (!result) return
    
    result.matches.forEach(match => {
      if (match.status === 'orphaned_in_sanity' && match.suggestedArtworks.length > 0) {
        const topSuggestion = match.suggestedArtworks[0]
        csvRows.push({
          creator: result.creatorName,
          imageFilename: match.profileImage.filename,
          imageCaption: match.profileImage.parsedCaption.title || '',
          sanityMediaId: match.sanityMedia._id,
          suggestedArtworkId: topSuggestion.artwork._id,
          suggestedArtworkTitle: topSuggestion.artwork.workTitle || topSuggestion.artwork.name,
          matchScore: topSuggestion.score,
          reason: topSuggestion.reason
        })
      }
    })
  })
  
  if (csvRows.length > 0) {
    const csvHeader = 'Creator,Image Filename,Image Caption,Sanity Media ID,Suggested Artwork ID,Suggested Artwork Title,Match Score,Reason\n'
    const csvContent = csvHeader + csvRows.map(row => 
      `"${row.creator}","${row.imageFilename}","${row.imageCaption}","${row.sanityMediaId}","${row.suggestedArtworkId}","${row.suggestedArtworkTitle}",${row.matchScore},"${row.reason}"`
    ).join('\n')
    
    const csvFilename = `/Users/florian.ludwig/Documents/aa_scan/reports/orphaned-media-suggestions-${timestamp}.csv`
    fs.writeFileSync(csvFilename, csvContent)
    console.log(`💾 Orphaned media suggestions CSV: ${csvFilename}`)
  }
  
  console.log('\n✨ Analysis complete!\n')
  
  return results
}

// Main execution
const PROFILE_URLS = [
  'https://artaurea.de/profiles/urup-tora/',
  // Add more profile URLs here
]

// Check if URLs provided as command line arguments
const args = process.argv.slice(2)
const urlsToAnalyze = args.length > 0 ? args : PROFILE_URLS

if (urlsToAnalyze.length === 0) {
  console.log('❌ No profile URLs provided!')
  console.log('\nUsage:')
  console.log('  node scrape-profile-images-and-match.js <profile-url1> <profile-url2> ...')
  console.log('\nOr edit PROFILE_URLS in the script.')
  process.exit(1)
}

analyzeProfiles(urlsToAnalyze)

