require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.bak') })
const sanityClient = require('@sanity/client')

const client = sanityClient.createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
})

function slugToTitle(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function fixMissingTitles() {
  console.log('🔧 Fixing missing names...\n')
  
  // Get all items missing names
  const materials = await client.fetch(`*[_type == 'material' && !defined(name)]`)
  const finishes = await client.fetch(`*[_type == 'finish' && !defined(name)]`)
  const mediums = await client.fetch(`*[_type == 'medium' && !defined(name)]`)
  
  let fixed = 0
  
  // Fix materials
  for (const item of materials) {
    const slug = item.slug?.current || item._id
    const title = slugToTitle(slug)
    
    await client
      .patch(item._id)
      .set({
        name: {
          en: title,
          de: title // Start with English, can translate later
        }
      })
      .commit()
    
    console.log(`✅ Material: ${slug} → "${title}"`)
    fixed++
  }
  
  // Fix finishes
  for (const item of finishes) {
    const slug = item.slug?.current || item._id
    const title = slugToTitle(slug)
    
    await client
      .patch(item._id)
      .set({
        name: {
          en: title,
          de: title
        }
      })
      .commit()
    
    console.log(`✅ Finish: ${slug} → "${title}"`)
    fixed++
  }
  
  // Fix mediums
  for (const item of mediums) {
    const slug = item.slug?.current || item._id
    const title = slugToTitle(slug)
    
    await client
      .patch(item._id)
      .set({
        name: {
          en: title,
          de: title
        }
      })
      .commit()
    
    console.log(`✅ Medium: ${slug} → "${title}"`)
    fixed++
  }
  
  console.log(`\n✅ Fixed ${fixed} items!`)
  console.log('Now run the creator sync again.')
}

fixMissingTitles().catch(console.error)

