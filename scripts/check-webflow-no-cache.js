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

async function webflowRequest(endpoint) {
  const baseUrl = 'https://api.webflow.com/v2'
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    cache: 'no-store'
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  return response.json()
}

async function checkWebflowFresh() {
  console.log('🔍 Checking Webflow (no cache, fresh data)\n')
  console.log(`Timestamp: ${new Date().toISOString()}\n`)
  
  // Get locale IDs
  const siteInfo = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}`)
  const primaryLocaleId = siteInfo.locales.primary.cmsLocaleId
  const germanLocaleId = siteInfo.locales.secondary.find(l => l.tag === 'de' || l.tag === 'de-DE')?.cmsLocaleId
  
  // Get creator collection and Tora Urup
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  const creatorCollection = collections.collections.find(c => c.slug === 'creator')
  const creators = await webflowRequest(`/collections/${creatorCollection.id}/items`)
  const toraUrup = creators.items.find(c => c.fieldData.name === 'Tora Urup')
  
  console.log('📝 Tora Urup - PRIMARY (English) Locale:')
  const englishData = await webflowRequest(`/collections/${creatorCollection.id}/items/${toraUrup.id}?cmsLocaleId=${primaryLocaleId}`)
  console.log(`  Portrait starts with: ${englishData.fieldData['portrait-english']?.substring(0, 80)}...`)
  
  console.log('\n📝 Tora Urup - GERMAN Locale:')
  const germanData = await webflowRequest(`/collections/${creatorCollection.id}/items/${toraUrup.id}?cmsLocaleId=${germanLocaleId}`)
  console.log(`  Portrait starts with: ${germanData.fieldData['portrait-english']?.substring(0, 80)}...`)
  
  console.log('\n🔍 Analysis:')
  if (englishData.fieldData['portrait-english']?.startsWith('Tora Urup')) {
    console.log('  ✅ English locale has ENGLISH text')
  } else if (englishData.fieldData['portrait-english']?.startsWith('Die Glasobjekte')) {
    console.log('  ❌ English locale has GERMAN text (WRONG!)')
  }
  
  if (germanData.fieldData['portrait-english']?.startsWith('Die Glasobjekte')) {
    console.log('  ✅ German locale has GERMAN text')
  } else if (germanData.fieldData['portrait-english']?.startsWith('Tora Urup')) {
    console.log('  ❌ German locale has ENGLISH text (WRONG!)')
  }
}

checkWebflowFresh().catch(console.error)

