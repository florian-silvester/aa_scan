import { createClient } from '@sanity/client'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFromRoot() {
  try {
    const envPath = join(__dirname, '../../.env')
    const env = readFileSync(envPath, 'utf8')
    env.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
        process.env[key.trim()] = value
      }
    })
  } catch (e) {}
}

loadEnvFromRoot()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

async function fixOneArtwork() {
  const artworkName = 'Ute Kathrin Beck_Glanz und Glimmer'
  const assetId = 'image-085c0aab49b7ddb33f1687be8b5ee945f0f128ee-1920x1300-jpg' // 56113_glanz-und-glimmer_ute-kathrin-beck.jpg
  
  console.log(`🔧 Fixing: ${artworkName}`)
  console.log(`   Asset ID: ${assetId}\n`)
  
  const art = await client.fetch(`*[_type == "artwork" && name == "${artworkName}"][0] {_id, mainImage}`)
  
  if (!art) {
    console.log('❌ Artwork not found')
    return
  }
  
  console.log('Current mainImage:', JSON.stringify(art.mainImage, null, 2))
  
  await client.patch(art._id).set({
    mainImage: {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: assetId
      },
      ...(art.mainImage?.alt ? { alt: art.mainImage.alt } : {})
    }
  }).commit()
  
  console.log('✅ FIXED')
}

fixOneArtwork().catch(console.error)

