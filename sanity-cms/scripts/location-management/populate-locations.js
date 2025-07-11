import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_TOKEN || 'your-token-here', // You'll need to set this
  apiVersion: '2023-01-01'
})

// Helper function to determine location type based on title
function determineLocationType(title) {
  const lowerTitle = title.toLowerCase()
  
  if (lowerTitle.includes('museum')) {
    return 'museum'
  } else if (lowerTitle.includes('studio') || lowerTitle.includes('atelier')) {
    return 'studio'
  } else {
    // Default to shop-gallery for galleries, shops, showrooms, etc.
    return 'shop-gallery'
  }
}

// Helper function to extract potential country/city from title
function extractLocationInfo(title) {
  // Basic extraction - can be improved later
  // Many galleries have location hints in their names
  const lowerTitle = title.toLowerCase()
  
  // Simple country detection
  let country = 'Unknown'
  let city = 'Unknown'
  
  if (lowerTitle.includes('münchen') || lowerTitle.includes('munich')) {
    country = 'Germany'
    city = 'Munich'
  } else if (lowerTitle.includes('berlin')) {
    country = 'Germany'
    city = 'Berlin'
  } else if (lowerTitle.includes('münster')) {
    country = 'Germany'
    city = 'Münster'
  } else if (lowerTitle.includes('london')) {
    country = 'United Kingdom'
    city = 'London'
  }
  
  return { country, city }
}

async function createLocationFromWordpressData(wpPlace) {
  try {
    const { country, city } = extractLocationInfo(wpPlace.title)
    
    // Skip duplicates (many places appear twice in the export)
    const existingLocation = await client.fetch(
      `*[_type == "location" && slug.current == $slug][0]`,
      { slug: wpPlace.slug }
    )
    
    if (existingLocation) {
      console.log(`⚠ Location already exists: ${wpPlace.title}`)
      return existingLocation
    }
    
    const doc = {
      _type: 'location',
      name: wpPlace.title,
      slug: {
        _type: 'slug',
        current: wpPlace.slug || wpPlace.title.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/--+/g, '-')
          .replace(/^-|-$/g, '')
      },
      type: determineLocationType(wpPlace.title),
      country: country,
      location: city,
      // Add description from content if available
      ...(wpPlace.content && wpPlace.content.trim() && {
        description: [
          {
            _type: 'block',
            _key: 'description',
            style: 'normal',
            children: [
              {
                _type: 'span',
                text: wpPlace.content.trim()
              }
            ]
          }
        ]
      })
    }
    
    const result = await client.create(doc)
    console.log(`✓ Created location: ${wpPlace.title} (${result._id})`)
    return result
  } catch (error) {
    console.error(`✗ Error creating location ${wpPlace.title}:`, error.message)
    return null
  }
}

async function populateLocations() {
  console.log('Starting to populate locations from WordPress export...')
  
  // Load the extracted places data
  const dataPath = path.join(process.cwd(), '..', 'places-extracted-2025-07-09.json')
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Places data file not found:', dataPath)
    console.log('Please make sure places-extracted-2025-07-09.json exists in the project root')
    return
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  console.log(`📊 Found ${data.total_places} places in export`)
  
  // Filter for published or unique entries only
  const uniquePlaces = []
  const seenSlugs = new Set()
  
  for (const place of data.places) {
    // Skip if we've already seen this slug (removes duplicates)
    if (place.slug && seenSlugs.has(place.slug)) {
      continue
    }
    
    // Skip if no title
    if (!place.title || place.title.trim() === '') {
      continue
    }
    
    if (place.slug) {
      seenSlugs.add(place.slug)
    }
    uniquePlaces.push(place)
  }
  
  console.log(`📋 Processing ${uniquePlaces.length} unique locations...`)
  
  let created = 0
  let skipped = 0
  
  for (const place of uniquePlaces) {
    const result = await createLocationFromWordpressData(place)
    if (result) {
      created++
    } else {
      skipped++
    }
    
    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`\n📊 Import Summary:`)
  console.log(`✓ Created: ${created} locations`)
  console.log(`⚠ Skipped: ${skipped} locations`)
  console.log(`\n💡 Next steps:`)
  console.log(`   - Review imported locations in Sanity Studio`)
  console.log(`   - Add missing country/city information`)
  console.log(`   - Add contact details, opening times, etc.`)
  console.log(`   - Upload location images`)
}

populateLocations().catch(console.error) 