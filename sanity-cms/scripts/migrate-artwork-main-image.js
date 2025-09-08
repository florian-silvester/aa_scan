#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

let createClient
try {
  createClient = require('@sanity/client').createClient
} catch (e) {
  try {
    createClient = require(path.join(__dirname, '..', 'node_modules', '@sanity', 'client')).createClient
    console.log('ℹ️  Using @sanity/client from sanity-cms/node_modules')
  } catch (e2) {
    console.error('@sanity/client not found. Install it at repo root or in sanity-cms.')
    process.exit(1)
  }
}

// Load env from project root .env.bak if present
function loadEnvFromRoot() {
  try {
    const root = path.join(__dirname, '..', '..')
    const envBak = path.join(root, '.env.bak')
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

  console.log(`🚀 Migrating artwork images -> mainImage (${doApply ? 'APPLY' : 'DRY-RUN'})${clearImages ? ' + clear images' : ''}${limit ? `, limit=${limit}` : ''}`)

  const query = `*[_type == "artwork" && !defined(mainImage.asset) && count(images) > 0] | order(_createdAt asc) {
    _id,
    name,
    workTitle,
    images[0]{
      asset->{
        _id,
        url,
        originalFilename
      },
      alt
    }
  }`

  let artworks = await client.fetch(query)
  if (limit && Number.isFinite(limit) && artworks.length > limit) {
    artworks = artworks.slice(0, limit)
  }

  console.log(`📋 Candidates: ${artworks.length}`)
  let updated = 0
  for (const art of artworks) {
    const first = art.images
    if (!first || !first.asset || !first.asset._id) continue

    const patch = {
      mainImage: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: first.asset._id
        },
        ...(first.alt ? { alt: first.alt } : {})
      }
    }

    if (doApply) {
      let p = client.patch(art._id).set(patch)
      if (clearImages) {
        p = p.set({ images: [] })
      }
      await p.commit()
      updated++
      console.log(`✅ Set mainImage for ${art._id} (${art.name || art.workTitle?.en || art.workTitle?.de || 'Untitled'})`)
    } else {
      console.log(`🔎 Would set mainImage for ${art._id} to ${first.asset._id}`)
    }
  }

  console.log(doApply ? `🎯 Updated ${updated}/${artworks.length}` : '🧪 Dry run complete')
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})


