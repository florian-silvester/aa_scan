import {createClient} from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01'
})

async function checkData() {
  try {
    console.log('=== SANITY DATA OVERVIEW ===')
    
    const materialTypes = await client.fetch('*[_type == "materialType"] | order(sortOrder)')
    const materials = await client.fetch('*[_type == "material"] | order(sortOrder)')
    const mediums = await client.fetch('*[_type == "medium"] | order(sortOrder)')
    const finishes = await client.fetch('*[_type == "finish"] | order(sortOrder)')
    const creators = await client.fetch('*[_type == "creator"]')
    const artworks = await client.fetch('*[_type == "artwork"]')
    
    console.log(`Material Types: ${materialTypes.length}`)
    console.log(`Materials: ${materials.length}`)
    console.log(`Mediums: ${mediums.length}`)
    console.log(`Finishes: ${finishes.length}`)
    console.log(`Creators: ${creators.length}`)
    console.log(`Artworks: ${artworks.length}`)
    
    if (materialTypes.length > 0) {
      console.log('\n=== SAMPLE MATERIAL TYPE ===')
      console.log(JSON.stringify(materialTypes[0], null, 2))
    }
    
    if (materials.length > 0) {
      console.log('\n=== SAMPLE MATERIAL ===')
      console.log(JSON.stringify(materials[0], null, 2))
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

checkData() 