import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'
import csv from 'csv-parser'
import { nanoid } from 'nanoid'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from project root
dotenv.config({ path: join(__dirname, '../../../.env') })

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

const DRY_RUN = process.argv[2] !== '--execute'

// Parse caption to extract title in EN and DE
function parseCaption(caption, title) {
  // Caption is in German, title might be in English or German
  // We'll use title as EN, caption first part as DE
  
  const captionText = caption || title || 'Untitled'
  
  // Extract the main title before dimensions/materials
  let cleanTitle = captionText
    .split(/\.\s+(?:Glas|Keramik|Holz|Metall|Schmuck|Textil|Silber|Gold)/i)[0]
    .split(/\d+\s*[x×]\s*\d+/)[0]
    .replace(/<[^>]+>/g, '')
    .trim()
  
  // If we have a separate title field, use it as EN
  const titleEN = title || cleanTitle
  const titleDE = cleanTitle
  
  return {
    en: titleEN,
    de: titleDE
  }
}

// Create slug from title
function createSlug(creatorName, titleEN) {
  const slug = `${creatorName} ${titleEN}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  
  return slug
}

// Load artworks from CSV
async function loadArtworks() {
  return new Promise((resolve, reject) => {
    const artworks = []
    fs.createReadStream('/Users/florian.ludwig/Documents/aa_scan/reports/ready-to-create-artworks-2025-10-29.csv')
      .pipe(csv())
      .on('data', (row) => artworks.push(row))
      .on('end', () => resolve(artworks))
      .on('error', reject)
  })
}

// Get all creators as lookup
async function getCreators() {
  const creators = await client.fetch(`
    *[_type == "creator"]{
      _id,
      name,
      slug
    }
  `)
  
  const lookup = new Map()
  creators.forEach(c => {
    const normalized = c.name.toLowerCase().trim()
    lookup.set(normalized, c)
  })
  
  return lookup
}

// Get all categories
async function getCategories() {
  const categories = await client.fetch(`
    *[_type == "category"]{
      _id,
      "titleEn": title.en,
      "titleDe": title.de
    }
  `)
  return categories
}

// Prepare artwork documents
function prepareArtwork(row, creatorLookup, categories) {
  const creatorName = row.Creator || ''
  const creatorKey = creatorName.toLowerCase().trim()
  const creator = creatorLookup.get(creatorKey)
  
  if (!creator) {
    return {
      error: `Creator not found: ${creatorName}`,
      row
    }
  }
  
  const titles = parseCaption(row.Caption, row.Title)
  const slug = createSlug(creatorName, titles.en)
  
  // Build the artwork document
  const artworkId = `artwork-${nanoid(16)}`
  
  const artwork = {
    _id: artworkId,
    _type: 'artwork',
    name: `${creatorName}_${titles.en}`.slice(0, 100),
    workTitle: {
      en: titles.en,
      de: titles.de
    },
    slug: {
      _type: 'slug',
      current: slug
    },
    creator: {
      _type: 'reference',
      _ref: creator._id
    },
    images: [
      {
        _type: 'image',
        _key: nanoid(12),
        asset: {
          _type: 'reference',
          _ref: row['Media ID']
        }
      }
    ],
    year: row.Year || null
  }
  
  return {
    success: true,
    artwork,
    meta: {
      creator: creatorName,
      title: titles.en,
      mediaId: row['Media ID']
    }
  }
}

// Main execution
async function bulkCreateArtworks() {
  console.log('🚀 Bulk Artwork Creation Script\n')
  console.log('=' .repeat(80))
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
    console.log('   Run with --execute to actually create artworks')
  } else {
    console.log('⚠️  EXECUTE MODE - Will create artworks in Sanity!')
  }
  console.log('=' .repeat(80) + '\n')
  
  try {
    // Load data
    console.log('📥 Loading data...\n')
    const artworksToCreate = await loadArtworks()
    const creatorLookup = await getCreators()
    const categories = await getCategories()
    
    console.log(`   ✓ Loaded ${artworksToCreate.length} artworks from CSV`)
    console.log(`   ✓ Loaded ${creatorLookup.size} creators`)
    console.log(`   ✓ Loaded ${categories.length} categories\n`)
    
    // Prepare all artworks
    console.log('🔧 Preparing artwork documents...\n')
    const prepared = artworksToCreate.map(row => 
      prepareArtwork(row, creatorLookup, categories)
    )
    
    const successful = prepared.filter(p => p.success)
    const errors = prepared.filter(p => p.error)
    
    console.log(`   ✓ Successfully prepared: ${successful.length}`)
    console.log(`   ✗ Errors: ${errors.length}\n`)
    
    if (errors.length > 0) {
      console.log('⚠️  ERRORS:\n')
      errors.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.error}`)
      })
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors\n`)
      }
    }
    
    // Show preview
    console.log('\n📋 PREVIEW (first 5 artworks):\n')
    successful.slice(0, 5).forEach((item, i) => {
      const { artwork, meta } = item
      console.log(`${i + 1}. ${meta.creator} - ${meta.title}`)
      console.log(`   ID: ${artwork._id}`)
      console.log(`   Slug: ${artwork.slug.current}`)
      console.log(`   Year: ${artwork.year || 'N/A'}`)
      console.log(`   Media: ${meta.mediaId}`)
      console.log(`   Creator Ref: ${artwork.creator._ref}`)
      console.log('')
    })
    
    if (DRY_RUN) {
      console.log('=' .repeat(80))
      console.log('✨ DRY RUN COMPLETE')
      console.log('=' .repeat(80))
      console.log(`\n📊 Summary:`)
      console.log(`   Would create: ${successful.length} artworks`)
      console.log(`   Would skip (errors): ${errors.length}`)
      console.log(`\n💡 To execute, run: node bulk-create-artworks.js --execute\n`)
      
      // Save prepared data for review
      const outputFile = '/Users/florian.ludwig/Documents/aa_scan/reports/prepared-artworks-preview.json'
      fs.writeFileSync(outputFile, JSON.stringify({
        summary: {
          total: artworksToCreate.length,
          successful: successful.length,
          errors: errors.length
        },
        sample: successful.slice(0, 20).map(s => s.artwork),
        errors: errors
      }, null, 2))
      console.log(`📄 Saved preview to: ${outputFile}\n`)
      
    } else {
      // Execute creation
      console.log('=' .repeat(80))
      console.log('🚀 EXECUTING CREATION...')
      console.log('=' .repeat(80) + '\n')
      
      const artworksToUpload = successful.map(s => s.artwork)
      const BATCH_SIZE = 100
      
      let created = 0
      let failed = 0
      
      for (let i = 0; i < artworksToUpload.length; i += BATCH_SIZE) {
        const batch = artworksToUpload.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(artworksToUpload.length / BATCH_SIZE)
        
        console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} artworks)...`)
        
        try {
          const transaction = client.transaction()
          batch.forEach(artwork => {
            transaction.create(artwork)
          })
          
          await transaction.commit()
          created += batch.length
          console.log(`   ✓ Created ${batch.length} artworks`)
          
        } catch (error) {
          console.error(`   ✗ Batch failed: ${error.message}`)
          failed += batch.length
        }
      }
      
      console.log('\n' + '=' .repeat(80))
      console.log('✨ EXECUTION COMPLETE')
      console.log('=' .repeat(80))
      console.log(`\n📊 Final Results:`)
      console.log(`   ✅ Created: ${created}`)
      console.log(`   ❌ Failed: ${failed}`)
      console.log(`   ⚠️  Skipped (errors): ${errors.length}`)
      console.log(`   📈 Total processed: ${artworksToCreate.length}\n`)
      
      // Save execution log
      const logFile = `/Users/florian.ludwig/Documents/aa_scan/reports/bulk-create-log-${new Date().toISOString().split('T')[0]}.json`
      fs.writeFileSync(logFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
          total: artworksToCreate.length,
          created,
          failed,
          skipped: errors.length
        },
        errors
      }, null, 2))
      console.log(`📄 Execution log saved: ${logFile}\n`)
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run it
bulkCreateArtworks()

