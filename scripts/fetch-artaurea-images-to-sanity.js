#!/usr/bin/env node

// Minimal scraper to fetch artwork images from Art Aurea profiles
// and attach them to Sanity artworks that currently lack media.

const fs = require('fs')
const path = require('path')

// Load environment variables from project root .env.bak if present
;(function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.bak')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) process.env[key.trim()] = value.trim()
    })
  }
})()

const { createClient } = require('@sanity/client')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
const cheerio = require('cheerio')

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function deriveWorkQuery(artworkName, creatorName) {
  if (!artworkName) return encodeURIComponent(creatorName || '')
  let work = artworkName
  if (creatorName && artworkName.startsWith(creatorName)) {
    const parts = artworkName.split('_')
    if (parts.length > 1) work = parts.slice(1).join(' ')
  }
  return encodeURIComponent(`${creatorName || ''} ${work}`.trim())
}

async function findFirstProfileResult(creatorName, workQuery) {
  // Try precise artwork search first, then fallback to creator search
  const queries = [workQuery, encodeURIComponent(creatorName || '')]
  for (const q of queries) {
    const url = `https://artaurea.de/profiles/?s=${q}`
    try {
      const res = await fetch(url, { timeout: 20000 })
      if (!res.ok) continue
      const html = await res.text()
      const $ = cheerio.load(html)
      // Grab first meaningful link on results page
      let href = null
      $('a[href]').each((_, a) => {
        const h = $(a).attr('href') || ''
        const text = ($(a).text() || '').trim()
        if (h.includes('/profiles/') || h.includes('/profile/') || (h.endsWith('/') && text.length > 1)) {
          href = h
          return false
        }
      })
      if (href) return href
    } catch (_) {}
  }
  return null
}

function pickBestImageFromProfile($) {
  // Prefer larger images, avoid logos/icons
  const candidates = []
  $('img').each((_, img) => {
    const src = $(img).attr('src') || ''
    const w = Number($(img).attr('width') || 0)
    const h = Number($(img).attr('height') || 0)
    if (!src) return
    if (/(logo|icon|avatar|placeholder)/i.test(src)) return
    if (!src.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) return
    const score = (w * h) || 0
    candidates.push({ src, score })
  })
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]?.src || null
}

async function fetchImageBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function uploadImageToSanity(buffer, filename, altEn, altDe) {
  const asset = await sanity.assets.upload('image', buffer, { filename })
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
    alt: { en: altEn || '', de: altDe || '' }
  }
}

async function attachImageToArtwork(artworkId, imageObj) {
  await sanity
    .patch(artworkId)
    .setIfMissing({ images: [] })
    .insert('after', 'images[-1]', [imageObj])
    .commit({ autoGenerateArrayKeys: true })
}

async function main() {
  const limit = Number(process.env.LIMIT) || 5 // test small batch first
  console.log(`🔎 Selecting up to ${limit} artworks without images...`)
  const artworks = await sanity.fetch(`
    *[_type == "artwork" && (!defined(images) || count(images[defined(asset._ref)]) == 0)] | order(name asc) [0...${limit}] {
      _id, name, slug, creator->{name}
    }
  `)
  console.log(`Found ${artworks.length} artworks to process`)

  let success = 0, failed = 0
  for (const art of artworks) {
    const creatorName = art.creator?.name || ''
    const workQuery = deriveWorkQuery(art.name, creatorName)
    console.log(`\n➡️  ${creatorName} — ${art.name}`)

    try {
      const profileUrl = await findFirstProfileResult(creatorName, workQuery)
      if (!profileUrl) throw new Error('No profile result found')
      console.log(`   🌐 Profile: ${profileUrl}`)

      const res = await fetch(profileUrl)
      const html = await res.text()
      const $ = cheerio.load(html)
      const imgUrl = pickBestImageFromProfile($)
      if (!imgUrl) throw new Error('No suitable image found on profile page')
      console.log(`   🖼️  Image: ${imgUrl}`)

      const filename = (imgUrl.split('/').pop() || 'artwork.jpg').split('?')[0]
      const buf = await fetchImageBuffer(imgUrl)
      const imageObj = await uploadImageToSanity(buf, filename, art.name, art.name)
      await attachImageToArtwork(art._id, imageObj)
      console.log('   ✅ Attached image to artwork')
      success++
      await delay(800)
    } catch (e) {
      console.log(`   ❌ ${e.message}`)
      failed++
    }
  }

  console.log(`\n✅ Done. Success: ${success}, Failed: ${failed}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})


