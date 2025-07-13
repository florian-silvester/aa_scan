import fs from 'fs'
import path from 'path'
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

/**
 * SANITY MEDIA UPLOAD - SIMPLIFIED VERSION
 * Uploads only media assets, no artwork documents
 * Avoids complex validation issues
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

class MediaUploader {
  constructor() {
    this.startTime = Date.now()
    this.stats = {
      uploaded: 0,
      failed: 0,
      skipped: 0
    }
    this.failedUploads = []
  }

  async uploadAllMedia() {
    console.log('🚀 STARTING MEDIA-ONLY UPLOAD WITH UMLAUT HANDLING')
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

      // Upload in optimized batches
      const batchSize = 10 // Increased batch size
      let totalProcessed = 0

      for (let i = 0; i < wpImages.length; i += batchSize) {
        const batch = wpImages.slice(i, i + batchSize)
        
        console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(wpImages.length/batchSize)}`)
        console.log(`   Images ${i + 1}-${Math.min(i + batchSize, wpImages.length)} of ${wpImages.length}`)

        // Process batch in parallel for speed
        await Promise.all(batch.map(async (imageData, j) => {
          const globalIndex = i + j
          await this.uploadSingleImage(imageData, globalIndex)
        }))
        
        totalProcessed += batch.length

        // Minimal delay between batches
        await new Promise(resolve => setTimeout(resolve, 50))

        // Progress update every 10 batches
        if ((Math.floor(i/batchSize) + 1) % 10 === 0) {
          const progress = ((totalProcessed / wpImages.length) * 100).toFixed(1)
          console.log(`\n📊 Progress: ${totalProcessed}/${wpImages.length} (${progress}%)`)
          console.log(`   ✅ Uploaded: ${this.stats.uploaded}`)
          console.log(`   ❌ Failed: ${this.stats.failed}`)
          
          // Save intermediate report
          await this.saveIntermediateReport(totalProcessed, wpImages.length)
        }
      }

      console.log('\n🎉 MEDIA UPLOAD COMPLETE!')
      console.log(`✅ Successfully uploaded: ${this.stats.uploaded}`)
      console.log(`❌ Failed uploads: ${this.stats.failed}`)

      // Generate final report
      await this.generateFinalReport()

    } catch (error) {
      console.error('❌ UPLOAD FAILED:', error)
      await this.saveErrorReport(error)
    }
  }

  async uploadSingleImage(imageData, index) {
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

      // Also try without extension
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
      
      // Upload to Sanity - MEDIA ASSET ONLY
      const asset = await client.assets.upload('image', buffer, {
        filename: finalFilename,
        title: title || undefined,
        description: description || undefined,
        // Store WordPress metadata as source info
        source: {
          name: 'WordPress Import',
          url: url,
          id: imageData.id || index,
          originalFilename: originalFilename,
          localPath: localFilePath
        }
      })

      this.stats.uploaded++
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

    const reportPath = `media-upload-progress-${new Date().toISOString().split('T')[0]}.json`
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

    const reportPath = `media-upload-complete-${new Date().toISOString().split('T')[0]}.json`
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

    const reportPath = `media-upload-error-${Date.now()}.json`
    fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2))
    console.log(`💥 Error report saved: ${reportPath}`)
  }
}

// Run the media upload
const uploader = new MediaUploader()
uploader.uploadAllMedia().catch(console.error) 