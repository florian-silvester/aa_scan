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
  try {
    createClient = require(path.join(__dirname, '..', 'sanity-cms', 'node_modules', '@sanity', 'client')).createClient
  } catch (e2) {
    throw new Error("@sanity/client not found")
  }
}

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

// Old category IDs to delete
const OLD_CATEGORY_IDS = [
  'category-art-jewelry',
  'category-design-jewelry',
  'category-ceramic-art',
  'category-studio-glass',
  'category-metal-art',
  'category-textile-accessories',
  'category-rugs-interior-textiles',
  'category-woodwork-paper',
  'category-furniture-objects',
  'category-lighting',
  'category-diverse-design-objects'
]

async function deleteOldCategories() {
  console.log('🗑️  Deleting old category documents from Sanity...')
  console.log('='.repeat(80))
  
  try {
    let deletedCount = 0
    let notFoundCount = 0
    
    for (const id of OLD_CATEGORY_IDS) {
      try {
        const doc = await sanityClient.getDocument(id)
        if (doc) {
          console.log(`  Deleting: ${doc.title?.en || id}`)
          await sanityClient.delete(id)
          deletedCount++
        } else {
          notFoundCount++
        }
      } catch (error) {
        if (error.statusCode === 404) {
          console.log(`  ⏭️  Not found: ${id}`)
          notFoundCount++
        } else {
          console.error(`  ❌ Failed to delete ${id}: ${error.message}`)
        }
      }
      
      await new Promise(r => setTimeout(r, 200))
    }
    
    console.log(`\n✅ Complete!`)
    console.log(`  📊 ${deletedCount} old categories deleted`)
    console.log(`  ⏭️  ${notFoundCount} not found (already deleted)`)
    console.log(`\n💡 Now sync to Webflow to remove them there:`)
    console.log(`   node api/sync-to-webflow.js --only=category --publish`)
    
  } catch (error) {
    console.error('❌ Deletion failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  deleteOldCategories().then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  }).catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
}
