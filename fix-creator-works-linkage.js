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

// Webflow API helper with rate limit handling
async function webflowRequest(endpoint, options = {}, retryCount = 0) {
  const baseUrl = 'https://api.webflow.com/v2'
  const maxRetries = 3
  
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
    const waitTime = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
    console.log(`⏳ Rate limited, waiting ${waitTime/1000}s before retry ${retryCount + 1}/${maxRetries}`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    return webflowRequest(endpoint, options, retryCount + 1)
  }
  
  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Webflow API Error Response:', errorBody)
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }

  return response.json()
}

// Get ALL items from a collection with pagination
async function getAllWebflowItems(collectionId, collectionName) {
  console.log(`📋 Getting ALL ${collectionName} with pagination...`)
  let allItems = []
  let offset = 0
  const limit = 100
  
  while (true) {
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

// MAIN FUNCTION: Populate Creator Works (using the exact logic from main sync script)
async function fixCreatorWorksLinkage() {
  console.log('🔗 FIXING Creator Works Linkage')
  console.log('='.repeat(50))
  
  try {
    // Get ALL creators from Webflow with pagination
    const allCreators = await getAllWebflowItems(WEBFLOW_COLLECTIONS.creator, 'creators')
    
    // Get ALL artworks from Webflow with pagination  
    const allArtworks = await getAllWebflowItems(WEBFLOW_COLLECTIONS.artwork, 'artworks')
    
    console.log(`\n🎨 Processing ${allCreators.length} creators and ${allArtworks.length} artworks...`)
    
    let processedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    
    // Process each creator
    for (let i = 0; i < allCreators.length; i++) {
      const creator = allCreators[i]
      const creatorName = creator.fieldData.name
      
      // Find all artworks that belong to this creator
      const creatorArtworks = allArtworks.filter(artwork => 
        artwork.fieldData.creator === creator.id
      )
      
      processedCount++
      
      if (creatorArtworks.length > 0) {
        console.log(`  🎨 ${creatorName}: ${creatorArtworks.length} artworks`)
        
        // Update creator's works field with artwork IDs
        const artworkIds = creatorArtworks.map(artwork => artwork.id)
        
        try {
          await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.creator}/items/${creator.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              fieldData: {
                works: artworkIds
              }
            })
          })
          
          updatedCount++
          console.log(`    ✅ Updated works field`)
        } catch (error) {
          console.error(`    ❌ Failed to update ${creatorName}: ${error.message}`)
        }
        
        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        console.log(`  ⚪ ${creatorName}: 0 artworks`)
        skippedCount++
      }
      
      // Progress indicator
      if (processedCount % 10 === 0) {
        console.log(`  📊 Progress: ${processedCount}/${allCreators.length} creators processed`)
      }
    }
    
    console.log(`\n✅ Creator works linkage completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - Processed: ${processedCount} creators`)
    console.log(`   - Updated: ${updatedCount} creators with works`)
    console.log(`   - Skipped: ${skippedCount} creators with no artworks`)
    
  } catch (error) {
    console.error(`❌ Error fixing creator works linkage:`, error)
    throw error
  }
}

// Run the fix
if (require.main === module) {
  console.log('🚀 Starting Creator Works Linkage Fix...')
  fixCreatorWorksLinkage().then(() => {
    console.log('✅ Fix completed!')
    process.exit(0)
  }).catch((error) => {
    console.error('❌ Fix failed:', error.message)
    process.exit(1)
  })
} 