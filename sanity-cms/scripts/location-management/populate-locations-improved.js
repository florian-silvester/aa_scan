import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_TOKEN || 'your-token-here',
  apiVersion: '2023-01-01'
})

// Enhanced location detection from title
function extractLocationInfo(title) {
  const lowerTitle = title.toLowerCase()
  
  // Country and city detection
  let country = 'Germany' // Default since most galleries are German
  let city = 'Unknown'
  
  // Specific city detection (case insensitive)
  const cityMappings = {
    // Germany
    'münchen': { country: 'Germany', city: 'Munich' },
    'munich': { country: 'Germany', city: 'Munich' },
    'berlin': { country: 'Germany', city: 'Berlin' },
    'hamburg': { country: 'Germany', city: 'Hamburg' },
    'köln': { country: 'Germany', city: 'Cologne' },
    'cologne': { country: 'Germany', city: 'Cologne' },
    'düsseldorf': { country: 'Germany', city: 'Düsseldorf' },
    'frankfurt': { country: 'Germany', city: 'Frankfurt' },
    'stuttgart': { country: 'Germany', city: 'Stuttgart' },
    'münster': { country: 'Germany', city: 'Münster' },
    'hannover': { country: 'Germany', city: 'Hannover' },
    'nürnberg': { country: 'Germany', city: 'Nuremberg' },
    'dresden': { country: 'Germany', city: 'Dresden' },
    'leipzig': { country: 'Germany', city: 'Leipzig' },
    
    // International
    'london': { country: 'United Kingdom', city: 'London' },
    'paris': { country: 'France', city: 'Paris' },
    'amsterdam': { country: 'Netherlands', city: 'Amsterdam' },
    'vienna': { country: 'Austria', city: 'Vienna' },
    'wien': { country: 'Austria', city: 'Vienna' },
    'zurich': { country: 'Switzerland', city: 'Zurich' },
    'zürich': { country: 'Switzerland', city: 'Zurich' },
    'basel': { country: 'Switzerland', city: 'Basel' },
    'antwerp': { country: 'Belgium', city: 'Antwerp' },
    'antwerpen': { country: 'Belgium', city: 'Antwerp' },
    'brussels': { country: 'Belgium', city: 'Brussels' },
    'brüssel': { country: 'Belgium', city: 'Brussels' },
    'copenhagen': { country: 'Denmark', city: 'Copenhagen' },
    'stockholm': { country: 'Sweden', city: 'Stockholm' },
    'oslo': { country: 'Norway', city: 'Oslo' },
    'helsinki': { country: 'Finland', city: 'Helsinki' },
    'milan': { country: 'Italy', city: 'Milan' },
    'milano': { country: 'Italy', city: 'Milan' },
    'rome': { country: 'Italy', city: 'Rome' },
    'roma': { country: 'Italy', city: 'Rome' },
    'florence': { country: 'Italy', city: 'Florence' },
    'firenze': { country: 'Italy', city: 'Florence' },
    'madrid': { country: 'Spain', city: 'Madrid' },
    'barcelona': { country: 'Spain', city: 'Barcelona' },
    'lisbon': { country: 'Portugal', city: 'Lisbon' },
    'lisboa': { country: 'Portugal', city: 'Lisbon' },
    'prague': { country: 'Czech Republic', city: 'Prague' },
    'praha': { country: 'Czech Republic', city: 'Prague' },
    'budapest': { country: 'Hungary', city: 'Budapest' },
    'warsaw': { country: 'Poland', city: 'Warsaw' },
    'warszawa': { country: 'Poland', city: 'Warsaw' },
    'beijing': { country: 'China', city: 'Beijing' },
    'peking': { country: 'China', city: 'Beijing' },
    'shanghai': { country: 'China', city: 'Shanghai' },
    'tokyo': { country: 'Japan', city: 'Tokyo' },
    'kyoto': { country: 'Japan', city: 'Kyoto' },
    'new york': { country: 'United States', city: 'New York' },
    'los angeles': { country: 'United States', city: 'Los Angeles' },
    'san francisco': { country: 'United States', city: 'San Francisco' },
    'chicago': { country: 'United States', city: 'Chicago' },
    'toronto': { country: 'Canada', city: 'Toronto' },
    'vancouver': { country: 'Canada', city: 'Vancouver' },
    'sydney': { country: 'Australia', city: 'Sydney' },
    'melbourne': { country: 'Australia', city: 'Melbourne' }
  }
  
  // Check for city matches
  for (const [searchTerm, location] of Object.entries(cityMappings)) {
    if (lowerTitle.includes(searchTerm)) {
      return location
    }
  }
  
  // Language-based country detection
  if (lowerTitle.includes('galerie') || lowerTitle.includes('schmuck') || 
      lowerTitle.includes('atelier') || lowerTitle.includes('objekt')) {
    // German language indicators
    return { country: 'Germany', city: 'Unknown' }
  } else if (lowerTitle.includes('goud') || lowerTitle.includes('edelsmederij') ||
             lowerTitle.includes('sieraden')) {
    // Dutch language indicators  
    return { country: 'Netherlands', city: 'Unknown' }
  } else if (lowerTitle.includes('bijoux') || lowerTitle.includes('orfèvre')) {
    // French language indicators
    return { country: 'France', city: 'Unknown' }
  } else if (lowerTitle.includes('gioielli') || lowerTitle.includes('oreficeria')) {
    // Italian language indicators
    return { country: 'Italy', city: 'Unknown' }
  } else if (lowerTitle.includes('joyería') || lowerTitle.includes('orfebrería')) {
    // Spanish language indicators
    return { country: 'Spain', city: 'Unknown' }
  }
  
  return { country, city }
}

// Enhanced type detection
function determineLocationType(title) {
  const lowerTitle = title.toLowerCase()
  
  if (lowerTitle.includes('museum') || lowerTitle.includes('museo')) {
    return 'museum'
  } else if (lowerTitle.includes('studio') || lowerTitle.includes('atelier') || 
             lowerTitle.includes('werkstatt') || lowerTitle.includes('workshop')) {
    return 'studio'
  } else {
    // Default to shop-gallery for galleries, shops, showrooms, etc.
    return 'shop-gallery'
  }
}

// Generate a reasonable address based on country/city
function generatePlaceholderAddress(country, city) {
  if (city === 'Unknown') {
    return `${country}`
  }
  return `${city}, ${country}`
}

async function updateLocationWithBetterData(wpPlace) {
  try {
    const { country, city } = extractLocationInfo(wpPlace.title)
    const locationType = determineLocationType(wpPlace.title)
    const placeholderAddress = generatePlaceholderAddress(country, city)
    
    // Find existing location by slug
    const existingLocation = await client.fetch(
      `*[_type == "location" && slug.current == $slug][0]`,
      { slug: wpPlace.slug }
    )
    
    if (!existingLocation) {
      console.log(`❌ Location not found: ${wpPlace.title}`)
      return null
    }
    
    // Update with better data
    const updatedDoc = await client
      .patch(existingLocation._id)
      .set({
        type: locationType,
        country: country,
        location: city === 'Unknown' ? null : city,
        address: placeholderAddress
      })
      .commit()
    
    console.log(`✓ Updated: ${wpPlace.title} → ${country}, ${city} (${locationType})`)
    return updatedDoc
  } catch (error) {
    console.error(`✗ Error updating ${wpPlace.title}:`, error.message)
    return null
  }
}

async function improveLocationData() {
  console.log('🔧 Improving location data with better country/city detection...')
  
  // Load the extracted places data
  const dataPath = path.join(process.cwd(), '..', 'places-extracted-2025-07-09.json')
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Places data file not found:', dataPath)
    return
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  console.log(`📊 Found ${data.total_places} places in export`)
  
  // Filter for unique entries
  const uniquePlaces = []
  const seenSlugs = new Set()
  
  for (const place of data.places) {
    if (place.slug && seenSlugs.has(place.slug)) continue
    if (!place.title || place.title.trim() === '') continue
    
    if (place.slug) seenSlugs.add(place.slug)
    uniquePlaces.push(place)
  }
  
  console.log(`📋 Updating ${uniquePlaces.length} unique locations...`)
  
  let updated = 0
  let failed = 0
  
  for (const place of uniquePlaces) {
    const result = await updateLocationWithBetterData(place)
    if (result) {
      updated++
    } else {
      failed++
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  console.log(`\n📊 Update Summary:`)
  console.log(`✓ Updated: ${updated} locations`)
  console.log(`❌ Failed: ${failed} locations`)
  console.log(`\n🎉 Locations now have proper country, city, type, and placeholder addresses!`)
  console.log(`💡 Next steps:`)
  console.log(`   - Review updated locations in Sanity Studio`)
  console.log(`   - Add specific addresses, phone numbers, websites`)
  console.log(`   - Upload location images`)
}

improveLocationData().catch(console.error) 