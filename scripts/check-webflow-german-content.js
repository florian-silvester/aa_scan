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
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  return response.json()
}

async function checkGermanContent() {
  console.log('🔍 Checking German Content in Webflow\n')
  
  // Get site info
  const siteInfo = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}`)
  const germanLocaleId = siteInfo.locales.secondary.find(l => l.tag === 'de' || l.tag === 'de-DE')?.cmsLocaleId
  const primaryLocaleId = siteInfo.locales.primary.cmsLocaleId
  
  console.log(`Primary locale ID: ${primaryLocaleId}`)
  console.log(`German locale ID: ${germanLocaleId}\n`)
  
  // Get creator collection
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  const creatorCollection = collections.collections.find(c => c.slug === 'creator')
  
  // Get Tora Urup from Webflow
  const creators = await webflowRequest(`/collections/${creatorCollection.id}/items`)
  const toraUrup = creators.items.find(c => c.fieldData.name === 'Tora Urup')
  
  if (!toraUrup) {
    console.log('❌ Tora Urup not found')
    return
  }
  
  console.log('📝 Tora Urup - English (Primary) Locale:')
  const englishData = await webflowRequest(`/collections/${creatorCollection.id}/items/${toraUrup.id}?cmsLocaleId=${primaryLocaleId}`)
  console.log(`  Portrait: ${englishData.fieldData['portrait-english']?.substring(0, 100)}...`)
  console.log(`  Biography: ${englishData.fieldData['biography']?.substring(0, 100)}...`)
  
  console.log('\n📝 Tora Urup - German Locale:')
  try {
    const germanData = await webflowRequest(`/collections/${creatorCollection.id}/items/${toraUrup.id}?cmsLocaleId=${germanLocaleId}`)
    console.log(`  Portrait: ${germanData.fieldData['portrait-english']?.substring(0, 100)}...`)
    console.log(`  Biography: ${germanData.fieldData['biography']?.substring(0, 100)}...`)
    
    if (germanData.fieldData['portrait-english'] === englishData.fieldData['portrait-english']) {
      console.log('\n❌ PROBLEM: German and English content are IDENTICAL!')
      console.log('   The German locale was not properly updated.')
    } else {
      console.log('\n✅ German content is different from English!')
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`)
  }
}

checkGermanContent().catch(console.error)

