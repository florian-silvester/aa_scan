import {createClient} from '@sanity/client'

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

// Webflow collection IDs
const WEBFLOW_COLLECTIONS = {
  materialType: '6873884cedcec21fab8dd8dc',
  material: '687388627483ef982c64eb3f',
  finish: '6873886339818fe4cd550b03',
  medium: '686e55eace746485413c6bfb',
  category: '686e4fd904ae9f54468f85df',
  country: '686e4ff7977797cc67e99b97', // Using location ID temporarily - you'll need the real country collection ID
  city: '686e4ff7977797cc67e99b97',    // Using location ID temporarily - you'll need the real city collection ID
  location: '686e4ff7977797cc67e99b97',
  creator: '686e4d544cb3505ce3b1412c',
  artwork: '686e50ba1170cab27bfa6c49'
}

// Store mapping of Sanity IDs to Webflow IDs (in production, use database)
const idMappings = {
  materialType: new Map(),
  material: new Map(),
  finish: new Map(),
  medium: new Map(),
  category: new Map(),
  country: new Map(),
  city: new Map(),
  location: new Map(),
  creator: new Map()
}

// Helper functions
function mapBilingualName(sanityItem) {
  return {
    'name-english': sanityItem.name?.en || '',
    'name-german': sanityItem.name?.de || '',
    name: sanityItem.name?.en || sanityItem.name?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.name?.en || sanityItem.name?.de)
  }
}

function mapBilingualTitle(sanityItem) {
  return {
    'title-english': sanityItem.title?.en || '',
    'title-german': sanityItem.title?.de || '',
    name: sanityItem.title?.en || sanityItem.title?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.title?.en || sanityItem.title?.de)
  }
}

function mapBilingualDescription(sanityItem) {
  return {
    'description-english': sanityItem.description?.en || '',
    'description-german': sanityItem.description?.de || ''
  }
}

// Convert Sanity rich text to plain text for Webflow
function richTextToPlainText(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) return ''
  
  return richTextArray
    .map(block => {
      if (block._type === 'block' && block.children) {
        return block.children
          .map(child => child.text || '')
          .join('')
      }
      return ''
    })
    .join('\n\n')
}

function mapBilingualRichText(sanityItem, fieldName) {
  return {
    [`${fieldName}-english`]: richTextToPlainText(sanityItem[fieldName]?.en),
    [`${fieldName}-german`]: richTextToPlainText(sanityItem[fieldName]?.de)
  }
}

// Get Sanity image URL for Webflow
function getSanityImageUrl(imageRef) {
  if (!imageRef || !imageRef.asset) return null
  
  const projectId = 'b8bczekj'
  const dataset = 'production'
  
  // Extract image ID from reference
  const imageId = imageRef.asset._ref || imageRef.asset._id
  if (!imageId) return null
  
  // Convert to CDN URL
  const [, id, dimensions, format] = imageId.match(/image-([a-f0-9]+)-(\d+x\d+)-(\w+)/) || []
  if (!id) return null
  
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`
}

function generateSlug(text) {
  if (!text) return 'untitled'
  return text.toLowerCase()
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Webflow API helper
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
    const error = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${error}`)
  }
  
  return response.json()
}

// Create items in Webflow
async function createWebflowItems(collectionId, items) {
  const batchSize = 50
  const results = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    console.log(`Creating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)} (${batch.length} items)`)
    
    try {
      const result = await webflowRequest(`/collections/${collectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items: batch })
      })
      results.push(...result.items)
    } catch (error) {
      console.error(`Batch failed:`, error.message)
      throw error
    }
  }
  
  return results
}

// Delete items from Webflow
async function deleteWebflowItems(collectionId, itemIds) {
  const results = []
  
  for (const itemId of itemIds) {
    try {
      await webflowRequest(`/collections/${collectionId}/items/${itemId}`, {
        method: 'DELETE'
      })
      results.push({ itemId, status: 'deleted' })
    } catch (error) {
      console.error(`Failed to delete ${itemId}:`, error.message)
      results.push({ itemId, status: 'error', error: error.message })
    }
  }
  
  return results
}

// Get current Webflow items for comparison
async function getWebflowItems(collectionId) {
  try {
    const result = await webflowRequest(`/collections/${collectionId}/items?limit=100`)
    return result.items || []
  } catch (error) {
    console.error(`Failed to get Webflow items:`, error.message)
    return []
  }
}

// PHASE 1: Sync Material Types
async function syncMaterialTypes() {
  console.log('📋 Syncing Material Types...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "materialType"] | order(sortOrder asc, name.en asc) {
      _id,
      name,
      description,
      sortOrder,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'sort-order': item.sortOrder || 0
    }
  }))
  
  // Create in Webflow
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.materialType, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.materialType.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Material Types: ${results.length} created`)
  return results.length
}

// PHASE 2: Sync Finishes
async function syncFinishes() {
  console.log('🎨 Syncing Finishes...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "finish"] | order(name.en asc) {
      _id,
      name,
      description,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item)
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.finish, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.finish.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Finishes: ${results.length} created`)
  return results.length
}

// PHASE 3: Sync Categories
async function syncCategories() {
  console.log('📂 Syncing Categories...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "category"] | order(title.en asc) {
      _id,
      title,
      description,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualTitle(item),
      ...mapBilingualDescription(item)
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.category, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.category.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Categories: ${results.length} created`)
  return results.length
}

// PHASE 4: Sync Countries
async function syncCountries() {
  console.log('🌍 Syncing Countries...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "country"] | order(name.en asc) {
      _id,
      name,
      code,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      'country-code': item.code || ''
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.country, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.country.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Countries: ${results.length} created`)
  return results.length
}

// PHASE 5: Sync Cities (with Country references)
async function syncCities() {
  console.log('🏙️ Syncing Cities...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "city"] | order(name.en asc) {
      _id,
      name,
      country->{_id, name},
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      'country': item.country?._id ? idMappings.country.get(item.country._id) : null
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.city, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.city.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Cities: ${results.length} created`)
  return results.length
}

// PHASE 6: Sync Materials (with Material Type references)
async function syncMaterials() {
  console.log('🪨 Syncing Materials...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "material"] | order(name.en asc) {
      _id,
      name,
      description,
      materialType->{_id, name},
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'material-type': item.materialType?._id ? idMappings.materialType.get(item.materialType._id) : null
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.material, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.material.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Materials: ${results.length} created`)
  return results.length
}

// PHASE 7: Sync other collections
async function syncMediums() {
  console.log('🎭 Syncing Mediums...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "medium"] | order(name.en asc) {
      _id,
      name,
      description,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item)
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.medium, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.medium.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Mediums: ${results.length} created`)
  return results.length
}

// PHASE 8: Sync Locations (with Country and City references)
async function syncLocations() {
  console.log('📍 Syncing Locations...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "location"] | order(name.en asc) {
      _id,
      name,
      description,
      type,
      country->{_id, name},
      city->{_id, name},
      address,
      times,
      phone,
      email,
      website,
      image,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      ...mapBilingualRichText(item, 'description'),
      'location-type': item.type || '',
      'country': item.country?._id ? idMappings.country.get(item.country._id) : null,
      'city': item.city?._id ? idMappings.city.get(item.city._id) : null,
      'address': item.address || '',
      'opening-times-english': item.times?.en || '',
      'opening-times-german': item.times?.de || '',
      'phone': item.phone || '',
      'email': item.email || '',
      'website': item.website || '',
      'image': getSanityImageUrl(item.image)
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.location, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.location.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Locations: ${results.length} created`)
  return results.length
}

// PHASE 9: Sync Creators (with Category and Location references)
async function syncCreators() {
  console.log('👨‍🎨 Syncing Creators...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "creator"] | order(name asc) {
      _id,
      name,
      image,
      biography,
      portrait,
      website,
      email,
      nationality,
      birthYear,
      specialties,
      category->{_id, title},
      tier,
      associatedLocations[]->{_id, name},
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      'name': item.name || 'Untitled Creator',
      'biography-english': richTextToPlainText(item.biography?.en),
      'biography-german': richTextToPlainText(item.biography?.de),
      'portrait-english': richTextToPlainText(item.portrait?.en),
      'portrait-german': richTextToPlainText(item.portrait?.de),
      'website': item.website || '',
      'email': item.email || '',
      'nationality-english': item.nationality?.en || '',
      'nationality-german': item.nationality?.de || '',
      'birth-year': item.birthYear || null,
      'specialties-english': Array.isArray(item.specialties?.en) ? item.specialties.en.join(', ') : '',
      'specialties-german': Array.isArray(item.specialties?.de) ? item.specialties.de.join(', ') : '',
      'category': item.category?._id ? idMappings.category.get(item.category._id) : null,
      'tier': item.tier || 'free',
      'profile-image': getSanityImageUrl(item.image),
      slug: item.slug?.current || generateSlug(item.name)
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.creator, webflowItems)
  
  // Store mappings
  results.forEach((webflowItem, index) => {
    const sanityItem = sanityData[index]
    idMappings.creator.set(sanityItem._id, webflowItem.id)
  })
  
  console.log(`✅ Creators: ${results.length} created`)
  return results.length
}

// PHASE 10: Sync Artworks (with all references)
async function syncArtworks() {
  console.log('🎨 Syncing Artworks...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "artwork"] | order(name asc) {
      _id,
      name,
      workTitle,
      images,
      creator->{_id, name},
      category->{_id, title},
      medium[]->{_id, name},
      materials[]->{_id, name},
      finishes[]->{_id, name},
      size,
      year,
      price,
      description,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      'name': item.name || 'Untitled Artwork',
      'work-title-english': item.workTitle?.en || '',
      'work-title-german': item.workTitle?.de || '',
      'creator': item.creator?._id ? idMappings.creator.get(item.creator._id) : null,
      'category': item.category?._id ? idMappings.category.get(item.category._id) : null,
      'medium': item.medium?.map(m => idMappings.medium.get(m._id)).filter(Boolean) || [],
      'materials': item.materials?.map(m => idMappings.material.get(m._id)).filter(Boolean) || [],
      'finishes': item.finishes?.map(f => idMappings.finish.get(f._id)).filter(Boolean) || [],
      'size': item.size || '',
      'year': item.year || '',
      'price': item.price || '',
      'description-english': item.description?.en || '',
      'description-german': item.description?.de || '',
      'main-image': getSanityImageUrl(item.images?.[0]),
      slug: item.slug?.current || generateSlug(item.workTitle?.en || item.name)
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.artwork, webflowItems)
  
  console.log(`✅ Artworks: ${results.length} created`)
  return results.length
}

// Main sync function
async function performCompleteSync() {
  const startTime = Date.now()
  let totalSynced = 0
  
  try {
    console.log('🚀 Starting Complete Sanity → Webflow Sync')
    console.log('='.repeat(60))
    
    // Clear existing mappings
    Object.values(idMappings).forEach(map => map.clear())
    
    // Phase 1: Foundation data (no dependencies)
    console.log('\n📋 PHASE 1: Foundation Data')
    totalSynced += await syncMaterialTypes()
    totalSynced += await syncFinishes()
    totalSynced += await syncCategories()
    totalSynced += await syncCountries()
    
    // Phase 2: Reference data (with simple dependencies)
    console.log('\n🔗 PHASE 2: Reference Data')
    totalSynced += await syncCities()
    totalSynced += await syncMaterials()
    totalSynced += await syncMediums()
    
    // Phase 3: Complex entities
    console.log('\n🏢 PHASE 3: Complex Entities')
    totalSynced += await syncLocations()
    totalSynced += await syncCreators()
    
    // Phase 4: Artworks (depends on everything)
    console.log('\n🎨 PHASE 4: Artworks')
    totalSynced += await syncArtworks()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ Complete sync finished in ${duration}s`)
    console.log(`📊 Total items synced: ${totalSynced}`)
    
    return {
      success: true,
      totalSynced,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    throw error
  }
}

// Main API handler
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // Verify required environment variables
    if (!process.env.SANITY_API_TOKEN) {
      throw new Error('SANITY_API_TOKEN environment variable is required')
    }
    if (!process.env.WEBFLOW_API_TOKEN) {
      throw new Error('WEBFLOW_API_TOKEN environment variable is required')
    }
    
    console.log('🔔 Sync triggered via API')
    const result = await performCompleteSync()
    
    res.status(200).json({
      message: 'Sync completed successfully',
      ...result
    })
    
  } catch (error) {
    console.error('API Error:', error.message)
    res.status(500).json({
      error: 'Sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
} 