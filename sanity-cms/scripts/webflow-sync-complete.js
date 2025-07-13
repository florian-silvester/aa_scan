import {createClient} from '@sanity/client'

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01'
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

const WEBFLOW_SITE_ID = '68664367794a916bfa6d247c'

// Store mapping of Sanity IDs to Webflow IDs
const idMappings = {
  materialType: new Map(),
  material: new Map(),
  finish: new Map(),
  medium: new Map(),
  category: new Map(),
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

function mapBilingualDescription(sanityItem) {
  return {
    'description-english': sanityItem.description?.en || '',
    'description-german': sanityItem.description?.de || ''
  }
}

function generateSlug(text) {
  if (!text) return 'untitled'
  return text.toLowerCase()
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Batch create items in Webflow (max 100 per batch)
async function createWebflowItems(collectionId, items, batchSize = 50) {
  const results = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    console.log(`  Creating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)} (${batch.length} items)`)
    
    try {
      // Create items as drafts first
      const response = await fetch('http://localhost:3000/webflow/create-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          items: batch
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      const result = await response.json()
      results.push(...(result.items || []))
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`  ❌ Batch failed:`, error.message)
      throw error
    }
  }
  
  return results
}

// Sync Material Types (no dependencies)
async function syncMaterialTypes() {
  console.log('\n🔄 Syncing Material Types...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "materialType"] | order(sortOrder) {
      _id,
      name,
      description,
      slug,
      sortOrder
    }
  `)
  
  console.log(`Found ${sanityData.length} material types in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'sort-order': item.sortOrder || 100
    },
    _sanityId: item._id // Keep track for mapping
  }))
  
  console.log('Creating items in Webflow...')
  const createdItems = await createWebflowItems(WEBFLOW_COLLECTIONS.materialType, webflowItems)
  
  // Store ID mappings
  createdItems.forEach((webflowItem, index) => {
    const sanityId = webflowItems[index]._sanityId
    idMappings.materialType.set(sanityId, webflowItem.id)
  })
  
  console.log(`✅ Created ${createdItems.length} material types`)
  return createdItems
}

// Sync Finishes (no dependencies)
async function syncFinishes() {
  console.log('\n🔄 Syncing Finishes...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "finish"] | order(sortOrder) {
      _id,
      name,
      description,
      slug,
      sortOrder
    }
  `)
  
  console.log(`Found ${sanityData.length} finishes in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'sort-order': item.sortOrder || 100
    },
    _sanityId: item._id
  }))
  
  console.log('Creating items in Webflow...')
  const createdItems = await createWebflowItems(WEBFLOW_COLLECTIONS.finish, webflowItems)
  
  // Store ID mappings
  createdItems.forEach((webflowItem, index) => {
    const sanityId = webflowItems[index]._sanityId
    idMappings.finish.set(sanityId, webflowItem.id)
  })
  
  console.log(`✅ Created ${createdItems.length} finishes`)
  return createdItems
}

// Sync Materials (depends on Material Types)
async function syncMaterials() {
  console.log('\n🔄 Syncing Materials...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "material"] | order(sortOrder) {
      _id,
      name,
      description,
      slug,
      sortOrder,
      materialType->{_id, name}
    }
  `)
  
  console.log(`Found ${sanityData.length} materials in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'sort-order': item.sortOrder || 100,
      'material-type': item.materialType?._id ? idMappings.materialType.get(item.materialType._id) : null
    },
    _sanityId: item._id
  }))
  
  console.log('Creating items in Webflow...')
  const createdItems = await createWebflowItems(WEBFLOW_COLLECTIONS.material, webflowItems)
  
  // Store ID mappings
  createdItems.forEach((webflowItem, index) => {
    const sanityId = webflowItems[index]._sanityId
    idMappings.material.set(sanityId, webflowItem.id)
  })
  
  console.log(`✅ Created ${createdItems.length} materials`)
  return createdItems
}

// Main sync function
async function syncFoundationData() {
  try {
    console.log('🚀 Starting Sanity → Webflow Foundation Sync')
    console.log('='.repeat(60))
    
    // Clear existing mappings
    Object.values(idMappings).forEach(map => map.clear())
    
    // Phase 1: Foundation data (no dependencies)
    await syncMaterialTypes()
    await syncFinishes()
    
    // Phase 2: Data with references
    await syncMaterials()
    
    console.log('\n✅ Foundation sync complete!')
    console.log('\nID Mappings created:')
    console.log(`  Material Types: ${idMappings.materialType.size}`)
    console.log(`  Materials: ${idMappings.material.size}`)
    console.log(`  Finishes: ${idMappings.finish.size}`)
    
    console.log('\nNext: Run syncMediums(), syncCreators(), syncArtworks()')
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    console.error(error.stack)
  }
}

// Test mode - just prepare data without API calls
async function testSync() {
  console.log('🧪 TEST MODE: Preparing data without API calls')
  console.log('='.repeat(50))
  
  const materialTypes = await sanityClient.fetch(`*[_type == "materialType"] | order(sortOrder)[0...3]`)
  console.log('\nSample Material Types:')
  materialTypes.forEach(item => {
    const mapped = mapBilingualName(item)
    console.log(`  ${mapped['name-english']} / ${mapped['name-german']}`)
  })
  
  console.log('\n✅ Test complete! Ready for real sync.')
}

// Export for use in other scripts
export { 
  syncFoundationData, 
  testSync, 
  idMappings, 
  WEBFLOW_COLLECTIONS, 
  mapBilingualName, 
  mapBilingualDescription 
}

// Run based on command line argument
const mode = process.argv[2] || 'test'
if (import.meta.url === `file://${process.argv[1]}`) {
  if (mode === 'sync') {
    syncFoundationData()
  } else {
    testSync()
  }
} 