import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'

// Load environment variables
dotenv.config()

const client = createClient({
  projectId: 'b8bczekj', // Same as working script
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

/**
 * IMPORT PROPER GALLERIES DATA
 * 
 * Import the correct gallery data from galleries-clean-comprehensive-fixed.json
 * This file has proper addresses, cities, countries, etc.
 * 
 * FIXED: Now maps to correct schema fields
 */

async function importProperGalleries() {
  console.log('🏛️  IMPORTING PROPER GALLERIES DATA (FIXED MAPPING)\n')
  
  // Read the proper galleries file
  const filename = '../galleries-clean-comprehensive-fixed.json'
  
  if (!fs.existsSync(filename)) {
    console.log('❌ Galleries file not found:', filename)
    return
  }
  
  const galleries = JSON.parse(fs.readFileSync(filename, 'utf8'))
  
  console.log(`📋 Found ${galleries.length} galleries to import`)
  
  let imported = 0
  let errors = 0
  
  for (const gallery of galleries) {
    try {
      const locationDoc = {
        _type: 'location',
        // FIXED: Use correct field names from schema
        name: {
          en: gallery.name || 'Unknown Gallery',
          de: gallery.name || 'Unknown Gallery'
        },
        location: gallery.city || 'Unknown City',
        country: gallery.country || 'Unknown Country',
        address: gallery.address || '',
        phone: gallery.phone || '',
        email: gallery.email || '',
        website: gallery.website || '',
        type: 'shop-gallery', // Default type
        // FIXED: Map opening times to correct structure
        times: {
          en: gallery.times || '',
          de: gallery.times || ''
        },
        slug: {
          current: gallery.name ? gallery.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') : 'unknown-gallery'
        }
      }
      
      const result = await client.create(locationDoc)
      
      console.log(`✅ [${imported + 1}/${galleries.length}] ${gallery.name}`)
      imported++
      
    } catch (error) {
      console.log(`❌ [${imported + 1}/${galleries.length}] ${gallery.name}: ${error.message}`)
      errors++
    }
  }
  
  console.log(`\n📊 IMPORT COMPLETE:`)
  console.log(`   ✅ Imported: ${imported}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`   📍 Total: ${imported + errors}`)
}

importProperGalleries().catch(console.error) 