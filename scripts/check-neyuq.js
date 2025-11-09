require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.bak') })
const sanityClient = require('@sanity/client')

const client = sanityClient.createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
})

async function checkNeyuq() {
  const creator = await client.fetch(`
    *[_type == "creator" && name match "neyuQ*"][0] {
      _id,
      name,
      creatorMaterials[]->{_id, "title": title.en},
      creatorFinishes[]->{_id, "title": title.en},
      creatorMediumTypes[]->{_id, "title": title.en}
    }
  `)

  console.log('\n✨ neyuQ ceramics:\n')
  console.log('ID:', creator._id)
  console.log('\nMaterials:', creator.creatorMaterials?.map(m => m.title).join(', ') || 'None')
  console.log('Finishes:', creator.creatorFinishes?.map(f => f.title).join(', ') || 'None')
  console.log('Medium Types:', creator.creatorMediumTypes?.map(m => m.title).join(', ') || 'None')
  console.log('\n📋 Copy this ID for sync:', creator._id)
}

checkNeyuq().catch(console.error)

