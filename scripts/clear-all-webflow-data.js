#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Load environment variables manually
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const {createClient} = require('@sanity/client')

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

// Webflow site ID
const WEBFLOW_SITE_ID = '68664367794a916bfa6d247c'

// Webflow collection IDs
const WEBFLOW_COLLECTIONS = {
  materialType: '6873884cedcec21fab8dd8dc',
  material: '687388627483ef982c64eb3f',
  finish: '6873886339818fe4cd550b03',
  medium: '686e55eace746485413c6bfb',
  category: '686e4fd904ae9f54468f85df',
  location: '686e4ff7977797cc67e99b97',
  creator: '686e4d544cb3505ce3b1412c',
  artwork: '686e50ba1170cab27bfa6c49'
}

// Enhanced Webflow API helper with aggressive rate limit handling
async function webflowRequest(endpoint, options = {}, retryCount = 0) {
  const baseUrl = 'https://api.webflow.com/v2'
  const maxRetries = 5 // Increased retries
  
  // Add base delay before any request
  if (retryCount === 0) {
    await new Promise(resolve => setTimeout(resolve, 1000)) // 1s base delay
  }
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    // Handle rate limits with exponential backoff
    if (response.status === 429 && retryCount < maxRetries) {
      const waitTime = Math.pow(2, retryCount) * 2000 // 2s, 4s, 8s, 16s, 32s
      console.log(`  ⏳ Rate limited (attempt ${retryCount + 1}/${maxRetries}), waiting ${waitTime/1000}s...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return webflowRequest(endpoint, options, retryCount + 1)
    }
    
    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Webflow API Error Response:', errorBody)
      throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
    }
    
    // Handle empty responses for DELETE requests
    if (response.status === 204 || options.method === 'DELETE') {
      return {} // Return empty object for successful deletions
    }

    const result = await response.json()
    
    // Add delay after successful request to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay after each successful request
    
    return result
    
  } catch (error) {
    if (retryCount < maxRetries && (error.message.includes('fetch') || error.message.includes('network'))) {
      const waitTime = Math.pow(2, retryCount) * 1000
      console.log(`  🔄 Network error, retrying in ${waitTime/1000}s... (${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return webflowRequest(endpoint, options, retryCount + 1)
    }
    throw error
  }
}

// Get items with pagination and rate limiting
async function getAllWebflowItems(collectionId, collectionName) {
  console.log(`📋 Getting ALL ${collectionName} with pagination...`)
  let allItems = []
  let offset = 0
  const limit = 100
  
  while (true) {
    console.log(`  📄 Fetching batch at offset ${offset}...`)
    
    const result = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
    const items = result.items || []
    
    allItems.push(...items)
    console.log(`  📄 Batch: ${items.length} items (total: ${allItems.length})`)
    
    // If we got fewer items than the limit, we've reached the end
    if (items.length < limit) {
      break
    }
    
    offset += limit
  }
  
  console.log(`✅ Found ${allItems.length} total ${collectionName}`)
  return allItems
}

// Clear creator works with conservative rate limiting
async function clearCreatorWorks() {
  console.log('\n🧹 PHASE 1: Clearing Creator Works References')
  
  try {
    const creators = await getAllWebflowItems(WEBFLOW_COLLECTIONS.creator, 'creators')
    
    const creatorsWithWorks = creators.filter(creator => 
      creator.fieldData.works && creator.fieldData.works.length > 0
    )
    
    console.log(`📊 Found ${creatorsWithWorks.length} creators with works to clear`)
    
    if (creatorsWithWorks.length === 0) {
      console.log('✅ No creator works to clear')
      return
    }
    
    // Process creators one by one with delays (very conservative)
    for (let i = 0; i < creatorsWithWorks.length; i++) {
      const creator = creatorsWithWorks[i]
      const creatorName = creator.fieldData.name || 'Unknown'
      const worksCount = creator.fieldData.works.length
      
      console.log(`  🧹 [${i+1}/${creatorsWithWorks.length}] Clearing ${worksCount} works for: ${creatorName}`)
      
      try {
        await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.creator}/items/${creator.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fieldData: {
              works: []
            }
          })
        })
        
        console.log(`    ✅ Cleared works for: ${creatorName}`)
        
        // Extra delay between creator updates
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2s delay between creators
        
      } catch (error) {
        console.warn(`    ⚠️  Failed to clear works for ${creatorName}: ${error.message}`)
        // Continue with next creator even if one fails
      }
    }
    
    console.log('✅ Creator works clearing completed')
    
  } catch (error) {
    console.error(`❌ Error clearing creator works:`, error)
    // Don't throw - continue with deletion even if clearing works fails
  }
}

// Delete items with very conservative rate limiting
async function deleteWebflowItems(collectionId, itemIds, collectionName) {
  if (itemIds.length === 0) return
  
  console.log(`  🗑️  Deleting ${itemIds.length} ${collectionName} items...`)
  
  // Process items one by one to avoid rate limits
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i]
    
    if ((i + 1) % 10 === 0) {
      console.log(`    📊 Progress: ${i + 1}/${itemIds.length} (${successCount} success, ${errorCount} errors)`)
    }
    
    try {
      await webflowRequest(`/collections/${collectionId}/items/${itemId}`, {
        method: 'DELETE'
      })
      successCount++
      
      // Small delay between deletions
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1s delay between deletions
      
    } catch (error) {
      errorCount++
      console.warn(`    ⚠️  Failed to delete item ${itemId}: ${error.message}`)
      
      // If we get a 404, the item might already be deleted - that's ok
      if (!error.message.includes('404')) {
        // For other errors, add extra delay
        await new Promise(resolve => setTimeout(resolve, 3000)) // 3s delay on error
      }
    }
  }
  
  console.log(`  ✅ Deletion complete: ${successCount} deleted, ${errorCount} errors`)
}

// Clear a single collection
async function clearWebflowCollection(collectionId, collectionName) {
  console.log(`\n🧹 Clearing ${collectionName}...`)
  
  const existingItems = await getAllWebflowItems(collectionId, collectionName)
  
  if (existingItems.length === 0) {
    console.log(`  ✅ No existing ${collectionName} to clear`)
    return
  }
  
  const itemIds = existingItems.map(item => item.id)
  await deleteWebflowItems(collectionId, itemIds, collectionName)
  console.log(`  ✅ Cleared ${existingItems.length} ${collectionName}`)
}

// Clear ID mappings in Sanity
async function clearIdMappings() {
  console.log('\n🧹 Clearing ID mappings in Sanity...')
  
  try {
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'id-mappings',
      idMappings: JSON.stringify({}),
      lastUpdated: new Date().toISOString()
    })
    
    console.log('✅ Cleared ID mappings in Sanity')
  } catch (error) {
    console.error('❌ Failed to clear ID mappings:', error.message)
  }
}

// Clear asset mappings in Sanity  
async function clearAssetMappings() {
  console.log('\n🧹 Clearing asset mappings in Sanity...')
  
  try {
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'asset-mappings',
      assetMappings: JSON.stringify({}),
      lastUpdated: new Date().toISOString()
    })
    
    console.log('✅ Cleared asset mappings in Sanity')
  } catch (error) {
    console.error('❌ Failed to clear asset mappings:', error.message)
  }
}

// Main cleanup function
async function performCompleteCleanup() {
  const startTime = Date.now()
  
  console.log('🚀 Starting Complete Webflow Data Cleanup')
  console.log('='.repeat(60))
  
  try {
    // Phase 1: Clear creator works first to break circular references
    await clearCreatorWorks()
    
    // Phase 2: Delete collections in dependency order
    console.log('\n🗑️  PHASE 2: Deleting Collections')
    
    const collections = [
      { id: WEBFLOW_COLLECTIONS.artwork, name: 'Artworks' },
      { id: WEBFLOW_COLLECTIONS.creator, name: 'Creators' },
      { id: WEBFLOW_COLLECTIONS.material, name: 'Materials' },
      { id: WEBFLOW_COLLECTIONS.medium, name: 'Mediums' },
      { id: WEBFLOW_COLLECTIONS.finish, name: 'Finishes' },
      { id: WEBFLOW_COLLECTIONS.materialType, name: 'Material Types' },
      { id: WEBFLOW_COLLECTIONS.category, name: 'Categories' },
      { id: WEBFLOW_COLLECTIONS.location, name: 'Locations' }
    ]
    
    for (const collection of collections) {
      await clearWebflowCollection(collection.id, collection.name)
    }
    
    // Phase 3: Clear Sanity mappings
    console.log('\n🧹 PHASE 3: Clearing Sanity Mappings')
    await clearIdMappings()
    await clearAssetMappings()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ Complete cleanup finished in ${duration}s`)
    console.log('🎉 All Webflow data and mappings cleared! Ready for fresh sync.')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    throw error
  }
}

// Run the cleanup
performCompleteCleanup().catch(console.error) 