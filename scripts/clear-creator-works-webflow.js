const fs = require('fs')
const path = require('path')

// Load environment variables
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID
const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN

if (!WEBFLOW_SITE_ID || !WEBFLOW_API_TOKEN) {
  console.error('❌ Missing WEBFLOW_SITE_ID or WEBFLOW_API_TOKEN in .env')
  process.exit(1)
}

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2'
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  if (response.status === 204) return {}
  return response.json()
}

async function resolveCreatorCollectionId() {
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  const creatorCollection = (collections.collections || collections || []).find(c => 
    (c.slug || c.displayName || '').toLowerCase().includes('creator') ||
    (c.slug || c.displayName || '').toLowerCase().includes('profile')
  )
  if (!creatorCollection) {
    throw new Error('Creator collection not found in Webflow')
  }
  console.log(`📋 Found creator collection: ${creatorCollection.displayName} (${creatorCollection.id})`)
  return creatorCollection.id
}

async function getAllCreators(collectionId) {
  let allCreators = []
  let offset = 0
  const limit = 100
  
  while (true) {
    console.log(`  ↺ Fetching creators ${offset}–${offset + limit}...`)
    const result = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
    const items = result.items || []
    allCreators.push(...items)
    
    if (items.length < limit) break
    offset += limit
  }
  
  console.log(`  📄 Found ${allCreators.length} total creators in Webflow`)
  return allCreators
}

async function clearCreatorWorks() {
  console.log('🚀 Clearing all artwork references from Webflow creators...')
  console.log('='.repeat(60))
  
  try {
    const collectionId = await resolveCreatorCollectionId()
    const creators = await getAllCreators(collectionId)
    
    let updatedCount = 0
    let skippedCount = 0
    
    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i]
      const works = creator.fieldData?.works || []
      
      if (works.length === 0) {
        skippedCount++
        continue
      }
      
      console.log(`  🔄 Clearing ${works.length} works from: ${creator.fieldData.name}`)
      
      try {
        await webflowRequest(`/collections/${collectionId}/items/${creator.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fieldData: {
              works: []
            }
          })
        })
        updatedCount++
        
        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 200))
        
        if ((i + 1) % 25 === 0) {
          console.log(`    ↳ Processed ${i + 1}/${creators.length}...`)
        }
      } catch (error) {
        console.warn(`  ⚠️  Failed to clear works for ${creator.fieldData.name}: ${error.message}`)
      }
    }
    
    console.log(`\n✅ Complete!`)
    console.log(`  📊 ${updatedCount} creators updated (works cleared)`)
    console.log(`  ⏭️  ${skippedCount} creators skipped (no works)`)
    
  } catch (error) {
    console.error('❌ Failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  clearCreatorWorks().then(() => {
    console.log('✅ Done!')
    process.exit(0)
  }).catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
}

