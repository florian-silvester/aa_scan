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

function normalizeFilename(filename) {
  return filename?.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchArtworkToAsset(artworkName, assetFilename) {
  const artNorm = normalizeFilename(artworkName)
  const assetNorm = normalizeFilename(assetFilename)
  
  // Extract key words from artwork name
  const artWords = artworkName.toLowerCase().split(/[_\s-]+/).filter(w => w.length > 2)
  
  // Check if artwork words appear in asset filename
  const matches = artWords.filter(word => assetNorm.includes(word)).length
  return matches >= 2 // At least 2 words match
}

async function restoreAssetReferences() {
  console.log('🔧 RESTORING BROKEN ASSET REFERENCES\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  console.log(`Mode: ${doApply ? 'APPLY' : 'DRY-RUN'}\n`)
  
  // Get broken artworks
  const brokenArtworks = await client.fetch(`
    *[_type == "artwork" && !defined(mainImage.asset._ref) && defined(mainImage)] {
      _id,
      name,
      mainImage{
        alt
      }
    }
  `)
  
  console.log(`📋 Found ${brokenArtworks.length} artworks with broken asset references\n`)
  
  // Get all assets
  const allAssets = await client.fetch(`
    *[_type == "sanity.imageAsset"] {
      _id,
      originalFilename
    }
  `)
  
  console.log(`📁 Found ${allAssets.length} total assets\n`)
  
  let restored = 0
  let noMatch = 0
  
  for (const art of brokenArtworks) {
    // Try to find matching asset
    const matches = allAssets.filter(asset => 
      matchArtworkToAsset(art.name, asset.originalFilename)
    )
    
    if (matches.length === 0) {
      console.log(`❌ No match for: ${art.name}`)
      noMatch++
      continue
    }
    
    // Take first match (or best match)
    const match = matches[0]
    
    console.log(`✅ Match: ${art.name} → ${match.originalFilename}`)
    
    if (doApply) {
      try {
        await client.patch(art._id).set({
          'mainImage.asset': {
            _type: 'reference',
            _ref: match._id
          }
        }).commit()
        restored++
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`)
      }
    } else {
      restored++
    }
  }
  
  console.log(`\n✅ ${doApply ? 'Restored' : 'Would restore'}: ${restored}`)
  console.log(`❌ No match: ${noMatch}`)
}

restoreAssetReferences().catch(console.error)

