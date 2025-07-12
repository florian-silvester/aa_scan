import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

async function analyzeDuplicateDescriptions() {
  console.log('🔍 Analyzing duplicate English/German descriptions...')
  
  try {
    // Fetch all artworks with descriptions
    const artworks = await client.fetch(`
      *[_type == "artwork" && defined(description)] {
        _id,
        name,
        creator->{name},
        description,
        workTitle
      }
    `)

    console.log(`📊 Found ${artworks.length} artworks with descriptions`)

    let duplicateCount = 0
    let emptyBothCount = 0
    let onlyEnglishCount = 0
    let onlyGermanCount = 0
    let differentCount = 0
    let totalWithDescriptions = 0

    const duplicateExamples = []
    const suspiciousPatterns = []

    for (const artwork of artworks) {
      const desc = artwork.description
      
      if (!desc || (typeof desc !== 'object')) {
        continue
      }

      totalWithDescriptions++
      
      const enDesc = desc.en ? desc.en.trim() : ''
      const deDesc = desc.de ? desc.de.trim() : ''

      // Both empty
      if (!enDesc && !deDesc) {
        emptyBothCount++
        continue
      }

      // Only one language
      if (enDesc && !deDesc) {
        onlyEnglishCount++
        continue
      }
      if (deDesc && !enDesc) {
        onlyGermanCount++
        continue
      }

      // Both have content - check for duplicates
      if (enDesc && deDesc) {
        if (enDesc === deDesc) {
          duplicateCount++
          
          // Collect examples
          if (duplicateExamples.length < 10) {
            duplicateExamples.push({
              name: artwork.name,
              creator: artwork.creator?.name,
              description: enDesc.substring(0, 100) + (enDesc.length > 100 ? '...' : '')
            })
          }

          // Check for suspicious patterns
          if (enDesc.includes('€') || enDesc.includes('cm') || enDesc.includes('mm')) {
            suspiciousPatterns.push({
              name: artwork.name,
              creator: artwork.creator?.name,
              type: 'technical_data',
              text: enDesc.substring(0, 100)
            })
          }
        } else {
          differentCount++
        }
      }
    }

    // Report results
    console.log('\n📈 ANALYSIS RESULTS:')
    console.log('==================')
    console.log(`Total artworks with description objects: ${totalWithDescriptions}`)
    console.log(`🔴 Exact duplicates (EN = DE): ${duplicateCount}`)
    console.log(`📝 Different descriptions: ${differentCount}`)
    console.log(`🇬🇧 Only English: ${onlyEnglishCount}`)
    console.log(`🇩🇪 Only German: ${onlyGermanCount}`)
    console.log(`🚫 Both empty: ${emptyBothCount}`)

    const duplicatePercentage = totalWithDescriptions > 0 ? 
      ((duplicateCount / totalWithDescriptions) * 100).toFixed(1) : 0

    console.log(`\n🎯 Duplicate rate: ${duplicatePercentage}% of descriptions`)

    if (duplicateExamples.length > 0) {
      console.log('\n📝 EXAMPLES OF DUPLICATES:')
      console.log('=========================')
      duplicateExamples.forEach((example, i) => {
        console.log(`${i + 1}. ${example.creator} - ${example.name}`)
        console.log(`   "${example.description}"`)
        console.log('')
      })
    }

    if (suspiciousPatterns.length > 0) {
      console.log('\n⚠️  SUSPICIOUS PATTERNS (technical data, not translations):')
      console.log('===========================================================')
      suspiciousPatterns.slice(0, 5).forEach((pattern, i) => {
        console.log(`${i + 1}. ${pattern.creator} - ${pattern.name}`)
        console.log(`   "${pattern.text}..."`)
        console.log('')
      })
    }

    console.log('\n💡 RECOMMENDATIONS:')
    console.log('===================')
    if (duplicateCount > 50) {
      console.log('• High duplicate rate detected - consider running cleanup script')
    }
    if (suspiciousPatterns.length > 10) {
      console.log('• Many descriptions contain technical data rather than descriptive text')
    }
    if (onlyEnglishCount > onlyGermanCount * 2) {
      console.log('• Consider translating English-only descriptions to German')
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error)
    process.exit(1)
  }
}

// Run the analysis
analyzeDuplicateDescriptions() 