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
  
  if (response.status === 204) {
    return {}
  }
  
  return response.json()
}

async function enableAllLocalization() {
  console.log('🌍 Enabling Localization for ALL Collections\n')
  console.log('='.repeat(60))
  
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  
  // Fields to localize per collection
  const localizationMap = {
    'creator': ['biography', 'portrait-english', 'nationality', 'specialties'],
    'artwork': ['work-title', 'description'],
    'medium': ['name', 'description'],  // Webflow Medium (Sanity Category)
    'material': ['name', 'description'],
    'finish': ['name', 'description'],
    'type': ['name', 'description'],  // Webflow Type (Sanity Medium)
    'material-type': ['name'],
    'location': ['name', 'description']
  }
  
  for (const [collectionSlug, fieldsToLocalize] of Object.entries(localizationMap)) {
    const collection = collections.collections?.find(c => c.slug === collectionSlug)
    
    if (!collection) {
      console.log(`⚠️  Collection "${collectionSlug}" not found, skipping...`)
      continue
    }
    
    console.log(`\n📦 ${collection.displayName} (${collection.slug})`)
    
    // Get detailed collection info
    const details = await webflowRequest(`/collections/${collection.id}`)
    
    for (const fieldSlug of fieldsToLocalize) {
      const field = details.fields?.find(f => f.slug === fieldSlug)
      
      if (!field) {
        console.log(`   ⚠️  Field "${fieldSlug}" not found`)
        continue
      }
      
      if (field.isLocalized) {
        console.log(`   ✓ ${fieldSlug} - Already localized`)
        continue
      }
      
      // Enable localization
      try {
        console.log(`   🔄 ${fieldSlug} - Enabling localization...`)
        
        await webflowRequest(`/collections/${collection.id}/fields/${field.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            isLocalized: true
          })
        })
        
        console.log(`   ✅ ${fieldSlug} - Localization enabled!`)
      } catch (error) {
        console.error(`   ❌ ${fieldSlug} - Failed: ${error.message}`)
      }
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Localization enabled for all collections!')
  console.log('\n📝 Next step:')
  console.log('   Run full sync: node api/sync-to-webflow.js')
  console.log('')
}

enableAllLocalization().catch(console.error)

