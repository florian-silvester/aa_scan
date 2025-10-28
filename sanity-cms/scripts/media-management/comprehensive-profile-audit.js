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

const BASE_URL = 'https://artaurea.de'
const DELAY_MS = 1000 // Be nice to the server

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper to normalize strings for matching
function normalizeForMatching(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[äàáâã]/g, 'a')
    .replace(/[öòóô]/g, 'o')
    .replace(/[üùúû]/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract profile URLs from the main profiles page
async function getAllProfileUrls() {
  console.log('📋 Fetching all profile URLs from artaurea.de...\n')
  
  try {
    const response = await fetch(`${BASE_URL}/profiles/`)
    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    const profileLinks = []
    const links = document.querySelectorAll('a[href*="/profiles/"]')
    
    links.forEach(link => {
      const href = link.getAttribute('href')
      if (href && href.includes('/profiles/') && !href.endsWith('/profiles/')) {
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
        if (!profileLinks.includes(fullUrl)) {
          profileLinks.push(fullUrl)
        }
      }
    })
    
    console.log(`   Found ${profileLinks.length} unique profile URLs\n`)
    return profileLinks
    
  } catch (error) {
    console.error('❌ Error fetching profile URLs:', error.message)
    return []
  }
}

// Scrape a single profile page
async function scrapeProfile(profileUrl) {
  try {
    const response = await fetch(profileUrl)
    if (!response.ok) {
      console.log(`   ⚠️  HTTP ${response.status} for ${profileUrl}`)
      return null
    }
    
    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Extract creator name
    const creatorName = document.querySelector('h1')?.textContent?.trim() ||
                       document.querySelector('.entry-title')?.textContent?.trim()
    
    if (!creatorName) {
      console.log(`   ⚠️  No creator name found for ${profileUrl}`)
      return null
    }
    
    // Extract artworks from carousel
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
        
        // Parse caption to extract details
        const captionText = caption.replace(/<[^>]+>/g, '')
        const yearMatch = captionText.match(/\b(19|20)\d{2}\b/)
        const year = yearMatch ? yearMatch[0] : null
        
        // Extract title (before first period or before dimensions)
        let title = captionText.split(/\.\s+(?:Glas|Keramik|Holz|Metall|Schmuck|Textil)/i)[0]
        title = title.split(/\d+\s*[x×]\s*\d+/)[0].trim()
        
        artworks.push({
          index: index + 1,
          imageUrl,
          filename,
          caption: captionText,
          title,
          year
        })
      }
    })
    
    console.log(`   ✓ ${creatorName}: ${artworks.length} artworks`)
    
    return {
      profileUrl,
      creatorName,
      artworkCount: artworks.length,
      artworks
    }
    
  } catch (error) {
    console.log(`   ❌ Error scraping ${profileUrl}: ${error.message}`)
    return null
  }
}

// Get all data from Sanity
async function getSanityData() {
  console.log('\n📊 Fetching Sanity data...\n')
  
  // Get all creators
  const creators = await client.fetch(`
    *[_type == "creator"]{
      _id,
      name,
      slug,
      profileUrl,
      "artworkCount": count(*[_type == "artwork" && references(^._id)])
    } | order(name)
  `)
  
  console.log(`   Creators: ${creators.length}`)
  
  // Get all artworks
  const artworks = await client.fetch(`
    *[_type == "artwork"]{
      _id,
      name,
      "workTitle": workTitle.en,
      "workTitleDe": workTitle.de,
      slug,
      "creator": creator->name,
      "creatorId": creator._ref,
      year,
      "imageCount": count(images),
      "images": images[].asset._ref,
      "mainImage": mainImage.asset._ref,
      originalFilename
    }
  `)
  
  console.log(`   Artworks: ${artworks.length}`)
  
  // Get all media
  const media = await client.fetch(`
    *[_type == "sanity.imageAsset"]{
      _id,
      originalFilename,
      url,
      size,
      "usedInArtworks": count(*[_type == "artwork" && (
        mainImage.asset._ref == ^._id ||
        ^._id in images[].asset._ref
      )]),
      "usedInProfiles": count(*[_type == "creator" && profileImage.asset._ref == ^._id])
    }
  `)
  
  const orphanedMedia = media.filter(m => m.usedInArtworks === 0 && m.usedInProfiles === 0)
  
  console.log(`   Total media: ${media.length}`)
  console.log(`   Orphaned media: ${orphanedMedia.length}`)
  
  return {
    creators,
    artworks,
    media,
    orphanedMedia
  }
}

// Match profile data with Sanity data
function analyzeMatches(profileData, sanityData) {
  console.log('\n🔍 Analyzing matches...\n')
  
  const results = {
    totalProfileArtworks: 0,
    totalSanityArtworks: sanityData.artworks.length,
    totalOrphanedMedia: sanityData.orphanedMedia.length,
    creatorMatches: []
  }
  
  profileData.forEach(profile => {
    if (!profile) return
    
    results.totalProfileArtworks += profile.artworkCount
    
    // Find matching creator in Sanity
    const sanityCreator = sanityData.creators.find(c => 
      normalizeForMatching(c.name) === normalizeForMatching(profile.creatorName)
    )
    
    const match = {
      profileUrl: profile.profileUrl,
      creatorName: profile.creatorName,
      profileArtworkCount: profile.artworkCount,
      sanityCreator: sanityCreator ? {
        id: sanityCreator._id,
        name: sanityCreator.name,
        artworkCount: sanityCreator.artworkCount
      } : null,
      artworkMatches: [],
      missingArtworks: [],
      orphanedMediaForCreator: []
    }
    
    if (sanityCreator) {
      // Get artworks for this creator from Sanity
      const creatorArtworks = sanityData.artworks.filter(a => 
        a.creatorId === sanityCreator._id
      )
      
      // Get orphaned media that might belong to this creator
      const creatorNameWords = normalizeForMatching(profile.creatorName).split(' ')
      const possibleOrphanedMedia = sanityData.orphanedMedia.filter(m => {
        const filename = normalizeForMatching(m.originalFilename || '')
        return creatorNameWords.some(word => word.length > 3 && filename.includes(word))
      })
      
      match.orphanedMediaForCreator = possibleOrphanedMedia
      
      // Match profile artworks to Sanity artworks
      profile.artworks.forEach(profileArtwork => {
        const profileFilename = profileArtwork.filename.toLowerCase()
        const profileTitle = normalizeForMatching(profileArtwork.title)
        
        // Try to find matching Sanity media
        const matchedMedia = sanityData.media.find(m => {
          const sanityFilename = (m.originalFilename || '').toLowerCase()
          return sanityFilename === profileFilename ||
                 sanityFilename.replace(/-\d+x\d+/, '') === profileFilename.replace(/-\d+x\d+/, '')
        })
        
        // Try to find matching artwork
        let matchedArtwork = null
        if (matchedMedia) {
          matchedArtwork = creatorArtworks.find(aw =>
            aw.mainImage === matchedMedia._id ||
            (aw.images && aw.images.includes(matchedMedia._id))
          )
        }
        
        // Also try title matching
        if (!matchedArtwork && profileTitle) {
          const titleWords = profileTitle.split(' ').filter(w => w.length > 3)
          matchedArtwork = creatorArtworks.find(aw => {
            const awTitle = normalizeForMatching(aw.workTitle || aw.workTitleDe || aw.name || '')
            return titleWords.some(word => awTitle.includes(word))
          })
        }
        
        if (matchedArtwork || matchedMedia) {
          match.artworkMatches.push({
            profileArtwork,
            sanityMedia: matchedMedia,
            sanityArtwork: matchedArtwork,
            status: matchedArtwork ? 'complete' : (matchedMedia ? 'media_only' : 'title_match')
          })
        } else {
          match.missingArtworks.push(profileArtwork)
        }
      })
    } else {
      // Creator not in Sanity - all artworks are missing
      match.missingArtworks = profile.artworks
    }
    
    results.creatorMatches.push(match)
  })
  
  return results
}

// Generate reports
function generateReports(results) {
  console.log('\n' + '='.repeat(80))
  console.log('📊 COMPREHENSIVE AUDIT SUMMARY')
  console.log('='.repeat(80))
  
  const creatorsInProfile = results.creatorMatches.length
  const creatorsInSanity = results.creatorMatches.filter(m => m.sanityCreator).length
  const creatorsNotInSanity = creatorsInProfile - creatorsInSanity
  
  const totalMatched = results.creatorMatches.reduce((sum, m) => 
    sum + m.artworkMatches.filter(am => am.status === 'complete').length, 0)
  const totalMediaOnly = results.creatorMatches.reduce((sum, m) => 
    sum + m.artworkMatches.filter(am => am.status === 'media_only').length, 0)
  const totalMissing = results.creatorMatches.reduce((sum, m) => 
    sum + m.missingArtworks.length, 0)
  
  console.log(`\n📁 CREATORS:`)
  console.log(`   In profiles: ${creatorsInProfile}`)
  console.log(`   In Sanity: ${creatorsInSanity}`)
  console.log(`   Not in Sanity: ${creatorsNotInSanity}`)
  
  console.log(`\n🎨 ARTWORKS:`)
  console.log(`   In profiles: ${results.totalProfileArtworks}`)
  console.log(`   In Sanity: ${results.totalSanityArtworks}`)
  console.log(`   ✅ Fully matched (artwork + media): ${totalMatched}`)
  console.log(`   ⚠️  Media exists but no artwork: ${totalMediaOnly}`)
  console.log(`   ❌ Missing from Sanity: ${totalMissing}`)
  
  console.log(`\n💾 MEDIA:`)
  console.log(`   Orphaned media in Sanity: ${results.totalOrphanedMedia}`)
  
  const percentageComplete = ((totalMatched / results.totalProfileArtworks) * 100).toFixed(1)
  console.log(`\n📈 COMPLETION RATE: ${percentageComplete}%`)
  
  console.log('='.repeat(80))
  
  // Show top issues
  console.log('\n🔴 TOP ISSUES:\n')
  
  // Creators with most missing artworks
  const creatorsByMissing = [...results.creatorMatches]
    .sort((a, b) => b.missingArtworks.length - a.missingArtworks.length)
    .slice(0, 10)
  
  console.log('Creators with most missing artworks:')
  creatorsByMissing.forEach((match, i) => {
    if (match.missingArtworks.length > 0) {
      console.log(`   ${i + 1}. ${match.creatorName}: ${match.missingArtworks.length} missing`)
    }
  })
  
  // Creators with orphaned media
  console.log('\nCreators with most orphaned media:')
  const creatorsByOrphaned = [...results.creatorMatches]
    .filter(m => m.orphanedMediaForCreator.length > 0)
    .sort((a, b) => b.orphanedMediaForCreator.length - a.orphanedMediaForCreator.length)
    .slice(0, 10)
  
  creatorsByOrphaned.forEach((match, i) => {
    console.log(`   ${i + 1}. ${match.creatorName}: ${match.orphanedMediaForCreator.length} orphaned media`)
  })
  
  // Save detailed reports
  const timestamp = new Date().toISOString().split('T')[0]
  
  // Full JSON report
  const jsonFilename = `/Users/florian.ludwig/Documents/aa_scan/reports/profile-audit-complete-${timestamp}.json`
  fs.writeFileSync(jsonFilename, JSON.stringify(results, null, 2))
  console.log(`\n💾 Full JSON report: ${jsonFilename}`)
  
  // CSV: Missing artworks
  const missingCsvRows = []
  results.creatorMatches.forEach(match => {
    match.missingArtworks.forEach(artwork => {
      missingCsvRows.push({
        creator: match.creatorName,
        profileUrl: match.profileUrl,
        artworkTitle: artwork.title || '',
        caption: artwork.caption || '',
        year: artwork.year || '',
        imageUrl: artwork.imageUrl,
        filename: artwork.filename,
        creatorInSanity: match.sanityCreator ? 'Yes' : 'No',
        creatorId: match.sanityCreator?.id || ''
      })
    })
  })
  
  if (missingCsvRows.length > 0) {
    const csvHeader = 'Creator,Profile URL,Artwork Title,Caption,Year,Image URL,Filename,Creator in Sanity,Creator ID\n'
    const csvContent = csvHeader + missingCsvRows.map(row =>
      `"${row.creator}","${row.profileUrl}","${row.artworkTitle}","${row.caption.replace(/"/g, '""')}","${row.year}","${row.imageUrl}","${row.filename}","${row.creatorInSanity}","${row.creatorId}"`
    ).join('\n')
    
    const csvFilename = `/Users/florian.ludwig/Documents/aa_scan/reports/missing-artworks-${timestamp}.csv`
    fs.writeFileSync(csvFilename, csvContent)
    console.log(`💾 Missing artworks CSV: ${csvFilename}`)
  }
  
  // CSV: Orphaned media with creator matches
  const orphanedCsvRows = []
  results.creatorMatches.forEach(match => {
    if (match.orphanedMediaForCreator.length > 0 && match.sanityCreator) {
      match.orphanedMediaForCreator.forEach(media => {
        orphanedCsvRows.push({
          creator: match.creatorName,
          creatorId: match.sanityCreator.id,
          mediaId: media._id,
          filename: media.originalFilename || '',
          url: media.url,
          sizeKB: Math.round(media.size / 1024)
        })
      })
    }
  })
  
  if (orphanedCsvRows.length > 0) {
    const csvHeader = 'Creator,Creator ID,Media ID,Filename,URL,Size (KB)\n'
    const csvContent = csvHeader + orphanedCsvRows.map(row =>
      `"${row.creator}","${row.creatorId}","${row.mediaId}","${row.filename}","${row.url}",${row.sizeKB}`
    ).join('\n')
    
    const csvFilename = `/Users/florian.ludwig/Documents/aa_scan/reports/orphaned-media-by-creator-${timestamp}.csv`
    fs.writeFileSync(csvFilename, csvContent)
    console.log(`💾 Orphaned media CSV: ${csvFilename}`)
  }
  
  console.log('\n✨ Audit complete!\n')
}

// Main execution
async function runAudit() {
  console.log('🚀 Starting Comprehensive Profile Audit\n')
  console.log('This will:')
  console.log('  1. Scrape all profile pages from artaurea.de')
  console.log('  2. Fetch all data from Sanity')
  console.log('  3. Match and identify gaps')
  console.log('  4. Generate detailed reports\n')
  
  try {
    // Step 1: Get all profile URLs
    const profileUrls = await getAllProfileUrls()
    
    if (profileUrls.length === 0) {
      console.log('❌ No profile URLs found!')
      return
    }
    
    // Step 2: Scrape all profiles
    console.log(`📥 Scraping ${profileUrls.length} profiles...\n`)
    const profileData = []
    
    for (let i = 0; i < profileUrls.length; i++) {
      const url = profileUrls[i]
      console.log(`   [${i + 1}/${profileUrls.length}] ${url}`)
      const data = await scrapeProfile(url)
      if (data) {
        profileData.push(data)
      }
      await delay(DELAY_MS)
    }
    
    console.log(`\n   ✓ Successfully scraped ${profileData.length} profiles`)
    
    // Step 3: Get Sanity data
    const sanityData = await getSanityData()
    
    // Step 4: Analyze matches
    const results = analyzeMatches(profileData, sanityData)
    
    // Step 5: Generate reports
    generateReports(results)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    console.error(error.stack)
  }
}

// Run it!
runAudit()

