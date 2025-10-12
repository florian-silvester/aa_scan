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
  createClient = require(path.join(__dirname, '..', 'sanity-cms', 'node_modules', '@sanity', 'client')).createClient
}

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID

async function test() {
  console.log('🧪 Testing single creator with both locales\n')
  
  // Get locale IDs
  const siteInfo = await fetch(`https://api.webflow.com/v2/sites/${WEBFLOW_SITE_ID}`, {
    headers: { 'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}` }
  }).then(r => r.json())
  
  const enLocaleId = siteInfo.locales.primary.cmsLocaleId
  const deLocaleId = siteInfo.locales.secondary[0].cmsLocaleId
  
  console.log(`EN locale: ${enLocaleId}`)
  console.log(`DE locale: ${deLocaleId}\n`)
  
  // Get Tora Urup from Sanity
  const creator = await sanityClient.fetch(`
    *[_type == "creator" && name == "Tora Urup"][0] {
      _id,
      name,
      lastName,
      biography,
      portrait,
      nationality,
      specialties,
      slug
    }
  `)
  
  if (!creator) {
    console.log('❌ Tora Urup not found in Sanity')
    return
  }
  
  console.log(`Found in Sanity: ${creator.name}\n`)
  
  // Get Webflow collection
  const collections = await fetch(`https://api.webflow.com/v2/sites/${WEBFLOW_SITE_ID}/collections`, {
    headers: { 'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}` }
  }).then(r => r.json())
  
  const creatorCollection = collections.collections.find(c => c.slug === 'creator')
  
  // Get Tora's Webflow ID
  const wfItems = await fetch(`https://api.webflow.com/v2/collections/${creatorCollection.id}/items`, {
    headers: { 'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}` }
  }).then(r => r.json())
  
  const toraWF = wfItems.items.find(i => i.fieldData.name === 'Tora Urup')
  
  if (!toraWF) {
    console.log('❌ Tora Urup not found in Webflow')
    return
  }
  
  console.log(`Webflow ID: ${toraWF.id}\n`)
  
  // Step 1: Update EN locale
  console.log('Step 1: Updating EN locale...')
  const enUpdate = await fetch(`https://api.webflow.com/v2/collections/${creatorCollection.id}/items`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: [{
        id: toraWF.id,
        cmsLocaleId: enLocaleId,
        fieldData: {
          'portrait-english': creator.portrait?.en?.map(b => b.children?.map(c => c.text).join('')).join(' ') || '',
          biography: creator.biography?.en?.map(b => b.children?.map(c => c.text).join('')).join(' ') || '',
          nationality: creator.nationality?.en || '',
          specialties: creator.specialties?.en?.join(', ') || ''
        }
      }]
    })
  })
  
  const enResult = await enUpdate.json()
  console.log(`  Status: ${enUpdate.status}`)
  console.log(`  Response locale: ${enResult.items?.[0]?.cmsLocaleId}`)
  console.log(`  Match: ${enResult.items?.[0]?.cmsLocaleId === enLocaleId ? '✅' : '❌'}\n`)
  
  // Step 2: Create DE locale
  console.log('Step 2: Creating DE locale...')
  const deCreate = await fetch(`https://api.webflow.com/v2/collections/${creatorCollection.id}/items`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: [{
        id: toraWF.id,
        cmsLocaleId: deLocaleId,
        fieldData: {
          name: creator.name,
          slug: creator.slug?.current || 'tora-urup',
          'last-name': creator.lastName || '',
          'portrait-english': creator.portrait?.de?.map(b => b.children?.map(c => c.text).join('')).join(' ') || '',
          biography: creator.biography?.de?.map(b => b.children?.map(c => c.text).join('')).join(' ') || '',
          nationality: creator.nationality?.de || '',
          specialties: creator.specialties?.de?.join(', ') || ''
        },
        isDraft: false
      }]
    })
  })
  
  const deResult = await deCreate.json()
  console.log(`  Status: ${deCreate.status}`)
  console.log(`  Response locale: ${deResult.items?.[0]?.cmsLocaleId}`)
  console.log(`  Match: ${deResult.items?.[0]?.cmsLocaleId === deLocaleId ? '✅ YES!' : '❌'}\n`)
  
  if (deResult.items?.[0]?.cmsLocaleId === deLocaleId) {
    console.log('🎉 DE LOCALE CREATED SUCCESSFULLY!\n')
    
    // Verify
    await new Promise(r => setTimeout(r, 2000))
    const verify = await fetch(`https://api.webflow.com/v2/collections/${creatorCollection.id}/items/${toraWF.id}?cmsLocaleId=${deLocaleId}`, {
      headers: { 'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}` }
    }).then(r => r.json())
    
    console.log('Verified DE content:')
    console.log(`  Portrait: ${verify.fieldData['portrait-english']?.substring(0, 80)}...`)
    console.log(`  Biography: ${verify.fieldData.biography?.substring(0, 80)}...`)
  } else {
    console.log('❌ Failed:', JSON.stringify(deResult).substring(0, 300))
  }
}

test().catch(console.error)

