import fetch from 'node-fetch'
import { createClient } from '@sanity/client'
import 'dotenv/config'

// WordPress API Configuration
const WP_BASE_URL = 'https://artaurea.com'
const WP_API_ENDPOINT = '/wp-json/wp/v2/places' // or '/wp-json/wp/v2/orte' if using German post type

// Sanity Client Configuration
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

async function fetchWordPressPlaces(username, appPassword) {
  try {
    console.log('🔍 Fetching places from WordPress...')
    
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64')
    
    const response = await fetch(`${WP_BASE_URL}${WP_API_ENDPOINT}?per_page=100`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
    }

    const places = await response.json()
    console.log(`✅ Found ${places.length} places in WordPress`)
    
    return places
  } catch (error) {
    console.error('❌ Error fetching WordPress places:', error)
    throw error
  }
}

async function convertToSanityLocation(wpPlace) {
  // Extract WordPress custom fields and convert to Sanity format
  const location = {
    _type: 'location',
    name: wpPlace.title?.rendered || 'Untitled Location',
    slug: {
      _type: 'slug',
      current: wpPlace.slug || wpPlace.title?.rendered?.toLowerCase().replace(/\s+/g, '-')
    },
    description: wpPlace.content?.rendered ? stripHtml(wpPlace.content.rendered) : '',
    
    // Map WordPress custom fields to Sanity fields
    // You'll need to adjust these based on your actual WordPress field structure
    address: wpPlace.acf?.address || wpPlace.meta?.address || '',
    country: wpPlace.acf?.country || wpPlace.meta?.country || '',
    location: wpPlace.acf?.city || wpPlace.meta?.city || wpPlace.acf?.location || '',
    phone: wpPlace.acf?.phone || wpPlace.meta?.phone || '',
    email: wpPlace.acf?.email || wpPlace.meta?.email || '',
    website: wpPlace.acf?.website || wpPlace.meta?.website || '',
    
    // Default type
    type: 'Museum', // You can map this from WordPress categories or custom fields
    
    // WordPress metadata
    sourceInfo: {
      _type: 'object',
      wordpressId: wpPlace.id,
      originalSlug: wpPlace.slug,
      lastModified: wpPlace.modified
    }
  }

  return location
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim()
}

async function importPlacesToSanity(places) {
  console.log('📝 Converting and importing places to Sanity...')
  
  const results = []
  
  for (const wpPlace of places) {
    try {
      const sanityLocation = await convertToSanityLocation(wpPlace)
      
      // Create or update in Sanity
      const result = await sanityClient.createOrReplace(sanityLocation)
      
      console.log(`✅ Imported: ${sanityLocation.name}`)
      results.push(result)
    } catch (error) {
      console.error(`❌ Failed to import place ${wpPlace.title?.rendered}:`, error)
    }
  }
  
  console.log(`🎉 Import complete! ${results.length} locations imported.`)
  return results
}

// Main execution function
async function main() {
  const username = process.env.WP_USERNAME || 'your-wp-username'
  const appPassword = process.env.WP_APP_PASSWORD || 'your-app-password'
  
  try {
    const places = await fetchWordPressPlaces(username, appPassword)
    const imported = await importPlacesToSanity(places)
    
    console.log('📊 Import Summary:')
    console.log(`- WordPress places found: ${places.length}`)
    console.log(`- Successfully imported: ${imported.length}`)
    
  } catch (error) {
    console.error('💥 Import failed:', error)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { fetchWordPressPlaces, importPlacesToSanity } 