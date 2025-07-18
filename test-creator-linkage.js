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

async function testCreatorLinkage() {
  try {
    console.log('Testing creator linkage...')
    
    // Get a few artworks to check their creator references
    const artworks = await webflowRequest('/collections/686e50ba1170cab27bfa6c49/items?limit=5')
    
    console.log(`\nFound ${artworks.items.length} artworks:`)
    
    for (const artwork of artworks.items) {
      const creatorId = artwork.fieldData.creator
      const artworkName = artwork.fieldData.name
      
      console.log(`\n📱 Artwork: "${artworkName}"`)
      console.log(`   Creator ID: ${creatorId || 'NULL'}`)
      
      if (creatorId) {
        // Get creator details
        try {
          const creator = await webflowRequest(`/collections/686e4d544cb3505ce3b1412c/items/${creatorId}`)
          console.log(`   ✅ Creator: "${creator.fieldData.name}"`)
        } catch (error) {
          console.log(`   ❌ Creator lookup failed: ${error.message}`)
        }
      } else {
        console.log(`   ⚠️  No creator linked`)
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testCreatorLinkage() 