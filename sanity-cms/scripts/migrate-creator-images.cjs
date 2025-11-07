const path = require('path')
const fs = require('fs')

// Load environment variables
const envPath = path.join(__dirname, '../../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const createClient = require(path.join(__dirname, '../node_modules/@sanity/client')).createClient

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

async function migrateCreatorImages() {
  console.log('🔄 Migrating Creator Images:\n')
  console.log('  galleryImages[0] → portraitImage')
  console.log('  studioImages[0] → studioImage\n')
  console.log('='.repeat(60))
  
  // Find all creators with old array fields
  const creators = await sanityClient.fetch(`
    *[_type == "creator" && (defined(galleryImages) || defined(studioImages))] {
      _id,
      name,
      galleryImages,
      studioImages
    }
  `)
  
  console.log(`Found ${creators.length} creators with old image fields\n`)
  
  let migrated = 0
  let skipped = 0
  
  for (const creator of creators) {
    console.log(`📝 ${creator.name} (${creator._id})`)
    
    const firstGalleryImage = creator.galleryImages?.[0]
    const firstStudioImage = creator.studioImages?.[0]
    
    const updates = {}
    if (firstGalleryImage) {
      console.log(`  ✅ Migrating galleryImages[0] → portraitImage`)
      updates.portraitImage = firstGalleryImage
    }
    if (firstStudioImage) {
      console.log(`  ✅ Migrating studioImages[0] → studioImage`)
      updates.studioImage = firstStudioImage
    }
    
    if (Object.keys(updates).length > 0) {
      await sanityClient
        .patch(creator._id)
        .set(updates)
        .unset(['galleryImages', 'studioImages'])
        .commit()
      
      migrated++
    } else {
      console.log(`  🗑️  Removing empty galleryImages/studioImages arrays`)
      
      await sanityClient
        .patch(creator._id)
        .unset(['galleryImages', 'studioImages'])
        .commit()
      
      skipped++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Migration complete!`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Cleaned: ${skipped}`)
  console.log(`  Total: ${creators.length}\n`)
}

migrateCreatorImages().catch(console.error)

