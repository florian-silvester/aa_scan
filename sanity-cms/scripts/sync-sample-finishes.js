import {createClient} from '@sanity/client'

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01'
})

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

async function getSampleFinishes() {
  try {
    console.log('🔍 Getting sample finishes from Sanity...')
    
    const finishes = await sanityClient.fetch(`
      *[_type == "finish"] | order(sortOrder)[0...5] {
        _id, name, description, slug, sortOrder
      }
    `)
    
    console.log(`Found ${finishes.length} finishes:`)
    
    const webflowItems = finishes.map((finish, i) => {
      console.log(`${i+1}. ${finish.name?.en} / ${finish.name?.de}`)
      
      return {
        fieldData: {
          ...mapBilingualName(finish),
          ...mapBilingualDescription(finish),
          'sort-order': finish.sortOrder || 100
        }
      }
    })
    
    console.log('\n📝 Ready for Webflow Sync:')
    console.log('Collection ID: 6873886339818fe4cd550b03')
    console.log('Sample item:', JSON.stringify(webflowItems[0], null, 2))
    
    return { finishes, webflowItems }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  }
}

// Export for external use
export { getSampleFinishes }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getSampleFinishes()
} 