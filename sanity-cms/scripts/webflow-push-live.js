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

// Push Material Types to Webflow
async function pushMaterialTypes() {
  console.log('\n📋 Pushing Material Types to Webflow...')
  
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
  
  // Prepare for Webflow - first 10 items as a test
  const testItems = sanityData.slice(0, 10).map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item),
      'sort-order': item.sortOrder || 0
    }
  }))
  
  console.log(`Pushing ${testItems.length} Material Types to Webflow...`)
  console.log('Sample data:', JSON.stringify(testItems[0], null, 2))
  
  return { sanityData, testItems }
}

// Push Finishes to Webflow
async function pushFinishes() {
  console.log('\n🎨 Pushing Finishes to Webflow...')
  
  const sanityData = await sanityClient.fetch(`
    *[_type == "finish"] | order(name.en asc) {
      _id,
      name,
      description,
      slug
    }
  `)
  
  console.log(`Found ${sanityData.length} Finishes in Sanity`)
  
  // Prepare for Webflow - first 10 items as a test
  const testItems = sanityData.slice(0, 10).map(item => ({
    fieldData: {
      ...mapBilingualName(item),
      ...mapBilingualDescription(item)
    }
  }))
  
  console.log(`Pushing ${testItems.length} Finishes to Webflow...`)
  console.log('Sample data:', JSON.stringify(testItems[0], null, 2))
  
  return { sanityData, testItems }
}

// Main function to test the push
async function testPushToWebflow() {
  try {
    console.log('🚀 Starting TEST Push to Webflow')
    console.log('='.repeat(60))
    console.log('Testing with first 10 items of each type')
    console.log('='.repeat(60))
    
    // Test foundation data
    const materialTypes = await pushMaterialTypes()
    const finishes = await pushFinishes()
    
    console.log('\n✅ Test data prepared!')
    console.log('Next: Use MCP tools to actually create these in Webflow')
    
    return { materialTypes, finishes }
    
  } catch (error) {
    console.error('❌ Push failed:', error.message)
    console.error(error.stack)
  }
}

// Export for use
export { testPushToWebflow, pushMaterialTypes, pushFinishes }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPushToWebflow()
} 