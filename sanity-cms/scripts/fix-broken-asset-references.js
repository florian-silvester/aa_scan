import { createClient } from '@sanity/client'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env from root
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
  } catch (e) {
    // .env file doesn't exist, use system env
  }
}

loadEnvFromRoot()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

async function fixBrokenAssetReferences() {
  console.log('🔧 FIXING BROKEN ASSET REFERENCES\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  console.log(`Mode: ${doApply ? 'APPLY' : 'DRY-RUN'}\n`)
  
  // Find artworks with broken mainImage.asset but have images array
  const query = `*[_type == "artwork" && !defined(mainImage.asset._ref) && defined(mainImage) && count(images) > 0] {
    _id,
    name,
    mainImage{
      alt
    },
    images[0]{
      asset->{
        _id
      },
      alt
    },
    "imagesRef": images[0].asset._ref
  }`
  
  const artworks = await client.fetch(query)
  console.log(`📋 Found ${artworks.length} artworks with broken asset references\n`)
  
  let fixed = 0
  let skipped = 0
  
  for (const art of artworks) {
    const assetRef = art.imagesRef || art.images?.[0]?.asset?._id
    
    if (!assetRef) {
      console.log(`⏭️  Skipping ${art._id}: No asset reference in images array`)
      skipped++
      continue
    }
    
    // Restore mainImage with asset reference, preserve alt text
    const patch = {
      mainImage: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: assetRef
        },
        ...(art.mainImage?.alt ? { alt: art.mainImage.alt } : {})
      }
    }
    
    if (doApply) {
      try {
        await client.patch(art._id).set(patch).commit()
        console.log(`✅ Fixed ${art._id}: ${art.name}`)
        fixed++
      } catch (error) {
        console.error(`❌ Failed to fix ${art._id}: ${error.message}`)
      }
    } else {
      console.log(`🔎 Would fix ${art._id}: ${art.name} → asset: ${assetRef.substring(0, 20)}...`)
      fixed++
    }
  }
  
  console.log(`\n✅ ${doApply ? 'Fixed' : 'Would fix'}: ${fixed}`)
  console.log(`⏭️  Skipped: ${skipped}`)
}

fixBrokenAssetReferences().catch(console.error)

