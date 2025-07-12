import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2023-01-01',
})

const countries = [
  {
    _type: 'country',
    _id: 'country-germany',
    name: { en: 'Germany', de: 'Deutschland' },
    code: 'DE',
    slug: { current: 'germany' }
  },
  {
    _type: 'country',
    _id: 'country-austria',
    name: { en: 'Austria', de: 'Österreich' },
    code: 'AT',
    slug: { current: 'austria' }
  },
  {
    _type: 'country',
    _id: 'country-switzerland',
    name: { en: 'Switzerland', de: 'Schweiz' },
    code: 'CH',
    slug: { current: 'switzerland' }
  },
  {
    _type: 'country',
    _id: 'country-usa',
    name: { en: 'United States', de: 'Vereinigte Staaten' },
    code: 'US',
    slug: { current: 'united-states' }
  },
  {
    _type: 'country',
    _id: 'country-france',
    name: { en: 'France', de: 'Frankreich' },
    code: 'FR',
    slug: { current: 'france' }
  }
]

const cities = [
  // German cities
  {
    _type: 'city',
    _id: 'city-berlin',
    name: { en: 'Berlin', de: 'Berlin' },
    country: { _type: 'reference', _ref: 'country-germany' },
    slug: { current: 'berlin' }
  },
  {
    _type: 'city',
    _id: 'city-munich',
    name: { en: 'Munich', de: 'München' },
    country: { _type: 'reference', _ref: 'country-germany' },
    slug: { current: 'munich' }
  },
  {
    _type: 'city',
    _id: 'city-hamburg',
    name: { en: 'Hamburg', de: 'Hamburg' },
    country: { _type: 'reference', _ref: 'country-germany' },
    slug: { current: 'hamburg' }
  },
  {
    _type: 'city',
    _id: 'city-cologne',
    name: { en: 'Cologne', de: 'Köln' },
    country: { _type: 'reference', _ref: 'country-germany' },
    slug: { current: 'cologne' }
  },
  // Austrian cities
  {
    _type: 'city',
    _id: 'city-vienna',
    name: { en: 'Vienna', de: 'Wien' },
    country: { _type: 'reference', _ref: 'country-austria' },
    slug: { current: 'vienna' }
  },
  {
    _type: 'city',
    _id: 'city-salzburg',
    name: { en: 'Salzburg', de: 'Salzburg' },
    country: { _type: 'reference', _ref: 'country-austria' },
    slug: { current: 'salzburg' }
  },
  // Swiss cities
  {
    _type: 'city',
    _id: 'city-zurich',
    name: { en: 'Zurich', de: 'Zürich' },
    country: { _type: 'reference', _ref: 'country-switzerland' },
    slug: { current: 'zurich' }
  },
  {
    _type: 'city',
    _id: 'city-geneva',
    name: { en: 'Geneva', de: 'Genf' },
    country: { _type: 'reference', _ref: 'country-switzerland' },
    slug: { current: 'geneva' }
  },
  // US cities
  {
    _type: 'city',
    _id: 'city-new-york',
    name: { en: 'New York', de: 'New York' },
    country: { _type: 'reference', _ref: 'country-usa' },
    slug: { current: 'new-york' }
  },
  {
    _type: 'city',
    _id: 'city-los-angeles',
    name: { en: 'Los Angeles', de: 'Los Angeles' },
    country: { _type: 'reference', _ref: 'country-usa' },
    slug: { current: 'los-angeles' }
  },
  // French cities
  {
    _type: 'city',
    _id: 'city-paris',
    name: { en: 'Paris', de: 'Paris' },
    country: { _type: 'reference', _ref: 'country-france' },
    slug: { current: 'paris' }
  }
]

async function populateCountriesAndCities() {
  console.log('🌍 Populating countries and cities...')
  
  try {
    // Check if data already exists
    const existingCountries = await client.fetch('*[_type == "country"]')
    const existingCities = await client.fetch('*[_type == "city"]')
    
    if (existingCountries.length > 0 || existingCities.length > 0) {
      console.log('📍 Countries/cities already exist. Skipping...')
      console.log(`Found ${existingCountries.length} countries and ${existingCities.length} cities`)
      return
    }
    
    // Create countries first
    console.log('📝 Creating countries...')
    const countryTransaction = client.transaction()
    countries.forEach(country => countryTransaction.create(country))
    await countryTransaction.commit()
    console.log(`✅ Created ${countries.length} countries`)
    
    // Create cities
    console.log('🏙️ Creating cities...')
    const cityTransaction = client.transaction()
    cities.forEach(city => cityTransaction.create(city))
    await cityTransaction.commit()
    console.log(`✅ Created ${cities.length} cities`)
    
    console.log('🎉 Successfully populated countries and cities!')
    console.log('\nNow you can:')
    console.log('1. Go to Sanity Studio')
    console.log('2. Create locations with dropdown selections')
    console.log('3. Add new countries/cities as needed')
    
  } catch (error) {
    console.error('❌ Error populating countries and cities:', error)
  }
}

populateCountriesAndCities() 