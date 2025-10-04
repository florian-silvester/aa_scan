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

// Add proper pagination function (like in main sync script)
async function getAllWebflowItems(collectionId, collectionName) {
  console.log(`📋 Getting ALL ${collectionName} with pagination...`)
  let allItems = []
  let offset = 0
  const limit = 100
  
  while (true) {
    const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items?limit=${limit}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
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

async function checkAllCreators() {
  const fetch = (await import('node-fetch')).default
  
  // Get ALL creators with proper pagination
  const creators = await getAllWebflowItems('686e4d544cb3505ce3b1412c', 'creators')
  
  // Get ALL artworks with proper pagination
  const artworks = await getAllWebflowItems('686e50ba1170cab27bfa6c49', 'artworks')
  
  console.log(`\n📊 COMPLETE ANALYSIS:`)
  console.log(`📊 Total creators: ${creators.length}`)
  console.log(`📊 Total artworks: ${artworks.length}`)
  
  // Count creators with works
  const creatorsWithWorks = creators.filter(c => c.fieldData.works?.length > 0)
  console.log(`📊 Creators with works populated: ${creatorsWithWorks.length}`)
  
  // Count artworks with creators
  const artworksWithCreators = artworks.filter(a => a.fieldData.creator)
  console.log(`📊 Artworks with creators linked: ${artworksWithCreators.length}`)
  
  // Find unique creator IDs from artworks
  const creatorIdsFromArtworks = [...new Set(artworks.filter(a => a.fieldData.creator).map(a => a.fieldData.creator))]
  console.log(`📊 Unique creators referenced by artworks: ${creatorIdsFromArtworks.length}`)
  
  console.log('\n🔍 LINKAGE ANALYSIS:')
  
  if (creatorsWithWorks.length === creatorIdsFromArtworks.length) {
    console.log('✅ ALL creators have their works properly populated!')
    console.log('✅ No pagination issues detected')
  } else {
    console.log('❌ Problem identified:')
    console.log(`Only ${creatorsWithWorks.length} out of ${creatorIdsFromArtworks.length} creators have works populated!`)
    
    // Show which creators should have works but don't
    const creatorIdsWithWorks = new Set(creatorsWithWorks.map(c => c.id))
    const missingCreators = creatorIdsFromArtworks.filter(id => !creatorIdsWithWorks.has(id))
    
    console.log(`❌ ${missingCreators.length} creators are missing their works:`)
    
    for (let i = 0; i < Math.min(5, missingCreators.length); i++) {
      const creatorId = missingCreators[i]
      const creator = creators.find(c => c.id === creatorId)
      const artworkCount = artworks.filter(a => a.fieldData.creator === creatorId).length
      
      if (creator) {
        console.log(`  - ${creator.fieldData.name}: ${artworkCount} artworks (missing!)`)
      }
    }
    
    if (missingCreators.length > 5) {
      console.log(`  ... and ${missingCreators.length - 5} more`)
    }
  }
}

checkAllCreators().catch(console.error) 