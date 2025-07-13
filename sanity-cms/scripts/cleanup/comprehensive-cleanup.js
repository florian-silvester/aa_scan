import {createClient} from '@sanity/client'
import {nanoid} from 'nanoid'
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

console.log('🚀 COMPREHENSIVE ARTWORK CLEANUP & CREATION\n')

async function comprehensiveCleanup() {
  try {
    // Step 1: Analyze current state
    console.log('📊 ANALYZING CURRENT STATE...')
    const artworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        workTitle,
        creator,
        material,
        description,
        "imageCount": count(images)
      }
    `)
    
    const completelyEmpty = artworks.filter(a => 
      !a.creator && !a.material && !a.description
    )
    const hasContent = artworks.filter(a => 
      a.creator || a.material || a.description
    )
    
    console.log(`- Total artworks: ${artworks.length}`)
    console.log(`- Completely empty: ${completelyEmpty.length}`)  
    console.log(`- Has some content: ${hasContent.length}`)
    console.log('')
    
    // Step 2: Delete empty artworks
    if (completelyEmpty.length > 0) {
      console.log(`🗑️  DELETING ${completelyEmpty.length} EMPTY ARTWORKS...`)
      
      const batchSize = 50
      let deleted = 0
      
      for (let i = 0; i < completelyEmpty.length; i += batchSize) {
        const batch = completelyEmpty.slice(i, i + batchSize)
        const ids = batch.map(art => art._id)
        
        try {
          const transaction = client.transaction()
          ids.forEach(id => transaction.delete(id))
          await transaction.commit()
          
          deleted += batch.length
          console.log(`✅ Deleted batch ${Math.ceil((i + 1) / batchSize)}: ${deleted}/${completelyEmpty.length}`)
          
        } catch (error) {
          console.error(`❌ Error deleting batch:`, error.message)
          break
        }
      }
      
      console.log(`🎉 Cleanup complete! Deleted ${deleted} empty artworks`)
      console.log('')
    }
    
    // Step 3: Check remaining state
    const remainingArtworks = await client.fetch('count(*[_type == "artwork"])')
    console.log(`📈 Database Status:`)
    console.log(`- Remaining artworks: ${remainingArtworks}`)
    console.log(`- Ready for intelligent creation!`)
    console.log('')
    
    // Step 4: Get media assets for intelligent creation
    console.log(`🤖 ANALYZING MEDIA FOR INTELLIGENT CREATION...`)
    const mediaAssets = await client.fetch(`
      *[_type == "sanity.imageAsset" && (
        defined(title) || 
        defined(altText) || 
        defined(description)
      )][0...20]{
        _id,
        originalFilename,
        title,
        altText,
        description,
        "isLinkedToArtwork": count(*[_type == "artwork" && references(^._id)]) > 0
      }
    `)
    
    const unlinkedMedia = mediaAssets.filter(m => !m.isLinkedToArtwork)
    console.log(`- Media assets with metadata: ${mediaAssets.length}`)
    console.log(`- Unlinked (available for new artworks): ${unlinkedMedia.length}`)
    console.log('')
    
    console.log(`🎯 READY FOR COMPREHENSIVE INTELLIGENT EXTRACTION!`)
    console.log(`Next steps:`)
    console.log(`1. Extract materials from ${mediaAssets.length} media assets`)
    console.log(`2. Create ${unlinkedMedia.length} new rich artworks`)
    console.log(`3. Update ${hasContent.length} existing artworks with extracted data`)
    
  } catch (error) {
    console.error('❌ Comprehensive cleanup failed:', error.message)
    throw error
  }
}

comprehensiveCleanup() 