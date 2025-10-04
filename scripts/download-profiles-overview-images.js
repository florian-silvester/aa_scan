#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a))

function stripSize(u) {
  return u.replace(/-(?:\d+)[xX](?:\d+)\.(jpg|jpeg|png|webp)$/i, '.$1')
}

function isThumb(u) {
  return /(100x100|150x150|200x200|258x300|300x300|400x300|460x300|600x400|672x1024|693x1024|707x1024)\.(jpg|jpeg|png|webp)$/i.test(u)
}

async function main() {
  const startUrl = 'https://artaurea.de/profiles/'
  console.log('Fetching overview:', startUrl)
  const html = await (await fetch(startUrl, { headers: { 'User-Agent': 'aa-scraper/1.0' } })).text()
  const re = /https?:\/\/[^"'\s]+\/wp-content\/uploads\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi
  const raw = [...html.matchAll(re)].map(m => m[0])
  const normalized = Array.from(new Set(raw.map(stripSize)))
  const filtered = normalized.filter(u => !isThumb(u))

  const outDir = path.join(os.homedir(), 'Downloads', 'aa_overview')
  fs.mkdirSync(outDir, { recursive: true })

  console.log(`Found: raw=${raw.length}, unique=${normalized.length}, toDownload=${filtered.length}`)

  let ok = 0, fail = 0, skipped = 0, i = 0
  const concurrency = 8

  function swapDomain(u) {
    if (u.includes('artaurea.de')) return u.replace('artaurea.de', 'artaurea.com')
    if (u.includes('artaurea.com')) return u.replace('artaurea.com', 'artaurea.de')
    return u
  }

  async function fetchImageBinary(url) {
    const headers = {
      'User-Agent': 'aa-scraper/1.0',
      'Referer': startUrl,
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    }

    // Try original
    let res = await fetch(url, { headers })
    let ct = res.headers.get('content-type') || ''
    if (res.ok && ct.startsWith('image/')) return res.buffer()

    // Try swapped domain
    const swapped = swapDomain(url)
    if (swapped !== url) {
      res = await fetch(swapped, { headers })
      ct = res.headers.get('content-type') || ''
      if (res.ok && ct.startsWith('image/')) return res.buffer()
    }

    // Try stripping size suffix
    const stripped = stripSize(url)
    if (stripped !== url) {
      res = await fetch(stripped, { headers })
      ct = res.headers.get('content-type') || ''
      if (res.ok && ct.startsWith('image/')) return res.buffer()
    }

    return null
  }

  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= filtered.length) break
      const url = filtered[idx]
      const filename = path.basename(url)
      const outPath = path.join(outDir, filename)
      try {
        const buf = await fetchImageBinary(url)
        if (buf && buf.length > 0) {
          fs.writeFileSync(outPath, buf)
          ok++
        } else {
          // Non-image (likely logo/HTML) or blocked
          skipped++
        }
      } catch (e) {
        fail++
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))

  console.log('Saved to:', outDir)
  console.log('Downloaded:', ok, 'Skipped(non-image):', skipped, 'Failed:', fail)
}

main().catch(err => { console.error(err); process.exit(1) })


