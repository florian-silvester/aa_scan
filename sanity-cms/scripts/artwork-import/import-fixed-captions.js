import sanity from './sanity-client.js'
import fs from 'fs'

/**
 * IMPORT FIXED CAPTIONS
 * 
 * Converts properly extracted carousel captions into Sanity artwork documents
 * with correct titles, descriptions, and creator links
 */

async function importFixedCarouselCaptions() {
  console.log('🎨 IMPORTING FIXED CAROUSEL CAPTIONS\n')
  
  // Read the fixed captions data
  const filename = '../carousel-captions-fixed-2025-07-11.json'
  
  if (!fs.existsSync(filename)) {
    console.log('❌ Fixed captions file not found. Run the fixed scraper first.')
    return
  }
  
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'))
  
  console.log(`📋 Found ${data.designers.length} designers with ${data.summary.totalImages} images`)
  console.log(`🎯 ${data.summary.withCaptions} have captions (${Math.round(data.summary.withCaptions/data.summary.totalImages*100)}%)`)
  
  // Get existing creators for linking
  console.log('\n🔍 Loading existing creators...')
  const creators = await sanity.fetch('*[_type == "creator"] { _id, name, slug }')
  console.log(`📋 Found ${creators.length} existing creators`)
  
  // Process each designer
  let totalCreated = 0
  let skippedNoCreator = 0
  let skippedNoCaption = 0
  
  for (const designer of data.designers) {
    console.log(`\n👤 Processing ${designer.designerName}...`)
    
    // Find matching creator
    const creator = findMatchingCreator(creators, designer.designerName)
    if (!creator) {
      console.log(`   ❌ No matching creator found for "${designer.designerName}"`)
      skippedNoCreator++
      continue
    }
    
    console.log(`   ✅ Matched to creator: ${creator.name}`)
    
    // Process images
    let createdForDesigner = 0
    
    for (const image of designer.images) {
      // Skip if no caption
      if (!image.rawCaption && !image.rawCaption_en && !image.rawCaption_de) {
        skippedNoCaption++
        continue
      }
      
      // Extract title from caption
      const title = extractTitleFromCaption(image.rawCaption || image.rawCaption_en || image.rawCaption_de)
      
      // Create artwork document
      const artworkDoc = {
        _type: 'artwork',
        title: title,
        slug: {
          _type: 'slug',
          current: generateSlug(title, image.filename)
        },
        creator: {
          _type: 'reference',
          _ref: creator._id
        },
        rawCaption: image.rawCaption || image.rawCaption_de || image.rawCaption_en,
        rawCaption_en: image.rawCaption_en || '',
        rawCaption_de: image.rawCaption_de || '',
        filename: image.filename,
        imageUrl: image.imageUrl,
        slideIndex: image.slideIndex,
        extractedAt: new Date().toISOString()
      }
      
      try {
        const result = await sanity.create(artworkDoc)
        createdForDesigner++
        totalCreated++
        
        if (createdForDesigner % 10 === 0) {
          console.log(`   📦 Created ${createdForDesigner} artworks...`)
        }
        
      } catch (error) {
        console.log(`   ❌ Error creating artwork: ${error.message}`)
      }
    }
    
    console.log(`   ✅ Created ${createdForDesigner} artworks for ${designer.designerName}`)
  }
  
  console.log(`\n📊 IMPORT COMPLETE:`)
  console.log(`   ✅ Created: ${totalCreated} artworks`)
  console.log(`   ❌ Skipped (no creator): ${skippedNoCreator}`)
  console.log(`   ❌ Skipped (no caption): ${skippedNoCaption}`)
  console.log(`   🎯 Success rate: ${Math.round(totalCreated/(totalCreated+skippedNoCreator+skippedNoCaption)*100)}%`)
}

function findMatchingCreator(creators, designerName) {
  // Direct name match
  let match = creators.find(creator => 
    creator.name.toLowerCase() === designerName.toLowerCase()
  )
  
  if (match) return match
  
  // Fuzzy matching
  const normalizedDesigner = designerName.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  match = creators.find(creator => {
    const normalizedCreator = creator.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    return normalizedCreator === normalizedDesigner
  })
  
  if (match) return match
  
  // Partial matching (last resort)
  return creators.find(creator => {
    const designerParts = designerName.toLowerCase().split(' ')
    const creatorParts = creator.name.toLowerCase().split(' ')
    
    // Check if at least 2 parts match
    const matchingParts = designerParts.filter(part => 
      creatorParts.some(cPart => cPart.includes(part) || part.includes(cPart))
    )
    
    return matchingParts.length >= 2
  })
}

function extractTitleFromCaption(caption) {
  if (!caption) return 'Untitled'
  
  // Try to extract title from common patterns
  let title = caption
  
  // Remove HTML tags
  title = title.replace(/<[^>]*>/g, '')
  
  // Look for title in quotes or em tags
  const quotedMatch = caption.match(/<em>([^<]+)<\/em>/)
  if (quotedMatch) {
    return quotedMatch[1].trim()
  }
  
  // Look for title at the beginning
  const parts = title.split(/[.,]/)
  if (parts.length > 0) {
    const firstPart = parts[0].trim()
    
    // If first part looks like a title (not just material description)
    if (firstPart.length > 3 && firstPart.length < 100 && 
        !firstPart.toLowerCase().includes('porzellan') &&
        !firstPart.toLowerCase().includes('porcelain') &&
        !firstPart.toLowerCase().includes('clay') &&
        !firstPart.toLowerCase().includes('cm')) {
      return firstPart
    }
  }
  
  // Fallback: use first 50 characters
  return title.substring(0, 50).trim() + (title.length > 50 ? '...' : '')
}

function generateSlug(title, filename) {
  const baseSlug = title.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  // Add filename suffix to ensure uniqueness
  const filenamePart = filename.split('.')[0].substring(0, 20)
  return `${baseSlug}-${filenamePart}`
}

// Run the import
importFixedCarouselCaptions().catch(console.error) 