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
}

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
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  return response.json()
}

function extractTextFromBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return ''
  return blocks
    .map(block => {
      if (block._type === 'block' && block.children) {
        return block.children.map(child => child.text || '').join('')
      }
      return ''
    })
    .join(' ')
    .trim()
}

function mapCreatorFields(sanityItem, locale = 'en') {
  const isGerman = locale === 'de-DE' || locale === 'de'
  const localeFields = {
    'biography': extractTextFromBlocks(isGerman ? sanityItem.biography?.de : sanityItem.biography?.en),
    'portrait-english': extractTextFromBlocks(isGerman ? sanityItem.portrait?.de : sanityItem.portrait?.en),
    'nationality': isGerman ? (sanityItem.nationality?.de || '') : (sanityItem.nationality?.en || ''),
    'specialties': isGerman ? (sanityItem.specialties?.de?.join(', ') || '') : (sanityItem.specialties?.en?.join(', ') || '')
  }
  
  return localeFields
}

async function testUpdate() {
  console.log('🔍 Testing Creator Update Logic\n')
  
  // Get Tora Urup from Sanity
  const creator = await sanityClient.fetch(`
    *[_type == "creator" && name == "Tora Urup"][0] {
      _id,
      name,
      biography,
      portrait,
      nationality,
      specialties
    }
  `)
  
  console.log('📝 What mapCreatorFields() returns:\n')
  
  console.log('For ENGLISH (locale=\'en\'):')
  const englishFields = mapCreatorFields(creator, 'en')
  console.log(`  portrait-english: ${englishFields['portrait-english'].substring(0, 80)}...`)
  console.log(`  biography: ${englishFields['biography'].substring(0, 80)}...`)
  
  console.log('\nFor GERMAN (locale=\'de-DE\'):')
  const germanFields = mapCreatorFields(creator, 'de-DE')
  console.log(`  portrait-english: ${germanFields['portrait-english'].substring(0, 80)}...`)
  console.log(`  biography: ${germanFields['biography'].substring(0, 80)}...`)
  
  // Get locale IDs
  const siteInfo = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}`)
  const primaryLocaleId = siteInfo.locales.primary.cmsLocaleId
  const germanLocaleId = siteInfo.locales.secondary.find(l => l.tag === 'de' || l.tag === 'de-DE')?.cmsLocaleId
  
  console.log('\n📡 What would be sent to Webflow API:\n')
  console.log(`Primary locale (${primaryLocaleId}):`)
  console.log(`  Endpoint: /collections/{id}/items/{itemId}`)
  console.log(`  Body: ${JSON.stringify(englishFields, null, 2).substring(0, 200)}...`)
  
  console.log(`\nGerman locale (${germanLocaleId}):`)
  console.log(`  Endpoint: /collections/{id}/items/{itemId}?cmsLocaleId=${germanLocaleId}`)
  console.log(`  Body: ${JSON.stringify(germanFields, null, 2).substring(0, 200)}...`)
}

testUpdate().catch(console.error)

