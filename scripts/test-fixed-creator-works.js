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

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2'
  const fetch = (await import('node-fetch')).default
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorText}`)
  }
  
  return await response.json()
}

async function populateCreatorWorksFixed() {
  console.log('\n🔗 PHASE 4: Populating Creator Works (Reverse Linkage) - FIXED VERSION')
  
  const WEBFLOW_COLLECTIONS = {
    creator: '686e4d544cb3505ce3b1412c',
    artwork: '686e50ba1170cab27bfa6c49'
  }
  
  try {
    // Get ALL creators from Webflow with pagination
    let allCreators = []
    let creatorsOffset = 0
    let hasMoreCreators = true
    
    while (hasMoreCreators) {
      const creatorsResponse = await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.creator}/items?limit=100&offset=${creatorsOffset}`)
      allCreators = allCreators.concat(creatorsResponse.items)
      
      hasMoreCreators = creatorsResponse.items.length === 100
      creatorsOffset += 100
    }
    
    console.log(`📋 Found ${allCreators.length} creators to process`)
    
    // Get ALL artworks from Webflow with pagination  
    let allArtworks = []
    let artworksOffset = 0
    let hasMoreArtworks = true
    
    while (hasMoreArtworks) {
      const artworksResponse = await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.artwork}/items?limit=100&offset=${artworksOffset}`)
      allArtworks = allArtworks.concat(artworksResponse.items)
      
      hasMoreArtworks = artworksResponse.items.length === 100
      artworksOffset += 100
    }
    
    console.log(`🖼️  Found ${allArtworks.length} artworks to process`)
    
    let creatorsWithArtworks = 0
    
    // Process each creator
    for (let i = 0; i < allCreators.length; i++) {
      const creator = allCreators[i]
      const creatorName = creator.fieldData.name
      
      // Find all artworks that belong to this creator
      const creatorArtworks = allArtworks.filter(artwork => 
        artwork.fieldData.creator === creator.id
      )
      
      if (creatorArtworks.length > 0) {
        console.log(`  🎨 ${creatorName}: ${creatorArtworks.length} artworks`)
        
        // Update creator's works field with artwork IDs
        const artworkIds = creatorArtworks.map(artwork => artwork.id)
        
        await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.creator}/items/${creator.id}`, {
          method: 'PATCH',
          body: {
            fieldData: {
              works: artworkIds
            }
          }
        })
        
        creatorsWithArtworks++
      } else {
        console.log(`  ⚪ ${creatorName}: 0 artworks`)
      }
    }
    
    console.log(`✅ Creator works populated successfully`)
    console.log(`📊 ${creatorsWithArtworks} creators now have artworks linked`)
    
  } catch (error) {
    console.error(`❌ Error populating creator works:`, error)
    throw error
  }
}

populateCreatorWorksFixed().catch(console.error) 