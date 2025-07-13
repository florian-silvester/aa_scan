import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'

// Load environment variables
dotenv.config()

const client = createClient({
  projectId: 'b8bczekj', // Same as working scripts
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

/**
 * IMPORT ARTWORKS FROM FIXED CAPTIONS
 * 
 * Converts properly extracted carousel captions into Sanity artwork documents
 * with correct schema field mapping and intelligent title extraction
 */

async function importArtworksFromCaptions() {
  console.log('🎨 IMPORTING ARTWORKS FROM FIXED CAPTIONS\n')
  
  // Read the fixed captions data
  const filename = '../carousel-captions-fixed-2025-07-11.json'
  
  if (!fs.existsSync(filename)) {
    console.log('❌ Fixed captions file not found:', filename)
    return
  }
  
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'))
  
  console.log(`📋 Found ${data.designers.length} designers`)
  
  // Get existing creators for matching
  console.log('🔍 Loading existing creators...')
  const creators = await client.fetch('*[_type == "creator"] { _id, name }')
  console.log(`👤 Found ${creators.length} existing creators`)
  
  // Get existing media assets for image matching
  console.log('🖼️  Loading existing media assets...')
  const mediaAssets = await client.fetch('*[_type == "sanity.imageAsset"] { _id, originalFilename }')
  console.log(`🖼️  Found ${mediaAssets.length} media assets`)
  
  let processed = 0
  let imported = 0
  let errors = 0
  let skipped = 0
  let duplicates = 0
  
  // Track used media assets to prevent duplicates
  const usedMediaAssets = new Set()
  
  for (const designer of data.designers) {
    console.log(`\n👤 [${processed + 1}/${data.designers.length}] ${designer.designerName}`)
    
    // Find matching creator
    const matchingCreator = findMatchingCreator(designer.designerName, creators)
    
    if (!matchingCreator) {
      console.log(`   ⚠️  No matching creator found - skipping`)
      skipped++
      processed++
      continue
    }
    
    console.log(`   ✅ Matched creator: ${matchingCreator.name}`)
    
    // Process each image as a separate artwork
    for (const image of designer.images) {
      if (!image.rawCaption || image.rawCaption.trim() === '') {
        console.log(`   ⚠️  Empty caption for ${image.filename} - skipping`)
        skipped++
        continue
      }
      
      // Find matching media asset
      const matchingAsset = findMatchingMediaAsset(image.filename, mediaAssets)
      
      if (!matchingAsset) {
        console.log(`   ⚠️  No matching media asset for ${image.filename} - skipping`)
        skipped++
        continue
      }
      
      // Check if this media asset has already been used
      if (usedMediaAssets.has(matchingAsset._id)) {
        console.log(`   ⚠️  Media asset already used for ${image.filename} - skipping duplicate`)
        duplicates++
        continue
      }
      
      try {
        // Extract title from caption
        const extractedTitle = extractArtworkTitle(image.rawCaption)
        
        // Create artwork document with CORRECT SCHEMA MAPPING
        const artworkDoc = {
          _type: 'artwork',
          // REQUIRED: Images array with at least one image
          images: [
            {
              _type: 'image',
              _key: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              asset: {
                _type: 'reference',
                _ref: matchingAsset._id
              },
              alt: {
                en: extractedTitle || 'Artwork image',
                de: extractedTitle || 'Artwork image'
              }
            }
          ],
          // REQUIRED: Work title in both languages
          workTitle: {
            en: extractedTitle || 'Untitled Artwork',
            de: extractedTitle || 'Untitled Artwork'
          },
          // Creator reference
          creator: {
            _type: 'reference',
            _ref: matchingCreator._id
          },
          // Caption with raw data
          caption: {
            en: image.rawCaption_en || image.rawCaption || '',
            de: image.rawCaption_de || image.rawCaption || ''
          },
          // Raw caption - full original text
          rawCaption: {
            en: image.rawCaption_en || image.rawCaption || '',
            de: image.rawCaption_de || image.rawCaption || ''
          },
          // Source metadata
          originalFilename: image.filename,
          sourceUrls: {
            en: image.imageUrl || '',
            de: image.imageUrl || ''
          },
          // Extract additional metadata if possible
          ...extractMetadata(image.rawCaption),
          // Create slug
          slug: {
            current: generateSlug(extractedTitle, image.filename)
          }
        }
        
        // Create the artwork
        const result = await client.create(artworkDoc)
        
        // Mark this media asset as used
        usedMediaAssets.add(matchingAsset._id)
        
        console.log(`   ✅ Created: "${extractedTitle}" (${image.filename})`)
        imported++
        
      } catch (error) {
        console.log(`   ❌ Error creating artwork for ${image.filename}: ${error.message}`)
        errors++
      }
    }
    
    processed++
  }
  
  console.log(`\n📊 IMPORT COMPLETE:`)
  console.log(`   ✅ Imported: ${imported} artworks`)
  console.log(`   ⚠️  Skipped: ${skipped} (no creator, empty caption, or no media asset)`)
  console.log(`   🔄 Duplicates: ${duplicates} (same image used multiple times)`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`   👤 Processed: ${processed} designers`)
}

/**
 * Find matching media asset by filename
 */
function findMatchingMediaAsset(filename, mediaAssets) {
  // Direct filename match first
  let match = mediaAssets.find(asset => 
    asset.originalFilename === filename
  )
  
  if (match) return match
  
  // Try without extension
  const filenameWithoutExt = filename.replace(/\.[^.]+$/, '')
  match = mediaAssets.find(asset => 
    asset.originalFilename && asset.originalFilename.replace(/\.[^.]+$/, '') === filenameWithoutExt
  )
  
  if (match) return match
  
  // Try fuzzy matching for similar filenames
  const normalizedFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, '')
  match = mediaAssets.find(asset => {
    if (!asset.originalFilename) return false
    const normalizedAsset = asset.originalFilename.toLowerCase().replace(/[^a-z0-9]/g, '')
    return normalizedAsset.includes(normalizedFilename.substring(0, 20)) || 
           normalizedFilename.includes(normalizedAsset.substring(0, 20))
  })
  
  return match
}

/**
 * Find matching creator by name with fuzzy matching
 */
function findMatchingCreator(designerName, creators) {
  // Direct match first
  let match = creators.find(creator => 
    creator.name.toLowerCase() === designerName.toLowerCase()
  )
  
  if (match) return match
  
  // Fuzzy matching - remove common separators and patterns
  const cleanDesignerName = designerName
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  // Try partial matches
  match = creators.find(creator => {
    const cleanCreatorName = creator.name.toLowerCase()
    return cleanCreatorName.includes(cleanDesignerName.split(' ')[0]) ||
           cleanDesignerName.includes(cleanCreatorName.split(' ')[0])
  })
  
  return match
}

/**
 * Extract artwork title from caption, looking for text in <em> tags first
 */
function extractArtworkTitle(caption) {
  if (!caption) return null
  
  // Look for text in <em> tags first
  const emMatch = caption.match(/<em>([^<]+)<\/em>/)
  if (emMatch) {
    return emMatch[1]
      .replace(/\\\\/g, '\\') // Fix escaped backslashes
      .trim()
  }
  
  // If no <em> tags, try to extract meaningful title from start
  const cleanCaption = caption
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/©.*$/i, '') // Remove copyright
    .replace(/\.\s*$/, '') // Remove trailing period
    .trim()
  
  // Take first meaningful part (up to first period or comma)
  const titleMatch = cleanCaption.match(/^([^.,]+)/)
  return titleMatch ? titleMatch[1].trim() : null
}

/**
 * Extract metadata like year, materials, dimensions from caption
 */
function extractMetadata(caption) {
  const metadata = {}
  
  if (!caption) return metadata
  
  // Extract year (4 digits)
  const yearMatch = caption.match(/\b(19\d{2}|20\d{2})\b/)
  if (yearMatch) {
    metadata.year = yearMatch[1]
  }
  
  // Extract dimensions (pattern like "H 13,5 cm" or "0 9 x H 13,5 cm")
  const sizeMatch = caption.match(/(?:\d+[,.]?\d*\s*[x×]\s*)*[HWD]?\s*\d+[,.]?\d*\s*cm/i)
  if (sizeMatch) {
    metadata.size = {
      en: sizeMatch[0],
      de: sizeMatch[0]
    }
  }
  
  // Extract material hints (common materials)
  const materialHints = ['porzellan', 'porcelain', 'silver', 'silber', 'gold', 'bronze', 'copper', 'kupfer']
  const foundMaterial = materialHints.find(material => 
    caption.toLowerCase().includes(material.toLowerCase())
  )
  
  if (foundMaterial) {
    metadata.material = {
      en: foundMaterial,
      de: foundMaterial
    }
  }
  
  return metadata
}

/**
 * Generate URL-friendly slug
 */
function generateSlug(title, filename) {
  const baseSlug = title 
    ? title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    : filename.toLowerCase()
        .replace(/\.[^.]+$/, '') // Remove extension
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
  
  // Add timestamp to ensure uniqueness
  return `${baseSlug}-${Date.now()}`
}

importArtworksFromCaptions().catch(console.error) 