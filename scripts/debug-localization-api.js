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
  
  const text = await response.text()
  
  console.log(`Response status: ${response.status}`)
  console.log(`Response body: ${text}\n`)
  
  if (!response.ok) {
    throw new Error(`Webflow API error: ${response.status} ${text}`)
  }
  
  if (response.status === 204 || !text) {
    return {}
  }
  
  return JSON.parse(text)
}

async function debugLocalization() {
  console.log('🐛 Debugging Localization API Calls\n')
  console.log('='.repeat(60))
  
  // Get Creator collection
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  const creator = collections.collections?.find(c => c.slug === 'creator')
  
  console.log(`\nFound Creator collection: ${creator.id}`)
  
  // Get biography field details
  const details = await webflowRequest(`/collections/${creator.id}`)
  const biographyField = details.fields?.find(f => f.slug === 'biography')
  
  console.log(`\nBiography field before PATCH:`)
  console.log(`  ID: ${biographyField.id}`)
  console.log(`  Slug: ${biographyField.slug}`)
  console.log(`  Type: ${biographyField.type}`)
  console.log(`  isLocalized: ${biographyField.isLocalized}`)
  
  // Try to PATCH it
  console.log(`\nAttempting PATCH to enable localization...`)
  try {
    const result = await webflowRequest(`/collections/${creator.id}/fields/${biographyField.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        isLocalized: true
      })
    })
    
    console.log(`PATCH result:`, JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(`PATCH failed:`, error.message)
  }
  
  // Refetch to see if it changed
  console.log(`\nRefetching field...`)
  const detailsAfter = await webflowRequest(`/collections/${creator.id}`)
  const biographyFieldAfter = detailsAfter.fields?.find(f => f.slug === 'biography')
  
  console.log(`\nBiography field after PATCH:`)
  console.log(`  isLocalized: ${biographyFieldAfter.isLocalized}`)
  
  if (biographyFieldAfter.isLocalized) {
    console.log(`\n✅ SUCCESS - Field is now localized!`)
  } else {
    console.log(`\n❌ FAILED - Field is still not localized`)
    console.log(`\n💡 This might mean:`)
    console.log(`   1. The API doesn't support field-level localization`)
    console.log(`   2. Localization must be enabled through the Webflow UI`)
    console.log(`   3. The field type doesn't support localization`)
  }
}

debugLocalization().catch(console.error)

