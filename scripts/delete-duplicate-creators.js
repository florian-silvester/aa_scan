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

let createClient
try {
  createClient = require('@sanity/client').createClient
} catch (e) {
  createClient = require(path.join(__dirname, '..', 'sanity-cms', 'node_modules', '@sanity', 'client')).createClient
}

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2'
  
  // Rate limiting
  await new Promise(r => setTimeout(r, 1200))
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  if (response.status === 204 || options.method === 'DELETE') {
    return {}
  }
  
  return response.json()
}

async function getWebflowCollections() {
  const siteCollections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  const collections = {}
  
  for (const c of (siteCollections.collections || siteCollections || [])) {
    const slug = (c.slug || c.displayName || c.singularName).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    if (slug.includes('creator') || slug.includes('profile')) {
      collections.creator = c.id
      break
    }
  }
  
  return collections
}

async function getAllCreators(collectionId) {
  let allCreators = []
  let offset = 0
  const limit = 100
  
  while (true) {
    await new Promise(r => setTimeout(r, 500))
    const result = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
    const items = result.items || []
    
    allCreators.push(...items)
    
    if (items.length < limit) {
      break
    }
    
    offset += limit
  }
  
  return allCreators
}

async function cleanupDuplicates() {
  console.log('🧹 Cleaning Up Duplicate Creators\n')
  console.log('='.repeat(60))
  
  // Get collection
  const collections = await getWebflowCollections()
  if (!collections.creator) {
    console.error('❌ Could not find creator collection')
    return
  }
  
  console.log(`✅ Found creator collection: ${collections.creator}\n`)
  
  // Get all creators
  console.log('📥 Fetching all creators...')
  const creators = await getAllCreators(collections.creator)
  console.log(`✅ Found ${creators.length} creators\n`)
  
  // Group by name
  const byName = new Map()
  for (const creator of creators) {
    const name = creator.fieldData?.name
    if (name) {
      if (!byName.has(name)) {
        byName.set(name, [])
      }
      byName.get(name).push(creator)
    }
  }
  
  // Find duplicates
  const duplicates = []
  for (const [name, items] of byName.entries()) {
    if (items.length > 1) {
      duplicates.push({ name, items })
    }
  }
  
  console.log(`🔍 Found ${duplicates.length} duplicate sets\n`)
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates to clean up!')
    return
  }
  
  // For each duplicate, keep oldest, delete rest
  const toDelete = []
  const toKeep = []
  
  for (const dup of duplicates) {
    // Sort by creation date (oldest first)
    const sorted = [...dup.items].sort((a, b) => 
      new Date(a.createdOn) - new Date(b.createdOn)
    )
    
    const keep = sorted[0]
    const deleteItems = sorted.slice(1)
    
    console.log(`📌 "${dup.name}":`)
    console.log(`  ✅ KEEPING: ${keep.id} (slug: ${keep.fieldData?.slug}, created: ${keep.createdOn})`)
    
    toKeep.push({ name: dup.name, id: keep.id, slug: keep.fieldData?.slug })
    
    for (const item of deleteItems) {
      console.log(`  ❌ DELETING: ${item.id} (slug: ${item.fieldData?.slug}, created: ${item.createdOn})`)
      toDelete.push({ name: dup.name, id: item.id, slug: item.fieldData?.slug })
    }
    console.log()
  }
  
  console.log('='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`  Duplicates to delete: ${toDelete.length}`)
  console.log(`  Items to keep: ${toKeep.length}\n`)
  
  // Confirm deletion
  console.log('⚠️  Ready to delete duplicates. This cannot be undone!')
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n')
  
  await new Promise(r => setTimeout(r, 5000))
  
  // Delete duplicates
  console.log('🗑️  Deleting duplicates...\n')
  
  let deleted = 0
  let failed = 0
  
  for (const item of toDelete) {
    try {
      console.log(`  Deleting ${item.name} (${item.id})...`)
      await webflowRequest(
        `/collections/${collections.creator}/items/${item.id}`,
        { method: 'DELETE' }
      )
      deleted++
      console.log(`  ✅ Deleted`)
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`)
      failed++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Cleanup complete!`)
  console.log(`  Deleted: ${deleted}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total creators now: ${creators.length - deleted}\n`)
  
  // Save kept items for ID mapping update
  fs.writeFileSync(
    path.join(__dirname, '..', 'reports', 'kept-creators.json'),
    JSON.stringify({ kept: toKeep, deleted: toDelete }, null, 2)
  )
  
  console.log('💾 Saved kept items to: reports/kept-creators.json')
  console.log('\n💡 Next step: Clear creator hashes to force re-sync with correct IDs:')
  console.log('   node scripts/force-resync-creators.js')
}

cleanupDuplicates().catch(console.error)

