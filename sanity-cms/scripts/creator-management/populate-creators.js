import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_TOKEN || 'your-token-here', // You'll need to set this
  apiVersion: '2023-01-01'
})

// First, let's get the existing makers from artworks to create creators
async function getExistingMakers() {
  try {
    const makers = await client.fetch(`
      *[_type == "artwork" && defined(maker)] {
        "maker": maker
      }
    `)
    
    // Extract unique maker names
    const uniqueMakers = [...new Set(makers.map(m => m.maker).filter(Boolean))]
    console.log('Found existing makers:', uniqueMakers)
    
    return uniqueMakers
  } catch (error) {
    console.error('Error fetching existing makers:', error)
    return []
  }
}

async function createCreatorFromName(name) {
  try {
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
    
    const doc = {
      _type: 'creator',
      name: name,
      slug: {
        _type: 'slug',
        current: slug
      }
    }
    
    const result = await client.create(doc)
    console.log(`✓ Created creator: ${name} (${result._id})`)
    return result
  } catch (error) {
    console.error(`✗ Error creating creator ${name}:`, error.message)
    return null
  }
}

async function populateCreators() {
  console.log('Starting to populate creators...')
  
  // Get existing makers from artworks
  const existingMakers = await getExistingMakers()
  
  if (existingMakers.length === 0) {
    console.log('No existing makers found in artworks. Creating some sample creators...')
    
    // Create some sample creators
    const sampleCreators = [
      'Anna Thompson',
      'Emily Zhang',
      'Maria Lopez',
      'David Chen',
      'Sarah Johnson',
      'Michael Brown',
      'Lisa Wilson',
      'Robert Taylor'
    ]
    
    for (const name of sampleCreators) {
      await createCreatorFromName(name)
    }
  } else {
    console.log(`Found ${existingMakers.length} existing makers. Creating creators...`)
    
    for (const makerName of existingMakers) {
      await createCreatorFromName(makerName)
    }
  }
  
  console.log('Finished populating creators!')
}

populateCreators().catch(console.error) 