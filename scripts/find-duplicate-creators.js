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

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2'
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
  
  if (response.status === 204) {
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
    await new Promise(r => setTimeout(r, 500)) // Rate limiting
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

async function findDuplicates() {
  console.log('🔍 Finding Duplicate Creators in Webflow\n')
  console.log('='.repeat(60))
  
  // Get collection ID
  const collections = await getWebflowCollections()
  if (!collections.creator) {
    console.error('❌ Could not find creator collection')
    return
  }
  
  console.log(`✅ Found creator collection: ${collections.creator}\n`)
  
  // Get all creators
  console.log('📥 Fetching all creators from Webflow...')
  const creators = await getAllCreators(collections.creator)
  console.log(`✅ Found ${creators.length} total creators\n`)
  
  // Group by slug
  const bySlug = new Map()
  const byName = new Map()
  
  for (const creator of creators) {
    const slug = creator.fieldData?.slug
    const name = creator.fieldData?.name
    
    if (slug) {
      if (!bySlug.has(slug)) {
        bySlug.set(slug, [])
      }
      bySlug.get(slug).push(creator)
    }
    
    if (name) {
      if (!byName.has(name)) {
        byName.set(name, [])
      }
      byName.get(name).push(creator)
    }
  }
  
  // Find duplicates
  const slugDuplicates = []
  const nameDuplicates = []
  
  for (const [slug, items] of bySlug.entries()) {
    if (items.length > 1) {
      slugDuplicates.push({ slug, items })
    }
  }
  
  for (const [name, items] of byName.entries()) {
    if (items.length > 1) {
      nameDuplicates.push({ name, items })
    }
  }
  
  console.log('📊 DUPLICATE ANALYSIS\n')
  console.log(`Duplicates by SLUG: ${slugDuplicates.length}`)
  console.log(`Duplicates by NAME: ${nameDuplicates.length}\n`)
  
  if (slugDuplicates.length > 0) {
    console.log('='.repeat(60))
    console.log('🔴 SLUG DUPLICATES (Same slug, multiple items):\n')
    
    for (const dup of slugDuplicates) {
      console.log(`Slug: "${dup.slug}" (${dup.items.length} duplicates)`)
      for (const item of dup.items) {
        console.log(`  - ID: ${item.id}`)
        console.log(`    Name: ${item.fieldData?.name || 'N/A'}`)
        console.log(`    Created: ${item.createdOn || 'N/A'}`)
        console.log(`    Updated: ${item.lastUpdated || 'N/A'}`)
      }
      console.log()
    }
  }
  
  if (nameDuplicates.length > 0) {
    console.log('='.repeat(60))
    console.log('🟡 NAME DUPLICATES (Same name, different items):\n')
    
    for (const dup of nameDuplicates) {
      console.log(`Name: "${dup.name}" (${dup.items.length} duplicates)`)
      for (const item of dup.items) {
        console.log(`  - ID: ${item.id}`)
        console.log(`    Slug: ${item.fieldData?.slug || 'N/A'}`)
        console.log(`    Created: ${item.createdOn || 'N/A'}`)
      }
      console.log()
    }
  }
  
  // Generate cleanup report
  console.log('='.repeat(60))
  console.log('📝 CLEANUP RECOMMENDATIONS\n')
  
  const toDelete = []
  
  for (const dup of slugDuplicates) {
    // Keep the oldest one (first created)
    const sorted = [...dup.items].sort((a, b) => 
      new Date(a.createdOn) - new Date(b.createdOn)
    )
    
    const keep = sorted[0]
    const deleteItems = sorted.slice(1)
    
    console.log(`For "${dup.slug}":`)
    console.log(`  ✅ KEEP: ${keep.id} (created ${keep.createdOn})`)
    for (const item of deleteItems) {
      console.log(`  ❌ DELETE: ${item.id} (created ${item.createdOn})`)
      toDelete.push(item.id)
    }
    console.log()
  }
  
  console.log('='.repeat(60))
  console.log(`\n📋 SUMMARY:`)
  console.log(`  Total creators: ${creators.length}`)
  console.log(`  Duplicates to delete: ${toDelete.length}`)
  console.log(`  Clean creators after cleanup: ${creators.length - toDelete.length}\n`)
  
  // Save to file for cleanup script
  fs.writeFileSync(
    path.join(__dirname, '..', 'reports', 'duplicate-creators-to-delete.json'),
    JSON.stringify({ toDelete, duplicates: slugDuplicates }, null, 2)
  )
  
  console.log('✅ Saved deletion list to: reports/duplicate-creators-to-delete.json')
  console.log('\n💡 To delete duplicates, run: node scripts/delete-duplicate-creators.js')
}

findDuplicates().catch(console.error)

