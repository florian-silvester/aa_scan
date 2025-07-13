import fs from 'fs'
import path from 'path'
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Compare Sanity Media vs WordPress Downloads
 * Find overlaps, unique content, and recommend merge strategy
 */

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01',
})

async function compareMediaCollections() {
  console.log('🔍 COMPARING SANITY vs WORDPRESS MEDIA...')
  console.log('')

  // 1. Get current Sanity media
  console.log('📱 Fetching Sanity media...')
  const sanityMedia = await client.fetch(`
    *[_type == "sanity.imageAsset"]{
      _id,
      originalFilename,
      title,
      description,
      url
    }
  `)
  console.log(`✅ Found ${sanityMedia.length} images in Sanity`)

  // 2. Get WordPress download data
  console.log('📁 Loading WordPress download data...')
  const wpDataFile = 'wordpress-original-media-2025-07-09.json'
  const wpData = JSON.parse(fs.readFileSync(wpDataFile, 'utf8'))
  const wpImages = wpData.all_images
  console.log(`✅ Found ${wpImages.length} WordPress original images`)

  // 3. Get actual downloaded files
  console.log('📂 Scanning downloaded files...')
  const downloadDir = './wordpress-originals'
  const downloadedFiles = fs.readdirSync(downloadDir).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.gif')
  )
  console.log(`✅ Found ${downloadedFiles.length} downloaded files`)

  // 4. Find overlaps by filename similarity
  console.log('\n🔄 Analyzing overlaps...')
  
  const sanityFilenames = new Set()
  const sanityTitles = new Set()
  
  sanityMedia.forEach(item => {
    if (item.originalFilename) {
      sanityFilenames.add(item.originalFilename.toLowerCase())
    }
    if (item.title) {
      sanityTitles.add(item.title.toLowerCase())
    }
  })

  let overlaps = 0
  let uniqueWordPress = 0
  const overlapExamples = []
  const uniqueExamples = []

  wpImages.forEach(wpItem => {
    const wpFilename = wpItem.filename.toLowerCase()
    const wpTitle = wpItem.title.toLowerCase()
    
    // Check for overlaps
    const filenameMatch = sanityFilenames.has(wpFilename) || 
                         Array.from(sanityFilenames).some(sf => 
                           sf.includes(wpFilename) || wpFilename.includes(sf)
                         )
    
    const titleMatch = sanityTitles.has(wpTitle) ||
                      Array.from(sanityTitles).some(st => 
                        st.includes(wpTitle) || wpTitle.includes(st)
                      )

    if (filenameMatch || titleMatch) {
      overlaps++
      if (overlapExamples.length < 5) {
        overlapExamples.push({
          wp: wpItem.title,
          filename: wpItem.filename
        })
      }
    } else {
      uniqueWordPress++
      if (uniqueExamples.length < 10) {
        uniqueExamples.push({
          title: wpItem.title,
          filename: wpItem.filename,
          url: wpItem.url
        })
      }
    }
  })

  // 5. Artwork analysis
  const wpArtworks = wpData.artwork_images_data || []
  const artworkOverlaps = wpArtworks.filter(art => {
    const artFilename = art.filename.toLowerCase()
    const artTitle = art.title.toLowerCase()
    return sanityFilenames.has(artFilename) || sanityTitles.has(artTitle)
  }).length

  // 6. Generate report
  console.log('\n📊 COMPARISON RESULTS:')
  console.log('═'.repeat(50))
  console.log(`📱 Sanity Media: ${sanityMedia.length}`)
  console.log(`📁 WordPress Images: ${wpImages.length}`)
  console.log(`📂 Downloaded Files: ${downloadedFiles.length}`)
  console.log('')
  console.log(`🔄 Overlapping: ${overlaps}`)
  console.log(`🆕 WordPress Unique: ${uniqueWordPress}`)
  console.log(`💎 Artwork Overlaps: ${artworkOverlaps}/${wpArtworks.length}`)
  console.log('')

  console.log('🔍 SAMPLE OVERLAPS:')
  overlapExamples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.wp}`)
    console.log(`     File: ${ex.filename}`)
  })

  console.log('\n🆕 SAMPLE UNIQUE WORDPRESS IMAGES:')
  uniqueExamples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.title}`)
    console.log(`     File: ${ex.filename}`)
  })

  // 7. Recommendations
  console.log('\n💡 RECOMMENDATIONS:')
  console.log('═'.repeat(50))
  
  const uniquePercentage = (uniqueWordPress / wpImages.length * 100).toFixed(1)
  
  if (uniqueWordPress > wpImages.length * 0.7) {
    console.log(`🎯 MERGE STRATEGY: Add ${uniqueWordPress} unique WordPress images`)
    console.log(`   • Keep existing ${sanityMedia.length} Sanity images`)
    console.log(`   • Upload ${uniqueWordPress} new WordPress images`)
    console.log(`   • Final total: ~${sanityMedia.length + uniqueWordPress} images`)
    console.log(`   • Benefit: ${uniquePercentage}% new content, preserves existing data`)
  } else {
    console.log(`🔄 REPLACEMENT STRATEGY: Replace with WordPress collection`)
    console.log(`   • Delete ${sanityMedia.length} Sanity images`)
    console.log(`   • Upload ${wpImages.length} WordPress images`)
    console.log(`   • Net change: +${wpImages.length - sanityMedia.length} images`)
    console.log(`   • Benefit: Clean, organized collection from WordPress`)
  }

  // 8. Save detailed analysis
  const report = {
    analysis_date: new Date().toISOString(),
    sanity_count: sanityMedia.length,
    wordpress_count: wpImages.length,
    downloaded_count: downloadedFiles.length,
    overlaps: overlaps,
    unique_wordpress: uniqueWordPress,
    artwork_overlaps: artworkOverlaps,
    total_artworks: wpArtworks.length,
    overlap_examples: overlapExamples,
    unique_examples: uniqueExamples,
    recommendation: uniqueWordPress > wpImages.length * 0.7 ? 'MERGE' : 'REPLACE'
  }

  fs.writeFileSync('media-comparison-analysis.json', JSON.stringify(report, null, 2))
  console.log('\n✅ Detailed analysis saved to: media-comparison-analysis.json')
}

compareMediaCollections().catch(console.error) 