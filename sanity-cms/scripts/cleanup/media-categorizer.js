import {createClient} from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

console.log('🎯 MEDIA CATEGORIZATION SYSTEM\n')

// Categorization patterns
const PATTERNS = {
  PORTRAITS: {
    keywords: [
      'portrait', 'porträt', 'künstler', 'artist', 'person', 'people', 
      'headshot', 'face', 'biography', 'bio', 'creator', 'maker',
      'atelier', 'workshop', 'craftsman', 'artisan', 'designer'
    ],
    filenamePatterns: [
      /portrait/i, /porträt/i, /künstler/i, /artist/i, /person/i,
      /headshot/i, /bio/i, /creator/i, /maker/i, /_person/i,
      /artisan/i, /craftsman/i, /designer/i
    ]
  },
  
  STUDIO: {
    keywords: [
      'studio', 'atelier', 'workshop', 'workspace', 'tool', 'tools',
      'werkstatt', 'arbeitsplatz', 'equipment', 'process', 'making',
      'technique', 'technik', 'work', 'arbeiten', 'bench', 'table',
      'setup', 'environment', 'space', 'room', 'behind', 'scenes'
    ],
    filenamePatterns: [
      /studio/i, /atelier/i, /workshop/i, /workspace/i, /tool/i,
      /werkstatt/i, /arbeitsplatz/i, /equipment/i, /process/i,
      /technique/i, /technik/i, /bench/i, /table/i, /setup/i,
      /behind/i, /scenes/i, /_work/i, /_making/i
    ]
  },
  
  ARTWORK: {
    keywords: [
      'schmuck', 'jewelry', 'jewellery', 'ring', 'necklace', 'bracelet',
      'earring', 'pendant', 'brooch', 'chain', 'gold', 'silver', 'silber',
      'pearl', 'perle', 'diamond', 'stone', 'stein', 'metal', 'metall',
      'precious', 'luxury', 'elegant', 'design', 'handmade', 'unique',
      'collection', 'piece', 'stück', 'work', 'art', 'kunst'
    ],
    filenamePatterns: [
      /schmuck/i, /jewelry/i, /jewellery/i, /ring/i, /necklace/i,
      /bracelet/i, /earring/i, /pendant/i, /brooch/i, /chain/i,
      /gold/i, /silver/i, /silber/i, /pearl/i, /perle/i, /diamond/i,
      /collection/i, /piece/i, /stück/i, /_art/i, /_kunst/i
    ]
  }
}

function categorizeMedia(item) {
  const text = [
    item.originalFilename || '',
    item.title || '',
    item.altText || '',
    item.description || ''
  ].join(' ').toLowerCase()
  
  const scores = {
    artwork: 0,
    studio: 0,
    portrait: 0
  }
  
  // Check keywords
  Object.entries(PATTERNS).forEach(([category, config]) => {
    let categoryKey = category.toLowerCase()
    if (categoryKey === 'portraits') categoryKey = 'portrait'
    
    // Keyword matching
    config.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i')
      if (regex.test(text)) {
        scores[categoryKey] += 2
      }
    })
    
    // Filename pattern matching
    config.filenamePatterns.forEach(pattern => {
      if (pattern.test(item.originalFilename || '')) {
        scores[categoryKey] += 3
      }
    })
  })
  
  // Special rules for artwork detection
  const materialKeywords = [
    'gold', 'silber', 'silver', 'platinum', 'bronze', 'copper',
    'pearl', 'perle', 'diamond', 'ruby', 'sapphire', 'emerald',
    'glass', 'ceramic', 'steel', 'titanium'
  ]
  
  materialKeywords.forEach(material => {
    if (text.includes(material)) {
      scores.artwork += 1
    }
  })
  
  // Get the highest scoring category
  const maxScore = Math.max(...Object.values(scores))
  if (maxScore === 0) return 'uncategorized'
  
  const category = Object.keys(scores).find(key => scores[key] === maxScore)
  return category
}

async function analyzeAndCategorizeMedia() {
  try {
    console.log('📊 ANALYZING ALL MEDIA ASSETS...')
    
    // Get all media assets with metadata
    const mediaAssets = await client.fetch(`
      *[_type == "sanity.imageAsset"]{
        _id,
        originalFilename,
        title,
        altText,
        description,
        url,
        size,
        "isLinkedToArtwork": count(*[_type == "artwork" && references(^._id)]) > 0
      } | order(originalFilename)
    `)
    
    console.log(`- Total media assets: ${mediaAssets.length}`)
    console.log('')
    
    // Categorize each media item
    console.log('🤖 CATEGORIZING MEDIA...')
    const categorized = {
      artwork: [],
      studio: [],
      portrait: [],
      uncategorized: []
    }
    
    mediaAssets.forEach((item, index) => {
      const category = categorizeMedia(item)
      categorized[category].push({
        ...item,
        category,
        confidence: category === 'uncategorized' ? 0 : 1
      })
      
      if ((index + 1) % 100 === 0) {
        console.log(`  Processed ${index + 1}/${mediaAssets.length} assets...`)
      }
    })
    
    console.log('')
    console.log('📈 CATEGORIZATION RESULTS:')
    console.log(`- Artworks: ${categorized.artwork.length}`)
    console.log(`- Studio shots: ${categorized.studio.length}`)
    console.log(`- Portraits: ${categorized.portrait.length}`)
    console.log(`- Uncategorized: ${categorized.uncategorized.length}`)
    console.log('')
    
    // Show examples from each category
    console.log('🔍 CATEGORY EXAMPLES:')
    
    ['artwork', 'studio', 'portrait', 'uncategorized'].forEach(category => {
      if (categorized[category].length > 0) {
        console.log(`\n${category.toUpperCase()} (${categorized[category].length} items):`)
        categorized[category].slice(0, 5).forEach((item, i) => {
          console.log(`  ${i + 1}. ${item.originalFilename}`)
          if (item.title) console.log(`     Title: ${item.title}`)
          if (item.description) console.log(`     Desc: ${item.description.substring(0, 100)}...`)
        })
        if (categorized[category].length > 5) {
          console.log(`     ... and ${categorized[category].length - 5} more`)
        }
      }
    })
    
    // Check for linked vs unlinked media
    console.log('\n🔗 LINKING STATUS:')
    Object.entries(categorized).forEach(([category, items]) => {
      const linked = items.filter(item => item.isLinkedToArtwork).length
      const unlinked = items.length - linked
      if (items.length > 0) {
        console.log(`- ${category}: ${linked} linked, ${unlinked} unlinked`)
      }
    })
    
    console.log('\n💡 NEXT STEPS RECOMMENDATIONS:')
    console.log(`1. Create ${categorized.artwork.length} new artwork documents from artwork media`)
    console.log(`2. Link ${categorized.portrait.length} portrait images to creator profiles`)
    console.log(`3. Organize ${categorized.studio.length} studio images for gallery/process documentation`)
    console.log(`4. Review ${categorized.uncategorized.length} uncategorized items for manual classification`)
    
    return categorized
    
  } catch (error) {
    console.error('❌ Media categorization failed:', error.message)
    throw error
  }
}

async function createCategorizedCollections(categorizedMedia) {
  console.log('\n🗂️  CREATING CATEGORY-BASED ORGANIZATION...')
  
  try {
    // Here we could create category tags or collections
    // For now, let's just save the categorization results
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        artwork: categorizedMedia.artwork.length,
        studio: categorizedMedia.studio.length,
        portrait: categorizedMedia.portrait.length,
        uncategorized: categorizedMedia.uncategorized.length
      },
      details: categorizedMedia
    }
    
    // You could save this to a file or create Sanity documents
    console.log('✅ Categorization complete!')
    console.log('📄 Results available for artwork creation pipeline')
    
    return results
    
  } catch (error) {
    console.error('❌ Failed to create categorized collections:', error.message)
    throw error
  }
}

// Main execution
async function main() {
  try {
    const categorizedMedia = await analyzeAndCategorizeMedia()
    const results = await createCategorizedCollections(categorizedMedia)
    
    console.log('\n🎉 MEDIA CATEGORIZATION COMPLETE!')
    console.log('Ready for intelligent artwork creation from categorized media.')
    
    return results
    
  } catch (error) {
    console.error('❌ Media categorization system failed:', error.message)
    process.exit(1)
  }
}

main() 