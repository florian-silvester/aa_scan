import {createClient} from '@sanity/client'

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01'
})

// Webflow collection IDs
const WEBFLOW_COLLECTIONS = {
  materialType: '6873884cedcec21fab8dd8dc'
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

async function syncMaterialTypesStarter() {
  try {
    console.log('🚀 Starting Material Types Sync Test')
    console.log('='.repeat(50))
    
    // Get first 3 material types for testing
    const sanityData = await sanityClient.fetch(`
      *[_type == "materialType"] | order(sortOrder)[0...3] {
        _id,
        name,
        description,
        slug,
        sortOrder
      }
    `)
    
    console.log(`Found ${sanityData.length} material types for testing`)
    
    // Transform to Webflow format
    const webflowItems = sanityData.map(item => ({
      fieldData: {
        ...mapBilingualName(item),
        ...mapBilingualDescription(item),
        'sort-order': item.sortOrder || 100
      }
    }))
    
    console.log('\nSample items to create:')
    webflowItems.forEach((item, i) => {
      console.log(`${i + 1}. ${item.fieldData['name-english']} / ${item.fieldData['name-german']}`)
    })
    
    console.log('\n📝 Items prepared for Webflow sync')
    console.log('Next step: Use MCP Webflow functions to create these items')
    console.log('Collection ID:', WEBFLOW_COLLECTIONS.materialType)
    
    return {
      collectionId: WEBFLOW_COLLECTIONS.materialType,
      items: webflowItems,
      sanityData
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  }
}

// Export for external use
export { syncMaterialTypesStarter }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncMaterialTypesStarter()
} 