require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.bak') })

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID

async function checkWebflowNeyuq() {
  // Get collections
  const collectionsRes = await fetch(`https://api.webflow.com/v2/sites/${WEBFLOW_SITE_ID}/collections`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'accept': 'application/json'
    }
  })
  const collections = await collectionsRes.json()
  
  const creatorsCollection = collections.collections.find(c => 
    c.slug === 'creators' || c.displayName.toLowerCase().includes('creator')
  )
  
  console.log('✅ Found Creators collection:', creatorsCollection.id)
  
  // Get all creators to find neyuQ
  const itemsRes = await fetch(`https://api.webflow.com/v2/collections/${creatorsCollection.id}/items`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'accept': 'application/json'
    }
  })
  const itemsData = await itemsRes.json()
  
  const neyuq = itemsData.items.find(item => 
    item.fieldData.name && item.fieldData.name.toLowerCase().includes('neyuq')
  )
  
  if (!neyuq) {
    console.log('❌ neyuQ not found in Webflow')
    return
  }
  
  console.log('\n📋 neyuQ ceramics in Webflow:\n')
  console.log('ID:', neyuq.id)
  console.log('Name:', neyuq.fieldData.name)
  console.log('\n🎨 Aggregate Fields:')
  console.log('creator-materials:', neyuq.fieldData['creator-materials'] || '❌ EMPTY')
  console.log('creator-finishes:', neyuq.fieldData['creator-finishes'] || '❌ EMPTY')
  console.log('creator-medium-types:', neyuq.fieldData['creator-medium-types'] || '❌ EMPTY')
  
  console.log('\n📝 All fieldData keys:')
  console.log(Object.keys(neyuq.fieldData).join(', '))
}

checkWebflowNeyuq().catch(console.error)

