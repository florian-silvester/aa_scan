import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const client = createClient({
  projectId: 'b8bczekj', // Same as working script
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

/**
 * DELETE ALL LOCATIONS
 * Using the exact same configuration as the working artwork deletion script
 */

async function deleteAllLocations() {
  console.log('🗑️  DELETING ALL LOCATIONS')
  
  // Get all locations
  const locations = await client.fetch('*[_type == "location"] { _id, title }')
  
  console.log(`📋 Found ${locations.length} locations to delete`)
  
  if (locations.length === 0) {
    console.log('✅ No locations to delete')
    return
  }
  
  // Delete in batches (same as working script)
  const batchSize = 50
  let deleted = 0
  
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize)
    const ids = batch.map(loc => loc._id)
    
    console.log(`🔥 Deleting batch ${Math.ceil((i + 1) / batchSize)} (${batch.length} locations)...`)
    
    try {
      const transaction = client.transaction()
      ids.forEach(id => transaction.delete(id))
      await transaction.commit()
      
      deleted += batch.length
      console.log(`✅ Deleted batch ${Math.ceil((i + 1) / batchSize)}: ${deleted}/${locations.length}`)
      
    } catch (error) {
      console.log(`❌ Error deleting batch ${Math.ceil((i + 1) / batchSize)}:`, error.message)
    }
  }
  
  console.log(`\n🎉 DELETION COMPLETE!`)
  console.log(`🗑️  Deleted: ${deleted} locations`)
}

deleteAllLocations().catch(console.error) 