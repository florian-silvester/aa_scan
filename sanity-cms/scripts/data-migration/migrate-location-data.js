import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01',
})

// Helper function to create safe slugs
const createSlug = (text) => {
  if (!text || typeof text !== 'string') return 'unknown'
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (match) => {
      const replacements = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }
      return replacements[match] || match
    })
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Remove duplicate hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
}

async function migrateLocationData() {
  console.log('🔄 Starting location data migration...')
  
  try {
    // Step 1: Get all existing locations with string country/city data
    console.log('📍 Fetching existing locations...')
    const locations = await client.fetch(`
      *[_type == "location" && defined(country) && defined(location) && (
        string(country) == country || string(location) == location
      )] {
        _id,
        country,
        "city": location,
        name
      }
    `)
    
    console.log(`Found ${locations.length} locations to migrate`)
    
    if (locations.length === 0) {
      console.log('✅ No locations need migration!')
      return
    }
    
    // Step 2: Extract unique countries and cities
    const countryMap = new Map()
    const cityMap = new Map()
    
    locations.forEach(loc => {
      if (typeof loc.country === 'string') {
        countryMap.set(loc.country, loc.country)
      }
      if (typeof loc.city === 'string') {
        cityMap.set(`${loc.city}-${loc.country}`, {
          city: loc.city,
          country: loc.country
        })
      }
    })
    
    console.log(`Found ${countryMap.size} unique countries`)
    console.log(`Found ${cityMap.size} unique cities`)
    
    // Step 3: Create country documents
    console.log('🌍 Creating country documents...')
    const countryTransaction = client.transaction()
    const countryIds = new Map()
    
    Array.from(countryMap.keys()).forEach(countryName => {
      const countryId = `country-${createSlug(countryName)}`
      countryIds.set(countryName, countryId)
      
      countryTransaction.createIfNotExists({
        _type: 'country',
        _id: countryId,
        name: { 
          en: countryName, 
          de: countryName // For now, use same name - can be updated later
        },
        code: countryName.substring(0, 2).toUpperCase(), // Rough approximation
        slug: { current: createSlug(countryName) }
      })
    })
    
    await countryTransaction.commit()
    console.log(`✅ Created ${countryMap.size} country documents`)
    
    // Step 4: Create city documents
    console.log('🏙️ Creating city documents...')
    const cityTransaction = client.transaction()
    const cityIds = new Map()
    
    Array.from(cityMap.values()).forEach(cityData => {
      const cityId = `city-${createSlug(cityData.city)}-${createSlug(cityData.country)}`
      const countryId = countryIds.get(cityData.country)
      cityIds.set(`${cityData.city}-${cityData.country}`, cityId)
      
      cityTransaction.createIfNotExists({
        _type: 'city',
        _id: cityId,
        name: { 
          en: cityData.city, 
          de: cityData.city // For now, use same name - can be updated later
        },
        country: { _type: 'reference', _ref: countryId },
        slug: { current: createSlug(cityData.city) }
      })
    })
    
    await cityTransaction.commit()
    console.log(`✅ Created ${cityMap.size} city documents`)
    
    // Step 5: Update location documents to use references
    console.log('🔄 Updating location documents...')
    const locationTransaction = client.transaction()
    
    locations.forEach(loc => {
      const countryId = countryIds.get(loc.country)
      const cityId = cityIds.get(`${loc.city}-${loc.country}`)
      
      locationTransaction.patch(loc._id, {
        set: {
          country: { _type: 'reference', _ref: countryId },
          city: { _type: 'reference', _ref: cityId }
        },
        unset: ['location'] // Remove old location field
      })
    })
    
    await locationTransaction.commit()
    console.log(`✅ Updated ${locations.length} location documents`)
    
    console.log('🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Refresh your Sanity Studio')
    console.log('2. Check that locations now show proper dropdowns')
    console.log('3. Update country/city names and codes as needed')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

migrateLocationData() 