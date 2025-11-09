/**
 * Populate creator aggregate fields (materials, finishes, medium types)
 * Run once to populate all creators, then use document action for updates
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.bak') })
const sanityClient = require('@sanity/client')

const client = sanityClient.createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
})

async function aggregateCreatorData(creatorId) {
  // Query all artworks by this creator
  const artworks = await client.fetch(`
    *[_type == "artwork" && creator._ref == $creatorId] {
      "materials": materials[]._ref,
      "materialTypes": materialTypes[]._ref,
      "finishes": finishes[]._ref,
      "medium": medium[]._ref
    }
  `, { creatorId })

  // Collect unique IDs
  const materialIds = new Set()
  const materialTypeIds = new Set()
  const finishIds = new Set()
  const mediumIds = new Set()

  artworks.forEach(artwork => {
    artwork.materials?.forEach(id => id && materialIds.add(id))
    artwork.materialTypes?.forEach(id => id && materialTypeIds.add(id))
    artwork.finishes?.forEach(id => id && finishIds.add(id))
    artwork.medium?.forEach(id => id && mediumIds.add(id))
  })

  return {
    materials: Array.from(materialIds).map(id => ({ 
      _type: 'reference', 
      _ref: id,
      _key: id  // Use the ref ID as the key
    })),
    materialTypes: Array.from(materialTypeIds).map(id => ({ 
      _type: 'reference', 
      _ref: id,
      _key: id
    })),
    finishes: Array.from(finishIds).map(id => ({ 
      _type: 'reference', 
      _ref: id,
      _key: id
    })),
    mediumTypes: Array.from(mediumIds).map(id => ({ 
      _type: 'reference', 
      _ref: id,
      _key: id
    }))
  }
}

async function updateCreator(creatorId, creatorName, aggregates) {
  const { materials, materialTypes, finishes, mediumTypes } = aggregates

  console.log(`  📊 ${creatorName}:`)
  console.log(`     Materials: ${materials.length}, Material Types: ${materialTypes.length}, Finishes: ${finishes.length}, Medium Types: ${mediumTypes.length}`)

  // Update the creator document
  await client
    .patch(creatorId)
    .set({
      creatorMaterials: materials,
      creatorMaterialTypes: materialTypes,
      creatorFinishes: finishes,
      creatorMediumTypes: mediumTypes
    })
    .commit()
}

async function populateAllCreators() {
  console.log('🎨 Populating Creator Aggregate Fields\n')

  // Get all creators
  const creators = await client.fetch(`
    *[_type == "creator"] {
      _id,
      name
    } | order(name asc)
  `)

  console.log(`📋 Found ${creators.length} creators\n`)

  let updated = 0
  let skipped = 0

  for (const creator of creators) {
    try {
      const aggregates = await aggregateCreatorData(creator._id)
      
      // Only update if there's data
      if (aggregates.materials.length > 0 || aggregates.finishes.length > 0 || aggregates.mediumTypes.length > 0) {
        await updateCreator(creator._id, creator.name, aggregates)
        updated++
      } else {
        console.log(`  ⚪ ${creator.name}: No artworks with materials/finishes/mediums`)
        skipped++
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${creator.name}:`, error.message)
    }
  }

  console.log(`\n✅ Complete!`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped: ${skipped}`)
}

// Run if called directly
if (require.main === module) {
  populateAllCreators()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Fatal error:', err)
      process.exit(1)
    })
}

module.exports = { aggregateCreatorData, updateCreator }

