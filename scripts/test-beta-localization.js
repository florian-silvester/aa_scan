const fs = require('fs')
const path = require('path')

// Load env
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=')
    if (k && v) process.env[k.trim()] = v.trim()
  })
}

let createClient
try {
  createClient = require('@sanity/client').createClient
} catch (e) {
  createClient = require(path.join(__dirname, '..', 'sanity-cms', 'node_modules', '@sanity', 'client')).createClient
}

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN
})

const API = 'https://api.webflow.com'

async function run() {
  const site = await fetch(`${API}/v2/sites/${process.env.WEBFLOW_SITE_ID}`, {
    headers: { Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` }
  }).then(r => r.json())

  const en = site.locales.primary.cmsLocaleId
  const de = site.locales.secondary[0].cmsLocaleId

  const cols = await fetch(`${API}/v2/sites/${process.env.WEBFLOW_SITE_ID}/collections`, {
    headers: { Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` }
  }).then(r => r.json())

  const creatorCol = cols.collections.find(c => c.slug === 'creator')

  const creator = await sanity.fetch(`*[_type=="creator" && slug.current=="api-test"][0]{
    name, lastName, slug, portrait, biography, nationality, specialties
  }`)
  if (!creator) {
    console.log('❌ Sanity creator not found')
    return
  }

  const extract = blocks => (blocks || []).map(b => (b.children || []).map(c => c.text).join('')).join(' ')

  const enFields = {
    name: creator.name,
    slug: creator.slug?.current || 'api-test',
    'last-name': creator.lastName || '',
    'portrait-english': extract(creator.portrait?.en),
    biography: extract(creator.biography?.en),
    nationality: creator.nationality?.en || '',
    specialties: (creator.specialties?.en || []).join(', ')
  }

  console.log('Creating EN item...')
  const createEn = await fetch(`${API}/v2/collections/${creatorCol.id}/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items: [{ fieldData: enFields, isDraft: false }] })
  }).then(r => r.json())

  const itemId = createEn.items?.[0]?.id
  if (!itemId) {
    console.log('❌ EN create failed:', JSON.stringify(createEn).substring(0, 300))
    return
  }
  console.log('EN item ID:', itemId)

  const deFields = {
    ...enFields,
    'portrait-english': extract(creator.portrait?.de),
    biography: extract(creator.biography?.de),
    nationality: creator.nationality?.de || '',
    specialties: (creator.specialties?.de || []).join(', ')
  }

  console.log('Attaching DE via beta /localizations...')
  const addDe = await fetch(`${API}/beta/collections/${creatorCol.id}/items/${itemId}/localizations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cmsLocaleId: de, fieldData: deFields, isDraft: false })
  })
  const addText = await addDe.text()
  console.log('beta status:', addDe.status)
  console.log('beta response:', addText.substring(0, 400))

  await new Promise(r => setTimeout(r, 3000))
  const verify = await fetch(`${API}/v2/collections/${creatorCol.id}/items/${itemId}?cmsLocaleId=${de}`, {
    headers: { Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` }
  })
  console.log('verify status:', verify.status)
  const vtext = await verify.text()
  console.log('verify body:', vtext.substring(0, 400))
}

run().catch(err => {
  console.error('❌ ERROR:', err)
})
