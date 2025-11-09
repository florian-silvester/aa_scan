import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.bak' })

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
})

async function analyzeWorkTitles() {
  console.log('🔍 Analyzing artwork titles...\n')
  
  const artworks = await client.fetch(`
    *[_type == "artwork"] | order(creator->name asc, workTitle.en asc) {
      _id,
      name,
      "workTitleEn": workTitle.en,
      "workTitleDe": workTitle.de,
      "creatorName": creator->name,
      "mediumTypes": medium[]->{
        "nameEn": name.en,
        "nameDe": name.de,
        slug
      },
      year
    }
  `)
  
  console.log(`📋 Analyzing ${artworks.length} artworks:\n`)
  
  let canImprove = 0
  let withoutMedium = 0
  let alreadyHasMedium = 0
  let wouldBeRedundant = 0
  
  const improvable = []
  
  for (const art of artworks) {
    const mediumEn = art.mediumTypes?.[0]?.nameEn || ''
    const mediumDe = art.mediumTypes?.[0]?.nameDe || ''
    const titleEn = art.workTitleEn || ''
    const titleDe = art.workTitleDe || ''
    
    if (!mediumEn) {
      withoutMedium++
      continue
    }
    
    // Check if title already contains medium type (start, end, or middle)
    const titleHasMediumEn = titleEn.toLowerCase().includes(mediumEn.toLowerCase())
    const titleHasMediumDe = titleDe.toLowerCase().includes(mediumDe.toLowerCase())
    
    if (titleHasMediumEn && titleHasMediumDe) {
      alreadyHasMedium++
    } else if (titleHasMediumEn || titleHasMediumDe) {
      // One has it, one doesn't - tricky case, skip to avoid issues
      wouldBeRedundant++
    } else {
      // Neither has it - can safely add
      canImprove++
      const proposedEn = titleEn ? `${mediumEn} ${titleEn}` : mediumEn
      const proposedDe = titleDe ? `${mediumDe} ${titleDe}` : mediumDe
      
      improvable.push({
        id: art._id,
        creator: art.creatorName,
        name: art.name,
        currentEn: titleEn,
        currentDe: titleDe,
        proposedEn,
        proposedDe,
        mediumEn,
        mediumDe
      })
    }
  }
  
  // Show summary first
  console.log('═══════════════════════════════════════')
  console.log(`📊 SUMMARY:`)
  console.log(`   ✅ Can be improved: ${canImprove}`)
  console.log(`   ✓ Already has medium: ${alreadyHasMedium}`)
  console.log(`   ⚠️  Redundant (medium in one lang): ${wouldBeRedundant}`)
  console.log(`   ❌ No medium type: ${withoutMedium}`)
  console.log(`   📋 Total: ${artworks.length}`)
  console.log('═══════════════════════════════════════\n')
  
  // Show improvable items
  if (canImprove > 0) {
    console.log(`\n📝 ${canImprove} ARTWORKS THAT CAN BE IMPROVED:\n`)
    improvable.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.creator} - ${item.name}`)
      console.log(`   EN: "${item.currentEn}" → "${item.proposedEn}"`)
      console.log(`   DE: "${item.currentDe}" → "${item.proposedDe}"`)
    })
  }
  
  console.log('\n═══════════════════════════════════════')
  console.log('\n💡 This is a DRY RUN - no changes made.')
  console.log('💡 Logic: Skip if title CONTAINS medium word in ANY language (avoids "Schale Kupferschale").\n')
}

analyzeWorkTitles().catch(console.error)
