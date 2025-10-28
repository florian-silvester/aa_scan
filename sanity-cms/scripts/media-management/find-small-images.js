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

async function findSmallImages() {
  console.log(`🔍 Finding images smaller than ${MIN_SIZE_KB}KB in Sanity...\n`)
  
  try {
    // Query all image assets with their metadata
    const images = await client.fetch(`
      *[_type == "sanity.imageAsset"]{
        _id,
        originalFilename,
        title,
        url,
        size,
        "metadata": metadata {
          dimensions,
          hasAlpha,
          isOpaque,
          lqip
        },
        "usedIn": count(*[references(^._id)])
      } | order(size asc)
    `)
    
    console.log(`📊 Total images in Sanity: ${images.length}`)
    
    // Filter images smaller than threshold
    const smallImages = images.filter(img => img.size < MIN_SIZE_BYTES)
    
    console.log(`⚠️  Images under ${MIN_SIZE_KB}KB: ${smallImages.length}`)
    console.log(`✅ Images ${MIN_SIZE_KB}KB or larger: ${images.length - smallImages.length}\n`)
    
    // Calculate statistics
    const stats = {
      total: images.length,
      smallImages: smallImages.length,
      largeImages: images.length - smallImages.length,
      threshold: `${MIN_SIZE_KB}KB (${MIN_SIZE_BYTES} bytes)`,
      smallestImage: smallImages[0] ? {
        filename: smallImages[0].originalFilename,
        size: `${Math.round(smallImages[0].size / 1024)}KB`,
        usedIn: smallImages[0].usedIn
      } : null,
      averageSmallSize: smallImages.length > 0 
        ? `${Math.round(smallImages.reduce((sum, img) => sum + img.size, 0) / smallImages.length / 1024)}KB`
        : 'N/A'
    }
    
    // Group by size ranges
    const sizeRanges = {
      'under_50kb': smallImages.filter(img => img.size < 50 * 1024).length,
      '50_100kb': smallImages.filter(img => img.size >= 50 * 1024 && img.size < 100 * 1024).length,
      '100_200kb': smallImages.filter(img => img.size >= 100 * 1024 && img.size < 200 * 1024).length,
      '200_300kb': smallImages.filter(img => img.size >= 200 * 1024 && img.size < 300 * 1024).length
    }
    
    console.log('📈 SIZE DISTRIBUTION (images under 300KB):')
    console.log(`  < 50KB:      ${sizeRanges.under_50kb} images`)
    console.log(`  50-100KB:    ${sizeRanges['50_100kb']} images`)
    console.log(`  100-200KB:   ${sizeRanges['100_200kb']} images`)
    console.log(`  200-300KB:   ${sizeRanges['200_300kb']} images`)
    console.log('')
    
    // Check usage
    const usedImages = smallImages.filter(img => img.usedIn > 0)
    const unusedImages = smallImages.filter(img => img.usedIn === 0)
    
    console.log('🔗 USAGE STATUS:')
    console.log(`  Used in documents: ${usedImages.length}`)
    console.log(`  Unused/orphaned:   ${unusedImages.length}`)
    console.log('')
    
    // Prepare CSV output
    const csvHeader = 'Filename,Size (KB),Size (bytes),Width,Height,Used In,Image ID,URL\n'
    const csvRows = smallImages.map(img => {
      const sizeKb = Math.round(img.size / 1024)
      const width = img.metadata?.dimensions?.width || 'N/A'
      const height = img.metadata?.dimensions?.height || 'N/A'
      return `"${img.originalFilename || 'Untitled'}",${sizeKb},${img.size},${width},${height},${img.usedIn},"${img._id}","${img.url}"`
    }).join('\n')
    
    const csvContent = csvHeader + csvRows
    
    // Save CSV file
    const timestamp = new Date().toISOString().split('T')[0]
    const csvFilename = `../reports/images-under-${MIN_SIZE_KB}kb-${timestamp}.csv`
    fs.writeFileSync(csvFilename, csvContent)
    
    console.log(`💾 CSV report saved: ${csvFilename}`)
    
    // Save detailed JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      stats,
      sizeRanges,
      usage: {
        used: usedImages.length,
        unused: unusedImages.length
      },
      smallImages: smallImages.map(img => ({
        id: img._id,
        filename: img.originalFilename,
        title: img.title,
        sizeKB: Math.round(img.size / 1024),
        sizeBytes: img.size,
        dimensions: img.metadata?.dimensions || null,
        usedIn: img.usedIn,
        url: img.url
      }))
    }
    
    const jsonFilename = `../reports/images-under-${MIN_SIZE_KB}kb-${timestamp}.json`
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonReport, null, 2))
    
    console.log(`💾 JSON report saved: ${jsonFilename}`)
    console.log('')
    console.log('✨ Analysis complete!')
    
    // Display first few examples
    console.log('\n📋 SAMPLE SMALL IMAGES (first 10):')
    smallImages.slice(0, 10).forEach((img, idx) => {
      console.log(`  ${idx + 1}. ${img.originalFilename || 'Untitled'}`)
      console.log(`     Size: ${Math.round(img.size / 1024)}KB | Dimensions: ${img.metadata?.dimensions?.width || '?'} x ${img.metadata?.dimensions?.height || '?'} | Used: ${img.usedIn} times`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

findSmallImages()

