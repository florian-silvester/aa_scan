import {createClient} from '@sanity/client'

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

async function syncAllFoundationData() {
  try {
    console.log('🚀 Starting Complete Foundation Data Sync')
    console.log('='.repeat(60))
    
    // Get all foundation data from Sanity
    console.log('\n📊 Fetching all foundation data from Sanity...')
    
    const [materialTypes, materials, finishes, mediums, categories] = await Promise.all([
      sanityClient.fetch(`
        *[_type == "materialType"] | order(sortOrder) {
          _id, name, description, slug, sortOrder
        }
      `),
      sanityClient.fetch(`
        *[_type == "material"] | order(sortOrder) {
          _id, name, description, slug, sortOrder, usageCount,
          materialType->{_id, name}
        }
      `),
      sanityClient.fetch(`
        *[_type == "finish"] | order(sortOrder) {
          _id, name, description, slug, sortOrder, usageCount
        }
      `),
      sanityClient.fetch(`
        *[_type == "medium"] | order(sortOrder) {
          _id, name, description, slug, sortOrder, usageCount,
          category->{_id, title}
        }
      `),
      sanityClient.fetch(`
        *[_type == "category"] | order(_id) {
          _id, title, description, slug
        }
      `)
    ])
    
    console.log(`📈 Data Summary:`)
    console.log(`  Material Types: ${materialTypes.length}`)
    console.log(`  Materials: ${materials.length}`)
    console.log(`  Finishes: ${finishes.length}`)
    console.log(`  Mediums: ${mediums.length}`)
    console.log(`  Categories: ${categories.length}`)
    
    // Transform data for Webflow
    console.log('\n🔄 Transforming data for Webflow...')
    
    const transformedData = {
      materialTypes: materialTypes.map(item => ({
        sanityId: item._id,
        webflowData: {
          fieldData: {
            ...mapBilingualName(item),
            ...mapBilingualDescription(item),
            'sort-order': item.sortOrder || 100
          }
        }
      })),
      
      materials: materials.map(item => ({
        sanityId: item._id,
        webflowData: {
          fieldData: {
            ...mapBilingualName(item),
            ...mapBilingualDescription(item),
            'sort-order': item.sortOrder || 100
            // material-type reference will be added after material types are created
          }
        },
        materialTypeRef: item.materialType?._id
      })),
      
      finishes: finishes.map(item => ({
        sanityId: item._id,
        webflowData: {
          fieldData: {
            ...mapBilingualName(item),
            ...mapBilingualDescription(item),
            'sort-order': item.sortOrder || 100
          }
        }
      })),
      
      mediums: mediums.map(item => ({
        sanityId: item._id,
        webflowData: {
          fieldData: {
            ...mapBilingualName(item),
            ...mapBilingualDescription(item),
            'sort-order': item.sortOrder || 100
            // category reference will be added after categories are created
          }
        },
        categoryRef: item.category?._id
      })),
      
      categories: categories.map(item => ({
        sanityId: item._id,
        webflowData: {
          fieldData: {
            'title-english': item.title?.en || '',
            'title-german': item.title?.de || '',
            name: item.title?.en || item.title?.de || 'Untitled',
            slug: item.slug?.current || generateSlug(item.title?.en || item.title?.de),
            ...mapBilingualDescription(item)
          }
        }
      }))
    }
    
    console.log('✅ Data transformation complete!')
    
    // Display sample items
    console.log('\n📝 Sample transformed items:')
    console.log('\nMaterial Type:', JSON.stringify(transformedData.materialTypes[0]?.webflowData?.fieldData, null, 2))
    console.log('\nMaterial:', JSON.stringify(transformedData.materials[0]?.webflowData?.fieldData, null, 2))
    console.log('\nFinish:', JSON.stringify(transformedData.finishes[0]?.webflowData?.fieldData, null, 2))
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Use MCP Webflow functions to create these items in batches')
    console.log('2. Handle reference mapping between collections')
    console.log('3. Sync creators and artworks once foundation is complete')
    
    return transformedData
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    throw error
  }
}

// Export for external use
export { syncAllFoundationData }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAllFoundationData()
} 