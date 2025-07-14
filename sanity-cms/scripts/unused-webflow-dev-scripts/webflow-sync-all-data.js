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

// Store mapping of Sanity IDs to Webflow IDs for reference linking
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

// PHASE 1: Foundation Data (no dependencies)
async function syncMaterialTypes() {
  console.log('\n📋 Syncing Material Types...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "materialType"] | order(sortOrder asc, name.en asc) {
      _id,
      name,
      description,
      sortOrder,
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Material Types in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'sort-order': item.sortOrder || 0
    }
  }))
  
  // This would use MCP tools to create items in Webflow
  console.log(`Prepared ${webflowItems.length} Material Types for Webflow`)
  return { sanityData, webflowItems }
}

async function syncFinishes() {
  console.log('\n🎨 Syncing Finishes...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "finish"] | order(name.en asc) {
      _id,
      name,
      description,
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Finishes in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item)
    }
  }))
  
  console.log(`Prepared ${webflowItems.length} Finishes for Webflow`)
  return { sanityData, webflowItems }
}

// PHASE 2: Reference Data with Dependencies
async function syncMaterials() {
  console.log('\n🪨 Syncing Materials...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "material"] | order(name.en asc) {
      _id,
      name,
      description,
      materialType->{_id, name},
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Materials in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      // Note: Material Type reference would need to be mapped using idMappings
      'material-type': item.materialType?._id ? idMappings.materialType.get(item.materialType._id) : null
    }
  }))
  
  console.log(`Prepared ${webflowItems.length} Materials for Webflow`)
  return { sanityData, webflowItems }
}

async function syncMediums() {
  console.log('\n🎭 Syncing Mediums...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "medium"] | order(name.en asc) {
      _id,
      name,
      description,
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Mediums in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item)
    }
  }))
  
  console.log(`Prepared ${webflowItems.length} Mediums for Webflow`)
  return { sanityData, webflowItems }
}

async function syncCategories() {
  console.log('\n📂 Syncing Categories...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "category"] | order(name.en asc) {
      _id,
      name,
      description,
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Categories in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item)
    }
  }))
  
  console.log(`Prepared ${webflowItems.length} Categories for Webflow`)
  return { sanityData, webflowItems }
}

async function syncLocations() {
  console.log('\n📍 Syncing Locations...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "location"] | order(name.en asc) {
      _id,
      name,
      description,
      city,
      country,
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Locations in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      city: item.city || '',
      country: item.country || ''
    }
  }))
  
  console.log(`Prepared ${webflowItems.length} Locations for Webflow`)
  return { sanityData, webflowItems }
}

// PHASE 3: Content Data
async function syncCreators() {
  console.log('\n👨‍🎨 Syncing Creators...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "creator"] | order(name.en asc) {
      _id,
      name,
      description,
      bio,
      birthYear,
      deathYear,
      nationality,
      profileImage,
      categories[]->{ _id, name },
      location->{ _id, name },
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Creators in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'bio-english': item.bio?.en || '',
      'bio-german': item.bio?.de || '',
      'birth-year': item.birthYear || null,
      'death-year': item.deathYear || null,
      nationality: item.nationality || '',
      // References would need mapping
      location: item.location?._id ? idMappings.location.get(item.location._id) : null,
      // Note: categories is multi-reference, would need special handling
    }
  }))
  
  console.log(`Prepared ${webflowItems.length} Creators for Webflow`)
  return { sanityData, webflowItems }
}

async function syncArtworks() {
  console.log('\n🖼️ Syncing Artworks...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "artwork"] | order(workTitle.en asc) {
      _id,
      workTitle,
      description,
      year,
      dimensions,
      price,
      imageGallery,
      creator->{ _id, name },
      medium->{ _id, name },
      materials[]->{ _id, name },
      finishes[]->{ _id, name },
      categories[]->{ _id, name },
      location->{ _id, name },
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Artworks in Sanity`)
  
  const webflowItems = sanityData.map(item => ({
    fieldData: {
      'work-title-english': item.workTitle?.en || '',
      'work-title-german': item.workTitle?.de || '',
      name: item.workTitle?.en || item.workTitle?.de || 'Untitled Artwork',
      slug: item.slug?.current || generateSlug(item.workTitle?.en || item.workTitle?.de),
      ...mapBilingualDescription(item),
      year: item.year || null,
      dimensions: item.dimensions || '',
      price: item.price || null,
      // References would need mapping to Webflow IDs
      creator: item.creator?._id ? idMappings.creator.get(item.creator._id) : null,
      medium: item.medium?._id ? idMappings.medium.get(item.medium._id) : null,
      location: item.location?._id ? idMappings.location.get(item.location._id) : null,
      // Multi-references would need special handling
    }
  }))
  
  console.log(`Prepared ${webflowItems.length} Artworks for Webflow`)
  return { sanityData, webflowItems }
}

// Main sync function
async function syncAllToWebflow() {
  try {
    console.log('🚀 Starting COMPLETE Sanity → Webflow Sync')
    console.log('='.repeat(80))
    console.log('This will sync ALL content: Foundation data + Creators + Artworks')
    console.log('='.repeat(80))
    
    // Clear existing mappings
    Object.values(idMappings).forEach(map => map.clear())
    
    // Phase 1: Foundation data (no dependencies)
    console.log('\n📋 PHASE 1: Foundation Data')
    console.log('-'.repeat(40))
    const materialTypes = await syncMaterialTypes()
    const finishes = await syncFinishes()
    
    // Phase 2: Reference data (simple dependencies)
    console.log('\n🔗 PHASE 2: Reference Data')
    console.log('-'.repeat(40))
    const materials = await syncMaterials()
    const mediums = await syncMediums()
    const categories = await syncCategories()
    const locations = await syncLocations()
    
    // Phase 3: Content data (complex dependencies)
    console.log('\n📝 PHASE 3: Content Data')
    console.log('-'.repeat(40))
    const creators = await syncCreators()
    const artworks = await syncArtworks()
    
    // Summary
    console.log('\n✅ SYNC PREPARATION COMPLETE!')
    console.log('='.repeat(80))
    console.log(`📊 Data Summary:`)
    console.log(`  Material Types: ${materialTypes.sanityData.length}`)
    console.log(`  Materials: ${materials.sanityData.length}`)
    console.log(`  Finishes: ${finishes.sanityData.length}`)
    console.log(`  Mediums: ${mediums.sanityData.length}`)
    console.log(`  Categories: ${categories.sanityData.length}`)
    console.log(`  Locations: ${locations.sanityData.length}`)
    console.log(`  Creators: ${creators.sanityData.length}`)
    console.log(`  Artworks: ${artworks.sanityData.length}`)
    console.log('')
    console.log(`🎯 Total Items: ${[
      materialTypes.sanityData.length,
      materials.sanityData.length,
      finishes.sanityData.length,
      mediums.sanityData.length,
      categories.sanityData.length,
      locations.sanityData.length,
      creators.sanityData.length,
      artworks.sanityData.length
    ].reduce((a, b) => a + b, 0)}`)
    
    console.log('\n🚀 Ready to push to Webflow!')
    console.log('Next: Use MCP Webflow tools to create items in collections')
    
    return {
      materialTypes,
      materials,
      finishes,
      mediums,
      categories,
      locations,
      creators,
      artworks
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    console.error(error.stack)
    throw error
  }
}

// Export for use in other scripts
export { 
  syncAllToWebflow,
  syncMaterialTypes,
  syncMaterials,
  syncFinishes,
  syncMediums,
  syncCategories,
  syncLocations,
  syncCreators,
  syncArtworks,
  idMappings,
  WEBFLOW_COLLECTIONS
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAllToWebflow()
} 