import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

const MIN_SIZE_KB = 300
const MIN_SIZE_BYTES = MIN_SIZE_KB * 1024

async function findArtworksWithSmallImages() {
  console.log(`🔍 Finding artworks with images under ${MIN_SIZE_KB}KB...\n`)
  
  try {
    // First, get all small images
    const smallImages = await client.fetch(`
      *[_type == "sanity.imageAsset" && size < ${MIN_SIZE_BYTES}]{
        _id,
        originalFilename,
        size
      }
    `)
    
    const smallImageIds = new Set(smallImages.map(img => img._id))
    console.log(`📊 Found ${smallImages.length} images under ${MIN_SIZE_KB}KB`)
    
    // Get all artworks with their images
    const artworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        name,
        "workTitle": workTitle.en,
        "workTitleDe": workTitle.de,
        slug,
        "creator": creator->name,
        "mainImage": mainImage.asset._ref,
        "artworkImages": images[].asset._ref,
        "allImages": [mainImage.asset._ref] + images[].asset._ref
      } | order(name)
    `)
    
    console.log(`🎨 Total artworks: ${artworks.length}\n`)
    
    // Check each artwork for small images
    const artworksWithSmallImages = []
    
    for (const artwork of artworks) {
      const allImageRefs = artwork.allImages?.filter(Boolean) || []
      const smallImagesInArtwork = []
      
      for (const imageRef of allImageRefs) {
        if (smallImageIds.has(imageRef)) {
          const imageData = smallImages.find(img => img._id === imageRef)
          smallImagesInArtwork.push(imageData)
        }
      }
      
      if (smallImagesInArtwork.length > 0) {
        artworksWithSmallImages.push({
          ...artwork,
          smallImages: smallImagesInArtwork,
          totalImages: allImageRefs.length,
          smallImageCount: smallImagesInArtwork.length
        })
      }
    }
    
    // Sort by number of small images (worst first)
    artworksWithSmallImages.sort((a, b) => b.smallImageCount - a.smallImageCount)
    
    console.log('📈 RESULTS:')
    console.log(`⚠️  Artworks with small images: ${artworksWithSmallImages.length}`)
    console.log(`✅ Artworks with good quality images: ${artworks.length - artworksWithSmallImages.length}\n`)
    
    // Display artworks
    console.log('🎨 ARTWORKS WITH LOW QUALITY IMAGES:\n')
    artworksWithSmallImages.slice(0, 20).forEach((artwork, idx) => {
      const title = artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled'
      const creator = artwork.creator || 'Unknown'
      const percentage = Math.round((artwork.smallImageCount / artwork.totalImages) * 100)
      
      console.log(`${idx + 1}. ${creator} - ${title}`)
      console.log(`   Small images: ${artwork.smallImageCount}/${artwork.totalImages} (${percentage}%)`)
      console.log(`   Slug: ${artwork.slug?.current || 'N/A'}`)
      
      if (artwork.smallImages.length <= 3) {
        artwork.smallImages.forEach(img => {
          console.log(`      - ${img.originalFilename} (${Math.round(img.size / 1024)}KB)`)
        })
      } else {
        console.log(`      First 3 files:`)
        artwork.smallImages.slice(0, 3).forEach(img => {
          console.log(`      - ${img.originalFilename} (${Math.round(img.size / 1024)}KB)`)
        })
        console.log(`      ... and ${artwork.smallImages.length - 3} more`)
      }
      console.log('')
    })
    
    if (artworksWithSmallImages.length > 20) {
      console.log(`... and ${artworksWithSmallImages.length - 20} more artworks with small images\n`)
    }
    
    // Save CSV report
    const csvHeader = 'Artwork Name,Creator,Total Images,Small Images,Percentage,Slug,Artwork ID\n'
    const csvRows = artworksWithSmallImages.map(artwork => {
      const title = (artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled').replace(/"/g, '""')
      const creator = (artwork.creator || 'Unknown').replace(/"/g, '""')
      const percentage = Math.round((artwork.smallImageCount / artwork.totalImages) * 100)
      const slug = artwork.slug?.current || 'N/A'
      return `"${title}","${creator}",${artwork.totalImages},${artwork.smallImageCount},${percentage}%,"${slug}","${artwork._id}"`
    }).join('\n')
    
    const csvContent = csvHeader + csvRows
    const timestamp = new Date().toISOString().split('T')[0]
    const csvFilename = `../reports/artworks-with-small-images-${timestamp}.csv`
    fs.writeFileSync(csvFilename, csvContent)
    
    console.log(`💾 CSV report saved: ${csvFilename}`)
    
    // Save detailed JSON
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalArtworks: artworks.length,
        artworksWithSmallImages: artworksWithSmallImages.length,
        artworksOk: artworks.length - artworksWithSmallImages.length
      },
      artworks: artworksWithSmallImages.map(aw => ({
        id: aw._id,
        name: aw.name,
        workTitle: aw.workTitle,
        workTitleDe: aw.workTitleDe,
        creator: aw.creator,
        slug: aw.slug?.current,
        totalImages: aw.totalImages,
        smallImageCount: aw.smallImageCount,
        percentage: Math.round((aw.smallImageCount / aw.totalImages) * 100),
        smallImages: aw.smallImages.map(img => ({
          id: img._id,
          filename: img.originalFilename,
          sizeKB: Math.round(img.size / 1024),
          sizeBytes: img.size
        }))
      }))
    }
    
    const jsonFilename = `../reports/artworks-with-small-images-${timestamp}.json`
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonReport, null, 2))
    
    console.log(`💾 JSON report saved: ${jsonFilename}`)
    console.log('\n✨ Analysis complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

findArtworksWithSmallImages()



