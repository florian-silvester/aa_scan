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

function matchArtworkToAsset(artworkName, desc, assetFilename) {
  const artNorm = normalizeFilename(artworkName)
  const assetNorm = normalizeFilename(assetFilename)
  const descNorm = normalizeFilename(desc || '')
  
  // Extract the main title from artwork name (after the underscore)
  const titleMatch = artworkName.match(/_[^_]+$/)
  const mainTitle = titleMatch ? titleMatch[0].substring(1).toLowerCase() : ''
  
  // Extract key words from title (remove parentheses content)
  const cleanTitle = mainTitle.replace(/\([^)]+\)/g, '').trim()
  const titleWords = cleanTitle.split(/[_\s-]+/).filter(w => w.length > 2)
  
  // Extract year from description or artwork name
  const yearMatch = desc.match(/\b(19|20)\d{2}\b/) || artworkName.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? yearMatch[0] : null
  
  // Extract specific keywords from description
  const descLower = (desc || '').toLowerCase()
  const isVessels = descLower.includes('vessels') || descLower.includes('gefäße')
  const isVessel = descLower.includes('vessel') || descLower.includes('gefäß')
  const isCan = descLower.includes('can') || descLower.includes('dose')
  const isCooperation = descLower.includes('cooperation') || descLower.includes('kooperation')
  const hasSusanne = descLower.includes('susanne') || descLower.includes('mansen') || descLower.includes('hansen')
  
  // Check if ALL important title words appear in asset filename
  const importantWords = titleWords.filter(w => 
    !['the', 'and', 'von', 'und', 'mit', 'aus', 'der', 'die', 'das'].includes(w)
  )
  
  if (importantWords.length === 0) return false
  
  // Require title words to match
  const titleMatches = importantWords.filter(word => assetNorm.includes(word)).length
  if (titleMatches < Math.min(importantWords.length, 2)) return false
  
  // Score based on additional matches
  let score = titleMatches
  
  // Year match bonus
  if (year && assetNorm.includes(year)) score += 2
  
  // Specific type matches
  if (isCan && assetNorm.includes('dose')) score += 2
  if (isCan && assetNorm.includes('can')) score += 2
  if (isVessels && assetNorm.includes('gefaess-paar')) score += 2
  if (isVessel && !isVessels && assetNorm.includes('gefaess') && !assetNorm.includes('gefaess-paar')) score += 2
  if (isCooperation && hasSusanne && assetNorm.includes('susanne')) score += 2
  
  // Reject obviously wrong matches
  if (assetNorm.includes('kingelez') && !assetNorm.includes('ute')) return false
  
  return score >= 2
}

async function restoreImages() {
  console.log('🖼️  RESTORING MISSING IMAGES\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  console.log(`Mode: ${doApply ? 'APPLY' : 'DRY-RUN'}\n`)
  
  // Get artworks missing images
  const artworks = await client.fetch(`
    *[_type == "artwork" && mainImage.asset == null && defined(mainImage) && (name match "*Ute Kathrin Beck*" || name match "*Sarah Cossham*")] {
      _id,
      name,
      year,
      "descEn": description.en,
      "descDe": description.de,
      mainImage{
        alt
      }
    }
  `)
  
  console.log(`📋 Found ${artworks.length} artworks missing images\n`)
  
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
  
  for (const art of artworks) {
    const desc = art.descEn || art.descDe || ''
    
    // Find matching assets
    const matches = allAssets.filter(asset => 
      matchArtworkToAsset(art.name, desc, asset.originalFilename)
    )
    
    if (matches.length === 0) {
      console.log(`❌ No match: ${art.name}`)
      noMatch++
      continue
    }
    
    // Take best match (first one for now)
    const match = matches[0]
    
    console.log(`✅ Match: ${art.name}`)
    console.log(`   → Asset: ${match.originalFilename} (score: ${scoredMatches[0].score})`)
    if (scoredMatches.length > 1) {
      console.log(`   Other candidates: ${scoredMatches.slice(1, 3).map(m => m.asset.originalFilename).join(', ')}`)
    }
    
    if (doApply) {
      try {
        // Preserve alt text, only set asset reference
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

restoreImages().catch(console.error)

