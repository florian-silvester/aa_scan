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

// Webflow API helper
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
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }
  
  return await response.json()
}

// Test the populateCreatorWorks function
async function populateCreatorWorks() {
  console.log('\n🔗 Testing Creator Works Population')
  
  const WEBFLOW_COLLECTIONS = {
    creator: '686e4d544cb3505ce3b1412c',
    artwork: '686e50ba1170cab27bfa6c49'
  }
  
  try {
    // Get all creators from Webflow
    const creatorsResponse = await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.creator}/items?limit=100`)
    const creators = creatorsResponse.items
    
    console.log(`📋 Found ${creators.length} creators to process`)
    
    // Get all artworks from Webflow  
    const artworksResponse = await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.artwork}/items?limit=2000`)
    const artworks = artworksResponse.items
    
    console.log(`🖼️  Found ${artworks.length} artworks to process`)
    
    // Process each creator
    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i]
      const creatorName = creator.fieldData.name
      
      // Find all artworks that belong to this creator
      const creatorArtworks = artworks.filter(artwork => 
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
      } else {
        console.log(`  ⚪ ${creatorName}: 0 artworks`)
      }
    }
    
    console.log(`✅ Creator works populated successfully`)
    
  } catch (error) {
    console.error(`❌ Error populating creator works:`, error)
    throw error
  }
}

// Test the fix
populateCreatorWorks().catch(console.error) 