const fs = require('fs')
const path = require('path')

// Load environment variables manually
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const {createClient} = require('@sanity/client')

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

// Import the mapping function from the sync script
const syncScript = require('./api/sync-to-webflow.js')

// Webflow collection ID for creators
const WEBFLOW_CREATOR_COLLECTION_ID = '686e4d544cb3505ce3b1412c'

async function webflowRequest(endpoint, options = {}) {
  const response = await fetch(`https://api.webflow.com/v2${endpoint}`, {
    headers: { 
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    ...options
  })
  if (!response.ok) {
    throw new Error(`Webflow API Error: ${response.status} ${await response.text()}`)
  }
  return response.json()
}

function convertSanityBlocksToWebflowRichText(blocks) {
  if (!blocks || !Array.isArray(blocks)) return ''
  
  return blocks
    .map(block => {
      if (block._type === 'block' && block.children) {
        return block.children
          .map(child => child.text || '')
          .join('')
      }
      return ''
    })
    .join('\n')
    .trim()
}

function mapCreatorFields(sanityItem) {
  return {
    'name': sanityItem.name || 'Untitled',
    'slug': sanityItem.slug?.current || sanityItem.name?.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    'biography-english': convertSanityBlocksToWebflowRichText(sanityItem.biography?.en),
    'biography-german': convertSanityBlocksToWebflowRichText(sanityItem.biography?.de),
    'portrait-english': convertSanityBlocksToWebflowRichText(sanityItem.portrait?.en),
    'portrait-german': convertSanityBlocksToWebflowRichText(sanityItem.portrait?.de),
    'website': sanityItem.website || '',
    'email': sanityItem.email || '',
    'nationality-english': sanityItem.nationality?.en || '',
    'nationality-german': sanityItem.nationality?.de || '',
    'birth-year': sanityItem.birthYear ? parseInt(sanityItem.birthYear, 10) : null,
    'specialties-english': sanityItem.specialties?.en?.join(', ') || '',
    'specialties-german': sanityItem.specialties?.de?.join(', ') || '',
    'category': null // Skip category for now
  }
}

async function testSingleCreator() {
  try {
    console.log('🔍 Fetching first creator from Sanity...')
    
    // Get one creator from Sanity
    const creators = await sanityClient.fetch(`
      *[_type == "creator"] | order(name asc) [0...1] {
        _id,
        name,
        biography,
        portrait,
        nationality,
        specialties,
        slug,
        website,
        email,
        birthYear,
        tier,
        category->{_id, "_ref": _id}
      }
    `)

    if (!creators || creators.length === 0) {
      console.log('❌ No creators found in Sanity')
      return
    }

    const creator = creators[0]
    console.log(`✅ Found creator: ${creator.name}`)
    console.log('📊 Sanity data:', JSON.stringify(creator, null, 2))

    // Map the fields
    const mappedFields = mapCreatorFields(creator)
    console.log('\n🔄 Mapped fields for Webflow:')
    console.log(JSON.stringify(mappedFields, null, 2))

    // Check which fields have data
    console.log('\n📋 Field Analysis:')
    Object.entries(mappedFields).forEach(([key, value]) => {
      const hasData = value && value !== '' && value !== null
      console.log(`${hasData ? '✅' : '❌'} ${key}: ${hasData ? 'HAS DATA' : 'EMPTY'}`)
    })

    // Try to create/update in Webflow
    console.log('\n🚀 Syncing to Webflow...')
    const webflowData = {
      items: [{
        fieldData: mappedFields
      }]
    }

    const result = await webflowRequest(`/collections/${WEBFLOW_CREATOR_COLLECTION_ID}/items`, {
      method: 'POST',
      body: JSON.stringify(webflowData)
    })

    console.log('✅ Successfully synced to Webflow!')
    console.log('Webflow response:', JSON.stringify(result, null, 2))

    if (result.items && result.items[0]) {
      const webflowItem = result.items[0]
      console.log('\n🎯 Verification - Webflow fields populated:')
      Object.entries(webflowItem.fieldData).forEach(([key, value]) => {
        const hasData = value && value !== '' && value !== null
        console.log(`${hasData ? '✅' : '❌'} ${key}: ${hasData ? 'POPULATED' : 'EMPTY'}`)
      })
    }

  } catch (error) {
    console.error('❌ Error testing single creator:', error.message)
    console.error(error.stack)
  }
}

testSingleCreator() 