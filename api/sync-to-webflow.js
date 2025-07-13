const {createClient} = require('@sanity/client')

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
  location: new Map(),
  creator: new Map()
}

// Collection-specific mapping functions
function mapMaterialTypeFields(sanityItem) {
  return {
    'name-english': sanityItem.name?.en || '',
    'name-german': sanityItem.name?.de || '',
    'description-english': sanityItem.description?.en || '',
    'description-german': sanityItem.description?.de || '',
    name: sanityItem.name?.en || sanityItem.name?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.name?.en || sanityItem.name?.de)
  }
}

function mapCategoryFields(sanityItem) {
  return {
    'title-german': sanityItem.title?.de || '',
    description: sanityItem.description?.en || sanityItem.description?.de || '',
    name: sanityItem.title?.en || sanityItem.title?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.title?.en || sanityItem.title?.de)
  }
}

function mapCreatorFields(sanityItem) {
  return {
    'biography-english': sanityItem.biography?.en || '',
    'biography-german': sanityItem.biography?.de || '',
    'portrait-english': sanityItem.portrait?.en || '',
    'portrait-german': sanityItem.portrait?.de || '',
    name: sanityItem.name || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.name)
  }
}

function mapLocationFields(sanityItem) {
  return {
    name: sanityItem.name?.en || sanityItem.name?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.name?.en || sanityItem.name?.de)
  }
}

function mapMediumFinishFields(sanityItem) {
  return {
    'name-english': sanityItem.name?.en || '',
    'name-german': sanityItem.name?.de || '',
    'description-english': sanityItem.description?.en || '',
    'description-german': sanityItem.description?.de || '',
    name: sanityItem.name?.en || sanityItem.name?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.name?.en || sanityItem.name?.de)
  }
}

function generateSlug(text) {
  if (!text) return 'untitled'
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Map Sanity location types to Webflow location types
function mapLocationType(sanityType) {
  const typeMapping = {
    'museum': 'Museum',
    'shop-gallery': 'Shop / Gallery',
    'studio': 'Studio'
  }
  return typeMapping[sanityType] || 'Shop / Gallery' // Default to Shop / Gallery
}

// Map Sanity location types to Webflow location types
function mapLocationType(sanityType) {
  const typeMapping = {
    'museum': 'Museum',
    'shop-gallery': 'Shop / Gallery',
    'studio': 'Studio'
  }
  return typeMapping[sanityType] || 'Shop / Gallery' // Default to Shop / Gallery
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
      ...mapMaterialTypeFields(item),
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
      ...mapMediumFinishFields(item)
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

// PHASE 3: Sync Materials (with Material Type references)
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
      ...mapMediumFinishFields(item),
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

// PHASE 4: Sync other collections
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
      ...mapMediumFinishFields(item)
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
      name: item.title?.en || item.title?.de || 'Untitled',
      slug: item.slug?.current || generateSlug(item.title?.en || item.title?.de),
      'name-english': item.title?.en || '',
      'name-german': item.title?.de || '',
      'description-english': item.description?.en || '',
      'description-german': item.description?.de || ''
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

async function syncLocations() {
  console.log('📍 Syncing Locations...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "location"] | order(name.en asc) {
      _id,
      name,
      type,
      address,
      city->{name},
      country->{name},
      website,
      times,
      phone,
      email,
      description,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      name: item.name?.en || item.name?.de || 'Untitled',
      slug: item.slug?.current || generateSlug(item.name?.en || item.name?.de),
      'name-english': item.name?.en || '',
      'name-german': item.name?.de || '',
      'description-english': item.description?.en || '',
      'description-german': item.description?.de || '',
      'location-type': mapLocationType(item.type),
      address: item.address || '',
      'city-location': item.city?.name?.en || item.city?.name?.de || '',
      country: item.country?.name?.en || item.country?.name?.de || '',
      website: item.website || '',
      'opening-times-english': item.times?.en || '',
      'opening-times-german': item.times?.de || '',
      phone: item.phone || '',
      email: item.email || ''
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

async function syncCreators() {
  console.log('👤 Syncing Creators...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "creator"] | order(name asc) {
      _id,
      name,
      biography,
      portrait,
      nationality,
      specialties,
      galleryImages,
      slug
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      name: item.name || 'Untitled',
      slug: item.slug?.current || generateSlug(item.name),
      'biography-english': item.biography?.en || '',
      'biography-german': item.biography?.de || '',
      'portrait-english': item.portrait?.en || '',
      'portrait-german': item.portrait?.de || '',
      'nationality-english': item.nationality?.en || '',
      'nationality-german': item.nationality?.de || '',
      'specialties-english': item.specialties?.en || '',
      'specialties-german': item.specialties?.de || ''
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

// PHASE 8: Sync Artworks
async function syncArtworks() {
  console.log('🎨 Syncing Artworks...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "artwork"] | order(name asc) {
      _id,
      name,
      workTitle,
      description,
      creator->{_id},
      category->{_id},
      materials[]->{_id},
      medium[]->{_id},
      finishes[]->{_id},
      size,
      year,
      price,
      slug,
      images[]{ 
        asset->{
          _id,
          url
        },
        alt
      }
    }
  `)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      name: item.name || 'Untitled',
      slug: item.slug?.current || generateSlug(item.name || item.workTitle?.en),
      'work-title': item.workTitle?.en || item.workTitle?.de || '',
      'work-title-english': item.workTitle?.en || '',
      'work-title-german': item.workTitle?.de || '',
      'description-english': item.description?.en || '',
      'description-german': item.description?.de || '',
      creator: item.creator?._id ? idMappings.creator.get(item.creator._id) : null,
      category: item.category?._id ? [idMappings.category.get(item.category._id)].filter(Boolean) : [],
      materials: item.materials?.map(mat => idMappings.material.get(mat._id)).filter(Boolean) || [],
      medium: item.medium?.map(med => idMappings.medium.get(med._id)).filter(Boolean) || [],
      finishes: item.finishes?.map(fin => idMappings.finish.get(fin._id)).filter(Boolean) || [],
      'size-dimensions': item.size || '',
      year: item.year || '',
      price: item.price || '',
      'artwork-images': item.images?.map(img => img.asset?.url).filter(Boolean) || []
    }
  }))
  
  const results = await createWebflowItems(WEBFLOW_COLLECTIONS.artwork, webflowItems)
  
  console.log(`✅ Artworks: ${results.length} created`)
  return results.length
}

// Main sync function
async function performCompleteSync(progressCallback = null) {
  const startTime = Date.now()
  let totalSynced = 0
  
  const updateProgress = (step, message, currentCount = 0, totalCount = 0) => {
    if (progressCallback) {
      progressCallback({
        phase: step,
        message,
        currentCount,
        totalCount,
        totalSynced
      })
    }
  }
  
  try {
    console.log('🚀 Starting Complete Sanity → Webflow Sync')
    console.log('='.repeat(60))
    
    // Clear existing mappings
    Object.values(idMappings).forEach(map => map.clear())
    
    // Phase 1: Foundation data (no dependencies)
    updateProgress('Phase 1', 'Starting foundation data sync...', 0, 4)
    console.log('\n📋 PHASE 1: Foundation Data')
    
    updateProgress('Phase 1', 'Syncing Material Types...', 1, 4)
    totalSynced += await syncMaterialTypes()
    
    updateProgress('Phase 1', 'Syncing Finishes...', 2, 4)
    totalSynced += await syncFinishes()
    
    updateProgress('Phase 1', 'Syncing Categories...', 3, 4)
    totalSynced += await syncCategories()
    
    updateProgress('Phase 1', 'Syncing Locations...', 4, 4)
    totalSynced += await syncLocations()
    
    // Phase 2: Reference data (with dependencies)
    updateProgress('Phase 2', 'Starting reference data sync...', 0, 3)
    console.log('\n🔗 PHASE 2: Reference Data')
    
    updateProgress('Phase 2', 'Syncing Materials...', 1, 3)
    totalSynced += await syncMaterials()
    
    updateProgress('Phase 2', 'Syncing Mediums...', 2, 3)
    totalSynced += await syncMediums()
    
    updateProgress('Phase 2', 'Syncing Creators...', 3, 3)
    totalSynced += await syncCreators()
    
    // Phase 3: Complex data (with multiple dependencies)
    updateProgress('Phase 3', 'Starting artwork sync...', 0, 1)
    console.log('\n🎨 PHASE 3: Complex Data')
    
    updateProgress('Phase 3', 'Syncing Artworks with Images...', 1, 1)
    totalSynced += await syncArtworks()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ Complete sync finished in ${duration}s`)
    console.log(`📊 Total items synced: ${totalSynced}`)
    
    updateProgress('Complete', `Sync completed! ${totalSynced} items synced`, totalSynced, totalSynced)
    
    return {
      success: true,
      totalSynced,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    if (progressCallback) {
      progressCallback({
        phase: 'Error',
        message: error.message,
        error: true
      })
    }
    throw error
  }
}

// Main API handler
module.exports = async function handler(req, res) {
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
    
    // Check if client wants streaming progress
    const { streaming } = req.body || {}
    
    if (streaming) {
      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      
      const sendProgress = (progress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`)
      }
      
      try {
        console.log('🔔 Sync triggered via API (streaming)')
        const result = await performCompleteSync(sendProgress)
        res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`)
        res.end()
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
        res.end()
      }
    } else {
      // Regular sync without streaming
      console.log('🔔 Sync triggered via API')
      const result = await performCompleteSync()
      
      res.status(200).json({
        message: 'Sync completed successfully',
        ...result
      })
    }
    
  } catch (error) {
    console.error('API Error:', error.message)
    res.status(500).json({
      error: 'Sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
} 