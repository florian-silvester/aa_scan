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

console.log('🔥 FORCE DELETE ALL ARTWORKS - REMOVING REFERENCES\n')

async function forceDeleteAllArtworks() {
  try {
    // Step 1: Check remaining artworks
    console.log('🔍 CHECKING REMAINING ARTWORKS...')
    const artworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        workTitle
      }
    `)
    
    console.log(`- Found ${artworks.length} remaining artworks`)
    
    if (artworks.length === 0) {
      console.log('✅ No artworks found - database already clean!')
      return
    }
    
    // Step 2: Find creators with artwork references
    console.log('\n🔗 FINDING CREATOR REFERENCES...')
    const creators = await client.fetch(`
      *[_type == "creator" && defined(artworks)]{
        _id,
        name,
        artworks
      }
    `)
    
    console.log(`- Found ${creators.length} creators with artwork references`)
    
    // Step 3: Remove all creator references to artworks
    if (creators.length > 0) {
      console.log('\n🧹 REMOVING CREATOR REFERENCES...')
      
      for (const creator of creators) {
        try {
          await client
            .patch(creator._id)
            .unset(['artworks'])
            .commit()
          
          console.log(`  ✅ Removed references from: ${creator.name}`)
        } catch (error) {
          console.log(`  ❌ Failed to update ${creator.name}: ${error.message}`)
        }
      }
    }
    
    // Step 4: Now delete all artworks
    console.log('\n🗑️ DELETING ALL ARTWORKS...')
    
    const batchSize = 50
    let deleted = 0
    
    for (let i = 0; i < artworks.length; i += batchSize) {
      const batch = artworks.slice(i, i + batchSize)
      const ids = batch.map(art => art._id)
      
      try {
        const transaction = client.transaction()
        ids.forEach(id => transaction.delete(id))
        await transaction.commit()
        
        deleted += batch.length
        console.log(`  ✅ Deleted batch ${Math.ceil((i + 1) / batchSize)}: ${deleted}/${artworks.length}`)
        
      } catch (error) {
        console.error(`  ❌ Error deleting batch ${Math.ceil((i + 1) / batchSize)}:`, error.message)
      }
    }
    
    // Step 5: Verify complete cleanup
    console.log('\n📊 VERIFYING COMPLETE CLEANUP...')
    const finalArtworkCount = await client.fetch('count(*[_type == "artwork"])')
    const finalCreatorCount = await client.fetch('count(*[_type == "creator"])')
    const finalLocationCount = await client.fetch('count(*[_type == "location"])')
    const finalMediaCount = await client.fetch('count(*[_type == "sanity.imageAsset"])')
    
    console.log('\n📈 FINAL DATABASE STATE:')
    console.log(`- Artworks: ${finalArtworkCount} (should be 0)`)
    console.log(`- Creators: ${finalCreatorCount} (preserved)`)
    console.log(`- Locations: ${finalLocationCount} (preserved)`)
    console.log(`- Media assets: ${finalMediaCount} (preserved)`)
    console.log('')
    
    if (finalArtworkCount === 0) {
      console.log('🎉 SUCCESS: COMPLETE ARTWORK WIPE ACHIEVED!')
      console.log('📄 Database is now a clean slate - ready for media categorization and rebuilding.')
    } else {
      console.log(`⚠️  WARNING: ${finalArtworkCount} artworks still remain.`)
    }
    
  } catch (error) {
    console.error('❌ Force delete all artworks failed:', error.message)
    throw error
  }
}

forceDeleteAllArtworks() 