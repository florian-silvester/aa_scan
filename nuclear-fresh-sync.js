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

// Import the main sync function
const syncModule = require('./api/sync-to-webflow.js')

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

// Webflow API helper
async function webflowRequest(endpoint, options = {}) {
  const fetch = (await import('node-fetch')).default
  const baseUrl = 'https://api.webflow.com/v2'
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  return response.json()
}

// Get all items with pagination
async function getAllItems(collectionId) {
  let allItems = []
  let offset = 0
  const limit = 100
  
  while (true) {
    const response = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
    const items = response.items || []
    
    allItems.push(...items)
    
    if (items.length < limit) break
    offset += limit
  }
  
  return allItems
}

// Delete all items from a collection
async function clearCollection(collectionId, collectionName) {
  console.log(`🧹 Clearing ${collectionName}...`)
  
  const items = await getAllItems(collectionId)
  console.log(`  📊 Found ${items.length} items to delete`)
  
  if (items.length === 0) {
    console.log(`  ✅ ${collectionName} already empty`)
    return
  }
  
  // Delete items one by one with rate limiting
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    try {
      await webflowRequest(`/collections/${collectionId}/items/${item.id}`, {
        method: 'DELETE'
      })
      console.log(`  🗑️  Deleted ${i + 1}/${items.length}: ${item.fieldData.name || item.id}`)
    } catch (error) {
      console.error(`  ❌ Failed to delete ${item.id}: ${error.message}`)
    }
    
    // Rate limiting - wait between deletions
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`  ✅ Cleared ${collectionName}`)
}

async function nuclearFreshSync() {
  console.log('💥 NUCLEAR OPTION: Clear Everything and Fresh Sync')
  console.log('='.repeat(60))
  
  // Step 1: Clear all collections in dependency order
  console.log('\n🧹 STEP 1: Clearing all Webflow collections...')
  
  const collections = [
    { id: WEBFLOW_COLLECTIONS.artwork, name: 'Artworks' },
    { id: WEBFLOW_COLLECTIONS.material, name: 'Materials' },
    { id: WEBFLOW_COLLECTIONS.creator, name: 'Creators' },
    { id: WEBFLOW_COLLECTIONS.finish, name: 'Finishes' },
    { id: WEBFLOW_COLLECTIONS.medium, name: 'Mediums' },
    { id: WEBFLOW_COLLECTIONS.category, name: 'Categories' },
    { id: WEBFLOW_COLLECTIONS.location, name: 'Locations' },
    { id: WEBFLOW_COLLECTIONS.materialType, name: 'Material Types' }
  ]
  
  for (const collection of collections) {
    await clearCollection(collection.id, collection.name)
  }
  
  console.log('\n✅ All collections cleared!')
  
  // Step 2: Run fresh sync
  console.log('\n🚀 STEP 2: Running fresh sync...')
  
  // Temporarily restore the clearing logic for this one-time fresh sync
  const originalSync = require('./api/sync-to-webflow.js')
  
  try {
    // Run the sync directly - it will see empty collections and create everything fresh
    await originalSync()
    
    console.log('\n🎉 SUCCESS: Fresh sync completed!')
    console.log('Expected result: 181 creators, 1358 artworks')
    
  } catch (error) {
    console.error('\n❌ Fresh sync failed:', error.message)
  }
}

nuclearFreshSync().catch(console.error) 