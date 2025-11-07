import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'
import csv from 'csv-parser'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

function normalizeFilename(filename) {
  if (!filename) return ''
  return filename
    .toLowerCase()
    .replace(/^\d+_/, '') // Remove WordPress media ID prefix like "4080_"
    .replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)$/i, '.$1') // Remove size suffixes like -1024x672.jpg
    .replace(/\.jpeg$/i, '.jpg') // Normalize jpeg to jpg
}

function extractKeywords(str) {
  if (!str) return []
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
}

async function analyzeMissingArtworks() {
  console.log('🔍 Analyzing media matches for missing artworks...\n')
  
  // Load missing artworks CSV
  const missingArtworks = []
  
  await new Promise((resolve, reject) => {
    fs.createReadStream('/Users/florian.ludwig/Documents/aa_scan/reports/missing-artworks-2025-10-28.csv')
      .pipe(csv())
      .on('data', (row) => {
        missingArtworks.push(row)
      })
      .on('end', resolve)
      .on('error', reject)
  })
  
  console.log(`📄 Loaded ${missingArtworks.length} missing artworks from CSV\n`)
  
  // Get all orphaned media from Sanity
  console.log('📊 Fetching orphaned media from Sanity...\n')
  
  const allMedia = await client.fetch(`
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
  
  const orphanedMedia = allMedia.filter(m => m.usedInArtworks === 0 && m.usedInProfiles === 0)
  
  console.log(`   Total media: ${allMedia.length}`)
  console.log(`   Orphaned media: ${orphanedMedia.length}\n`)
  
  // Create lookup maps for fast matching
  const mediaByFilename = new Map()
  const mediaByNormalizedFilename = new Map()
  
  orphanedMedia.forEach(media => {
    const filename = media.originalFilename || ''
    const normalized = normalizeFilename(filename)
    
    if (filename) {
      mediaByFilename.set(filename.toLowerCase(), media)
    }
    if (normalized) {
      if (!mediaByNormalizedFilename.has(normalized)) {
        mediaByNormalizedFilename.set(normalized, [])
      }
      mediaByNormalizedFilename.get(normalized).push(media)
    }
  })
  
  console.log('🔗 Matching missing artworks to orphaned media...\n')
  
  const matches = []
  let exactMatches = 0
  let normalizedMatches = 0
  let noMatch = 0
  
  missingArtworks.forEach((artwork, index) => {
    const profileFilename = artwork.Filename || ''
    const normalizedProfile = normalizeFilename(profileFilename)
    const creator = artwork.Creator || ''
    const title = artwork['Artwork Title'] || ''
    
    let matchedMedia = null
    let matchType = 'none'
    
    // Try exact filename match
    if (profileFilename) {
      matchedMedia = mediaByFilename.get(profileFilename.toLowerCase())
      if (matchedMedia) {
        matchType = 'exact'
        exactMatches++
      }
    }
    
    // Try normalized filename match (without size suffix)
    if (!matchedMedia && normalizedProfile) {
      const candidates = mediaByNormalizedFilename.get(normalizedProfile)
      if (candidates && candidates.length > 0) {
        matchedMedia = candidates[0] // Take first match
        matchType = 'normalized'
        normalizedMatches++
      }
    }
    
    // Try fuzzy match based on creator + keywords
    if (!matchedMedia && creator && title) {
      const creatorWords = extractKeywords(creator)
      const titleWords = extractKeywords(title)
      const searchWords = [...creatorWords, ...titleWords].slice(0, 5)
      
      // Find media that contains creator name and some title words
      const fuzzyMatches = orphanedMedia.filter(media => {
        const mediaFilename = (media.originalFilename || '').toLowerCase()
        const hasCreator = creatorWords.some(word => mediaFilename.includes(word))
        const titleMatches = titleWords.filter(word => mediaFilename.includes(word)).length
        return hasCreator && titleMatches >= 2
      })
      
      if (fuzzyMatches.length > 0) {
        matchedMedia = fuzzyMatches[0]
        matchType = 'fuzzy'
      }
    }
    
    if (!matchedMedia) {
      noMatch++
    }
    
    matches.push({
      creator,
      title,
      caption: artwork.Caption || '',
      year: artwork.Year || '',
      profileUrl: artwork['Profile URL'] || '',
      imageUrl: artwork['Image URL'] || '',
      profileFilename,
      normalizedProfile,
      matchedMedia: matchedMedia ? {
        id: matchedMedia._id,
        filename: matchedMedia.originalFilename,
        url: matchedMedia.url,
        sizeKB: Math.round(matchedMedia.size / 1024)
      } : null,
      matchType,
      creatorId: artwork['Creator ID'] || '',
      creatorInSanity: artwork['Creator in Sanity'] === 'Yes'
    })
    
    // Progress indicator
    if ((index + 1) % 100 === 0) {
      console.log(`   Processed ${index + 1}/${missingArtworks.length}...`)
    }
  })
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 MATCHING RESULTS')
  console.log('='.repeat(80))
  console.log(`\nTotal missing artworks: ${missingArtworks.length}`)
  console.log(`✅ Exact filename matches: ${exactMatches} (${(exactMatches/missingArtworks.length*100).toFixed(1)}%)`)
  console.log(`⚡ Normalized matches: ${normalizedMatches} (${(normalizedMatches/missingArtworks.length*100).toFixed(1)}%)`)
  console.log(`❌ No media found: ${noMatch} (${(noMatch/missingArtworks.length*100).toFixed(1)}%)`)
  
  const totalMatched = exactMatches + normalizedMatches
  console.log(`\n📈 Total matchable: ${totalMatched} (${(totalMatched/missingArtworks.length*100).toFixed(1)}%)`)
  console.log('='.repeat(80))
  
  // Show sample matches
  console.log('\n📋 SAMPLE EXACT MATCHES:\n')
  matches.filter(m => m.matchType === 'exact').slice(0, 5).forEach((match, i) => {
    console.log(`${i + 1}. ${match.creator} - ${match.title}`)
    console.log(`   Profile file: ${match.profileFilename}`)
    console.log(`   Sanity file:  ${match.matchedMedia.filename}`)
    console.log(`   Media ID: ${match.matchedMedia.id}`)
    console.log('')
  })
  
  console.log('\n📋 SAMPLE NO MATCHES:\n')
  matches.filter(m => m.matchType === 'none').slice(0, 5).forEach((match, i) => {
    console.log(`${i + 1}. ${match.creator} - ${match.title}`)
    console.log(`   Profile file: ${match.profileFilename}`)
    console.log(`   Creator in Sanity: ${match.creatorInSanity ? 'Yes' : 'No'}`)
    console.log('')
  })
  
  // Save detailed match results
  const timestamp = new Date().toISOString().split('T')[0]
  const outputFile = `/Users/florian.ludwig/Documents/aa_scan/reports/artwork-media-matches-${timestamp}.json`
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalMissing: missingArtworks.length,
      exactMatches,
      normalizedMatches,
      noMatch,
      totalMatched,
      matchPercentage: (totalMatched/missingArtworks.length*100).toFixed(1)
    },
    matches
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2))
  console.log(`\n💾 Detailed report saved: ${outputFile}`)
  
  // Save matchable artworks CSV (ready to create)
  const matchableRows = matches.filter(m => m.matchType !== 'none')
  if (matchableRows.length > 0) {
    const csvHeader = 'Creator,Creator ID,Title,Year,Media ID,Media Filename,Profile Filename,Match Type,Caption\n'
    const csvContent = csvHeader + matchableRows.map(row =>
      `"${row.creator}","${row.creatorId}","${row.title}","${row.year}","${row.matchedMedia.id}","${row.matchedMedia.filename}","${row.profileFilename}","${row.matchType}","${(row.caption || '').replace(/"/g, '""')}"`
    ).join('\n')
    
    const csvFile = `/Users/florian.ludwig/Documents/aa_scan/reports/ready-to-create-artworks-${timestamp}.csv`
    fs.writeFileSync(csvFile, csvContent)
    console.log(`💾 Ready-to-create CSV: ${csvFile}`)
    console.log(`   ${matchableRows.length} artworks ready to create with media\n`)
  }
  
  // Save unmatched artworks CSV (need manual attention or download)
  const unmatchedRows = matches.filter(m => m.matchType === 'none')
  if (unmatchedRows.length > 0) {
    const csvHeader = 'Creator,Creator ID,Creator in Sanity,Title,Year,Image URL,Filename,Caption\n'
    const csvContent = csvHeader + unmatchedRows.map(row =>
      `"${row.creator}","${row.creatorId}","${row.creatorInSanity ? 'Yes' : 'No'}","${row.title}","${row.year}","${row.imageUrl}","${row.profileFilename}","${(row.caption || '').replace(/"/g, '""')}"`
    ).join('\n')
    
    const csvFile = `/Users/florian.ludwig/Documents/aa_scan/reports/unmatched-artworks-need-download-${timestamp}.csv`
    fs.writeFileSync(csvFile, csvContent)
    console.log(`💾 Unmatched CSV: ${csvFile}`)
    console.log(`   ${unmatchedRows.length} artworks need images downloaded\n`)
  }
  
  console.log('✨ Analysis complete!\n')
}

analyzeMissingArtworks()

