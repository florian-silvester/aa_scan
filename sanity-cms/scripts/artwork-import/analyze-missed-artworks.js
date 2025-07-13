import {createClient} from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

console.log('🔍 ANALYZING MISSED ARTWORK OPPORTUNITIES\n')

// Copy the same patterns from artwork-extractor.js
const ARTWORK_PATTERNS = {
  jewelry: [
    'jewelry', 'jewellery', 'schmuck', 'ring', 'necklace', 'bracelet', 
    'earring', 'pendant', 'brooch', 'chain', 'choker', 'tiara', 'crown',
    'anklet', 'armband', 'cufflink', 'charm', 'locket'
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
    '\\d+\\s*x\\s*\\d+', '\\d+\\s*mm', '\\d+\\s*cm', '\\d+\\.\\d+\\s*cm'
  ],
  
  artCategories: [
    'art', 'kunst', 'design', 'handmade', 'unique', 'collection',
    'piece', 'stück', 'work', 'creation', 'shoes', 'accessory',
    'fashion', 'wearable', 'sculpture', 'object'
  ]
}

function scoreMedia(item) {
  const text = [
    item.originalFilename || '',
    item.title || '',
    item.altText || '',
    item.description || ''
  ].join(' ').toLowerCase()
  
  let score = 0
  const matches = {
    jewelry: [],
    materials: [],
    measurements: [],
    artCategories: []
  }
  
  // Check jewelry keywords
  ARTWORK_PATTERNS.jewelry.forEach(keyword => {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) {
      score += 3
      matches.jewelry.push(keyword)
    }
  })
  
  // Check material keywords
  ARTWORK_PATTERNS.materials.forEach(material => {
    if (new RegExp(`\\b${material}\\b`, 'i').test(text)) {
      score += 2
      matches.materials.push(material)
    }
  })
  
  // Check measurement indicators
  ARTWORK_PATTERNS.measurements.forEach(measurement => {
    if (new RegExp(measurement, 'i').test(text)) {
      score += 2
      matches.measurements.push(measurement)
    }
  })
  
  // Check art category keywords
  ARTWORK_PATTERNS.artCategories.forEach(category => {
    if (new RegExp(`\\b${category}\\b`, 'i').test(text)) {
      score += 1
      matches.artCategories.push(category)
    }
  })
  
  return { score, matches, text }
}

async function analyzeMissedArtworks() {
  try {
    console.log('📊 ANALYZING ALL MEDIA FOR MISSED ARTWORKS...')
    
    // Get all media assets
    const mediaAssets = await client.fetch(`
      *[_type == "sanity.imageAsset"]{
        _id,
        originalFilename,
        title,
        altText,
        description
      } | order(originalFilename)
    `)
    
    console.log(`- Total media assets: ${mediaAssets.length}`)
    
    // Score all media
    const scoredMedia = mediaAssets.map(media => ({
      ...media,
      ...scoreMedia(media)
    }))
    
    // Current threshold is 3
    const currentArtworks = scoredMedia.filter(item => item.score >= 3)
    const missedPotential = scoredMedia.filter(item => item.score >= 1 && item.score < 3)
    const noScore = scoredMedia.filter(item => item.score === 0)
    
    console.log(`\n📈 SCORE DISTRIBUTION:`)
    console.log(`- Current artworks (score ≥ 3): ${currentArtworks.length}`)
    console.log(`- Missed potential (score 1-2): ${missedPotential.length}`)
    console.log(`- No matches (score 0): ${noScore.length}`)
    
    // Analyze score distribution in detail
    const scoreDistribution = {}
    scoredMedia.forEach(item => {
      scoreDistribution[item.score] = (scoreDistribution[item.score] || 0) + 1
    })
    
    console.log(`\n🎯 DETAILED SCORE BREAKDOWN:`)
    Object.keys(scoreDistribution).sort((a, b) => b - a).forEach(score => {
      console.log(`- Score ${score}: ${scoreDistribution[score]} items`)
    })
    
    // Show examples of missed potential (score 1-2)
    console.log(`\n🔍 MISSED POTENTIAL EXAMPLES (Score 1-2):`)
    missedPotential.slice(0, 20).forEach((item, i) => {
      console.log(`\n${i + 1}. ${item.originalFilename} (Score: ${item.score})`)
      if (item.title) console.log(`   Title: ${item.title}`)
      if (item.matches.jewelry.length) console.log(`   Jewelry: ${item.matches.jewelry.join(', ')}`)
      if (item.matches.materials.length) console.log(`   Materials: ${item.matches.materials.join(', ')}`)
      if (item.matches.measurements.length) console.log(`   Measurements: ${item.matches.measurements.join(', ')}`)
      if (item.matches.artCategories.length) console.log(`   Art: ${item.matches.artCategories.join(', ')}`)
    })
    
    // Look for patterns in filenames that might indicate artwork
    console.log(`\n📁 FILENAME PATTERN ANALYSIS:`)
    const filenamePatterns = {}
    
    noScore.forEach(item => {
      if (item.originalFilename) {
        // Extract file extensions
        const ext = item.originalFilename.split('.').pop()?.toLowerCase()
        if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          const basename = item.originalFilename.replace(/\.[^.]+$/, '').toLowerCase()
          
          // Look for potential jewelry indicators we might have missed
          if (basename.includes('ring') || basename.includes('schmuck') || 
              basename.includes('chain') || basename.includes('gold') ||
              basename.includes('silver') || basename.includes('jewelry')) {
            filenamePatterns[item.originalFilename] = true
          }
        }
      }
    })
    
    console.log(`- Zero-score files with jewelry indicators: ${Object.keys(filenamePatterns).length}`)
    if (Object.keys(filenamePatterns).length > 0) {
      console.log(`Examples:`)
      Object.keys(filenamePatterns).slice(0, 10).forEach(filename => {
        console.log(`  - ${filename}`)
      })
    }
    
    // Suggest new threshold
    const potentialWithLowerThreshold = scoredMedia.filter(item => item.score >= 1)
    console.log(`\n💡 RECOMMENDATIONS:`)
    console.log(`- Current threshold (≥3): ${currentArtworks.length} artworks`)
    console.log(`- Lowered threshold (≥1): ${potentialWithLowerThreshold.length} artworks (+${missedPotential.length} more)`)
    console.log(`- Lowered threshold (≥2): ${scoredMedia.filter(item => item.score >= 2).length} artworks`)
    
    return {
      currentArtworks: currentArtworks.length,
      missedPotential: missedPotential.length,
      recommendations: {
        threshold1: potentialWithLowerThreshold.length,
        threshold2: scoredMedia.filter(item => item.score >= 2).length
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
    throw error
  }
}

analyzeMissedArtworks() 