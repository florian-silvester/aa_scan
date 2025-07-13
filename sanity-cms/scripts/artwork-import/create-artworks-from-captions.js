import { createClient } from '@sanity/client'
import fs from 'fs'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN || ''
})

/**
 * ARTWORK IMPORTER FROM BILINGUAL CAPTIONS
 * 
 * Creates artwork documents from the scraped bilingual caption data
 * Links to existing creators and media assets
 */

async function createArtworksFromCaptions() {
  console.log('🎨 CREATING ARTWORKS FROM BILINGUAL CAPTIONS\n')
  
  // Load scraped data
  const data = JSON.parse(fs.readFileSync('../artwork-captions-2025-07-10.json', 'utf8'))
  console.log(`📊 Found ${data.designers.length} designers with ${data.summary.totalImages} images`)
  
  // Get existing creators and media for matching
  console.log('\n🔍 Loading existing creators and media...')
  const creators = await client.fetch('*[_type == "creator"]{_id, name, slug}')
  const mediaAssets = await client.fetch('*[_type == "sanity.imageAsset"]{_id, originalFilename, url}')
  
  console.log(`   ✅ Found ${creators.length} creators`)
  console.log(`   ✅ Found ${mediaAssets.length} media assets`)
  
  // Create artwork documents
  let totalArtworks = 0
  let linkedToCreator = 0
  let linkedToMedia = 0
  
  const artworkDocuments = []
  
  for (const designer of data.designers) {
    console.log(`\n👤 Processing ${designer.designerName}...`)
    
    // Find matching creator
    const creator = findCreator(designer.designerName, creators)
    if (!creator) {
      console.log(`   ❌ No creator found for: ${designer.designerName}`)
      continue
    }
    
    console.log(`   ✅ Found creator: ${creator.name}`)
    
    // Process images
    for (const image of designer.images) {
      if (!image.rawCaption_en && !image.rawCaption_de) {
        continue // Skip images without captions
      }
      
      totalArtworks++
      
      // Find matching media asset
      const mediaAsset = findMediaAsset(image.filename, mediaAssets)
      
      // Extract title from caption
      const title = extractTitle(image.rawCaption_en || image.rawCaption_de)
      
      // Create artwork document
      const artworkDoc = {
        _type: 'artwork',
        _id: `artwork-${totalArtworks}`,
        title: title || `Artwork by ${designer.designerName}`,
        creators: [{ _type: 'reference', _ref: creator._id }],
        description: [
          {
            _key: 'en',
            _type: 'localeText',
            language: 'en',
            value: image.rawCaption_en || ''
          },
          {
            _key: 'de', 
            _type: 'localeText',
            language: 'de',
            value: image.rawCaption_de || ''
          }
        ],
        year: extractYear(image.rawCaption_en || image.rawCaption_de),
        materials: extractMaterials(image.rawCaption_en || image.rawCaption_de),
        dimensions: extractDimensions(image.rawCaption_en || image.rawCaption_de),
        imageUrl: image.imageUrl,
        filename: image.filename
      }
      
      // Link to media asset if found
      if (mediaAsset) {
        artworkDoc.image = {
          _type: 'image',
          asset: { _type: 'reference', _ref: mediaAsset._id }
        }
        linkedToMedia++
      }
      
      artworkDocuments.push(artworkDoc)
      linkedToCreator++
    }
    
    console.log(`   📊 Created ${designer.images.filter(img => img.rawCaption_en || img.rawCaption_de).length} artworks`)
  }
  
  console.log(`\n📊 SUMMARY:`)
  console.log(`   - Total artworks to create: ${totalArtworks}`)
  console.log(`   - Linked to creators: ${linkedToCreator}`)
  console.log(`   - Linked to media: ${linkedToMedia}`)
  
  // Save batch create
  console.log('\n💾 Creating artwork documents in Sanity...')
  const batchSize = 50
  
  for (let i = 0; i < artworkDocuments.length; i += batchSize) {
    const batch = artworkDocuments.slice(i, i + batchSize)
    
    try {
      // Use transaction for batch operations
      const transaction = client.transaction()
      batch.forEach(doc => transaction.createOrReplace(doc))
      await transaction.commit()
      
      console.log(`   ✅ Created batch ${Math.floor(i/batchSize) + 1}: ${i + batch.length}/${artworkDocuments.length}`)
    } catch (error) {
      console.error(`   ❌ Error creating batch ${Math.floor(i/batchSize) + 1}:`, error.message)
    }
  }
  
  console.log('\n🎉 IMPORT COMPLETE!')
  console.log(`Created ${artworkDocuments.length} artworks with bilingual descriptions`)
}

function findCreator(designerName, creators) {
  // Direct name match
  let creator = creators.find(c => 
    c.name.toLowerCase() === designerName.toLowerCase()
  )
  
  // Fuzzy match
  if (!creator) {
    creator = creators.find(c => 
      c.name.toLowerCase().includes(designerName.toLowerCase()) ||
      designerName.toLowerCase().includes(c.name.toLowerCase())
    )
  }
  
  return creator
}

function findMediaAsset(filename, mediaAssets) {
  return mediaAssets.find(media => 
    media.originalFilename === filename ||
    media.url?.includes(filename)
  )
}

function extractTitle(caption) {
  if (!caption) return null
  
  // Try to extract title from caption
  const patterns = [
    /^([^,]+),\s*\d{4}/, // "Title, 2021"
    /^([^\.]+)\.\s*\d{4}/, // "Title. 2021"
    /^([^,]+),\s*[^,]+,\s*\d{4}/, // "Title, type, 2021"
  ]
  
  for (const pattern of patterns) {
    const match = caption.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  
  // Fallback - first part before comma or period
  const firstPart = caption.split(/[,\.]/)[0].trim()
  if (firstPart.length > 3 && firstPart.length < 100) {
    return firstPart
  }
  
  return null
}

function extractYear(caption) {
  if (!caption) return null
  
  const yearMatch = caption.match(/\b(19|20)\d{2}\b/)
  return yearMatch ? parseInt(yearMatch[0]) : null
}

function extractMaterials(caption) {
  if (!caption) return []
  
  // Common material patterns
  const materials = []
  const materialPatterns = [
    /\b(silver|gold|platinum|bronze|copper|brass|steel|titanium)\b/gi,
    /\b(porcelain|ceramic|clay|stoneware)\b/gi,
    /\b(wood|metal|glass|plastic|resin)\b/gi,
    /\b(leather|textile|fabric|paper)\b/gi
  ]
  
  for (const pattern of materialPatterns) {
    const matches = caption.match(pattern)
    if (matches) {
      materials.push(...matches.map(m => m.toLowerCase()))
    }
  }
  
  return [...new Set(materials)] // Remove duplicates
}

function extractDimensions(caption) {
  if (!caption) return null
  
  // Look for dimension patterns
  const dimensionPatterns = [
    /\b\d+\s*x\s*\d+\s*x\s*\d+\s*cm\b/gi,
    /\b\d+\s*x\s*\d+\s*cm\b/gi,
    /\bh\s*\d+\s*cm\b/gi,
    /\bø\s*\d+\s*cm\b/gi
  ]
  
  for (const pattern of dimensionPatterns) {
    const match = caption.match(pattern)
    if (match) {
      return match[0]
    }
  }
  
  return null
}

// Run the importer
createArtworksFromCaptions().catch(console.error) 