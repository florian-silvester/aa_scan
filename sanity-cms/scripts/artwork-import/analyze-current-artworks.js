import {createClient} from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

async function analyzeArtworks() {
  console.log('📊 Analyzing current artwork records...\n')
  
  try {
    const artworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        workTitle,
        creator,
        material,
        description,
        "imageCount": count(images),
        "hasImages": count(images) > 0
      }
    `)
    
    console.log(`📋 CURRENT ARTWORK ANALYSIS (${artworks.length} total):`)
    console.log('')
    
    const withCreator = artworks.filter(a => a.creator).length
    const withMaterial = artworks.filter(a => a.material).length  
    const withDescription = artworks.filter(a => a.description).length
    const withImages = artworks.filter(a => a.hasImages).length
    const hasAllFields = artworks.filter(a => a.creator && a.material && a.description).length
    const isEmpty = artworks.filter(a => !a.creator && !a.material && !a.description).length
    
    console.log(`✅ With Creator: ${withCreator}/${artworks.length} (${Math.round(withCreator/artworks.length*100)}%)`)
    console.log(`✅ With Material: ${withMaterial}/${artworks.length} (${Math.round(withMaterial/artworks.length*100)}%)`)
    console.log(`✅ With Description: ${withDescription}/${artworks.length} (${Math.round(withDescription/artworks.length*100)}%)`)
    console.log(`✅ With Images: ${withImages}/${artworks.length} (${Math.round(withImages/artworks.length*100)}%)`)
    console.log(`✅ Complete (all fields): ${hasAllFields}/${artworks.length} (${Math.round(hasAllFields/artworks.length*100)}%)`)
    console.log(`❌ Completely Empty: ${isEmpty}/${artworks.length} (${Math.round(isEmpty/artworks.length*100)}%)`)
    console.log('')
    
    console.log('📋 SAMPLE ARTWORKS:')
    artworks.slice(0, 8).forEach((art, i) => {
      console.log(`${i+1}. "${art.workTitle || 'Untitled'}"`)
      console.log(`   Creator: ${art.creator ? '✅ Yes' : '❌ None'}`)
      console.log(`   Material: ${art.material || '❌ None'}`)
      console.log(`   Description: ${art.description ? '✅ Yes' : '❌ None'}`)
      console.log(`   Images: ${art.imageCount || 0} image(s)`)
      console.log('')
    })
    
    console.log('🗑️  DELETION IMPACT ANALYSIS:')
    console.log('')
    
    if (hasAllFields > 0) {
      console.log(`⚠️  WARNING: ${hasAllFields} artworks have complete data!`)
      console.log(`   These would be lost if you delete all artworks.`)
    }
    
    if (isEmpty > artworks.length * 0.5) {
      console.log(`✅ SAFE TO DELETE: ${isEmpty} artworks are completely empty`)
      console.log(`   (${Math.round(isEmpty/artworks.length*100)}% of total)`)
    }
    
    console.log('')
    console.log('🎯 RECOMMENDATIONS:')
    if (isEmpty > artworks.length * 0.8) {
      console.log('✅ DELETE ALL: Most artworks are empty - fresh start recommended')
    } else if (hasAllFields < artworks.length * 0.1) {
      console.log('⚠️  SELECTIVE DELETE: Delete empty ones, keep complete ones')
    } else {
      console.log('❌ KEEP EXISTING: Too much valuable data would be lost')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

analyzeArtworks() 