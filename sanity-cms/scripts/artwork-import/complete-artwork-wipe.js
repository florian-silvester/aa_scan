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

console.log('🔥 COMPLETE ARTWORK WIPE - OPTION A\n')

async function completeArtworkWipe() {
  try {
    // Step 1: Get count of all artworks
    console.log('📊 ANALYZING ALL ARTWORKS...')
    const allArtworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        workTitle,
        creator,
        material,
        description
      }
    `)
    
    console.log(`- Total artworks to delete: ${allArtworks.length}`)
    console.log('')
    
    // Confirm action (in production, you might want interactive confirmation)
    if (allArtworks.length === 0) {
      console.log('✅ No artworks found - database already clean!')
      return
    }
    
    console.log('⚠️  WARNING: This will delete ALL artworks permanently!')
    console.log('   - Creators will be preserved')
    console.log('   - Locations will be preserved') 
    console.log('   - Media assets will be preserved')
    console.log('')
    
    // Step 2: Delete ALL artworks in batches
    console.log(`🗑️  DELETING ALL ${allArtworks.length} ARTWORKS...`)
    
    const batchSize = 50
    let deleted = 0
    
    for (let i = 0; i < allArtworks.length; i += batchSize) {
      const batch = allArtworks.slice(i, i + batchSize)
      const ids = batch.map(art => art._id)
      
      try {
        const transaction = client.transaction()
        ids.forEach(id => transaction.delete(id))
        await transaction.commit()
        
        deleted += batch.length
        console.log(`✅ Deleted batch ${Math.ceil((i + 1) / batchSize)}: ${deleted}/${allArtworks.length}`)
        
      } catch (error) {
        console.error(`❌ Error deleting batch ${Math.ceil((i + 1) / batchSize)}:`, error.message)
        console.log('   Continuing with next batch...')
      }
    }
    
    console.log('')
    console.log(`🎉 COMPLETE WIPE SUCCESSFUL!`)
    console.log(`- Deleted ${deleted} artworks`)
    console.log('')
    
    // Step 3: Verify clean state
    const remainingArtworks = await client.fetch('count(*[_type == "artwork"])')
    const creators = await client.fetch('count(*[_type == "creator"])')
    const locations = await client.fetch('count(*[_type == "location"])')
    const mediaAssets = await client.fetch('count(*[_type == "sanity.imageAsset"])')
    
    console.log(`📈 FINAL DATABASE STATE:`)
    console.log(`- Artworks: ${remainingArtworks} (should be 0)`)
    console.log(`- Creators: ${creators} (preserved)`)
    console.log(`- Locations: ${locations} (preserved)`)
    console.log(`- Media assets: ${mediaAssets} (preserved)`)
    console.log('')
    
    if (remainingArtworks === 0) {
      console.log(`✅ SUCCESS: Clean slate achieved!`)
      console.log(`Ready for media categorization and intelligent artwork creation.`)
    } else {
      console.log(`⚠️  WARNING: ${remainingArtworks} artworks still remain. Some may have been protected by references.`)
    }
    
  } catch (error) {
    console.error('❌ Complete artwork wipe failed:', error.message)
    throw error
  }
}

completeArtworkWipe() 