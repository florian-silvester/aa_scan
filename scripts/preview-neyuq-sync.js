require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.bak') })
const sanityClient = require('@sanity/client')

const client = sanityClient.createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
})

async function previewNeyuqSync() {
  // Get neyuQ data exactly as sync would
  const creator = await client.fetch(`
    *[_type == "creator" && _id == "hEWOpVV05Nk2Wkv6vItQRB"][0] {
      _id,
      name,
      lastName,
      category,
      creatorMaterials[]->{_id, "title": title.en},
      creatorFinishes[]->{_id, "title": title.en},
      creatorMediumTypes[]->{_id, "title": title.en}
    }
  `)

  console.log('\n📋 neyuQ Ceramics - Preview of what would sync:\n')
  console.log('Name:', creator.name)
  console.log('Last Name:', creator.lastName || '(none)')
  console.log('\n🎨 NEW AGGREGATE FIELDS:')
  console.log('Materials:', creator.creatorMaterials?.map(m => m.title).join(', ') || '❌ NONE')
  console.log('Finishes:', creator.creatorFinishes?.map(f => f.title).join(', ') || '❌ NONE')
  console.log('Medium Types:', creator.creatorMediumTypes?.map(m => m.title).join(', ') || '❌ NONE')
  
  console.log('\n✅ This looks good? These are the NEW fields that would be added.')
  console.log('⚠️  If materials/finishes/mediums show as "NONE", the aggregation might have failed.\n')
}

previewNeyuqSync().catch(console.error)

