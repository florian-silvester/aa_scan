import {createClient} from '@sanity/client'
import {nanoid} from 'nanoid'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

// LLM-like extraction patterns (can be enhanced with actual LLM API)
class IntelligentExtractor {
  
  extractArtistName(text) {
    // Clean up common noise
    const cleaned = text
      .replace(/&#\d+;/g, ' ') // Remove HTML entities
      .replace(/_+/g, ' ')      // Replace underscores
      .replace(/-+/g, ' ')      // Replace dashes
      .trim()
    
    // Smart patterns to extract artist names
    const patterns = [
      // "by Artist Name" format
      /by\s+([A-Z][a-zA-Z\s]+)/i,
      // German/Dutch names "Firstname Lastname" 
      /\b([A-Z][a-z]+\s+(?:ten\s+|de\s+|van\s+)?[A-Z][a-z]+)\b/,
      // "Artist, Title" format
      /^([A-Z][a-zA-Z\s]+),\s*/,
      // Studio format "Name design" -> extract Name
      /^([A-Z][a-z]+)\s+(?:design|studio|gallery)/i,
      // Photo credit "Photo Name" -> extract Name  
      /Photo\s+([A-Z][a-zA-Z\s]+)/,
      // Copyright "© Name" -> extract Name
      /©\s*([A-Z][a-zA-Z\s]+)/
    ]
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern)
      if (match && match[1]) {
        const name = match[1].trim()
        // Filter out common false positives
        if (name.length > 2 && 
            !name.match(/^(Read|Photo|Fine|Art|Design|Berlin|Amsterdam)$/i) &&
            name.includes(' ')) { // Require first + last name
          return name
        }
      }
    }
    return null
  }
  
  extractArtworkTitle(text, artistName) {
    if (!artistName) return text
    
    // Remove artist name from title
    const cleaned = text
      .replace(new RegExp(artistName + ',?\\s*', 'i'), '')
      .replace(/^,\s*/, '')
      .trim()
    
    return cleaned || text
  }
  
  extractStudioInfo(text) {
    // Extract studio/gallery information
    const studioPatterns = [
      /([A-Z][a-zA-Z]+\s+(design|studio|gallery|atelier))/i,
      /(\\[A-Za-z]+)/g, // Location markers like \Berlin
    ]
    
    const studios = []
    for (const pattern of studioPatterns) {
      const matches = text.match(pattern)
      if (matches) {
        studios.push(...matches.map(m => m.replace(/\\/, '').trim()))
      }
    }
    return studios
  }
  
  extractExhibitionInfo(text) {
    // Extract exhibition/gallery context
    const exhibitionPatterns = [
      /(Ausstellung|Exhibition|Galerie|Gallery)([^.]+)/i,
      /(mit aktuellen Arbeiten|contemporary works|current works)/i
    ]
    
    for (const pattern of exhibitionPatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[0].trim()
      }
    }
    return null
  }
  
  extractMaterial(text) {
    // Extract material information (English + German)
    const materials = [
      // Metals
      'silver', 'silber', 'gold', 'bronze', 'copper', 'kupfer',
      'steel', 'stahl', 'iron', 'eisen', 'brass', 'messing',
      // Ceramics & Glass
      'ceramic', 'keramik', 'porcelain', 'porzellan', 'glass', 'glas',
      // Natural materials
      'wood', 'holz', 'stone', 'stein', 'leather', 'leder',
      // Modern materials
      'plastic', 'kunststoff', 'resin', 'harz', 'rubber', 'gummi',
      // Textiles
      'fabric', 'stoff', 'textile', 'textil', 'cotton', 'baumwolle',
      // Jewelry specific
      'emerald', 'smaragd', 'diamond', 'diamant', 'pearl', 'perle'
    ]
    
    const found = new Set()
    const lowerText = text.toLowerCase()
    
    materials.forEach(material => {
      if (lowerText.includes(material)) {
        // Map German to English
        const englishMaterial = {
          'silber': 'silver', 'stahl': 'steel', 'eisen': 'iron',
          'keramik': 'ceramic', 'holz': 'wood', 'stein': 'stone',
          'kunststoff': 'plastic', 'harz': 'resin', 'gummi': 'rubber',
          'stoff': 'fabric', 'textil': 'textile'
        }[material] || material
        
        found.add(englishMaterial)
      }
    })
    
    return found.size > 0 ? Array.from(found).join(', ') : null
  }
  
  categorizeArtwork(title, description) {
    const categories = {
      'jewelry': ['bracelet', 'necklace', 'ring', 'earring', 'brooch', 'pendant'],
      'sculpture': ['sculpture', 'installation', 'object'],
      'vessel': ['vase', 'bowl', 'cup', 'vessel'],
      'lighting': ['light', 'lamp', 'lighting']
    }
    
    const text = (title + ' ' + description).toLowerCase()
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category
      }
    }
    return 'artwork'
  }
}

async function analyzeMediaAssets() {
  console.log('🔍 Analyzing media assets for extraction...\n')
  
  try {
    // Get image assets with metadata
    const assets = await client.fetch(`
      *[_type == "sanity.imageAsset" && (
        defined(title) || 
        defined(altText) || 
        defined(description) ||
        defined(originalFilename)
      )][0...10]{
        _id,
        originalFilename,
        title,
        altText,
        description,
        "references": *[references(^._id) && _type == "artwork"]{_id, workTitle}
      }
    `)
    
    console.log(`Found ${assets.length} media assets with metadata`)
    
    const extractor = new IntelligentExtractor()
    
    assets.forEach((asset, index) => {
      console.log(`\n--- Asset ${index + 1} ---`)
      console.log(`File: ${asset.originalFilename}`)
      console.log(`Title: ${asset.title || 'None'}`)
      console.log(`Alt: ${asset.altText || 'None'}`)
      console.log(`Description: ${asset.description || 'None'}`)
      console.log(`Referenced by: ${asset.references?.length || 0} artworks`)
      
      // Extract structured data
      const text = [asset.title, asset.altText, asset.description].filter(Boolean).join(' ')
      if (text) {
        const artist = extractor.extractArtistName(text)
        const title = extractor.extractArtworkTitle(text, artist)
        const studios = extractor.extractStudioInfo(text)
        const exhibition = extractor.extractExhibitionInfo(text)
        const material = extractor.extractMaterial(text)
        const category = extractor.categorizeArtwork(title, text)
        
        console.log(`  🎨 Extracted Artist: ${artist || 'Unknown'}`)
        console.log(`  📝 Extracted Title: ${title}`)
        console.log(`  🏢 Studios: ${studios.join(', ') || 'None'}`)
        console.log(`  🖼️  Exhibition: ${exhibition || 'None'}`)
        console.log(`  🔧 Material: ${material || 'Unknown'}`)
        console.log(`  📂 Category: ${category}`)
      }
    })
    
    return assets
    
  } catch (error) {
    console.error('❌ Error analyzing assets:', error.message)
    throw error
  }
}

async function populateArtworksFromMedia() {
  console.log('\n🤖 Starting intelligent artwork population...\n')
  
  try {
    // Get artworks with their referenced images
    const artworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        workTitle,
        creator,
        category,
        material,
        description,
        "images": images[]{
          asset->{
            _id,
            originalFilename,
            title,
            altText,
            description
          }
        }
      }
    `)
    
    const extractor = new IntelligentExtractor()
    let updated = 0
    let creatorsCreated = 0
    
    for (const artwork of artworks) {
      console.log(`\nProcessing: ${artwork.workTitle || 'Untitled'}`)
      
      // Gather all text from images
      const imageTexts = artwork.images
        ?.map(img => [img.asset?.title, img.asset?.altText, img.asset?.description].filter(Boolean))
        .flat() || []
      
      if (imageTexts.length === 0) {
        console.log('  ⏭️  No image metadata - skipping')
        continue
      }
      
      const allText = imageTexts.join(' ')
      console.log(`  📄 Source text: ${allText.substring(0, 100)}...`)
      
      // Extract structured data
      const extractedArtist = extractor.extractArtistName(allText)
      const extractedTitle = extractor.extractArtworkTitle(allText, extractedArtist)
      const extractedMaterial = extractor.extractMaterial(allText)
      const extractedCategory = extractor.categorizeArtwork(extractedTitle, allText)
      
      // Prepare updates
      const updates = {}
      
      // Update title if empty or generic
      if (!artwork.workTitle || artwork.workTitle.includes('Untitled')) {
        updates.workTitle = extractedTitle
        console.log(`  📝 Title: ${extractedTitle}`)
      }
      
      // Update material if empty
      if (!artwork.material && extractedMaterial) {
        updates.material = extractedMaterial
        console.log(`  🔧 Material: ${extractedMaterial}`)
      }
      
      // Handle creator
      if (!artwork.creator && extractedArtist) {
        console.log(`  👨‍🎨 Looking for creator: ${extractedArtist}`)
        
        // Find or create creator
        let creator = await client.fetch(`
          *[_type == "creator" && name match $pattern][0]{_id, name}
        `, { pattern: `*${extractedArtist}*` })
        
        if (!creator) {
          // Create new creator
          const creatorData = {
            _type: 'creator',
            _id: `creator-${nanoid()}`,
            name: extractedArtist,
            slug: { 
              _type: 'slug', 
              current: extractedArtist.toLowerCase().replace(/[^a-z0-9]+/g, '-') 
            },
            tier: 'free'
          }
          
          creator = await client.create(creatorData)
          console.log(`  ✨ Created creator: ${creator.name}`)
          creatorsCreated++
        }
        
        updates.creator = { _type: 'reference', _ref: creator._id }
        console.log(`  🔗 Linked to creator: ${creator.name}`)
      }
      
      // Apply updates
      if (Object.keys(updates).length > 0) {
        await client.patch(artwork._id).set(updates).commit()
        console.log(`  ✅ Updated artwork with ${Object.keys(updates).length} fields`)
        updated++
      } else {
        console.log('  ➡️  No updates needed')
      }
    }
    
    console.log(`\n🎉 Population complete!`)
    console.log(`- Artworks updated: ${updated}`)
    console.log(`- New creators created: ${creatorsCreated}`)
    
  } catch (error) {
    console.error('❌ Error during population:', error.message)
    throw error
  }
}

async function main() {
  try {
    const command = process.argv[2]
    
    switch (command) {
      case 'analyze':
        await analyzeMediaAssets()
        break
      case 'populate':
        await populateArtworksFromMedia()
        break
      default:
        console.log('📋 Available commands:')
        console.log('  node intelligent-artwork-extractor.js analyze   - Analyze media assets')
        console.log('  node intelligent-artwork-extractor.js populate  - Populate artworks from media')
        await analyzeMediaAssets()
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message)
    process.exit(1)
  }
}

main() 