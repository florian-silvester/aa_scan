import { createClient } from '@sanity/client'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import https from 'https'

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

async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
      res.on('error', reject)
    })
  })
}

function normalizeFilename(filename) {
  return filename
    .toLowerCase()
    .replace(/-\d+x\d+/, '') // Remove size suffixes like -1024x693
    .replace(/-\d+\.jpg$/, '.jpg') // Remove trailing numbers before .jpg
    .replace(/\.jpg$/, '') // Remove extension
}

function filenamesMatch(websiteFilename, sanityFilename) {
  const websiteNorm = normalizeFilename(websiteFilename)
  const sanityNorm = normalizeFilename(sanityFilename)
  
  // EXACT match only after normalization
  return websiteNorm === sanityNorm
}

async function matchProfileImagesToArtworks(profileUrl, creatorName) {
  console.log(`\n🌐 Fetching: ${profileUrl}`)
  
  const html = await fetchHTML(profileUrl)
  
  // Extract image URLs with their exact captions from data-cycle-caption
  const imageMatches = []
  
  // Match pattern: data-cycle-title='...' ... data-cycle-caption='...' ... src="..."
  // Handle multi-line matches
  const pattern = /data-cycle-title='([^']+)'.*?data-cycle-caption='([^']+)'.*?src="([^"]+)"/gis
  let match
  
  while ((match = pattern.exec(html)) !== null) {
    const imageTitle = match[1]
    const caption = match[2]
    const imageUrl = match[3]
    
    imageMatches.push({
      imageTitle,
      caption,
      imageUrl,
      filename: imageUrl.split('/').pop()
    })
  }
  
  console.log(`📸 Found ${imageMatches.length} images with captions\n`)
  
  // Get artworks for this creator that are MISSING images
  const artworks = await client.fetch(`
    *[_type == "artwork" && creator->name match "${creatorName}*" && !defined(mainImage.asset._ref)] {
      _id,
      name,
      "descEn": description.en,
      "descDe": description.de,
      mainImage{
        alt
      }
    }
  `)
  
  // Get all assets
  const allAssets = await client.fetch(`
    *[_type == "sanity.imageAsset"] {
      _id,
      originalFilename
    }
  `)
  
  // Match image URLs from profile to assets by EXACT filename matching
  const imageToAssetMap = new Map()
  const usedAssets = new Set()
  
  for (const img of imageMatches) {
    // Find exact matching asset
    for (const asset of allAssets) {
      if (usedAssets.has(asset._id)) continue
      
      if (filenamesMatch(img.filename, asset.originalFilename || '')) {
        imageToAssetMap.set(img.imageUrl, asset)
        usedAssets.add(asset._id)
        break // Only one match per image
      }
    }
  }
  
  console.log(`🔗 Matched ${imageToAssetMap.size} images to assets\n`)
  
  // Clean caption text (remove HTML tags, normalize)
  function cleanCaption(text) {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/\[[^\]]+\]/g, '') // Remove [Intestine] type notes
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }
  
  // Match artworks to images by EXACT caption match only
  const matches = []
  const usedArtworks = new Set()
  const usedImageUrls = new Set()
  
  for (const artwork of artworks) {
    const descEn = cleanCaption(artwork.descEn || '')
    const descDe = cleanCaption(artwork.descDe || '')
    
    // Find matching image with EXACT caption match
    for (const img of imageMatches) {
      if (usedImageUrls.has(img.imageUrl)) continue
      
      const asset = imageToAssetMap.get(img.imageUrl)
      if (!asset) continue
      
      const websiteCaption = cleanCaption(img.caption)
      
      // EXACT match only - captions must match exactly (after cleaning)
      if (descEn === websiteCaption || descDe === websiteCaption) {
        matches.push({
          artwork,
          imageMatch: img,
          asset,
          caption: img.caption
        })
        usedArtworks.add(artwork._id)
        usedImageUrls.add(img.imageUrl)
        break
      }
    }
  }
  
  return matches
}

async function main() {
  console.log('🔍 Matching profile page images to artworks\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  const profiles = [
    { url: 'https://artaurea.com/profiles/sarah-cossham/', name: 'Sarah Cossham' },
    { url: 'https://artaurea.com/profiles/beck-ute-kathrin-2/', name: 'Ute Kathrin Beck' }
  ]
  
  const allMatches = []
  
  for (const profile of profiles) {
    const matches = await matchProfileImagesToArtworks(profile.url, profile.name)
    allMatches.push(...matches)
    
    console.log(`\n✅ Found ${matches.length} matches for ${profile.name}:`)
    matches.forEach(m => {
      console.log(`   ${m.artwork.name}`)
      console.log(`   → Caption: ${m.caption}`)
      console.log(`   → Asset: ${m.asset.originalFilename}`)
      console.log('')
    })
  }
  
  console.log(`\n📊 Total matches: ${allMatches.length}`)
  
  if (doApply && allMatches.length > 0) {
    console.log('\n✅ Applying fixes...')
    for (const match of allMatches) {
      try {
        await client.patch(match.artwork._id).set({
          'mainImage.asset': {
            _type: 'reference',
            _ref: match.asset._id
          }
        }).commit()
        console.log(`   ✅ ${match.artwork.name}`)
      } catch (error) {
        console.error(`   ❌ ${match.artwork.name}: ${error.message}`)
      }
    }
  } else if (allMatches.length > 0) {
    console.log('\n🔎 Run with --apply to update artworks')
  }
}

main().catch(console.error)
