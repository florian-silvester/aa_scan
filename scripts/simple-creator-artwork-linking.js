#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Load environment variables
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

const WEBFLOW_COLLECTIONS = {
  creator: '686e4d544cb3505ce3b1412c',
  artwork: '686e4d544cb3505ce3b1412b'
}

async function simpleCreatorArtworkLinking() {
  const fetch = (await import('node-fetch')).default
  
  console.log('🔗 Simple Creator-Artwork Linking (NO DATA DELETION)')
  console.log('This script ONLY updates creator.works fields - nothing else!')
  
  try {
    // Get all creators
    const creatorsResponse = await fetch(`https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTIONS.creator}/items?limit=200`, {
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    const creators = await creatorsResponse.json()
    console.log(`📋 Found ${creators.items.length} creators`)
    
    // Get all artworks
    const artworksResponse = await fetch(`https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTIONS.artwork}/items?limit=200`, {
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    const artworks = await artworksResponse.json()
    console.log(`🎨 Found ${artworks.items.length} artworks`)
    
    // Link artworks to creators
    for (const creator of creators.items) {
      const creatorName = creator.fieldData.name
      
      // Find artworks that belong to this creator
      const creatorArtworks = artworks.items.filter(artwork => 
        artwork.fieldData.creator === creator.id
      )
      
      if (creatorArtworks.length > 0) {
        console.log(`  🎨 ${creatorName}: ${creatorArtworks.length} artworks`)
        
        // Update creator's works field
        const artworkIds = creatorArtworks.map(artwork => artwork.id)
        
        const updateResponse = await fetch(`https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTIONS.creator}/items/${creator.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fieldData: {
              works: artworkIds
            }
          })
        })
        
        if (updateResponse.ok) {
          console.log(`    ✅ Updated ${creatorName}`)
        } else {
          console.log(`    ❌ Failed to update ${creatorName}`)
        }
      } else {
        console.log(`  ⚪ ${creatorName}: 0 artworks`)
      }
    }
    
    console.log('✅ Creator-artwork linking complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

simpleCreatorArtworkLinking() 