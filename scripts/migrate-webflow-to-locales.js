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

// All collection IDs
const COLLECTIONS = {
  creator: '68c6785963cdfa79c3a138ab',
  artwork: '68c6785963cdfa79c3a138d1',
  material: '68c6785963cdfa79c3a1386c',
  finish: '68c6785963cdfa79c3a1381d',
  medium: '68c6785963cdfa79c3a13840',
  category: '68c6785963cdfa79c3a137d5',
  location: '68c6785963cdfa79c3a1388a',
  materialType: '68c6785963cdfa79c3a137fc'
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

async function migrateCollectionToLocales(collectionId, collectionName, fieldsToDelete) {
  console.log(`\n📋 Migrating ${collectionName}...`)
  
  try {
    const collection = await webflowRequest(`/collections/${collectionId}`)
    console.log(`  Current fields: ${collection.fields.length}`)
    
    let deletedCount = 0
    let failedCount = 0
    
    for (const fieldSlug of fieldsToDelete) {
      const field = collection.fields.find(f => f.slug === fieldSlug)
      if (field) {
        console.log(`  🗑️  Deleting: ${field.displayName}`)
        try {
          await webflowRequest(`/collections/${collectionId}/fields/${field.id}`, {
            method: 'DELETE'
          })
          deletedCount++
          await new Promise(r => setTimeout(r, 300)) // Rate limit safety
        } catch (error) {
          console.error(`    ❌ Failed: ${error.message}`)
          failedCount++
        }
      }
    }
    
    console.log(`  ✅ ${collectionName}: ${deletedCount} deleted, ${failedCount} failed`)
  } catch (error) {
    console.error(`  ❌ ${collectionName} migration failed: ${error.message}`)
  }
}

async function migrateToLocales() {
  console.log('🚀 Migrating ALL collections to use Webflow locales...')
  console.log('='.repeat(60))
  
  try {
    // Creator
    await migrateCollectionToLocales(COLLECTIONS.creator, 'Creator', [
      'creator-name'
    ])
    
    // Artwork
    await migrateCollectionToLocales(COLLECTIONS.artwork, 'Artwork', [
      'work-title-english', 'work-title-german',
      'description-english', 'description-german'
    ])
    
    // Material
    await migrateCollectionToLocales(COLLECTIONS.material, 'Material', [
      'name-english', 'name-german',
      'description-english', 'description-german'
    ])
    
    // Finish
    await migrateCollectionToLocales(COLLECTIONS.finish, 'Finish', [
      'name-english', 'name-german',
      'description-english', 'description-german'
    ])
    
    // Medium
    await migrateCollectionToLocales(COLLECTIONS.medium, 'Medium', [
      'name-english', 'name-german',
      'description-english', 'description-german'
    ])
    
    // Category
    await migrateCollectionToLocales(COLLECTIONS.category, 'Category', [
      'name-english',
      'description-english'
    ])
    
    // Location
    await migrateCollectionToLocales(COLLECTIONS.location, 'Location', [
      'name-english', 'name-german',
      'description-english', 'description-german',
      'opening-times-english', 'opening-times-german'
    ])
    
    // Material Type
    await migrateCollectionToLocales(COLLECTIONS.materialType, 'Material Type', [
      'name-english', 'name-german',
      'description-english', 'description-german'
    ])
    
    console.log('\n✅ Migration complete for all collections!')
    console.log('Note: Single fields (name, description, etc.) can now be localized.')
    console.log('For Creator: biography and portrait fields may need to be recreated as RichText.')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  migrateToLocales().then(() => {
    console.log('✅ Done!')
    process.exit(0)
  }).catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
}

