import {createClient} from '@sanity/client'
import {nanoid} from 'nanoid'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

console.log('🎨 ARTWORK IMPORTER - Creating artworks from captions\n')

// Load artwork data
const ARTWORK_DATA_FILE = '../artwork-captions-2025-07-10.json'
let artworkData = null

try {
  console.log('📖 Loading artwork data...')
  const dataContent = fs.readFileSync(ARTWORK_DATA_FILE, 'utf8')
  artworkData = JSON.parse(dataContent)
  console.log(`✅ Loaded data for ${artworkData.designers.length} designers with ${artworkData.summary.totalImages} images`)
} catch (error) {
  console.error('❌ Failed to load artwork data:', error.message)
  process.exit(1)
}

async function findCreatorByName(creatorName) {
  if (!creatorName) return null
  
  try {
    // Try exact match first
    const exactMatch = await client.fetch(`
      *[_type == "creator" && name == $name][0]{_id, name}
    `, { name: creatorName })
    
    if (exactMatch) return exactMatch
    
    // Try case-insensitive fuzzy match
    const fuzzyMatch = await client.fetch(`
      *[_type == "creator" && name match $pattern][0]{_id, name}
    `, { pattern: `*${creatorName}*` })
    
    return fuzzyMatch
  } catch (error) {
    console.warn(`⚠️  Error finding creator "${creatorName}":`, error.message)
    return null
  }
}

function extractWorkTitle(imageData) {
  // Simple title from filename - NO EXTRACTION from captions
  const title = extractTitleFromFilename(imageData.filename)
  
  return {
    en: title || 'Untitled',
    de: title || 'Ohne Titel'
  }
}

function extractTitleFromFilename(filename) {
  if (!filename) return 'Untitled'
  
  // Extract from filename like "friedrich-becker-kinetic-ring-1-1024x693.jpg"
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  const parts = nameWithoutExt.split('-')
  
  // Skip size info like "1024x693" and artist name
  const titleParts = parts.filter(part => 
    !part.match(/^\d+x\d+$/) && 
    !part.match(/^\d+$/) &&
    part.length > 1
  ).slice(2) // Skip first two parts (usually artist name)
  
  return titleParts.join(' ').replace(/^\w/, c => c.toUpperCase()) || 'Untitled'
}

function extractMaterials(imageData) {
  // NO EXTRACTION - materials are in the full caption
  return null
}

function extractDescription(imageData) {
  // Use the full raw captions as descriptions - NO EXTRACTION
  if (!imageData.rawCaption_en && !imageData.rawCaption_de) {
    return null
  }
  
  return {
    en: imageData.rawCaption_en || '',
    de: imageData.rawCaption_de || ''
  }
}

function extractSize(imageData) {
  // NO EXTRACTION - size is in the full caption
  return null
}

function extractPrice(imageData) {
  // NO EXTRACTION - price is in the full caption
  return null
}

function createSlug(title, creatorName) {
  const baseSlug = `${title}-${creatorName}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  
  return `${baseSlug}-${nanoid(6)}`
}

async function processArtworkImage(imageData, creatorRef, creatorName, index, totalImages) {
  const workTitle = extractWorkTitle(imageData)
  const materials = extractMaterials(imageData)
  const description = extractDescription(imageData)
  const size = extractSize(imageData)
  const price = extractPrice(imageData)
  
  const artworkDocument = {
    _type: 'artwork',
    _id: `artwork-${nanoid()}`,
    workTitle,
    creator: creatorRef,
    year: imageData.year || null,
    originalFilename: imageData.filename,
    sourceUrls: {
      en: imageData.imageUrl,
      de: imageData.imageUrl
    },
    ...(materials && { material: materials }),
    ...(description && { description }),
    ...(size && { size }),
    ...(price && { price }),
    // Store image info for later linking
    sourceInfo: {
      extractedArtist: creatorName,
      originalUrl: imageData.imageUrl,
      filename: imageData.filename,
      rawCaption_en: imageData.rawCaption_en,
      rawCaption_de: imageData.rawCaption_de
    }
  }
  
  try {
    const created = await client.create(artworkDocument)
    
    const progress = `${index}/${totalImages}`
    const titleDisplay = workTitle.en || workTitle.de || 'Untitled'
    console.log(`✅ [${progress}] Created: "${titleDisplay}" by ${creatorName}`)
    
    return created
  } catch (error) {
    console.error(`❌ Failed to create artwork from ${imageData.filename}:`, error.message)
    return null
  }
}

async function importArtworks() {
  console.log('\n🎨 Starting artwork import from captions...\n')
  
  let totalProcessed = 0
  let totalCreated = 0
  let totalSkipped = 0
  let creatorsMatched = 0
  let creatorsNotFound = 0
  
  const creators = await client.fetch('*[_type == "creator"]{_id, name}')
  console.log(`📋 Found ${creators.length} existing creators`)
  
  for (let designerIndex = 0; designerIndex < artworkData.designers.length; designerIndex++) {
    const designer = artworkData.designers[designerIndex]
    const designerName = designer.designerName
    
    console.log(`\n👨‍🎨 [${designerIndex + 1}/${artworkData.designers.length}] Processing: ${designerName}`)
    console.log(`📸 ${designer.images.length} images to process`)
    
    // Find matching creator
    const creatorRef = await findCreatorByName(designerName)
    
    if (!creatorRef) {
      console.warn(`⚠️  Creator not found: ${designerName} - skipping ${designer.images.length} artworks`)
      totalSkipped += designer.images.length
      creatorsNotFound++
      continue
    }
    
    console.log(`🔗 Linked to creator: ${creatorRef.name}`)
    creatorsMatched++
    
    // Process each image as an artwork
    for (let imgIndex = 0; imgIndex < designer.images.length; imgIndex++) {
      const imageData = designer.images[imgIndex]
      totalProcessed++
      
      const artwork = await processArtworkImage(
        imageData, 
        { _type: 'reference', _ref: creatorRef._id },
        designerName,
        totalProcessed,
        artworkData.summary.totalImages
      )
      
      if (artwork) {
        totalCreated++
      } else {
        totalSkipped++
      }
    }
  }
  
  console.log('\n🎉 ARTWORK IMPORT COMPLETE!')
  console.log(`📊 Summary:`)
  console.log(`- Total processed: ${totalProcessed}`)
  console.log(`- Artworks created: ${totalCreated}`)
  console.log(`- Artworks skipped: ${totalSkipped}`)
  console.log(`- Creators matched: ${creatorsMatched}`)
  console.log(`- Creators not found: ${creatorsNotFound}`)
  
  return {
    totalProcessed,
    totalCreated,
    totalSkipped,
    creatorsMatched,
    creatorsNotFound
  }
}

async function updateCreatorArtworkReferences() {
  console.log('\n🔄 Updating creator artwork references...')
  
  try {
    const creators = await client.fetch('*[_type == "creator"]{_id, name}')
    
    for (const creator of creators) {
      const artworks = await client.fetch(`
        *[_type == "artwork" && creator._ref == $creatorId]{_id}
      `, { creatorId: creator._id })
      
      if (artworks.length > 0) {
        const artworkRefs = artworks.map(art => ({
          _type: 'reference',
          _ref: art._id
        }))
        
        await client.patch(creator._id)
          .set({ artworks: artworkRefs })
          .commit()
        
        console.log(`🎨 Updated ${creator.name} with ${artworks.length} artworks`)
      }
    }
    
    console.log('✅ Creator references updated!')
    
  } catch (error) {
    console.error('❌ Error updating creator references:', error.message)
  }
}

async function main() {
  try {
    const results = await importArtworks()
    
    if (results.totalCreated > 0) {
      await updateCreatorArtworkReferences()
    }
    
    console.log('\n🎯 Next steps:')
    console.log('1. Review created artworks in Sanity Studio')
    console.log('2. Run image linking script to connect media assets')
    console.log('3. Add categories and additional metadata as needed')
    
  } catch (error) {
    console.error('💥 Import failed:', error.message)
    process.exit(1)
  }
}

// Add command line flag support
if (process.argv.includes('--dry-run')) {
  console.log('🔍 DRY RUN MODE - No actual imports will be performed')
  // Add dry run logic here
} else {
  main()
} 