const fs = require('fs')
const path = require('path')

// Load environment variables
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

let createClient
try {
  createClient = require('@sanity/client').createClient
} catch (e) {
  createClient = require(path.join(__dirname, '..', 'sanity-cms', 'node_modules', '@sanity', 'client')).createClient
  console.log('ℹ️  Using @sanity/client from sanity-cms/node_modules')
}

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2'
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Webflow API Error Response:', errorBody)
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  return response.json()
}

async function testGermanLocale() {
  console.log('🧪 Testing German Locale Setup\n')
  console.log('='.repeat(60))
  
  // 1. Check Webflow locale configuration
  console.log('\n1️⃣  Checking Webflow locale configuration...')
  try {
    const siteInfo = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}`)
    console.log('   Site name:', siteInfo.displayName)
    
    if (siteInfo.locales) {
      console.log('   ✅ Locales found:')
      console.log('      Primary:', siteInfo.locales.primary?.cmsLocaleId, `(${siteInfo.locales.primary?.tag})`)
      
      if (Array.isArray(siteInfo.locales.secondary)) {
        console.log('      Secondary locales:')
        siteInfo.locales.secondary.forEach(locale => {
          console.log(`         - ${locale.tag}: ${locale.cmsLocaleId}`)
        })
        
        const germanLocale = siteInfo.locales.secondary.find(l => l.tag === 'de' || l.tag === 'de-DE')
        if (germanLocale) {
          console.log('\n   ✅ German locale configured!')
          console.log(`      Locale ID: ${germanLocale.cmsLocaleId}`)
          console.log(`      Tag: ${germanLocale.tag}`)
        } else {
          console.log('\n   ❌ German locale NOT found!')
          console.log('      Available secondary locales:', siteInfo.locales.secondary.map(l => l.tag).join(', '))
        }
      } else {
        console.log('      ❌ No secondary locales configured')
      }
    } else {
      console.log('   ❌ No locale information found')
    }
  } catch (error) {
    console.error('   ❌ Error fetching site info:', error.message)
  }
  
  // 2. Check German data in Sanity
  console.log('\n2️⃣  Checking German data in Sanity...')
  try {
    const creators = await sanityClient.fetch(`
      *[_type == "creator"] | order(name asc) [0...5] {
        _id,
        name,
        biography,
        portrait,
        nationality,
        specialties
      }
    `)
    
    console.log(`   Found ${creators.length} sample creators`)
    
    let hasGermanData = false
    creators.forEach(creator => {
      const hasBiographyDe = creator.biography?.de && creator.biography.de.length > 0
      const hasPortraitDe = creator.portrait?.de && creator.portrait.de.length > 0
      const hasNationalityDe = creator.nationality?.de && creator.nationality.de.trim() !== ''
      const hasSpecialtiesDe = creator.specialties?.de && creator.specialties.de.length > 0
      
      if (hasBiographyDe || hasPortraitDe || hasNationalityDe || hasSpecialtiesDe) {
        hasGermanData = true
        console.log(`\n   ✅ ${creator.name} has German data:`)
        if (hasBiographyDe) console.log(`      - Biography (DE): ${creator.biography.de.length} blocks`)
        if (hasPortraitDe) console.log(`      - Portrait (DE): ${creator.portrait.de.length} blocks`)
        if (hasNationalityDe) console.log(`      - Nationality (DE): ${creator.nationality.de}`)
        if (hasSpecialtiesDe) console.log(`      - Specialties (DE): ${creator.specialties.de.join(', ')}`)
      }
    })
    
    if (!hasGermanData) {
      console.log('\n   ⚠️  No German data found in the first 5 creators!')
      console.log('      You need to add German text in Sanity CMS for:')
      console.log('      - Biography (German)')
      console.log('      - Portrait (German)')
      console.log('      - Nationality (German)')
      console.log('      - Specialties (German)')
    }
  } catch (error) {
    console.error('   ❌ Error fetching Sanity data:', error.message)
  }
  
  // 3. Check Webflow Creator collection fields
  console.log('\n3️⃣  Checking Webflow Creator collection structure...')
  try {
    const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
    const creatorCollection = collections.collections?.find(c => 
      c.slug === 'creators' || c.slug === 'creator' || c.displayName?.toLowerCase().includes('creator')
    )
    
    if (creatorCollection) {
      console.log(`   ✅ Found Creator collection: ${creatorCollection.displayName}`)
      console.log(`      Collection ID: ${creatorCollection.id}`)
      
      // Get detailed collection info
      const collectionDetails = await webflowRequest(`/collections/${creatorCollection.id}`)
      console.log('\n      Fields:')
      collectionDetails.fields?.forEach(field => {
        const localizableTypes = ['PlainText', 'RichText']
        if (localizableTypes.includes(field.type)) {
          console.log(`         - ${field.slug} (${field.type})${field.isLocalized ? ' 🌍 LOCALIZED' : ' ⚠️  NOT localized'}`)
        }
      })
    } else {
      console.log('   ❌ Creator collection not found')
    }
  } catch (error) {
    console.error('   ❌ Error fetching collection info:', error.message)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n📝 Recommendations:')
  console.log('   1. Make sure German locale is added in Webflow (Settings > Localization)')
  console.log('   2. Add German text in Sanity CMS for creators')
  console.log('   3. Make sure text fields in Webflow are marked as "Localizable"')
  console.log('   4. Run the sync: node api/sync-to-webflow.js')
  console.log('')
}

testGermanLocale().catch(console.error)

