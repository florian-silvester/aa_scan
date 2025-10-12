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

async function enableLocalization() {
  console.log('🌍 Enabling Localization for Webflow Fields\n')
  console.log('='.repeat(60))
  
  try {
    // Get Creator collection
    const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
    const creatorCollection = collections.collections?.find(c => 
      c.slug === 'creators' || c.slug === 'creator' || c.displayName?.toLowerCase().includes('creator')
    )
    
    if (!creatorCollection) {
      console.error('❌ Creator collection not found')
      return
    }
    
    console.log(`✅ Found Creator collection: ${creatorCollection.displayName}`)
    console.log(`   Collection ID: ${creatorCollection.id}\n`)
    
    // Get detailed collection info
    const collectionDetails = await webflowRequest(`/collections/${creatorCollection.id}`)
    
    // Fields that should be localized
    const fieldsToLocalize = [
      'biography',
      'portrait-english',
      'nationality',
      'specialties'
    ]
    
    console.log('📝 Fields to enable localization:\n')
    
    for (const fieldSlug of fieldsToLocalize) {
      const field = collectionDetails.fields?.find(f => f.slug === fieldSlug)
      
      if (!field) {
        console.log(`   ⚠️  Field "${fieldSlug}" not found`)
        continue
      }
      
      if (field.isLocalized) {
        console.log(`   ✓ ${fieldSlug} - Already localized`)
        continue
      }
      
      // Enable localization for this field
      try {
        console.log(`   🔄 ${fieldSlug} - Enabling localization...`)
        
        await webflowRequest(`/collections/${creatorCollection.id}/fields/${field.id}`, {
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
    
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ Localization setup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Run the sync: node api/sync-to-webflow.js')
    console.log('   2. Check German locale in Webflow by switching locale in the CMS')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

enableLocalization().catch(console.error)

