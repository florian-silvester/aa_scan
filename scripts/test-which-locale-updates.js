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

async function testLocaleUpdates() {
  console.log('🧪 Testing which locale gets updated without cmsLocaleId param\n')
  
  // Get locale IDs
  const siteInfo = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}`)
  const primaryLocaleId = siteInfo.locales.primary.cmsLocaleId
  const germanLocaleId = siteInfo.locales.secondary.find(l => l.tag === 'de' || l.tag === 'de-DE')?.cmsLocaleId
  
  console.log(`Primary locale ID (${siteInfo.locales.primary.tag}): ${primaryLocaleId}`)
  console.log(`German locale ID (${siteInfo.locales.secondary[0].tag}): ${germanLocaleId}`)
  
  // Get creator collection and Tora Urup
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  const creatorCollection = collections.collections.find(c => c.slug === 'creator')
  const creators = await webflowRequest(`/collections/${creatorCollection.id}/items`)
  const toraUrup = creators.items.find(c => c.fieldData.name === 'Tora Urup')
  
  console.log(`\nTora Urup item ID: ${toraUrup.id}`)
  
  // Test 1: Update WITHOUT cmsLocaleId
  console.log(`\n📝 Test 1: Updating WITHOUT cmsLocaleId parameter`)
  console.log(`   Sending nationality: "TEST-NO-LOCALE-PARAM"`)
  
  await webflowRequest(`/collections/${creatorCollection.id}/items/${toraUrup.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fieldData: {
        nationality: 'TEST-NO-LOCALE-PARAM'
      }
    })
  })
  
  await new Promise(r => setTimeout(r, 2000)) // Wait 2 seconds
  
  // Check which locale got updated
  const primaryCheck = await webflowRequest(`/collections/${creatorCollection.id}/items/${toraUrup.id}?cmsLocaleId=${primaryLocaleId}`)
  const germanCheck = await webflowRequest(`/collections/${creatorCollection.id}/items/${toraUrup.id}?cmsLocaleId=${germanLocaleId}`)
  
  console.log(`\n   Results:`)
  console.log(`   Primary locale (${siteInfo.locales.primary.tag}): ${primaryCheck.fieldData.nationality}`)
  console.log(`   German locale (${siteInfo.locales.secondary[0].tag}): ${germanCheck.fieldData.nationality}`)
  
  if (primaryCheck.fieldData.nationality === 'TEST-NO-LOCALE-PARAM') {
    console.log(`\n   ✅ Updates WITHOUT cmsLocaleId go to PRIMARY locale (${siteInfo.locales.primary.tag})`)
  } else if (germanCheck.fieldData.nationality === 'TEST-NO-LOCALE-PARAM') {
    console.log(`\n   ❌ BUG! Updates WITHOUT cmsLocaleId go to GERMAN locale!`)
    console.log(`   This explains why everything is backwards!`)
  }
}

testLocaleUpdates().catch(console.error)

