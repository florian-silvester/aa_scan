const fs = require('fs')
const path = require('path')
const { createClient } = require('@sanity/client')

// Load env similar to main sync script
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

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
  if (!response.ok) {
    console.error('❌ Webflow error response:', text)
    throw new Error(`Webflow API error: ${response.status} ${text}`)
  }

  return text ? JSON.parse(text) : {}
}

function normalize(str = '') {
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

async function resolveLocales(siteId) {
  const site = await webflowRequest(`/sites/${siteId}`)
  const locales = {}

  if (site.locales?.primary?.cmsLocaleId) {
    locales['en-US'] = site.locales.primary.cmsLocaleId
  }
  if (Array.isArray(site.locales?.secondary)) {
    const german = site.locales.secondary.find(l => l.tag === 'de-DE' || l.tag === 'de')
    if (german?.cmsLocaleId) {
      locales['de-DE'] = german.cmsLocaleId
    }
  }

  return locales
}

async function resolveCollections(siteId) {
  const collections = await webflowRequest(`/sites/${siteId}/collections`)
  const map = {}
  for (const c of collections.collections || collections) {
    const slug = normalize(c.slug || c.displayName || c.singularName)
    map[slug] = c
  }
  return map
}

async function main() {
  const siteId = process.env.WEBFLOW_SITE_ID
  if (!siteId) {
    throw new Error('WEBFLOW_SITE_ID missing in env')
  }

  console.log('🔐 Using Webflow site:', siteId)

  const locales = await resolveLocales(siteId)
  console.log('🌍 Locales:', locales)

  const collections = await resolveCollections(siteId)
  const artworkCollection = collections['artworks'] || collections['artwork'] || Object.values(collections).find(c => c.name?.toLowerCase().includes('artwork'))
  if (!artworkCollection) {
    throw new Error('Could not find artwork collection')
  }

  console.log('🗂️  Artwork collection:', artworkCollection)

  // Load ID mappings from Sanity
  const mappingDoc = await sanityClient.fetch(`*[_type == "webflowSyncSettings" && _id == "id-mappings"][0]{idMappings}`)
  const parsedMappings = JSON.parse(mappingDoc.idMappings || '{}')
  const idMappings = {
    creator: new Map(),
    category: new Map(),
    material: new Map(),
    medium: new Map(),
    finish: new Map()
  }
  Object.entries(parsedMappings).forEach(([key, value]) => {
    const [collection, sanityId] = key.split(':')
    if (idMappings[collection]) {
      idMappings[collection].set(sanityId, value)
    }
  })

  // Fetch a single artwork
  const artwork = await sanityClient.fetch(`
    *[_type == "artwork" && defined(category) && defined(creator)][0] {
      _id,
      name,
      creator->{_id, name},
      category->{_id},
      materials[]->{_id},
      medium[]->{_id},
      finishes[]->{_id}
    }
  `)

  if (!artwork) {
    throw new Error('No artwork found with category & creator set')
  }

  console.log('🎨 Using artwork:', artwork.name)

  const creatorId = artwork.creator?._id ? idMappings.creator.get(artwork.creator._id) : null
  const materialIds = artwork.materials?.map(m => idMappings.material.get(m._id)).filter(Boolean) || []
  const mediumIds = artwork.medium?.map(m => idMappings.medium.get(m._id)).filter(Boolean) || []
  const finishIds = artwork.finishes?.map(f => idMappings.finish.get(f._id)).filter(Boolean) || []

  const fieldData = {
    name: artwork.name || 'Untitled',
    ...(creatorId ? { creator: creatorId } : {}),
    ...(materialIds.length ? { materials: materialIds } : {}),
    ...(mediumIds.length ? { medium: mediumIds } : {}),
    ...(finishIds.length ? { finishes: finishIds } : {})
  }

  console.log('🧪 Field data payload:', JSON.stringify(fieldData, null, 2))

  const payload = {
    cmsLocaleIds: [locales['en-US'], locales['de-DE']].filter(Boolean),
    isDraft: true,
    fieldData
  }

  console.log('📤 Sending payload to Webflow /items/bulk')

  try {
    const result = await webflowRequest(`/collections/${artworkCollection.id}/items/bulk`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    console.log('✅ Webflow response:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})


