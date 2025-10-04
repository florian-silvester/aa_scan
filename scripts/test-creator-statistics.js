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

async function testCreatorStatistics() {
  try {
    const fetch = (await import('node-fetch')).default
    
    // Get more artworks to test
    const response = await fetch('https://api.webflow.com/v2/collections/686e50ba1170cab27bfa6c49/items?limit=50', {
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    const creatorStats = {}
    
    for (const artwork of data.items) {
      const creatorId = artwork.fieldData.creator
      const artworkName = artwork.fieldData.name
      
      if (creatorId) {
        if (!creatorStats[creatorId]) {
          creatorStats[creatorId] = { count: 0, artworks: [] }
        }
        creatorStats[creatorId].count++
        creatorStats[creatorId].artworks.push(artworkName)
      }
    }
    
    console.log('Creator linkage statistics:')
    console.log(`✅ ${Object.keys(creatorStats).length} unique creators found`)
    console.log(`✅ ${data.items.filter(a => a.fieldData.creator).length}/${data.items.length} artworks have creators linked`)
    
    // Show top creators
    const sortedCreators = Object.entries(creatorStats).sort((a,b) => b[1].count - a[1].count)
    console.log('\nTop creators by artwork count:')
    sortedCreators.slice(0, 10).forEach(([id, stats]) => {
      console.log(`  ${stats.count} artworks linked to creator ${id}`)
    })
    
    // Check for unlinked artworks
    const unlinkedArtworks = data.items.filter(a => !a.fieldData.creator)
    if (unlinkedArtworks.length > 0) {
      console.log(`\n⚠️  ${unlinkedArtworks.length} artworks without creator links:`)
      unlinkedArtworks.slice(0, 5).forEach(artwork => {
        console.log(`  - "${artwork.fieldData.name}"`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testCreatorStatistics() 