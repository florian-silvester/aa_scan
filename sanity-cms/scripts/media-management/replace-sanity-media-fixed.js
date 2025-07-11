import fs from 'fs'
import path from 'path'
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

/**
 * COMPLETE SANITY MEDIA REPLACEMENT - FIXED VERSION
 * Handles German umlauts and special characters properly
 */

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01',
})

/**
 * Slugify filename to handle German umlauts and special characters
 */
function slugifyFilename(filename) {
  return filename
    // German umlauts
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')  
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    // French accents
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/ë/g, 'e')
    .replace(/à/g, 'a')
    .replace(/â/g, 'a')
    .replace(/ç/g, 'c')
    // Other special characters
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    // Clean up multiple dashes
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-|-$/g, '')
}

class MediaReplacerFixed {
  constructor() {
    this.startTime = Date.now()
    this.stats = {
      uploaded: 0,
      failed: 0,
      skipped: 0,
      artworks_created: 0
    }
    this.failedUploads = []
  }

  async run() {
    console.log('🚀 STARTING FULL WORDPRESS MEDIA UPLOAD WITH UMLAUT HANDLING')
    console.log('═'.repeat(70))
    console.log('')

    try {
      // Load WordPress data
      console.log('📁 Loading WordPress media data...')
      const wpData = JSON.parse(fs.readFileSync('wordpress-original-media-2025-07-09.json', 'utf8'))
      const wpImages = wpData.all_images
      
      console.log(`🎯 Found ${wpImages.length} images to upload`)
      console.log(`📂 Images should be in: ./wordpress-originals/`)
      console.log('')

      // Upload all images in batches
      await this.uploadAllImages(wpImages)

      // Generate final report
      await this.generateFinalReport()

    } catch (error) {
      console.error('❌ UPLOAD FAILED:', error)
      await this.saveErrorReport(error)
    }
  }

  async uploadAllImages(wpImages) {
    console.log('📤 STARTING BATCH UPLOAD...')
    const batchSize = 5 // Conservative batch size for stability
    let totalProcessed = 0

    for (let i = 0; i < wpImages.length; i += batchSize) {
      const batch = wpImages.slice(i, i + batchSize)
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(wpImages.length/batchSize)}`)
      console.log(`   Images ${i + 1}-${Math.min(i + batchSize, wpImages.length)} of ${wpImages.length}`)

      // Process batch sequentially to avoid rate limits
      for (let j = 0; j < batch.length; j++) {
        const imageData = batch[j]
        const globalIndex = i + j
        
        await this.uploadImage(imageData, globalIndex)
        totalProcessed++

        // Small delay to avoid overwhelming Sanity
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Progress update every 10 batches
      if ((Math.floor(i/batchSize) + 1) % 10 === 0) {
        const progress = ((totalProcessed / wpImages.length) * 100).toFixed(1)
        console.log(`\n📊 Progress: ${totalProcessed}/${wpImages.length} (${progress}%)`)
        console.log(`   ✅ Uploaded: ${this.stats.uploaded}`)
        console.log(`   ❌ Failed: ${this.stats.failed}`)
        console.log(`   🎨 Artworks: ${this.stats.artworks_created}`)
        
        // Save intermediate report
        await this.saveIntermediateReport(totalProcessed, wpImages.length)
      }
    }

    console.log('\n🎉 BATCH UPLOAD COMPLETE!')
    console.log(`✅ Successfully uploaded: ${this.stats.uploaded}`)
    console.log(`❌ Failed uploads: ${this.stats.failed}`)
    console.log(`🎨 Artworks created: ${this.stats.artworks_created}`)
  }

  async saveIntermediateReport(processed, total) {
    const report = {
      timestamp: new Date().toISOString(),
      progress: {
        processed,
        total,
        percentage: ((processed / total) * 100).toFixed(1)
      },
      stats: { ...this.stats },
      failed_uploads: this.failedUploads.slice(-10) // Last 10 failures
    }

    const reportPath = `intermediate-report-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  }

  async generateFinalReport() {
    const duration = Date.now() - this.startTime
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))

    const finalReport = {
      completion_time: new Date().toISOString(),
      duration_ms: duration,
      duration_human: `${hours}h ${minutes}m`,
      final_stats: { ...this.stats },
      success_rate: `${((this.stats.uploaded / (this.stats.uploaded + this.stats.failed)) * 100).toFixed(1)}%`,
      failed_uploads: this.failedUploads
    }

    const reportPath = `replacement-report-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2))
    console.log(`📋 Final report saved: ${reportPath}`)
  }

  async saveErrorReport(error) {
    const errorReport = {
      error_time: new Date().toISOString(),
      error_message: error.message,
      error_stack: error.stack,
      stats_at_failure: { ...this.stats },
      failed_uploads: this.failedUploads
    }

    const reportPath = `error-report-${Date.now()}.json`
    fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2))
    console.log(`💥 Error report saved: ${reportPath}`)
  }

  async uploadImage(imageData, index) {
    try {
      const { title, url, originalFilename, description, id, filename } = imageData
      
      // Create safe filename for Sanity
      const safeFilename = slugifyFilename(originalFilename || title || `image-${index}`)
      const fileExtension = path.extname(url) || '.jpg'
      const finalFilename = safeFilename.endsWith(fileExtension) ? safeFilename : safeFilename + fileExtension

      console.log(`📤 Uploading ${index + 1}/10407: ${finalFilename}`)

      // Find the local downloaded file
      const expectedFilename = `${id}_${filename}`
      const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      
      let localFilePath = null
      for (const ext of possibleExtensions) {
        const testPath = path.join('./wordpress-originals', expectedFilename + ext)
        if (fs.existsSync(testPath)) {
          localFilePath = testPath
          break
        }
      }

      // Also try without extension (in case it's already included)
      if (!localFilePath) {
        const testPath = path.join('./wordpress-originals', expectedFilename)
        if (fs.existsSync(testPath)) {
          localFilePath = testPath
        }
      }

      if (!localFilePath) {
        throw new Error(`Local file not found: ${expectedFilename}`)
      }

      // Read local file
      const buffer = fs.readFileSync(localFilePath)
      
      // Upload to Sanity
      const asset = await client.assets.upload('image', buffer, {
        filename: finalFilename,
        title: title,
        description: description,
        source: {
          name: 'WordPress Import',
          url: url,
          id: imageData.id || index,
          localPath: localFilePath
        }
      })

      this.stats.uploaded++
      
      // Create artwork document if this looks like jewelry/art
      if (this.isArtworkImage(imageData)) {
        await this.createArtworkDocument(asset, imageData)
        this.stats.artworks_created++
      }

      return asset

    } catch (error) {
      console.log(`❌ Upload failed: ${imageData.title || imageData.originalFilename} - ${error.message}`)
      this.stats.failed++
      this.failedUploads.push({
        ...imageData,
        error: error.message,
        safeFilename: slugifyFilename(imageData.originalFilename || imageData.title || `image-${index}`)
      })
      return null
    }
  }

  isArtworkImage(imageData) {
    const artworkKeywords = [
      'schmuck', 'jewelry', 'ring', 'necklace', 'bracelet', 'earring', 'brosche', 'pendant',
      'kette', 'armband', 'ohrschmuck', 'halskette', 'armreif', 'goldschmied', 'silber', 'gold'
    ]
    
    const text = `${imageData.title || ''} ${imageData.description || ''} ${imageData.originalFilename || ''}`.toLowerCase()
    
    return artworkKeywords.some(keyword => text.includes(keyword))
  }

  async createArtworkDocument(asset, imageData) {
    try {
      // Ensure we have a valid title (required field)
      const workTitle = imageData.title || imageData.originalFilename || `Artwork ${Date.now()}`
      
      const artworkDoc = {
        _type: 'artwork',
        workTitle: workTitle, // Required field matching schema
        images: [{ // Required array field matching schema
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: asset._id
          },
          alt: imageData.description || imageData.title || 'Artwork image'
        }],
        description: imageData.description || imageData.excerpt || undefined,
        material: this.extractMaterialFromData(imageData),
        // Store WordPress import metadata
        sourceInfo: {
          extractedArtist: this.extractCreatorFromFilename(imageData.originalFilename || imageData.title),
          originalUrl: imageData.url,
          wordpressMediaId: parseInt(imageData.id) || 0
        }
      }

      const result = await client.create(artworkDoc)
      return result
    } catch (error) {
      console.log(`❌ Artwork creation failed: ${error.message}`)
      return null
    }
  }

  extractMaterialFromData(imageData) {
    const text = `${imageData.title || ''} ${imageData.description || ''} ${imageData.originalFilename || ''}`.toLowerCase()
    
    // Common materials in jewelry/art
    const materials = [
      'gold', 'silver', 'silber', 'platinum', 'bronze', 'copper', 'brass',
      'pearl', 'perle', 'diamond', 'ruby', 'sapphire', 'emerald', 'opal',
      'glass', 'ceramic', 'steel', 'titanium', 'aluminium', 'leather', 'fabric', 'wood'
    ]
    
    const foundMaterials = materials.filter(material => 
      new RegExp(`\\b${material}\\b`, 'i').test(text)
    )
    
    return foundMaterials.length > 0 ? foundMaterials.join(', ') : undefined
  }

  extractCreatorFromFilename(filename) {
    if (!filename) return null
    
    // Try to extract creator name from common patterns
    const patterns = [
      /^([^_-]+)/,  // Everything before first _ or -
      /([a-zA-Z]+\s[a-zA-Z]+)/,  // First Name Last Name pattern
    ]
    
    for (const pattern of patterns) {
      const match = filename.match(pattern)
      if (match && match[1] && match[1].length > 2) {
        return match[1].replace(/-/g, ' ').trim()
      }
    }
    
    return null
  }

  async processFromFailures() {
    console.log('🔄 RESUMING FROM UMLAUT FAILURES...')
    console.log('════════════════════════════════════')
    
    // Load the report to see which images failed
    const reportFiles = fs.readdirSync('.').filter(f => f.startsWith('replacement-report-'))
    
    if (reportFiles.length === 0) {
      console.log('❌ No replacement report found. Cannot resume.')
      return
    }
    
    const latestReport = reportFiles.sort().pop()
    console.log(`📋 Loading report: ${latestReport}`)
    
    const report = JSON.parse(fs.readFileSync(latestReport, 'utf8'))
    const failedUploads = report.failed_uploads || []
    
    console.log(`🎯 Found ${failedUploads.length} failed uploads to retry`)
    
    // Retry failed uploads with proper character handling
    for (let i = 0; i < failedUploads.length; i++) {
      const imageData = failedUploads[i]
      console.log(`🔄 Retrying ${i + 1}/${failedUploads.length}: ${imageData.title}`)
      
      await this.uploadImage(imageData, i)
      
      // Progress update every 10 images
      if ((i + 1) % 10 === 0) {
        console.log(`📊 Retry progress: ${i + 1}/${failedUploads.length} (${((i + 1) / failedUploads.length * 100).toFixed(1)}%)`)
      }
    }
    
    // Save final report
    const finalReport = {
      retry_completion_time: new Date().toISOString(),
      total_retried: failedUploads.length,
      successful_retries: this.stats.uploaded,
      still_failed: this.stats.failed,
      success_rate: `${((this.stats.uploaded / failedUploads.length) * 100).toFixed(1)}%`,
      failed_uploads: this.failedUploads
    }
    
    const reportPath = `umlaut-retry-report-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2))
    console.log(`📋 Retry report saved: ${reportPath}`)
    
    console.log('\n🎉 UMLAUT RETRY COMPLETE!')
    console.log(`✅ Successfully uploaded: ${this.stats.uploaded}`)
    console.log(`❌ Still failed: ${this.stats.failed}`)
    console.log(`🎨 Artworks created: ${this.stats.artworks_created}`)
  }
}

// Run the appropriate process
async function main() {
  const replacer = new MediaReplacerFixed()
  
  // Check if we have any previous reports to resume from
  const reportFiles = fs.readdirSync('.').filter(f => f.startsWith('replacement-report-'))
  
  if (reportFiles.length > 0) {
    console.log('🔄 Found previous reports - resuming from failures...')
    await replacer.processFromFailures()
  } else {
    console.log('🚀 No previous reports found - starting full upload...')
    await replacer.run()
  }
}

main().catch(console.error) 