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

async function checkArtworksWithoutImages() {
  console.log('🔍 Checking artworks for images...\n')
  
  try {
    // Get all artworks with image information
    const allArtworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        name,
        "workTitle": workTitle.en,
        "workTitleDe": workTitle.de,
        slug,
        "creator": creator->name,
        "categoryEn": category->title.en,
        "categoryDe": category->title.de,
        year,
        "hasMainImage": defined(mainImage.asset._ref),
        "mainImageRef": mainImage.asset._ref,
        "imageCount": count(images),
        "images": images[].asset._ref
      } | order(name)
    `)
    
    console.log(`🎨 Total artworks in database: ${allArtworks.length}\n`)
    
    // Categorize artworks by image status
    const artworksWithNoImages = allArtworks.filter(a => a.imageCount === 0 || !a.images || a.images.length === 0)
    const artworksWithImages = allArtworks.filter(a => a.imageCount > 0)
    const artworksWithoutMainImage = allArtworks.filter(a => !a.hasMainImage)
    const artworksWithOnlyMainImage = allArtworks.filter(a => a.hasMainImage && a.imageCount === 0)
    
    // Calculate statistics
    const percentageWithImages = ((artworksWithImages.length / allArtworks.length) * 100).toFixed(2)
    const percentageWithoutImages = ((artworksWithNoImages.length / allArtworks.length) * 100).toFixed(2)
    
    // Image count statistics for artworks with images
    let imageStats = { min: 0, max: 0, avg: 0 }
    if (artworksWithImages.length > 0) {
      const imageCounts = artworksWithImages.map(a => a.imageCount)
      imageStats = {
        min: Math.min(...imageCounts),
        max: Math.max(...imageCounts),
        avg: (imageCounts.reduce((a, b) => a + b, 0) / imageCounts.length).toFixed(2)
      }
    }
    
    // Display results
    console.log('📊 SUMMARY:')
    console.log('━'.repeat(70))
    console.log(`✅ Artworks with images:           ${artworksWithImages.length.toString().padStart(6)} (${percentageWithImages}%)`)
    console.log(`❌ Artworks with NO images:        ${artworksWithNoImages.length.toString().padStart(6)} (${percentageWithoutImages}%)`)
    console.log('━'.repeat(70))
    console.log(`⚠️  Without main image:            ${artworksWithoutMainImage.length.toString().padStart(6)}`)
    console.log(`⚠️  Only main image (no gallery):  ${artworksWithOnlyMainImage.length.toString().padStart(6)}`)
    console.log('')
    
    if (artworksWithImages.length > 0) {
      console.log('📈 IMAGE COUNT STATISTICS:')
      console.log(`   Min images per artwork: ${imageStats.min}`)
      console.log(`   Max images per artwork: ${imageStats.max}`)
      console.log(`   Avg images per artwork: ${imageStats.avg}`)
      console.log('')
    }
    
    // Display artworks without images
    if (artworksWithNoImages.length > 0) {
      console.log('❌ ARTWORKS WITHOUT IMAGES:\n')
      artworksWithNoImages.slice(0, 30).forEach((artwork, idx) => {
        const title = artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled'
        const creator = artwork.creator || 'Unknown'
        const category = artwork.categoryEn || artwork.categoryDe || 'N/A'
        const year = artwork.year || 'N/A'
        const mainImageStatus = artwork.hasMainImage ? '✓ has main' : '✗ no main'
        
        console.log(`${(idx + 1).toString().padStart(3)}. ${creator} - ${title}`)
        console.log(`     Category: ${category} | Year: ${year} | ${mainImageStatus}`)
        console.log(`     Slug: ${artwork.slug?.current || 'N/A'}`)
        console.log(`     ID: ${artwork._id}`)
        console.log('')
      })
      
      if (artworksWithNoImages.length > 30) {
        console.log(`... and ${artworksWithNoImages.length - 30} more artworks without images\n`)
      }
    }
    
    // Display artworks without main image
    if (artworksWithoutMainImage.length > 0 && artworksWithoutMainImage.length !== artworksWithNoImages.length) {
      console.log('⚠️  ARTWORKS WITHOUT MAIN IMAGE (but may have gallery images):\n')
      const withoutMainButHasGallery = artworksWithoutMainImage.filter(a => a.imageCount > 0)
      
      if (withoutMainButHasGallery.length > 0) {
        withoutMainButHasGallery.slice(0, 20).forEach((artwork, idx) => {
          const title = artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled'
          const creator = artwork.creator || 'Unknown'
          
          console.log(`${(idx + 1).toString().padStart(3)}. ${creator} - ${title}`)
          console.log(`     Gallery images: ${artwork.imageCount}`)
          console.log(`     ID: ${artwork._id}`)
          console.log('')
        })
        
        if (withoutMainButHasGallery.length > 20) {
          console.log(`... and ${withoutMainButHasGallery.length - 20} more\n`)
        }
      }
    }
    
    // Display distribution of image counts
    console.log('📊 IMAGE COUNT DISTRIBUTION:')
    const distribution = {}
    allArtworks.forEach(a => {
      const count = a.imageCount || 0
      distribution[count] = (distribution[count] || 0) + 1
    })
    
    Object.keys(distribution)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(0, 15)
      .forEach(count => {
        const bar = '█'.repeat(Math.ceil((distribution[count] || 0) / 10))
        const artworkCount = distribution[count] || 0
        console.log(`   ${count.toString().padStart(2)} images: ${artworkCount.toString().padStart(4)} artworks ${bar}`)
      })
    console.log('')
    
    // Save reports
    const timestamp = new Date().toISOString().split('T')[0]
    
    // CSV report for artworks without images
    if (artworksWithNoImages.length > 0) {
      const csvHeader = 'Artwork Name,Creator,Category,Year,Has Main Image,Image Count,Slug,Artwork ID\n'
      const csvRows = artworksWithNoImages.map(artwork => {
        const title = (artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled').replace(/"/g, '""')
        const creator = (artwork.creator || 'Unknown').replace(/"/g, '""')
        const category = (artwork.categoryEn || artwork.categoryDe || 'N/A').replace(/"/g, '""')
        const year = artwork.year || 'N/A'
        const hasMain = artwork.hasMainImage ? 'Yes' : 'No'
        const slug = artwork.slug?.current || 'N/A'
        return `"${title}","${creator}","${category}","${year}","${hasMain}",${artwork.imageCount},"${slug}","${artwork._id}"`
      }).join('\n')
      
      const csvContent = csvHeader + csvRows
      const csvFilename = `../../reports/artworks-without-images-${timestamp}.csv`
      fs.writeFileSync(csvFilename, csvContent)
      console.log(`💾 CSV report saved: ${csvFilename}`)
    }
    
    // Save detailed JSON
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalArtworks: allArtworks.length,
        artworksWithImages: artworksWithImages.length,
        artworksWithoutImages: artworksWithNoImages.length,
        artworksWithoutMainImage: artworksWithoutMainImage.length,
        artworksWithOnlyMainImage: artworksWithOnlyMainImage.length,
        percentageWithImages: parseFloat(percentageWithImages),
        percentageWithoutImages: parseFloat(percentageWithoutImages),
        imageStats
      },
      imageDistribution: distribution,
      artworksWithoutImages: artworksWithNoImages.map(aw => ({
        id: aw._id,
        name: aw.name,
        workTitle: aw.workTitle,
        workTitleDe: aw.workTitleDe,
        creator: aw.creator,
        slug: aw.slug?.current,
        category: aw.categoryEn || aw.categoryDe,
        year: aw.year,
        hasMainImage: aw.hasMainImage,
        imageCount: aw.imageCount
      }))
    }
    
    const jsonFilename = `../../reports/artworks-image-check-${timestamp}.json`
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonReport, null, 2))
    console.log(`💾 JSON report saved: ${jsonFilename}`)
    console.log('\n✨ Analysis complete!')
    
    // Final recommendations
    if (artworksWithNoImages.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:')
      console.log(`   • ${artworksWithNoImages.length} artworks need images added`)
      console.log('   • Priority: Artworks with complete creator/category info but missing images')
      console.log('   • Consider: Check original data sources for images')
    } else {
      console.log('\n🎉 Excellent! All artworks have images!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

checkArtworksWithoutImages()

