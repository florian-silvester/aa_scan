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

async function findExhibitionsWithSmallImages() {
  console.log(`🔍 Finding exhibitions with images under ${MIN_SIZE_KB}KB...\n`)
  
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
    
    // Get all exhibitions with their images
    const exhibitions = await client.fetch(`
      *[_type == "exhibition"]{
        _id,
        "title": title.en,
        "titleDe": title.de,
        slug,
        startDate,
        endDate,
        "mainImage": mainImage.asset._ref,
        "galleryImages": gallery[].asset._ref,
        "allImages": [mainImage.asset._ref] + gallery[].asset._ref
      } | order(startDate desc)
    `)
    
    console.log(`🎨 Total exhibitions: ${exhibitions.length}\n`)
    
    // Check each exhibition for small images
    const exhibitionsWithSmallImages = []
    
    for (const exhibition of exhibitions) {
      const allImageRefs = exhibition.allImages?.filter(Boolean) || []
      const smallImagesInExhibition = []
      
      for (const imageRef of allImageRefs) {
        if (smallImageIds.has(imageRef)) {
          const imageData = smallImages.find(img => img._id === imageRef)
          smallImagesInExhibition.push(imageData)
        }
      }
      
      if (smallImagesInExhibition.length > 0) {
        exhibitionsWithSmallImages.push({
          ...exhibition,
          smallImages: smallImagesInExhibition,
          totalImages: allImageRefs.length,
          smallImageCount: smallImagesInExhibition.length
        })
      }
    }
    
    // Sort by number of small images (worst first)
    exhibitionsWithSmallImages.sort((a, b) => b.smallImageCount - a.smallImageCount)
    
    console.log('📈 RESULTS:')
    console.log(`⚠️  Exhibitions with small images: ${exhibitionsWithSmallImages.length}`)
    console.log(`✅ Exhibitions with good quality images: ${exhibitions.length - exhibitionsWithSmallImages.length}\n`)
    
    // Display exhibitions
    console.log('🎨 EXHIBITIONS WITH LOW QUALITY IMAGES:\n')
    exhibitionsWithSmallImages.forEach((exhibition, idx) => {
      const title = exhibition.title || exhibition.titleDe || 'Untitled'
      const year = exhibition.startDate ? new Date(exhibition.startDate).getFullYear() : 'N/A'
      const percentage = Math.round((exhibition.smallImageCount / exhibition.totalImages) * 100)
      
      console.log(`${idx + 1}. ${title} (${year})`)
      console.log(`   Small images: ${exhibition.smallImageCount}/${exhibition.totalImages} (${percentage}%)`)
      console.log(`   Slug: ${exhibition.slug?.current || 'N/A'}`)
      
      if (exhibition.smallImages.length <= 3) {
        exhibition.smallImages.forEach(img => {
          console.log(`      - ${img.originalFilename} (${Math.round(img.size / 1024)}KB)`)
        })
      } else {
        console.log(`      First 3 files:`)
        exhibition.smallImages.slice(0, 3).forEach(img => {
          console.log(`      - ${img.originalFilename} (${Math.round(img.size / 1024)}KB)`)
        })
        console.log(`      ... and ${exhibition.smallImages.length - 3} more`)
      }
      console.log('')
    })
    
    // Save CSV report
    const csvHeader = 'Exhibition Title,Year,Slug,Total Images,Small Images,Percentage,Exhibition ID\n'
    const csvRows = exhibitionsWithSmallImages.map(exhibition => {
      const title = (exhibition.title || exhibition.titleDe || 'Untitled').replace(/"/g, '""')
      const year = exhibition.startDate ? new Date(exhibition.startDate).getFullYear() : 'N/A'
      const percentage = Math.round((exhibition.smallImageCount / exhibition.totalImages) * 100)
      const slug = exhibition.slug?.current || 'N/A'
      return `"${title}",${year},"${slug}",${exhibition.totalImages},${exhibition.smallImageCount},${percentage}%,"${exhibition._id}"`
    }).join('\n')
    
    const csvContent = csvHeader + csvRows
    const timestamp = new Date().toISOString().split('T')[0]
    const csvFilename = `../reports/exhibitions-with-small-images-${timestamp}.csv`
    fs.writeFileSync(csvFilename, csvContent)
    
    console.log(`💾 CSV report saved: ${csvFilename}`)
    
    // Save detailed JSON
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalExhibitions: exhibitions.length,
        exhibitionsWithSmallImages: exhibitionsWithSmallImages.length,
        exhibitionsOk: exhibitions.length - exhibitionsWithSmallImages.length
      },
      exhibitions: exhibitionsWithSmallImages.map(ex => ({
        id: ex._id,
        title: ex.title,
        titleDe: ex.titleDe,
        slug: ex.slug?.current,
        startDate: ex.startDate,
        endDate: ex.endDate,
        totalImages: ex.totalImages,
        smallImageCount: ex.smallImageCount,
        percentage: Math.round((ex.smallImageCount / ex.totalImages) * 100),
        smallImages: ex.smallImages.map(img => ({
          id: img._id,
          filename: img.originalFilename,
          sizeKB: Math.round(img.size / 1024),
          sizeBytes: img.size
        }))
      }))
    }
    
    const jsonFilename = `../reports/exhibitions-with-small-images-${timestamp}.json`
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonReport, null, 2))
    
    console.log(`💾 JSON report saved: ${jsonFilename}`)
    console.log('\n✨ Analysis complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

findExhibitionsWithSmallImages()





