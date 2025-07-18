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

async function checkDuplicates() {
  const fetch = (await import('node-fetch')).default
  
  console.log('🔍 Checking for duplicate artworks...')
  
  // Get all artworks with pagination
  let allArtworks = []
  let offset = 0
  const limit = 100
  
  while (true) {
    const response = await fetch(`https://api.webflow.com/v2/collections/686e50ba1170cab27bfa6c49/items?limit=${limit}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    const items = result.items || []
    
    allArtworks.push(...items)
    console.log(`  📄 Batch: ${items.length} items (total: ${allArtworks.length})`)
    
    if (items.length < limit) break
    offset += limit
  }
  
  console.log(`\n📊 Total artworks: ${allArtworks.length}`)
  
  // Check for duplicates by name and slug
  const nameMap = new Map()
  const duplicates = []
  
  allArtworks.forEach(artwork => {
    const name = artwork.fieldData.name || 'Untitled'
    const slug = artwork.fieldData.slug || 'untitled'
    const key = `${name}-${slug}`
    
    if (nameMap.has(key)) {
      duplicates.push({
        name,
        slug,
        existing: nameMap.get(key),
        duplicate: artwork.id
      })
    } else {
      nameMap.set(key, artwork.id)
    }
  })
  
  console.log(`\n🔍 DUPLICATE ANALYSIS:`)
  console.log(`❌ Found ${duplicates.length} potential duplicates:`)
  
  if (duplicates.length > 0) {
    duplicates.slice(0, 10).forEach(dup => {
      console.log(`  - "${dup.name}" (slug: ${dup.slug})`)
    })
    
    if (duplicates.length > 10) {
      console.log(`  ... and ${duplicates.length - 10} more`)
    }
  } else {
    console.log(`✅ No duplicates found!`)
  }
  
  // Also check for different patterns
  console.log(`\n🔍 CHECKING DIFFERENT PATTERNS:`)
  
  // Check by Sanity ID if available
  const sanityIdMap = new Map()
  let sanityDuplicates = 0
  
  allArtworks.forEach(artwork => {
    // Check if there's a pattern in the slug that might indicate Sanity ID
    const slug = artwork.fieldData.slug
    if (slug && slug.length > 20) { // Sanity IDs are long
      if (sanityIdMap.has(slug)) {
        sanityDuplicates++
      } else {
        sanityIdMap.set(slug, artwork.id)
      }
    }
  })
  
  console.log(`📊 Unique slugs (potential Sanity IDs): ${sanityIdMap.size}`)
  console.log(`📊 Sanity-based duplicates: ${sanityDuplicates}`)
  
  // Sample a few artworks to see their structure
  console.log(`\n📋 SAMPLE ARTWORKS:`)
  allArtworks.slice(0, 3).forEach((artwork, i) => {
    console.log(`${i + 1}. "${artwork.fieldData.name}" (ID: ${artwork.id})`)
    console.log(`   Slug: ${artwork.fieldData.slug}`)
    console.log(`   Creator: ${artwork.fieldData.creator || 'None'}`)
  })
}

checkDuplicates().catch(console.error) 