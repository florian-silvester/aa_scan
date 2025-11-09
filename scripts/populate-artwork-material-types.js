import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.bak' })

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
})

async function getMaterialTypesForArtwork(artworkId, artworkName) {
  // Get all materials for this artwork and their material types
  const data = await client.fetch(`
    *[_id == $artworkId][0] {
      "materials": materials[]->{
        _id,
        "name": name.en,
        "materialType": materialType->{
          _id,
          "name": name.en
        }
      }
    }
  `, { artworkId })

  if (!data || !data.materials) {
    return []
  }

  // Collect unique material type IDs
  const materialTypeIds = new Set()
  
  data.materials.forEach(material => {
    // Skip null materials (broken references)
    if (!material) return
    
    if (material.materialType?._id) {
      materialTypeIds.add(material.materialType._id)
    }
  })

  // Convert to reference array with keys
  return Array.from(materialTypeIds).map(id => ({
    _type: 'reference',
    _ref: id,
    _key: id
  }))
}

async function updateArtwork(artworkId, artworkName, materialTypes) {
  if (materialTypes.length === 0) {
    console.log(`  ⚪ ${artworkName}: No material types found`)
    return false
  }

  try {
    await client.patch(artworkId)
      .set({ materialTypes })
      .commit()
    
    console.log(`  ✅ ${artworkName}: ${materialTypes.length} material type(s)`)
    return true
  } catch (error) {
    console.error(`  ❌ Error updating ${artworkName}:`, error.message)
    return false
  }
}

async function populateAllArtworks() {
  console.log('🎨 Populating Material Types on Artworks\n')

  // Get all artworks that have materials
  const artworks = await client.fetch(`
    *[_type == "artwork" && defined(materials) && count(materials) > 0] | order(name asc) {
      _id,
      name,
      "materialsCount": count(materials)
    }
  `)

  console.log(`📋 Found ${artworks.length} artworks with materials\n`)

  let updatedCount = 0
  let skippedCount = 0

  for (const artwork of artworks) {
    const materialTypes = await getMaterialTypesForArtwork(artwork._id, artwork.name)
    
    if (materialTypes.length > 0) {
      const success = await updateArtwork(artwork._id, artwork.name, materialTypes)
      if (success) updatedCount++
    } else {
      skippedCount++
    }
  }

  console.log(`\n✅ Complete!`)
  console.log(`   Updated: ${updatedCount}`)
  console.log(`   Skipped (no material types): ${skippedCount}`)
  console.log(`   Total artworks: ${artworks.length}\n`)
}

populateAllArtworks().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})

