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

async function migrateFieldsFromObjectToString() {
  console.log('🔄 Starting migration of price and size fields...')
  
  try {
    // Fetch all artworks that have object-type price or size fields
    const artworks = await client.fetch(`
      *[_type == "artwork" && (
        defined(price.en) || 
        defined(price.de) || 
        defined(size.en) || 
        defined(size.de)
      )] {
        _id,
        price,
        size,
        name
      }
    `)

    console.log(`📊 Found ${artworks.length} artworks that need migration`)

    if (artworks.length === 0) {
      console.log('✅ No artworks need migration')
      return
    }

    // Process each artwork
    const mutations = []
    
    for (const artwork of artworks) {
      const patches = {}
      
      // Handle price field migration
      if (artwork.price && typeof artwork.price === 'object') {
        // Use English version first, fallback to German, then empty string
        const newPrice = artwork.price.en || artwork.price.de || ''
        patches.price = newPrice
        console.log(`📝 ${artwork.name}: price "${artwork.price.en || artwork.price.de}" → "${newPrice}"`)
      }
      
      // Handle size field migration  
      if (artwork.size && typeof artwork.size === 'object') {
        // Use English version first, fallback to German, then empty string
        const newSize = artwork.size.en || artwork.size.de || ''
        patches.size = newSize
        console.log(`📝 ${artwork.name}: size "${artwork.size.en || artwork.size.de}" → "${newSize}"`)
      }

      // Add patch mutation if there are changes
      if (Object.keys(patches).length > 0) {
        mutations.push({
          patch: {
            id: artwork._id,
            set: patches
          }
        })
      }
    }

    if (mutations.length === 0) {
      console.log('✅ No mutations needed')
      return
    }

    // Execute mutations in batches
    console.log(`🚀 Executing ${mutations.length} mutations...`)
    
    const batchSize = 10
    for (let i = 0; i < mutations.length; i += batchSize) {
      const batch = mutations.slice(i, i + batchSize)
      await client.mutate(batch)
      console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(mutations.length/batchSize)}`)
    }

    console.log('🎉 Migration completed successfully!')
    console.log(`📊 Updated ${mutations.length} artworks`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateFieldsFromObjectToString() 