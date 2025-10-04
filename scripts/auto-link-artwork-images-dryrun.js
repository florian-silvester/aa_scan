#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Load env
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

const sanity = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

function normalize(s) {
  return (s || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

function buildTokens(creatorName, workTitle) {
  const c = normalize(creatorName).split(' ').filter(Boolean)
  const w = normalize(workTitle).split(' ').filter(Boolean)
  const tokens = Array.from(new Set([...c, ...w])).filter(t => t.length >= 3)
  return tokens
}

function scoreFilename(filename, tokens) {
  const base = normalize(filename)
  let score = 0
  for (const t of tokens) {
    if (base.includes(t)) score += 1
  }
  return score
}

async function findCandidates(tokens) {
  // Build a permissive pattern for GROQ match (wildcards around each token)
  // We query multiple times to avoid overly long patterns
  const unique = tokens.slice(0, 5) // cap to keep queries small
  const results = new Map()
  for (const t of unique) {
    const pattern = `*${t}*`
    const assets = await sanity.fetch(
      `*[_type == "sanity.imageAsset" && originalFilename match $p][0...50]{_id, originalFilename, url, size, sha1hash}`,
      { p: pattern }
    )
    for (const a of assets || []) {
      results.set(a._id, a)
    }
  }
  return Array.from(results.values())
}

async function main() {
  const limit = Number(process.env.LIMIT || 200)
  console.log(`🔎 Gathering artworks missing images (limit ${limit})...`)
  const artworks = await sanity.fetch(`
    *[_type == "artwork" && (!defined(images) || count(images[defined(asset._ref)]) == 0)] | order(name asc) [0...${limit}] {
      _id,
      name,
      "title": coalesce(workTitle.en, workTitle.de, name),
      creator->{ name }
    }
  `)

  const rows = [[
    'artwork_id','artwork_name','creator','proposed_asset_id','proposed_filename','score'
  ]]

  let linked = 0
  for (const aw of artworks) {
    const creatorName = aw.creator?.name || ''
    const title = aw.title || aw.name || ''
    const tokens = buildTokens(creatorName, title)
    const cands = await findCandidates(tokens)
    const ranked = cands
      .map(a => ({ ...a, _score: scoreFilename(a.originalFilename || '', tokens) }))
      .filter(a => a._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 3)

    if (ranked.length > 0) linked++
    const top = ranked[0]
    rows.push([
      aw._id,
      aw.name || '',
      creatorName,
      top?._id || '',
      top?.originalFilename || '',
      top?._score || 0
    ])
  }

  const outDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
  const outFile = path.join(outDir, 'auto-link-artwork-images.dryrun.csv')
  const csv = rows.map(r => r.map(f => `"${String(f)}"`).join(',')).join('\n')
  fs.writeFileSync(outFile, csv, 'utf8')
  console.log(`\nSaved proposals: ${outFile}`)
  console.log(`Proposals found for ${linked}/${artworks.length} artworks`)
}

main().catch(err => { console.error(err); process.exit(1) })


