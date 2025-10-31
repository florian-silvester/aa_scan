import { createClient } from '@sanity/client'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env from project root .env.bak if present
function loadEnvFromRoot() {
  try {
    const root = join(__dirname, '../..')
    const envBak = join(root, '.env.bak')
    if (fs.existsSync(envBak)) {
      const text = fs.readFileSync(envBak, 'utf8')
      text.split(/\r?\n/).forEach(line => {
        const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
        if (m) {
          const key = m[1]
          let val = m[2]
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
            val = val.slice(1, -1)
          }
          process.env[key] = val
        }
      })
    }
  } catch (_) {}
}

loadEnvFromRoot()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

async function main() {
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  const clearImages = argv.includes('--clear-images')
  const limitArg = argv.find(a => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null

  if (!process.env.SANITY_API_TOKEN) {
    console.error('❌ Missing SANITY_API_TOKEN in environment')
    process.exit(1)
  }

  console.log(`🚀 Migrating artwork images[0] -> mainImage`)
  console.log(`   Mode: ${doApply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`   Clear images array: ${clearImages ? 'YES' : 'NO'}`)
  if (limit) console.log(`   Limit: ${limit} artworks`)
  console.log('')

  // Find all artworks with images array
  const query = `*[_type == "artwork" && count(images) > 0] | order(_createdAt asc) {
    _id,
    name,
    workTitle,
    mainImage{
      asset->{
        _id
      }
    },
    images[0]{
      asset->{
        _id,
        url,
        originalFilename
      },
      alt
    },
    "imagesRef": images[0].asset._ref
  }`

  let artworks = await client.fetch(query)
  if (limit && Number.isFinite(limit) && artworks.length > limit) {
    artworks = artworks.slice(0, limit)
  }

  console.log(`📋 Found ${artworks.length} artworks with images array\n`)

  let updated = 0
  let skipped = 0
  let alreadyHasMainImage = 0
  let processed = 0

  for (const art of artworks) {
    processed++
    const firstImage = art.images?.[0]
    const imageAssetId = art.imagesRef || firstImage?.asset?._id
    const hasMainImage = art.mainImage?.asset?._id
    
    // Show progress every 50 items
    if (processed % 50 === 0) {
      console.log(`\n📊 Progress: ${processed}/${artworks.length} (${Math.round(processed/artworks.length*100)}%)`)
      console.log(`   Updated: ${updated} | Already set: ${alreadyHasMainImage} | Skipped: ${skipped}\n`)
    }
    
    if (!imageAssetId) {
      if (processed <= 5) console.log(`⏭️  Skipping ${art._id}: No valid first image`)
      skipped++
      continue
    }

    // If mainImage already exists and matches, skip migration but clear images if requested
    if (hasMainImage && hasMainImage === imageAssetId) {
      if (processed <= 5) console.log(`✓ ${art._id}: mainImage already matches images[0]`)
      alreadyHasMainImage++
      if (clearImages && doApply) {
        await client.patch(art._id).set({ images: [] }).commit()
        if (processed <= 5) console.log(`  🗑️  Cleared images array`)
      }
      continue
    }

    const artworkName = art.name || art.workTitle?.en || art.workTitle?.de || 'Untitled'
    
    const patch = {
      mainImage: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: imageAssetId
        },
        ...(firstImage?.alt ? { alt: firstImage.alt } : {})
      }
    }

    if (doApply) {
      let p = client.patch(art._id).set(patch)
      if (clearImages) {
        p = p.set({ images: [] })
      }
      await p.commit()
      updated++
      if (processed <= 5 || updated <= 5) {
        console.log(`✅ ${art._id}: Moved images[0] → mainImage`)
        console.log(`   Name: ${artworkName}`)
        if (clearImages) console.log(`   🗑️  Cleared images array`)
      }
    } else {
      if (processed <= 10) {
        console.log(`🔎 Would migrate ${art._id}: images[0] → mainImage`)
        console.log(`   Name: ${artworkName}`)
        if (hasMainImage) {
          console.log(`   ⚠️  Note: mainImage already exists, will be overwritten`)
        }
        if (clearImages) console.log(`   Would clear images array`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  if (doApply) {
    console.log(`✅ Migration complete!`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Already had mainImage: ${alreadyHasMainImage}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total processed: ${artworks.length}`)
  } else {
    console.log(`🧪 Dry run complete`)
    console.log(`   Would update: ${updated + alreadyHasMainImage}`)
    console.log(`   Already have mainImage: ${alreadyHasMainImage}`)
    console.log(`   Would skip: ${skipped}`)
    console.log(`\n💡 Run with --apply to execute migration`)
    console.log(`💡 Add --clear-images to also clear the images array after migration`)
  }
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message)
  console.error(err.stack)
  process.exit(1)
})
