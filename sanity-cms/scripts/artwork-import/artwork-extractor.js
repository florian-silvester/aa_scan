import {createClient} from '@sanity/client'
import {nanoid} from 'nanoid'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

console.log('🎨 ARTWORK EXTRACTION SYSTEM\n')

// ARTWORK IDENTIFICATION PATTERNS
const ARTWORK_PATTERNS = {
  artworks: [
    // Jewelry
    'jewelry', 'jewellery', 'schmuck', 'ring', 'necklace', 'bracelet', 
    'earring', 'pendant', 'brooch', 'chain', 'choker', 'tiara', 'crown',
    'anklet', 'armband', 'cufflink', 'charm', 'locket', 'halsschmuck',
    'ohrringe', 'kette', 'collier', 'armreif', 'anhänger', 'ohrring',
    // Fashion & Wearables
    'shoes', 'bag', 'handbag', 'scarf', 'belt', 'hat', 'cap', 'gloves',
    'fashion', 'clothing', 'accessory', 'wearable', 'textile',
    // Art Objects
    'sculpture', 'object', 'vessel', 'bowl', 'vase', 'cup', 'plate',
    'installation', 'artwork', 'piece', 'work', 'creation', 'design',
    // German equivalents
    'skulptur', 'objekt', 'gefäß', 'schale', 'tasse', 'teller',
    'installation', 'kunstwerk', 'stück', 'werk', 'kreation', 'design'
  ],
  
  materials: [
    'gold', 'silver', 'silber', 'platinum', 'bronze', 'copper', 'brass',
    'pearl', 'perle', 'diamond', 'ruby', 'sapphire', 'emerald', 'opal',
    'glass', 'ceramic', 'steel', 'titanium', 'aluminium', 'iron',
    'leather', 'fabric', 'wood', 'stone', 'crystal', 'amber'
  ],
  
  measurements: [
    'mm', 'cm', 'inch', 'size', 'dimension', 'diameter', 'length', 
    'width', 'height', 'depth', 'thickness', 'circumference',
    '\\d+\\s*mm', '\\d+\\s*cm', '\\d+\\.\\d+\\s*cm'
  ],
  
  artCategories: [
    'art', 'kunst', 'design', 'handmade', 'unique', 'collection',
    'piece', 'stück', 'work', 'creation', 'accessory',
    'fashion', 'wearable', 'sculpture', 'object'
  ],
  
  // Exclusion patterns - things that are NOT artworks
  exclusions: [
    'gallery', 'galerie', 'museum', 'exhibition', 'ausstellung', 'venue', 
    'booth', 'stand', 'messe', 'fair', 'event', 'opening', 'vernissage',
    'crowd', 'people', 'visitor', 'besucher', 'audience', 'publikum',
    'building', 'architecture', 'room', 'raum', 'space', 'hall', 'saal'
  ]
}

// ARTIST NAME EXTRACTION PATTERNS
const ARTIST_PATTERNS = [
  // German/Dutch name patterns with prefixes
  /(?:von|van|de|der|den|ten|zu)\s+[A-Za-z]+(?:\s+[A-Za-z]+)*/gi,
  
  // Standard labeled patterns  
  /(?:artist|künstler|creator|maker|designer|by)[:]\s*([A-Za-z\-]+(?:\s+[A-Za-z\-]+)*)/gi,
  
  // Names in parentheses
  /\(([A-Za-z\-]+(?:\s+[A-Za-z\-]+)*)\)/gi,
  
  // Copyright patterns
  /©\s*([A-Za-z\-]+(?:\s+[A-Za-z\-]+)*)/gi,
  
  // Common filename patterns (artist name at start)
  /^([A-Za-z]+(?:[-_][A-Za-z]+)+)[-_]/,
  
  // Name followed by artwork type
  /^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*[-_]\s*(?:ring|necklace|bracelet|earring|pendant|brooch|schmuck|jewelry|artwork|piece|work|sculpture|object|design)/gi,
  
  // Name at beginning of title
  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s/,
  
  // Name patterns with common separators
  /([A-Za-z]+)[-_]([A-Za-z]+)[-_]/gi,
  
  // Two capitalized words (likely first/last name)
  /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g
]

function isArtwork(item) {
  const text = [
    item.originalFilename || '',
    item.title || '',
    item.altText || '',
    item.description || ''
  ].join(' ').toLowerCase()
  
  let score = 0
  let hasExclusion = false
  
  // Check for exclusion patterns first - if it's a gallery/venue shot, skip it
  ARTWORK_PATTERNS.exclusions.forEach(exclusion => {
    if (new RegExp(`\\b${exclusion}\\b`, 'i').test(text)) {
      hasExclusion = true
    }
  })
  
  // Specific portrait photo detection
  const filename = item.originalFilename || ''
  const title = item.title || ''
  const description = item.description || ''
  
  // Strong indicators this is a portrait photo, not artwork
  // Only exclude if it's clearly a portrait photo, not artwork photography
  if ((title.match(/\b(portrait|porträt|headshot)\b/i) && !title.match(/\b(von|by)\b/i)) ||
      description.match(/\b(physischen Abdruck eines Menschen|Fingerabdrücken|Abformung eines Körperteils|person sitting|person in|gesicht|face|headshot|künstler portrait|artist portrait)\b/i)) {
    hasExclusion = true
  }
  
  // If it's clearly a gallery/venue/portrait shot, exclude it completely
  if (hasExclusion) {
    return false
  }
  
  // Check artwork keywords
  ARTWORK_PATTERNS.artworks.forEach(keyword => {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) {
      score += 3
    }
  })
  
  // Check material keywords
  ARTWORK_PATTERNS.materials.forEach(material => {
    if (new RegExp(`\\b${material}\\b`, 'i').test(text)) {
      score += 2
    }
  })
  
  // Check measurement indicators
  ARTWORK_PATTERNS.measurements.forEach(measurement => {
    if (new RegExp(measurement, 'i').test(text)) {
      score += 2
    }
  })
  
  // Check art category keywords
  ARTWORK_PATTERNS.artCategories.forEach(category => {
    if (new RegExp(`\\b${category}\\b`, 'i').test(text)) {
      score += 1
    }
  })
  
  // Check for artist name patterns (give points for having an artist name)
  const artistName = extractArtistName(item)
  if (artistName) {
    score += 1
  }
  
  // If no clear indicators but not excluded, still consider if it might be artwork
  if (score === 0) {
    // Check for common image file patterns that might be artworks
    const filename = item.originalFilename || ''
    
    // Images that might be artworks (conservative approach)
    if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      // If it has a structured filename suggesting it's a product/artwork photo
      if (filename.match(/[a-zA-Z]+[-_]\d+/) || 
          filename.match(/\d+[-_][a-zA-Z]+/) ||
          filename.includes('collection') ||
          filename.includes('piece')) {
        score += 0.5
      }
    }
  }
  
  return score >= 0.5 // Very low threshold, rely on exclusions to filter out non-artworks
}

function extractArtistName(item) {
  const filename = item.originalFilename || ''
  const title = item.title || ''
  const description = item.description || ''
  
  const foundNames = []
  
  // Pattern 1: Filename patterns like "Yong-Joo-Kim_Artwork-Title"
  const filenameMatch = filename.match(/^([A-Za-z]+(?:[-_][A-Za-z]+)*?)[-_](?:[A-Z]|[a-z])/i)
  if (filenameMatch) {
    const name = filenameMatch[1].replace(/[-_]/g, ' ').trim()
    if (name.length > 2) {
      foundNames.push(name)
    }
  }
  
  // Pattern 2: Studio/Atelier names in descriptions
  const studioMatch = description.match(/(?:Atelier|Studio|Galerie|Werkstatt)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/gi)
  if (studioMatch) {
    studioMatch.forEach(match => {
      const name = match.replace(/^(?:Atelier|Studio|Galerie|Werkstatt)\s+/i, '').trim()
      if (name.length > 2) {
        foundNames.push(match) // Keep "Atelier Zobel" format
      }
    })
  }
  
  // Pattern 3: Names in title (first part before space)
  if (title) {
    const titleMatch = title.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s|$)/)
    if (titleMatch && titleMatch[1].includes(' ')) {
      foundNames.push(titleMatch[1])
    }
  }
  
  // Pattern 4: Names in descriptions with "von" (German: "by")
  const vonMatch = description.match(/(?:von|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi)
  if (vonMatch) {
    vonMatch.forEach(match => {
      const name = match.replace(/^(?:von|by)\s+/i, '').trim()
      if (name.length > 2) {
        foundNames.push(name)
      }
    })
  }
  
  // Pattern 5: Multiple artists with "und" (German: "and")
  const multiMatch = description.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s+und\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g)
  if (multiMatch) {
    multiMatch.forEach(match => {
      const names = match.split(/\s+und\s+/)
      foundNames.push(...names)
    })
  }
  
  // Pattern 6: Single capitalized names (2+ words)
  const capNames = (title + ' ' + description).match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g)
  if (capNames) {
    capNames.forEach(name => {
      // Filter out common non-names
      if (!name.match(/^(Art|New|The|Red|Blue|Gold|Silver|Black|White|Green|Modern|Design|Collection|Gallery|Studio|Showroom)/) && 
          name.length > 4) {
        foundNames.push(name.trim())
      }
    })
  }
  
  // Return first found name (prioritize specific patterns)
  return foundNames.length > 0 ? foundNames[0] : null
}

function extractMaterials(item) {
  const text = [
    item.originalFilename || '',
    item.title || '',
    item.altText || '',
    item.description || ''
  ].join(' ').toLowerCase()
  
  const foundMaterials = []
  
  ARTWORK_PATTERNS.materials.forEach(material => {
    if (new RegExp(`\\b${material}\\b`, 'i').test(text)) {
      foundMaterials.push(material)
    }
  })
  
  return foundMaterials
}

function extractMeasurements(item) {
  const text = [
    item.originalFilename || '',
    item.title || '',
    item.altText || '',
    item.description || ''
  ].join(' ')
  
  const measurementPatterns = [
    /\d+\.?\d*\s*x\s*\d+\.?\d*\s*(?:mm|cm)/gi,
    /\d+\.?\d*\s*(?:mm|cm|inch)/gi,
    /diameter\s*[:]\s*\d+\.?\d*\s*(?:mm|cm)/gi,
    /size\s*[:]\s*\d+\.?\d*/gi
  ]
  
  const foundMeasurements = []
  
  measurementPatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      // Filter out common image dimensions
      const filtered = matches.filter(match => {
        // Exclude dimensions like 1920x1300, 1000x1500, etc.
        if (/\d{3,4}\s*x\s*\d{3,4}/.test(match)) {
          return false
        }
        return true
      })
      foundMeasurements.push(...filtered)
    }
  })
  
  return foundMeasurements
}

async function findCreatorByName(artistName, allCreators) {
  if (!artistName) return null
  
  // Normalize name for comparison
  const normalizedArtist = artistName.toLowerCase().trim()
  
  // Find exact match
  let match = allCreators.find(creator => 
    creator.name && creator.name.toLowerCase().trim() === normalizedArtist
  )
  
  if (match) return match
  
  // Find partial match (last name)
  const artistLastName = normalizedArtist.split(' ').pop()
  match = allCreators.find(creator => 
    creator.name && creator.name.toLowerCase().includes(artistLastName)
  )
  
  return match || null
}

async function extractArtworksFromMedia() {
  try {
    console.log('📊 ANALYZING MEDIA FOR ARTWORK EXTRACTION...')
    
    // Get all media assets
    const mediaAssets = await client.fetch(`
      *[_type == "sanity.imageAsset"]{
        _id,
        originalFilename,
        title,
        altText,
        description,
        url,
        size
      } | order(originalFilename)
    `)
    
    console.log(`- Total media assets: ${mediaAssets.length}`)
    
    // Get all existing creators for name matching
    const allCreators = await client.fetch(`
      *[_type == "creator"]{
        _id,
        name,
        biography
      }
    `)
    
    console.log(`- Available creators: ${allCreators.length}`)
    console.log('')
    
    // Identify artwork media
    console.log('🎨 IDENTIFYING ARTWORK MEDIA...')
    const artworkMedia = mediaAssets.filter(isArtwork)
    
    console.log(`- Identified ${artworkMedia.length} potential artwork images`)
    console.log('')
    
    // Process each artwork media item
    console.log('🔍 EXTRACTING ARTWORK DATA...')
    const extractedArtworks = []
    
    for (let i = 0; i < artworkMedia.length; i++) {
      const media = artworkMedia[i]
      
      const artistName = extractArtistName(media)
      const materials = extractMaterials(media)
      const measurements = extractMeasurements(media)
      const creator = await findCreatorByName(artistName, allCreators)
      
      const artworkData = {
        _id: `artwork-${nanoid()}`,
        _type: 'artwork',
        workTitle: media.title || media.originalFilename || 'Untitled Artwork',
        description: media.description || media.altText || '',
        material: materials.join(', ') || undefined,
        measurements: measurements.join(', ') || undefined,
        images: [{
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: media._id
          },
          alt: media.altText || media.title || 'Artwork image'
        }],
        creator: creator ? {
          _type: 'reference',
          _ref: creator._id
        } : undefined,
        extractedArtist: artistName || undefined,
        extractionMetadata: {
          source: 'media-extraction',
          confidence: materials.length + measurements.length + (creator ? 2 : 0),
          originalFilename: media.originalFilename
        }
      }
      
      extractedArtworks.push(artworkData)
      
      if ((i + 1) % 10 === 0) {
        console.log(`  Processed ${i + 1}/${artworkMedia.length} artwork items...`)
      }
    }
    
    console.log('')
    console.log('📈 EXTRACTION RESULTS:')
    console.log(`- Artwork items identified: ${extractedArtworks.length}`)
    console.log(`- With materials: ${extractedArtworks.filter(a => a.material).length}`)
    console.log(`- With measurements: ${extractedArtworks.filter(a => a.measurements).length}`) 
    console.log(`- With creator links: ${extractedArtworks.filter(a => a.creator).length}`)
    console.log(`- With artist names: ${extractedArtworks.filter(a => a.extractedArtist).length}`)
    console.log('')
    
    // Show examples
    console.log('🔍 EXTRACTION EXAMPLES:')
    extractedArtworks.slice(0, 5).forEach((artwork, i) => {
      console.log(`\n${i + 1}. ${artwork.workTitle}`)
      if (artwork.material) console.log(`   Materials: ${artwork.material}`)
      if (artwork.measurements) console.log(`   Measurements: ${artwork.measurements}`)
      if (artwork.creator) console.log(`   Creator: LINKED`)
      if (artwork.extractedArtist) console.log(`   Artist: ${artwork.extractedArtist}`)
    })
    
    return extractedArtworks
    
  } catch (error) {
    console.error('❌ Artwork extraction failed:', error.message)
    throw error
  }
}

async function createArtworkDocuments(extractedArtworks) {
  console.log('\n🚀 CREATING ARTWORK DOCUMENTS...')
  
  try {
    const batchSize = 20
    let created = 0
    
    for (let i = 0; i < extractedArtworks.length; i += batchSize) {
      const batch = extractedArtworks.slice(i, i + batchSize)
      
      const transaction = client.transaction()
      batch.forEach(artwork => {
        transaction.create(artwork)
      })
      
      await transaction.commit()
      created += batch.length
      
      console.log(`✅ Created batch ${Math.ceil((i + 1) / batchSize)}: ${created}/${extractedArtworks.length}`)
    }
    
    console.log('')
    console.log(`🎉 ARTWORK CREATION COMPLETE!`)
    console.log(`- Created ${created} new artwork documents`)
    
    return created
    
  } catch (error) {
    console.error('❌ Artwork creation failed:', error.message)
    throw error
  }
}

// Main execution
async function main() {
  try {
    const extractedArtworks = await extractArtworksFromMedia()
    
    if (extractedArtworks.length === 0) {
      console.log('⚠️  No artwork media found. Check identification patterns.')
      return
    }
    
    console.log('\n💡 PREVIEW MODE - Ready to create artworks!')
    console.log('Uncomment the line below to actually create the documents:')
    console.log('// const created = await createArtworkDocuments(extractedArtworks)')
    
    // Uncomment to actually create the documents:
    // const created = await createArtworkDocuments(extractedArtworks)
    
  } catch (error) {
    console.error('❌ Artwork extraction system failed:', error.message)
    process.exit(1)
  }
}

main() 