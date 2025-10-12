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

async function verifyOneCollection() {
  console.log('🔍 Verifying Creator Collection Fields\n')
  
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  const creator = collections.collections?.find(c => c.slug === 'creator')
  
  if (!creator) {
    console.log('❌ Creator collection not found')
    return
  }
  
  console.log(`Collection: ${creator.displayName} (${creator.id})\n`)
  
  // Get detailed info with fresh request
  const details = await webflowRequest(`/collections/${creator.id}`)
  
  console.log('All fields:')
  details.fields?.forEach(field => {
    const localized = field.isLocalized ? '🌍 LOCALIZED' : '  NOT localized'
    console.log(`  ${field.slug.padEnd(25)} ${field.type.padEnd(15)} ${localized}`)
  })
}

verifyOneCollection().catch(console.error)

