import {createClient} from '@sanity/client'

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01'
})

// Webflow collection IDs (from our earlier setup)
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

// Webflow site ID
const WEBFLOW_SITE_ID = '68664367794a916bfa6d247c'

// Field mapping helpers
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

// Sync functions for each collection type
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
    }
  }))
  
  // TODO: Call Webflow API to create/update items
  console.log('Sample Webflow item:', JSON.stringify(webflowItems[0], null, 2))
  
  return { sanityIds: sanityData.map(i => i._id), webflowItems }
}

async function syncMaterials(materialTypeMapping = {}) {
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
      // Will need to map material type reference once we have webflow IDs
      // 'material-type': materialTypeMapping[item.materialType?._id]
    }
  }))
  
  console.log('Sample Webflow item:', JSON.stringify(webflowItems[0], null, 2))
  
  return { sanityIds: sanityData.map(i => i._id), webflowItems }
}

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
    }
  }))
  
  console.log('Sample Webflow item:', JSON.stringify(webflowItems[0], null, 2))
  
  return { sanityIds: sanityData.map(i => i._id), webflowItems }
}

async function syncMediums() {
  console.log('\n🔄 Syncing Mediums...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "medium"] | order(sortOrder) {
      _id,
      name,
      description,
      slug,
      sortOrder,
      category->{_id, title}
    }
  `)
  
  console.log(`Found ${sanityData.length} mediums in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'sort-order': item.sortOrder || 100
      // Will need category reference mapping
    }
  }))
  
  console.log('Sample Webflow item:', JSON.stringify(webflowItems[0], null, 2))
  
  return { sanityIds: sanityData.map(i => i._id), webflowItems }
}

// Main sync function
async function syncAll() {
  try {
    console.log('🚀 Starting Sanity → Webflow Sync')
    console.log('='.repeat(50))
    
    // Phase 1: Foundation data (no dependencies)
    const materialTypes = await syncMaterialTypes()
    const finishes = await syncFinishes()
    
    // Phase 2: Data with simple references
    const materials = await syncMaterials()
    const mediums = await syncMediums()
    
    console.log('\n✅ Sync preparation complete!')
    console.log('Next steps:')
    console.log('1. Implement Webflow API calls')
    console.log('2. Handle reference mapping')
    console.log('3. Add error handling and retries')
    console.log('4. Sync creators and artworks')
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAll()
} 