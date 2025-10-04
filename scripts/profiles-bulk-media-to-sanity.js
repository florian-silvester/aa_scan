#!/usr/bin/env node

// Import all .jpg images from Art Aurea profile pages for creators
// present in reports/artworks-missing-media.enriched.csv, and upload
// them to Sanity media library WITHOUT renaming.

const fs = require('fs')
const path = require('path')

// Load env (supports .env.bak at repo root)
;(function loadEnv() {
  const envPaths = [path.join(process.cwd(), '.env'), path.join(process.cwd(), '.env.bak')]
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const c = fs.readFileSync(p, 'utf8')
      c.split('\n').forEach(line => {
        const [k, v] = line.split('=')
        if (k && v) process.env[k.trim()] = v.trim()
      })
    }
  }
})()

const { createClient } = require('@sanity/client')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
const cheerio = require('cheerio')
const crypto = require('crypto')

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

function sanitizeUploadFilename(name) {
  try {
    const idx = name.lastIndexOf('.')
    const ext = idx > -1 ? name.slice(idx).toLowerCase() : '.jpg'
    let base = idx > -1 ? name.slice(0, idx) : name
    base = base
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    if (!base) base = 'image'
    // constrain length to avoid API rejects
    const safe = `${base}`.slice(0, 128)
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg'
    return safe + safeExt
  } catch {
    return 'image.jpg'
  }
}

function parseCsvQuoted(content) {
  const rows = []
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)
  for (const line of lines) {
    const fields = []
    const re = /"([^"]*)"/g
    let m
    while ((m = re.exec(line)) !== null) fields.push(m[1])
    if (fields.length > 0) rows.push(fields)
  }
  return rows
}

async function assetExistsByFilename(filename) {
  const res = await sanity.fetch(`*[_type == "sanity.imageAsset" && originalFilename == $fn][0]{_id}`, { fn: filename })
  return Boolean(res)
}

async function assetExistsByUrl(url) {
  const res = await sanity.fetch(`*[_type == "sanity.imageAsset" && defined(source.url) && source.url == $u][0]{_id}`, { u: url })
  return Boolean(res)
}

async function assetExistsByFilenameAndSize(filename, size) {
  if (!size) return false
  const res = await sanity.fetch(`*[_type == "sanity.imageAsset" && originalFilename == $fn && size == $sz][0]{_id}`, { fn: filename, sz: size })
  return Boolean(res)
}

async function downloadBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

async function headContentLength(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const len = res.headers.get('content-length')
    return len ? Number(len) : null
  } catch {
    return null
  }
}

function stripSizeSuffix(url) {
  try {
    // Convert .../file-1024x693.jpg to .../file.jpg
    return url.replace(/-(?:\d+)[xX](?:\d+)\.(jpg|jpeg|png|webp)$/i, '.$1')
  } catch {
    return url
  }
}

function baseFilename(url) {
  const clean = (url.split('?')[0] || '').split('/').pop() || ''
  return clean.replace(/-(?:\d+)[xX](?:\d+)\.(jpg|jpeg|png|webp)$/i, '.$1')
}

async function resolveOriginalUrl(imgUrl) {
  // 1) Try stripping WordPress size suffix
  const candidate = stripSizeSuffix(imgUrl)
  if (candidate !== imgUrl) {
    try {
      const head = await fetch(candidate, { method: 'HEAD' })
      if (head.ok) return candidate
    } catch {}
  }
  // 2) Try WordPress Media API search by basename
  try {
    const name = baseFilename(imgUrl)
    const term = encodeURIComponent(name.replace(/\.(jpg|jpeg|png|webp)$/i, '').replace(/[-_]+/g, ' '))
    const apiBases = ['https://artaurea.de', 'https://artaurea.com']
    for (const base of apiBases) {
      const apiUrl = `${base}/wp-json/wp/v2/media?search=${term}&per_page=100`
      const res = await fetch(apiUrl)
      if (!res.ok) continue
      const arr = await res.json()
      if (Array.isArray(arr) && arr.length > 0) {
        // Prefer exact basename match inside source_url
        const exact = arr.find(m => (m.source_url||'').includes(name))
        const pick = exact || arr[0]
        if (pick && pick.source_url) return pick.source_url
      }
    }
  } catch {}
  // 3) Fall back to original URL
  return imgUrl
}

function unique(arr) { return Array.from(new Set(arr)) }

async function scrapeProfileImages(profileUrl) {
  const url = profileUrl
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  // Limit scraping to main content area to avoid headers/footers/overviews
  const content = $('.entry-content, article, .content, .post-content').first()
  const scope = content.length ? content : $.root()

  const urls = []
  scope.find('img').each((_, img) => {
    const src = $(img).attr('src') || ''
    if (!src) return
    if (!/\.(jpg|jpeg)(\?|$)/i.test(src)) return
    if (!src.includes('/wp-content/uploads/')) return
    urls.push(src.split('?')[0])
  })
  return unique(urls)
}

function normalizeName(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') }

async function findProfileUrlForCreator(creatorName, fallbackSearchUrl) {
  // If manual override is a direct profile URL (not a search URL), use it
  const directProfileRe = /^https?:\/\/artaurea\.(de|com)\/profiles\/[a-z0-9-]+\/?$/i
  if (fallbackSearchUrl && directProfileRe.test(fallbackSearchUrl)) {
    return fallbackSearchUrl
  }
  const searchUrl = fallbackSearchUrl || `https://artaurea.de/profiles/?s=${encodeURIComponent(creatorName)}`
  const res = await fetch(searchUrl)
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const target = normalizeName(creatorName)
  let exact = null
  let slugMatch = null

  $('a[href]').each((_, a) => {
    const h = ($(a).attr('href')||'').trim()
    const t = ($(a).text()||'').trim()
    if (!/^https?:\/\/artaurea\.(de|com)\//i.test(h)) return
    if (!/\/profiles\/[a-z0-9-]+\/?$/i.test(h)) return

    const textNorm = normalizeName(t)
    const hrefSlug = h.split('/').filter(Boolean).pop()

    if (!exact && textNorm === target) exact = h
    if (!slugMatch && normalizeName(hrefSlug).includes(target)) slugMatch = h
  })

  return exact || slugMatch || null
}

async function run() {
  const reportPath = path.join(process.cwd(), 'reports', 'artworks-missing-media.enriched.csv')
  if (!fs.existsSync(reportPath)) throw new Error(`Missing report: ${reportPath}`)
  const csv = fs.readFileSync(reportPath, 'utf8')
  const rows = parseCsvQuoted(csv)
  const header = rows.shift()
  if (!header) throw new Error('Empty CSV')

  const COL = {
    sanity_id: 0,
    artwork_name: 1,
    creator_name: 2,
    year: 3,
    category: 4,
    slug: 5,
    creator_search: 6,
    artwork_search: 7
  }

  // Unique creators and preferred search URL
  const nameToSearch = new Map()
  for (const r of rows) {
    const cname = r[COL.creator_name]
    const surl = r[COL.creator_search]
    if (!cname) continue
    if (!nameToSearch.has(cname)) nameToSearch.set(cname, surl)
  }

  // Prefer direct profile URLs from creator-profiles-from-missing-artworks.csv (creator,profile_url,via)
  const mappingPath = path.join(process.cwd(), 'reports', 'creator-profiles-from-missing-artworks.csv')
  if (fs.existsSync(mappingPath)) {
    const mapCsv = fs.readFileSync(mappingPath, 'utf8')
    const mapRows = parseCsvQuoted(mapCsv)
    mapRows.shift() // header
    for (const mr of mapRows) {
      const creator = mr[0]
      const profileUrl = mr[1]
      if (creator && profileUrl) {
        nameToSearch.set(creator, profileUrl)
      }
    }
  }

  // Merge manual overrides from reports/manual-profile-urls.csv (creator,url)
  const manualPath = path.join(process.cwd(), 'reports', 'manual-profile-urls.csv')
  if (fs.existsSync(manualPath)) {
    const content = fs.readFileSync(manualPath, 'utf8')
    const manualRows = parseCsvQuoted(content)
    const mh = manualRows.shift()
    for (const mr of manualRows) {
      const creator = mr[0]
      const url = mr[1]
      if (creator && url) {
        nameToSearch.set(creator, url)
      }
    }
  }

  const only = process.env.ONLY_CREATORS ? process.env.ONLY_CREATORS.split(',').map(s => s.trim()) : null
  const creators = Array.from(nameToSearch.entries()).filter(([n]) => !only || only.includes(n))
  const limit = Number(process.env.LIMIT_CREATORS || 0)
  const slice = limit > 0 ? creators.slice(0, limit) : creators
  console.log(`Processing ${slice.length} creators (${creators.length} total in report)`)

  const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
  let uploaded = 0, skipped = 0, errors = 0
  const summary = []
  const details = []

  for (const [creatorName, searchUrl] of slice) {
    console.log(`\n👤 ${creatorName}`)
    try {
      const profileUrl = await findProfileUrlForCreator(creatorName, searchUrl)
      if (!profileUrl) {
        console.log('  ❌ Profile not found')
        errors++
        continue
      }
      console.log(`  🌐 ${profileUrl}`)

      const images = await scrapeProfileImages(profileUrl)
      console.log(`  🖼️  Found ${images.length} jpg images`)

      let creatorFound = 0, creatorExists = 0, creatorWillUpload = 0
      for (const rawUrl of images) {
        const imgUrl = await resolveOriginalUrl(rawUrl)
        const filename = imgUrl.split('/').pop()
        if (!filename) continue
        creatorFound++
        // Duplicate guards
        if (await assetExistsByUrl(imgUrl)) { skipped++; creatorExists++; details.push([creatorName, filename, imgUrl, 'exists:url']); continue }
        const size = await headContentLength(imgUrl)
        if (await assetExistsByFilenameAndSize(filename, size)) { skipped++; creatorExists++; details.push([creatorName, filename, imgUrl, 'exists:filename+size']); continue }
        try {
          if (DRY_RUN) {
            creatorWillUpload++
            details.push([creatorName, filename, imgUrl, 'would-upload'])
          } else {
            const buf = await downloadBuffer(imgUrl)
            // Optional final check via sha1
            const sha1 = crypto.createHash('sha1').update(buf).digest('hex')
            const dupSha = await sanity.fetch(`*[_type == "sanity.imageAsset" && sha1hash == $h][0]{_id}`, { h: sha1 })
            if (dupSha) { skipped++; creatorExists++; details.push([creatorName, filename, imgUrl, 'exists:sha1']); continue }
            // Infer content type from extension; default to image/jpeg
            const contentType = (/\.png$/i.test(filename) ? 'image/png' : /\.gif$/i.test(filename) ? 'image/gif' : /\.webp$/i.test(filename) ? 'image/webp' : 'image/jpeg')
            const safeName = sanitizeUploadFilename(filename)
            await sanity.assets.upload('image', buf, { filename: safeName, contentType, source: { name: 'ArtAurea', url: imgUrl, originalFilename: filename } })
            uploaded++
            console.log(`    ✅ ${filename}`)
            await new Promise(r => setTimeout(r, 300))
          }
        } catch (e) {
          console.log(`    ❌ ${filename} - ${e.message}`)
          errors++
          details.push([creatorName, filename, imgUrl, `error:${e.message}`])
        }
      }
      summary.push([creatorName, profileUrl, creatorFound, creatorExists, creatorWillUpload])
    } catch (e) {
      console.log(`  ❌ ${e.message}`)
      errors++
    }
  }

  // Save dry-run or run summary
  const outDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
  const sumCsv = [["creator","profile_url","found","already_exist","to_upload"]].concat(summary).map(r=>r.map(f=>`"${String(f)}"`).join(',')).join('\n')
  const detCsv = [["creator","filename","url","status"]].concat(details).map(r=>r.map(f=>`"${String(f)}"`).join(',')).join('\n')
  const sumPath = path.join(outDir, DRY_RUN ? 'profiles-bulk-media.dryrun.summary.csv' : 'profiles-bulk-media.summary.csv')
  const detPath = path.join(outDir, DRY_RUN ? 'profiles-bulk-media.dryrun.details.csv' : 'profiles-bulk-media.details.csv')
  fs.writeFileSync(sumPath, sumCsv, 'utf8')
  fs.writeFileSync(detPath, detCsv, 'utf8')
  console.log(`\nSaved summary: ${sumPath}`)
  console.log(`Saved details: ${detPath}`)
  console.log(`\nDone. Uploaded: ${uploaded}, Skipped (exists): ${skipped}, Errors: ${errors}`)
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })


