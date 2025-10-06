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

// Mapping: old category ID → new medium name
const CATEGORY_MIGRATION_MAP = {
  'category-art-jewelry': 'Jewelry',
  'category-design-jewelry': 'Jewelry',
  'category-ceramic-art': 'Ceramics',
  'category-studio-glass': 'Glass',
  'category-metal-art': 'Metalwork',
  'category-textile-accessories': 'Textiles',
  'category-rugs-interior-textiles': 'Textiles',
  'category-woodwork-paper': 'Woodwork',
  'category-furniture-objects': 'Woodwork',
  // To delete:
  'category-lighting': null,
  'category-diverse-design-objects': null
}

// New medium categories to create
const NEW_MEDIUMS = [
  { id: 'medium-jewelry', titleEn: 'Jewelry', titleDe: 'Schmuck' },
  { id: 'medium-ceramics', titleEn: 'Ceramics', titleDe: 'Keramik' },
  { id: 'medium-glass', titleEn: 'Glass', titleDe: 'Glas' },
  { id: 'medium-metalwork', titleEn: 'Metalwork', titleDe: 'Metallarbeiten' },
  { id: 'medium-textiles', titleEn: 'Textiles', titleDe: 'Textilien' },
  { id: 'medium-woodwork', titleEn: 'Woodwork', titleDe: 'Holzarbeiten' }
]

function generateSlug(text) {
  if (!text) return 'untitled'
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function migrateCategoriesToMedium() {
  console.log('🚀 Migrating Categories to Medium...')
  console.log('='.repeat(80))
  
  try {
    // Step 1: Create new medium documents
    console.log('\n📝 Step 1: Creating new Medium documents...')
    const newMediumIds = {}
    
    for (const medium of NEW_MEDIUMS) {
      console.log(`  Creating: ${medium.titleEn}`)
      try {
        const doc = await sanityClient.createIfNotExists({
          _id: medium.id,
          _type: 'category', // Still using 'category' type for now
          title: {
            en: medium.titleEn,
            de: medium.titleDe
          },
          slug: {
            _type: 'slug',
            current: generateSlug(medium.titleEn)
          }
        })
        newMediumIds[medium.titleEn] = doc._id
        console.log(`    ✅ Created: ${doc._id}`)
      } catch (error) {
        console.error(`    ❌ Failed: ${error.message}`)
      }
    }
    
    // Step 2: Find all artworks and creators using old categories
    console.log('\n🔍 Step 2: Finding artworks and creators to remap...')
    
    const artworks = await sanityClient.fetch(`
      *[_type == "artwork" && defined(category._ref)] {
        _id,
        name,
        "categoryId": category._ref
      }
    `)
    
    const creators = await sanityClient.fetch(`
      *[_type == "creator" && defined(category._ref)] {
        _id,
        name,
        "categoryId": category._ref
      }
    `)
    
    console.log(`  Found ${artworks.length} artworks with categories`)
    console.log(`  Found ${creators.length} creators with categories`)
    
    // Step 3: Remap artworks
    console.log('\n🔄 Step 3: Remapping artworks to new mediums...')
    let artworkUpdated = 0
    let artworkSkipped = 0
    
    for (const artwork of artworks) {
      const oldCategoryId = artwork.categoryId
      const newMediumName = CATEGORY_MIGRATION_MAP[oldCategoryId]
      
      if (newMediumName === null) {
        // Delete category reference
        console.log(`  🗑️  Removing category from: ${artwork.name}`)
        try {
          await sanityClient.patch(artwork._id).unset(['category']).commit()
          artworkSkipped++
        } catch (e) {
          console.error(`    ❌ Failed: ${e.message}`)
        }
      } else if (newMediumName) {
        const newMediumId = newMediumIds[newMediumName]
        console.log(`  ↳ ${artwork.name}: ${oldCategoryId} → ${newMediumName}`)
        try {
          await sanityClient.patch(artwork._id)
            .set({ category: { _type: 'reference', _ref: newMediumId } })
            .commit()
          artworkUpdated++
        } catch (e) {
          console.error(`    ❌ Failed: ${e.message}`)
        }
      }
      
      await new Promise(r => setTimeout(r, 50))
    }
    
    // Step 4: Remap creators
    console.log('\n🔄 Step 4: Remapping creators to new mediums...')
    let creatorUpdated = 0
    let creatorSkipped = 0
    
    for (const creator of creators) {
      const oldCategoryId = creator.categoryId
      const newMediumName = CATEGORY_MIGRATION_MAP[oldCategoryId]
      
      if (newMediumName === null) {
        // Delete category reference
        console.log(`  🗑️  Removing category from: ${creator.name}`)
        try {
          await sanityClient.patch(creator._id).unset(['category']).commit()
          creatorSkipped++
        } catch (e) {
          console.error(`    ❌ Failed: ${e.message}`)
        }
      } else if (newMediumName) {
        const newMediumId = newMediumIds[newMediumName]
        console.log(`  ↳ ${creator.name}: ${oldCategoryId} → ${newMediumName}`)
        try {
          await sanityClient.patch(creator._id)
            .set({ category: { _type: 'reference', _ref: newMediumId } })
            .commit()
          creatorUpdated++
        } catch (e) {
          console.error(`    ❌ Failed: ${e.message}`)
        }
      }
      
      await new Promise(r => setTimeout(r, 50))
    }
    
    console.log('\n✅ Migration complete!')
    console.log(`  📊 Artworks: ${artworkUpdated} updated, ${artworkSkipped} category removed`)
    console.log(`  📊 Creators: ${creatorUpdated} updated, ${creatorSkipped} category removed`)
    console.log('\n⚠️  Next steps:')
    console.log('  1. Manually rename "Category" to "Medium" in Webflow Designer')
    console.log('  2. Run sync to push new mediums to Webflow')
    console.log('  3. Delete old category documents in Sanity if needed')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  migrateCategoriesToMedium().then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  }).catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
}
