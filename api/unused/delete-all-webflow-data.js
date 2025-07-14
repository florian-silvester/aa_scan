const {createClient} = require('@sanity/client')

// Webflow configuration
const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN
const WEBFLOW_SITE_ID = '68664367794a916bfa6d247c'

// Collection IDs for all collections that need cleanup (from sync script)
const COLLECTIONS = {
  materialType: '6873884cedcec21fab8dd8dc',
  material: '687388627483ef982c64eb3f',
  finish: '6873886339818fe4cd550b03',
  medium: '686e55eace746485413c6bfb',
  category: '686e4fd904ae9f54468f85df',
  location: '686e4ff7977797cc67e99b97',
  creator: '686e4d544cb3505ce3b1412c',
  artwork: '686e50ba1170cab27bfa6c49'
}

// Webflow API helper
async function webflowRequest(endpoint, options = {}) {
  const url = `https://api.webflow.com/v2${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      'accept': 'application/json',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorText}`)
  }
  
  return response.json()
}

// Get ALL items from a collection with pagination
async function getAllWebflowItems(collectionId) {
  console.log(`📋 Getting all items from collection ${collectionId}...`)
  let allItems = []
  let offset = 0
  const limit = 100
  
  while (true) {
    try {
      const result = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
      const items = result.items || []
      
      allItems.push(...items)
      console.log(`    Found ${items.length} items (total: ${allItems.length})`)
      
      if (items.length < limit) {
        break
      }
      
      offset += limit
      await new Promise(resolve => setTimeout(resolve, 100)) // Rate limiting
    } catch (error) {
      console.error(`❌ Error getting items: ${error.message}`)
      break
    }
  }
  
  return allItems
}

// Delete items in small batches with retry logic
async function deleteWebflowItems(collectionId, itemIds) {
  console.log(`🗑️  Deleting ${itemIds.length} items from collection ${collectionId}...`)
  
  const batchSize = 3  // Very small batches to avoid rate limits
  let deleted = 0
  
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize)
    console.log(`  Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(itemIds.length/batchSize)} (${batch.length} items)`)
    
    for (const itemId of batch) {
      let retries = 0
      const maxRetries = 5
      
      while (retries < maxRetries) {
        try {
          await webflowRequest(`/collections/${collectionId}/items/${itemId}`, {
            method: 'DELETE'
          })
          deleted++
          console.log(`    ✅ Deleted ${itemId} (${deleted}/${itemIds.length})`)
          break
        } catch (error) {
          retries++
          if (error.message.includes('429')) {
            const delay = Math.min(1000 * Math.pow(2, retries), 10000)
            console.log(`    ⏳ Rate limited, waiting ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          } else if (retries >= maxRetries) {
            console.warn(`    ⚠️  Failed to delete ${itemId}: ${error.message}`)
            break
          }
        }
      }
    }
    
    // Delay between batches
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`✅ Deleted ${deleted}/${itemIds.length} items from collection ${collectionId}`)
  return deleted
}

// Clear a single collection
async function clearCollection(collectionName, collectionId) {
  console.log(`\n🧹 CLEARING COLLECTION: ${collectionName.toUpperCase()}`)
  console.log(`   Collection ID: ${collectionId}`)
  
  try {
    const items = await getAllWebflowItems(collectionId)
    
    if (items.length === 0) {
      console.log(`✅ Collection ${collectionName} is already empty`)
      return 0
    }
    
    console.log(`💥 Found ${items.length} items to delete`)
    const itemIds = items.map(item => item.id)
    const deleted = await deleteWebflowItems(collectionId, itemIds)
    
    console.log(`✅ Collection ${collectionName} cleared: ${deleted} items deleted`)
    return deleted
  } catch (error) {
    console.error(`❌ Failed to clear collection ${collectionName}: ${error.message}`)
    return 0
  }
}

// Main cleanup function
async function deleteAllWebflowData() {
  console.log('🚨 WEBFLOW DATA CLEANUP STARTING')
  console.log('🚨 THIS WILL DELETE ALL DATA FROM ALL COLLECTIONS')
  console.log('🚨 THIS CANNOT BE UNDONE')
  console.log('')
  
  if (!WEBFLOW_API_TOKEN) {
    console.error('❌ WEBFLOW_API_TOKEN is required')
    process.exit(1)
  }
  
  let totalDeleted = 0
  const startTime = Date.now()
  
  // Clear all collections
  for (const [collectionName, collectionId] of Object.entries(COLLECTIONS)) {
    try {
      const deleted = await clearCollection(collectionName, collectionId)
      totalDeleted += deleted
    } catch (error) {
      console.error(`❌ Error clearing ${collectionName}: ${error.message}`)
    }
  }
  
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(1)
  
  console.log('\n🎉 CLEANUP COMPLETE!')
  console.log(`📊 Total items deleted: ${totalDeleted}`)
  console.log(`⏱️  Duration: ${duration}s`)
  console.log('')
  console.log('✅ All Webflow collections are now clean')
  console.log('✅ You can now run the sync without hitting plan limits')
}

// Run the cleanup
if (require.main === module) {
  deleteAllWebflowData().catch(console.error)
}

module.exports = { deleteAllWebflowData } 