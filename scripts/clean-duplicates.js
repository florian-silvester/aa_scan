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

// Webflow collection IDs
const WEBFLOW_COLLECTIONS = {
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
async function getAllItems(collectionId, itemType) {
  console.log(`📋 Getting all ${itemType}...`)
  let allItems = []
  let offset = 0
  const limit = 100
  
  while (true) {
    const response = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
    const items = response.items || []
    
    allItems.push(...items)
    console.log(`  📄 Batch: ${items.length} items (total: ${allItems.length})`)
    
    if (items.length < limit) break
    offset += limit
  }
  
  return allItems
}

// Delete items one by one
async function deleteItems(collectionId, itemIds, itemType) {
  console.log(`🗑️  Deleting ${itemIds.length} duplicate ${itemType}...`)
  
  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i]
    
    try {
      await webflowRequest(`/collections/${collectionId}/items/${itemId}`, {
        method: 'DELETE'
      })
      console.log(`  ✅ Deleted ${i + 1}/${itemIds.length}: ${itemId}`)
    } catch (error) {
      console.error(`  ❌ Failed to delete ${itemId}: ${error.message}`)
    }
    
    // Rate limiting - wait 1 second between deletions
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

async function cleanDuplicates() {
  console.log('🧹 Starting duplicate cleanup...')
  
  // Clean creators first
  console.log('\n📋 CLEANING CREATORS')
  const creators = await getAllItems(WEBFLOW_COLLECTIONS.creator, 'creators')
  
  // Group by name to find duplicates
  const creatorGroups = new Map()
  creators.forEach(creator => {
    const name = creator.fieldData.name
    if (!creatorGroups.has(name)) {
      creatorGroups.set(name, [])
    }
    creatorGroups.get(name).push(creator)
  })
  
  // Find duplicates
  const duplicateCreators = []
  creatorGroups.forEach((group, name) => {
    if (group.length > 1) {
      console.log(`🔍 Found ${group.length} duplicates of: ${name}`)
      // Keep the first one, mark others for deletion
      duplicateCreators.push(...group.slice(1))
    }
  })
  
  if (duplicateCreators.length > 0) {
    console.log(`❌ Found ${duplicateCreators.length} duplicate creators`)
    const duplicateIds = duplicateCreators.map(c => c.id)
    await deleteItems(WEBFLOW_COLLECTIONS.creator, duplicateIds, 'creators')
  } else {
    console.log('✅ No duplicate creators found')
  }
  
  // Clean artworks
  console.log('\n📋 CLEANING ARTWORKS')
  const artworks = await getAllItems(WEBFLOW_COLLECTIONS.artwork, 'artworks')
  
  // Group by name to find duplicates
  const artworkGroups = new Map()
  artworks.forEach(artwork => {
    const name = artwork.fieldData.name
    if (!artworkGroups.has(name)) {
      artworkGroups.set(name, [])
    }
    artworkGroups.get(name).push(artwork)
  })
  
  // Find duplicates
  const duplicateArtworks = []
  artworkGroups.forEach((group, name) => {
    if (group.length > 1) {
      console.log(`🔍 Found ${group.length} duplicates of: ${name}`)
      // Keep the first one, mark others for deletion
      duplicateArtworks.push(...group.slice(1))
    }
  })
  
  if (duplicateArtworks.length > 0) {
    console.log(`❌ Found ${duplicateArtworks.length} duplicate artworks`)
    const duplicateIds = duplicateArtworks.map(a => a.id)
    await deleteItems(WEBFLOW_COLLECTIONS.artwork, duplicateIds, 'artworks')
  } else {
    console.log('✅ No duplicate artworks found')
  }
  
  console.log('\n✅ Duplicate cleanup completed!')
}

cleanDuplicates().catch(console.error) 