const fs = require('fs')
const path = require('path')

// Load environment variables manually (only if not already set by Vercel/environment)
if (!process.env.SANITY_API_TOKEN || !process.env.WEBFLOW_API_TOKEN) {
  const envPath = path.join(__dirname, '..', '..', 'sanity-cms', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value && !process.env[key.trim()]) {
        process.env[key.trim()] = value.trim()
      }
    })
  }
}

const {createClient} = require('@sanity/client')
const crypto = require('crypto')
const https = require('https')

// Sanity client
const sanityClient = createClient({
  projectId: '09c9shy3',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2025-08-20',
  token: process.env.SANITY_API_TOKEN
})

// Webflow site ID - require env only
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID

// Webflow collection IDs - require env only (same names as Studio API)
const WEBFLOW_COLLECTIONS = {
  exhibition: process.env.WEBFLOW_COLLECTION_EXHIBITIONS_ID,
  artist: process.env.WEBFLOW_COLLECTION_ARTISTS_ID,
  news: process.env.WEBFLOW_COLLECTION_NEWS_ID,
  exhibitionImage: process.env.WEBFLOW_COLLECTION_EXHIBITION_IMAGES_ID,
  announcement: process.env.WEBFLOW_COLLECTION_ANNOUNCEMENTS_ID,
  work: process.env.WEBFLOW_COLLECTION_WORKS_ID
}

// Track currently existing Webflow IDs per collection (populated by getWebflowItems/rebuild)
const webflowExistingIds = new Map() // key: collectionId → Set<string>
function getExistingIdSetForKey(collectionKey) {
  const collectionId = WEBFLOW_COLLECTIONS[collectionKey]
  if (!collectionId) return null
  return webflowExistingIds.get(collectionId) || null
}
function filterToExistingIds(collectionKey, ids) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : []
  const set = getExistingIdSetForKey(collectionKey)
  return set ? list.filter((id) => set.has(id)) : list
}

function assertEnvConfig() {
  const missing = []
  if (!process.env.WEBFLOW_API_TOKEN) missing.push('WEBFLOW_API_TOKEN')
  if (!WEBFLOW_SITE_ID) missing.push('WEBFLOW_SITE_ID')
  const required = [
    'WEBFLOW_COLLECTION_EXHIBITIONS_ID',
    'WEBFLOW_COLLECTION_ARTISTS_ID',
    'WEBFLOW_COLLECTION_NEWS_ID',
    'WEBFLOW_COLLECTION_EXHIBITION_IMAGES_ID',
    'WEBFLOW_COLLECTION_ANNOUNCEMENTS_ID',
    'WEBFLOW_COLLECTION_WORKS_ID'
  ]
  required.forEach((name) => { if (!process.env[name]) missing.push(name) })
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`)
}

// Store mapping of Sanity IDs to Webflow IDs (in production, use database)
const idMappings = {
  exhibition: new Map(),
  artist: new Map(),
  news: new Map(),
  exhibitionImage: new Map(),
  announcement: new Map(),
  work: new Map()
}

// Persistent ID mappings system (like asset mappings)
let persistentIdMappings = new Map()
let persistentHashes = new Map() // key: collection:sanityId => lastSyncedHash

// CLI args
const ARGS = process.argv.slice(2)
function getArg(name) {
  const pref = `--${name}=`
  const hit = ARGS.find(a => a.startsWith(pref))
  return hit ? hit.substring(pref.length) : null
}
const FLAG_QUICK = ARGS.includes('--quick')
const FLAG_CHECK_ONLY = ARGS.includes('--check-only')
const FLAG_PUBLISH = ARGS.includes('--publish')
const FLAG_PUBLISH_ALL = ARGS.includes('--publish-all')
const ARG_SINCE = getArg('since') // e.g. --since=auto or --since=2025-08-24T00:00:00.000Z
const ARG_ONLY = getArg('only') // e.g. --only=artist|exhibition|work|exhibitionImage|news|announcement
const ARG_ITEM = getArg('item') // e.g. --item=news-id-123 (single item sync)
let GLOBAL_SINCE = null

// Order index maps (rebuilt each run)
const orderIndexByExhibitionImageId = new Map()
const orderIndexByWorkId = new Map()

function stripDraft(id) {
  return typeof id === 'string' ? id.replace(/^drafts\./, '') : id
}
function setBoth(map, key, value) {
  if (!key) return
  map.set(key, value)
  map.set(stripDraft(key), value)
}
function getOrderIndex(map, id) {
  if (!id) return null
  return map.get(id) ?? map.get(stripDraft(id)) ?? null
}

async function buildOrderIndexMaps() {
  orderIndexByExhibitionImageId.clear()
  orderIndexByWorkId.clear()
  try {
    const exhibitions = await sanityClient.fetch(`*[_type == "exhibition" && (count(exhibitionImages) > 0 || count(workReferences) > 0)]{ exhibitionImages[]{ _ref }, workReferences[]{ _ref } }`)
    exhibitions.forEach(ex => {
      (ex.exhibitionImages || []).forEach((ref, idx) => {
        if (ref && ref._ref) setBoth(orderIndexByExhibitionImageId, ref._ref, idx + 1)
      })
      (ex.workReferences || []).forEach((ref, idx) => {
        if (ref && ref._ref) setBoth(orderIndexByWorkId, ref._ref, idx + 1)
      })
    })
    console.log(`  Built order indices: views=${orderIndexByExhibitionImageId.size}, works=${orderIndexByWorkId.size}`)
  } catch (e) {
    console.warn('  Failed to build order indices:', e.message)
  }
}

// Load ID mappings from Sanity
async function loadIdMappings() {
  try {
    const result = await sanityClient.fetch(`
      *[_type == "webflowSyncSettings" && _id == "id-mappings"][0] {
        idMappings
      }
    `)
    
    if (result?.idMappings) {
      const parsedMappings = JSON.parse(result.idMappings)
      persistentIdMappings = new Map(Object.entries(parsedMappings))
      console.log(`Loaded ${persistentIdMappings.size} ID mappings from Sanity`)
    } else {
      console.log('No existing ID mappings found, starting fresh')
      persistentIdMappings = new Map()
    }
  } catch (error) {
    console.log('Failed to load ID mappings, starting fresh:', error.message)
    persistentIdMappings = new Map()
  }

  // Load hashes
  try {
    const result2 = await sanityClient.fetch(`
      *[_type == "webflowSyncSettings" && _id == "sync-hashes"][0] {
        hashes
      }
    `)
    if (result2?.hashes) {
      const parsed = JSON.parse(result2.hashes)
      persistentHashes = new Map(Object.entries(parsed))
      console.log(`Loaded ${persistentHashes.size} item hashes`)
    } else {
      persistentHashes = new Map()
    }
  } catch (e) {
    console.log('Failed to load hashes, starting fresh:', e.message)
    persistentHashes = new Map()
  }
}

// Clear stale ID mappings when Webflow is actually empty
async function clearStaleIdMappings() {
  console.log('Clearing stale ID mappings from Sanity...')
  
  try {
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'id-mappings',
      idMappings: JSON.stringify({}),
      lastUpdated: new Date().toISOString()
    })
    
    // Clear in-memory mappings too
    persistentIdMappings = new Map()
    Object.keys(idMappings).forEach(collection => {
      idMappings[collection].clear()
    })
    
    console.log('Cleared all stale ID mappings')
  } catch (error) {
    console.error('Failed to clear ID mappings:', error.message)
  }
}

// Save ID mappings to Sanity
async function saveIdMappings() {
  try {
    // Merge all collection mappings into one persistent store
    const allMappings = {}
    Object.entries(idMappings).forEach(([collection, map]) => {
      map.forEach((webflowId, sanityId) => {
        allMappings[`${collection}:${sanityId}`] = webflowId
      })
    })
    
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'id-mappings',
      idMappings: JSON.stringify(allMappings),
      lastUpdated: new Date().toISOString()
    })
    
    console.log(`Saved ${Object.keys(allMappings).length} ID mappings to Sanity`)
  } catch (error) {
    console.error('Failed to save ID mappings:', error.message)
  }

  try {
    const allHashes = Object.fromEntries(persistentHashes)
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'sync-hashes',
      hashes: JSON.stringify(allHashes),
      lastUpdated: new Date().toISOString()
    })
    console.log(`Saved ${Object.keys(allHashes).length} item hashes to Sanity`)
  } catch (e) {
    console.error('Failed to save hashes:', e.message)
  }

  // Save last run meta (for quick mode)
  try {
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'run-meta',
      lastRun: new Date().toISOString()
    })
  } catch (e) {
    console.warn('Failed to save run meta:', e.message)
  }
}

// Load persistent mappings into memory collections
function loadPersistentMappings() {
  Object.keys(idMappings).forEach(collection => {
    idMappings[collection].clear()
  })
  
  persistentIdMappings.forEach((webflowId, key) => {
    const [collection, sanityId] = key.split(':')
    if (idMappings[collection]) {
      idMappings[collection].set(sanityId, webflowId)
    }
  })
  
  console.log(`Loaded mappings into memory: ${Object.entries(idMappings).map(([k,v]) => `${k}:${v.size}`).join(', ')}`)
}

// Rebuild ID mappings from existing Webflow data (if mappings are empty)
async function rebuildIdMappings() {
  const collections = [
    { key: 'exhibition', id: WEBFLOW_COLLECTIONS.exhibition, sanityType: 'exhibition' },
    { key: 'artist', id: WEBFLOW_COLLECTIONS.artist, sanityType: 'artist' },
    { key: 'news', id: WEBFLOW_COLLECTIONS.news, sanityType: 'news' },
    { key: 'exhibitionImage', id: WEBFLOW_COLLECTIONS.exhibitionImage, sanityType: 'exhibitionImage' },
    { key: 'announcement', id: WEBFLOW_COLLECTIONS.announcement, sanityType: 'announcement' },
    { key: 'work', id: WEBFLOW_COLLECTIONS.work, sanityType: 'work' }
  ]
  
  for (const collection of collections) {
    // Drop any stale in-memory mappings first, then rebuild strictly from current Webflow items
    // This prevents referencing non-existent Webflow IDs during cross-collection field mapping.
    try { idMappings[collection.key].clear() } catch {}
    console.log(`Rebuilding ${collection.key} mappings (incremental, clearing stale)...`)
    
    const webflowItems = await getWebflowItems(collection.id)
    const sanityItems = await sanityClient.fetch(`*[_type == "${collection.sanityType}"] { _id, slug, name }`)
    
    for (const webflowItem of webflowItems) {
      const slug = webflowItem.fieldData.slug
      const name = webflowItem.fieldData.name
      const sanityItem = sanityItems.find(item => 
        item.slug?.current === slug || item.name === name || generateSlug(item.name) === slug
      )
      if (sanityItem) {
        if (!idMappings[collection.key].has(sanityItem._id)) {
          idMappings[collection.key].set(sanityItem._id, webflowItem.id)
        }
        try {
          await sanityClient.patch(sanityItem._id)
            .set({ webflowId: webflowItem.id })
            .commit({ visibility: 'async' })
        } catch (e) {
          console.warn(`  Failed to write back webflowId for ${collection.key}:${sanityItem._id}: ${e.message}`)
        }
      }
    }
    console.log(`  Rebuild complete for ${collection.key}: mappings=${idMappings[collection.key].size}`)
  }
}

// Find existing Webflow item by Sanity ID (using stored mappings)
function findExistingWebflowId(sanityId, collection) {
  return idMappings[collection]?.get(sanityId) || null
}

// Asset tracking system for incremental image sync (using Sanity as storage)
let assetMappings = new Map()

// Load asset mappings from Sanity
async function loadAssetMappings() {
  try {
    const result = await sanityClient.fetch(`
      *[_type == "webflowSyncSettings" && _id == "asset-mappings"][0] {
        assetMappings
      }
    `)
    
    if (result?.assetMappings) {
      const parsedMappings = JSON.parse(result.assetMappings)
      assetMappings = new Map(Object.entries(parsedMappings))
      console.log(`Loaded ${assetMappings.size} asset mappings from Sanity`)
    } else {
      console.log('No existing asset mappings found, starting fresh')
      assetMappings = new Map()
    }
  } catch (error) {
    console.log('Failed to load asset mappings, starting fresh:', error.message)
    assetMappings = new Map()
  }
}

// Save asset mappings to Sanity
async function saveAssetMappings() {
  try {
    const mappings = Object.fromEntries(assetMappings)
    
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'asset-mappings',
      assetMappings: JSON.stringify(mappings),
      lastUpdated: new Date().toISOString()
    })
    
    console.log(`Saved ${assetMappings.size} asset mappings to Sanity`)
  } catch (error) {
    console.error('Failed to save asset mappings:', error.message)
  }
}

// Check if image metadata has changed
function hasImageMetadataChanged(sanityImage, trackedAsset) {
  const currentAltText = sanityImage.alt?.en || sanityImage.alt?.de || ''
  const currentFilename = sanityImage.asset?.originalFilename || ''
  const currentUrl = sanityImage.asset?.url || ''
  
  return (
    trackedAsset.altText !== currentAltText ||
    trackedAsset.filename !== currentFilename ||
    trackedAsset.url !== currentUrl
  )
}

// Update image metadata in Webflow
async function updateImageMetadata(webflowAssetId, altText) {
  try {
    // Try the standard assets endpoint first
    await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/assets/${webflowAssetId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        altText: altText || ''
      })
    })
    console.log(`  Updated alt text: ${altText}`)
    return true
  } catch (error) {
    // If that fails, try alternative format
    try {
      await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/assets/${webflowAssetId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          alt: altText || ''
        })
      })
      console.log(`  Updated alt text (alt format): ${altText}`)
      return true
    } catch (error2) {
      console.warn(`  Failed to update alt text (tried both formats): ${error.message}`)
      return false
    }
  }
}

// Convert Sanity block content to HTML for Webflow Rich Text fields
function convertSanityBlocksToWebflowRichText(blocks) {
  if (!blocks || !Array.isArray(blocks)) return null

  const htmlParagraphs = blocks.map(block => {
    if (block._type === 'block' && block.children) {
      let paragraphContent = ''
      
      for (const child of block.children) {
        let text = child.text || ''
        
        // Apply marks (formatting)
        if (child.marks && child.marks.length > 0) {
          for (const mark of child.marks) {
            if (mark === 'strong') {
              text = `<strong>${text}</strong>`
            } else if (mark === 'em') {
              text = `<em>${text}</em>`
            } else if (mark.startsWith('link-')) {
              const href = mark.substring(5)
              text = `<a href="${href}">${text}</a>`
            }
          }
        }
        
        paragraphContent += text
      }
      
      return `<p>${paragraphContent}</p>`
    }
    return null
  }).filter(Boolean)

  if (htmlParagraphs.length === 0) return null
  
  // Return as HTML string for Webflow Rich Text fields
  return htmlParagraphs.join('')
}

// Extract plain text from Sanity rich text blocks (for non-rich-text fields)
function extractTextFromBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return ''
  
  return blocks
    .map(block => {
      if (block._type === 'block' && block.children) {
        return block.children
          .map(child => child.text || '')
          .join('')
      }
      return ''
    })
    .join('\n\n')  // Use double line breaks for better readability
    .trim()
}

// Utility functions
function generateSlug(text) {
  if (!text) return 'untitled'
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Webflow constraints: name <= 256 chars
const MAX_NAME_LENGTH = 256
function sanitizeName(value) {
  if (!value) return ''
  const trimmed = String(value).trim().replace(/\s+/g, ' ')
  return trimmed.length > MAX_NAME_LENGTH ? trimmed.slice(0, MAX_NAME_LENGTH) : trimmed
}

//------WEBFLOW API HELPERS (rate limits, retries, wrappers)------//
async function webflowRequest(endpoint, options = {}, retryCount = 0) {
  const baseUrl = 'https://api.webflow.com/v2'
  const maxRetries = 3
  
  let response
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
  } catch (err) {
    if (retryCount < maxRetries) {
      const waitTime = Math.pow(2, retryCount) * 1000
      console.log(`Network error (${err.message}). Retrying in ${waitTime/1000}s...`)
      await new Promise(r => setTimeout(r, waitTime))
      return webflowRequest(endpoint, options, retryCount + 1)
    }
    throw err
  }
  
  // Handle rate limits with exponential backoff
  if (response.status === 429 && retryCount < maxRetries) {
    const waitTime = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
    console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${retryCount + 1}/${maxRetries}`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    return webflowRequest(endpoint, options, retryCount + 1)
  }
  
  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Webflow API Error Response:', errorBody)
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  // Handle empty responses for DELETE requests
  if (response.status === 204 || options.method === 'DELETE') {
    return {} // Return empty object for successful deletions
  }

  return response.json()
}

// Update one item in a Webflow collection (UPSERT path)
async function updateWebflowItem(collectionId, itemId, fieldData, autoPublish = false) {
  try {
    await sleep(300); // basic throttle
    const result = await webflowRequest(`/collections/${collectionId}/items/${itemId}` , {
      method: 'PATCH',
      body: JSON.stringify({ fieldData })
    })
    
    // Auto-publish if requested (via CLI flag or API flag)
    const shouldPublish = autoPublish || process.env.API_PUBLISH_FLAG === 'true'
    if (shouldPublish) {
      try {
        await sleep(500); // Additional delay before publishing
        
        console.log(`  🚀 Publishing item ${itemId}...`)
        
        // Wait after update before publishing (Webflow might need time to process the update)
        await sleep(1000);
        
        const publishResult = await webflowRequest(`/collections/${collectionId}/items/publish`, {
          method: 'POST',
          body: JSON.stringify({
            itemIds: [itemId]
          })
        })
        
        console.log(`  📢 Publish result:`, JSON.stringify(publishResult, null, 2))
        
        if (publishResult.publishedItemIds && publishResult.publishedItemIds.includes(itemId)) {
          console.log(`  ✅ Successfully published item ${itemId}`)
        } else {
          console.warn(`  ❌ Item ${itemId} was not published`)
          if (publishResult.errors && publishResult.errors.length > 0) {
            console.warn(`  🚨 Publish errors:`, publishResult.errors)
          }
        }
      } catch (publishError) {
        console.warn(`  ⚠️  Failed to publish ${itemId}: ${publishError.message}`)
      }
    }
    
    return result
  } catch (error) {
    console.error(`Update failed for ${itemId}:`, error.message)
    throw error
  }
}

// Create items in Webflow
async function createWebflowItems(collectionId, items) {
  const batchSize = 50
  const results = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    console.log(`Creating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)} (${batch.length} items)`)
    
    try {
      const result = await webflowRequest(`/collections/${collectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items: batch })
      })
      const created = Array.isArray(result?.items) ? result.items : []
      results.push(...created)
      // If --publish was requested, publish created items immediately in the same batch
      if (FLAG_PUBLISH && created.length > 0) {
        const createdIds = created.map(i => i?.id).filter(Boolean)
        try {
          await publishWebflowItems(collectionId, createdIds)
        } catch (e) {
          console.warn(`  ⚠️  Failed to publish ${createdIds.length} created items: ${e.message}`)
        }
      }
    } catch (error) {
      console.error(`Batch failed:`, error.message)
      throw error
    }
  }
  
  return results
}

// Publish items in batches with basic backoff
async function publishWebflowItems(collectionId, itemIds) {
  const batchSize = 50
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize)
    let attempt = 0
    const maxAttempts = 4
    while (attempt < maxAttempts) {
      try {
        console.log(`  🚀 Publishing batch ${Math.floor(i/batchSize)+1}/${Math.ceil(itemIds.length/batchSize)} (${batch.length} items) ...`)
        const publishResult = await webflowRequest(`/collections/${collectionId}/items/publish`, {
          method: 'POST',
          body: JSON.stringify({ itemIds: batch })
        })
        console.log(`  📢 Publish result: ${JSON.stringify(publishResult)}`)
        break
      } catch (e) {
        attempt++
        const wait = Math.pow(2, attempt) * 1000
        console.warn(`  ⚠️  Publish batch failed (attempt ${attempt}/${maxAttempts}): ${e.message}. Retrying in ${wait/1000}s...`)
        await sleep(wait)
      }
    }
  }
}

// Delete items from Webflow (with batch processing)
async function deleteWebflowItems(collectionId, itemIds) {
  const results = []
  const batchSize = 50 // Can use a larger batch size for logging, requests are sequential
  
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize)
    console.log(`  Deleting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(itemIds.length/batchSize)} (${batch.length} items)`)
    
    // Process items sequentially within the batch
    for (const itemId of batch) {
      let attempts = 0
      while (attempts < 3) {
        try {
          await webflowRequest(`/collections/${collectionId}/items/${itemId}`, {
            method: 'DELETE'
          })
          results.push({ itemId, status: 'deleted' })
          break // Success, exit while loop
        } catch (error) {
          attempts++
          if (error.message.includes('429') && attempts < 3) {
            const waitTime = attempts * 2000 // 2s, 4s
            console.log(`  Rate limited, retrying ${itemId} in ${waitTime/1000}s...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          console.warn(`  Failed to delete ${itemId}: ${error.message}`)
          results.push({ itemId, status: 'error', error: error.message })
          break // Failure, exit while loop
        }
      }
    }
  }
  
  const successCount = results.filter(r => r.status === 'deleted').length
  const errorCount = results.filter(r => r.status === 'error').length
  
  if (errorCount > 0) {
    console.warn(`  ${errorCount} items failed to delete (${successCount} successful)`)
  }
  
  return results
}

// Get current Webflow items for comparison (with pagination)
async function getWebflowItems(collectionId) {
  try {
    let allItems = []
    let offset = 0
    const limit = 100
    
    while (true) {
      console.log(`  ↺ Fetching Webflow items ${offset}–${offset + limit} ...`)
      const result = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
      const items = result.items || []
      
      allItems.push(...items)
      // Cache existing IDs for quick validity checks
      let set = webflowExistingIds.get(collectionId)
      if (!set) {
        set = new Set()
        webflowExistingIds.set(collectionId, set)
      }
      for (const it of items) if (it?.id) set.add(it.id)
      
      // If we got fewer items than the limit, we've reached the end
      if (items.length < limit) {
        break
      }
      
      offset += limit
    }
    
    console.log(`  Found ${allItems.length} existing items`)
    return allItems
  } catch (error) {
    console.error(`Failed to get Webflow items:`, error.message)
    return []
  }
}

// Lightweight, targeted lookup for a single item by slug.
// Stops at the first match instead of fetching the entire collection upfront.
async function getWebflowItemBySlug(collectionId, slug) {
  if (!slug) return null
  try {
    let offset = 0
    const limit = 100
    // Paginate but exit as soon as we find a match
    while (true) {
      const result = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
      const items = result.items || []
      const hit = items.find(i => i?.fieldData?.slug === slug)
      if (hit) return hit
      if (items.length < limit) break
      offset += limit
    }
  } catch (e) {
    console.warn(`getWebflowItemBySlug failed: ${e.message}`)
  }
  return null
}

// Clear existing items from a collection
async function clearWebflowCollection(collectionId, collectionName) {
  console.log(`  Clearing existing ${collectionName}...`)
  const existingItems = await getWebflowItems(collectionId)
  
  if (existingItems.length === 0) {
    console.log(`  No existing ${collectionName} to clear`)
    return
  }
  
  console.log(`  Deleting ${existingItems.length} existing ${collectionName}`)
  const itemIds = existingItems.map(item => item.id)
  await deleteWebflowItems(collectionId, itemIds)
  console.log(`  Cleared ${existingItems.length} existing ${collectionName}`)
}

// Add after the existing utility functions
async function downloadImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Image download timeout (30s)'))
    }, 30000) // 30 second timeout
    
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        clearTimeout(timeout)
        reject(new Error(`Failed to download image: ${response.statusCode}`))
        return
      }
      
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        clearTimeout(timeout)
        resolve(Buffer.concat(chunks))
      })
      response.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
    
    request.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    
    request.on('timeout', () => {
      clearTimeout(timeout)
      request.destroy()
      reject(new Error('Image download timeout'))
    })
  })
}

function generateMD5Hash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

function hashObjectStable(obj) {
  const json = JSON.stringify(obj, Object.keys(obj).sort())
  return generateMD5Hash(Buffer.from(json))
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function uploadImageToWebflow(imageUrl, siteName, altText = null, originalFilename = null) {
  try {
    // Add a 5-second delay to respect asset creation rate limits
    await new Promise(resolve => setTimeout(resolve, 5000))

    // 1. Download image from Sanity
    console.log(`  Downloading: ${imageUrl}`)
    const imageBuffer = await downloadImageBuffer(imageUrl)
    
    // 2. Generate MD5 hash
    const fileHash = generateMD5Hash(imageBuffer)
    
    // 3. Create meaningful filename from alt text or description
    let filename = originalFilename || 'artwork-image.jpg'
    
    if (altText && altText.trim()) {
      // Use alt text to create descriptive filename
      const cleanAltText = altText
        .trim()
        .substring(0, 80) // Limit length
        .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .toLowerCase()
      
      if (cleanAltText) {
        const extension = originalFilename ? 
          originalFilename.split('.').pop() : 'jpg'
        filename = `${cleanAltText}.${extension}`
      }
    }
    
    // 4. Create asset metadata in Webflow
    const metadataResponse = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/assets`, {
      method: 'POST',
      body: JSON.stringify({
        fileName: filename,
        fileHash: fileHash,
        fileSize: imageBuffer.length
      })
    })
    
    if (!metadataResponse.uploadUrl || !metadataResponse.uploadDetails) {
      throw new Error('Failed to get upload credentials from Webflow')
    }
    
    // 5. Upload to Amazon S3 using FormData (the correct way)
    console.log('  Uploading to S3 with FormData...')
    
    const form = new FormData()
    
    // Add all presigned fields from uploadDetails
    Object.entries(metadataResponse.uploadDetails).forEach(([key, value]) => {
      form.append(key, value)
    })
    
    // Add the file last - create a Blob from the buffer for fetch()
    const blob = new Blob([imageBuffer], { 
      type: metadataResponse.uploadDetails['content-type'] || 'image/jpeg' 
    })
    form.append('file', blob, filename)
    
    const uploadResponse = await fetch(metadataResponse.uploadUrl, {
      method: 'POST',
      body: form
    })
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      throw new Error(`S3 upload failed: ${uploadResponse.status} - ${errorText}`)
    }
    
    // 6. Set alt text if provided (currently not working with Webflow API v2)
    // if (altText && metadataResponse.id) {
    //   await updateImageMetadata(metadataResponse.id, altText)
    // }
    
    // 7. Return Webflow asset ID
    console.log(`  Uploaded: ${filename}${altText ? ' (with alt text)' : ''}`)
    return metadataResponse.id
    
  } catch (error) {
    console.error(`Failed to upload image. URL: ${imageUrl}, Error:`, error)
    return null
  }
}

async function syncArtworkImages(artworkImages) {
  if (!artworkImages || artworkImages.length === 0) {
    return []
  }
  
  console.log(`  🖼️  Syncing ${artworkImages.length} images with incremental logic...`)
  const webflowAssetIds = []
  let uploadedCount = 0
  let updatedCount = 0
  let skippedCount = 0
  
  for (const image of artworkImages) {
    if (!image.asset?.url) continue
    
    const sanityAssetId = image.asset._id
    const originalFilename = image.asset.originalFilename || ''
    const imageUrl = image.asset.url
    
    // Create enhanced alt text from artwork context
    const altText = image.alt?.en || image.alt?.de || ''
    const artworkContext = image.artworkContext
    
    let enhancedAltText = altText
    if (!enhancedAltText && artworkContext) {
      // Build descriptive text from artwork data
      const parts = []
      if (artworkContext.creatorName) parts.push(artworkContext.creatorName)
      if (artworkContext.workTitle) parts.push(artworkContext.workTitle)
      else if (artworkContext.name) parts.push(artworkContext.name)
      
      enhancedAltText = parts.join(' - ')
    }
    
    // Check if we've seen this image before
    const existingAsset = assetMappings.get(sanityAssetId)
    
    if (!existingAsset) {
      // New image - upload it
      console.log(`  📤 Uploading new image: ${originalFilename}`)
      console.log(`  🏷️  Enhanced description: ${enhancedAltText}`)
        
      const assetId = await uploadImageToWebflow(
        imageUrl, 
        'artwork', 
        enhancedAltText, 
        originalFilename
      )
      
      if (assetId) {
        // Track this asset
        assetMappings.set(sanityAssetId, {
          webflowAssetId: assetId,
          altText: enhancedAltText,
          filename: originalFilename,
          url: imageUrl,
          lastUpdated: new Date().toISOString()
        })
        
        webflowAssetIds.push(assetId)
        uploadedCount++
      }
    } else if (hasImageMetadataChanged({...image, alt: {en: enhancedAltText}}, existingAsset)) {
      // Metadata changed - update tracking (no API call needed)
      console.log(`  🔄 Updating metadata for: ${originalFilename}`)
      console.log(`  🏷️  New description: ${enhancedAltText}`)
      
      // Update tracking (skip API call since it doesn't work)
      assetMappings.set(sanityAssetId, {
        ...existingAsset,
        altText: enhancedAltText,
        filename: originalFilename,
        url: imageUrl,
        lastUpdated: new Date().toISOString()
      })
      updatedCount++
      
      webflowAssetIds.push(existingAsset.webflowAssetId)
    } else {
      // No change - skip
      console.log(`  ⏭️  Skipping unchanged image: ${originalFilename}`)
      webflowAssetIds.push(existingAsset.webflowAssetId)
      skippedCount++
    }
  }
  
  console.log(`  ✅ Image sync complete: ${uploadedCount} uploaded, ${updatedCount} updated, ${skippedCount} skipped`)
  return webflowAssetIds
}

//------CORE SYNC ENGINE (duplicate-aware collection sync)------//
async function syncCollection(options) {
  const {
    name,
    collectionId,
    mappingKey,
    sanityQuery,
    fieldMapper,
    customImageSync = null
  } = options
  
  console.log(`📋 Syncing ${name}...`)
  
  const sanityData = await sanityClient.fetch(sanityQuery)
  const dataArray = Array.isArray(sanityData) ? sanityData : (sanityData ? [sanityData] : [])
  console.log(`  • Total Sanity items: ${dataArray.length}`)
  let filteredData = dataArray
  
  // Quick/changed-only mode using updatedAt and lastSynced hashes
  if (FLAG_QUICK) {
    // If --since=auto, compute a cutoff from last run time if stored
    if (ARG_SINCE === 'auto') {
      // load last run timestamp from settings
      try {
        const cfg = await sanityClient.fetch(`*[_type == "webflowSyncSettings" && _id == "run-meta"][0]{ lastRun }`)
        GLOBAL_SINCE = cfg?.lastRun || null
      } catch {}
    } else if (ARG_SINCE) {
      GLOBAL_SINCE = ARG_SINCE
    }
    if (GLOBAL_SINCE) {
      console.log(`  • Quick mode: filtering by since=${GLOBAL_SINCE}`)
    } else {
      console.log(`  • Quick mode: filtering by delta hashes only`)
    }
    // Filter by updated timestamp if available in docs
    if (GLOBAL_SINCE) {
      const cutoff = new Date(GLOBAL_SINCE).getTime()
      filteredData = filteredData.filter(d => {
        const t = new Date(d._updatedAt || d._createdAt || 0).getTime()
        return t >= cutoff
      })
    }
  }
  
  // If running a per-document sync, skip the heavy prefetch and only look up when needed
  const documentMode = options.documentMode === true
  const checkOnly = options.checkOnly === true
  const forceUpdate = options.forceUpdate === true
  const webflowBySlug = new Map()
  const webflowByName = new Map()
  if (!documentMode && !checkOnly) {
    const existingWebflowItems = await getWebflowItems(collectionId)
    for (const wfItem of existingWebflowItems) {
      const slug = wfItem?.fieldData?.slug
      if (slug) webflowBySlug.set(slug, wfItem)
      const nm = wfItem?.fieldData?.name
      if (nm) {
        const list = webflowByName.get(nm) || []
        list.push(wfItem)
        webflowByName.set(nm, list)
      }
    }
  }
  
  // Process items and check for duplicates
  const newItems = []
  const updateItems = []
  let wouldCreate = 0
  let wouldUpdate = 0
  const skippedItems = []
  let existingCount = 0
  let processedCount = 0
  
  for (const item of filteredData) {
    // Prefer mapping, then document's stored webflowId
    let existingId = idMappings[mappingKey].get(item._id) || item.webflowId || null

    // If we have a webflowId, verify it exists in Webflow (don't fall back to name/slug matching)
    if (existingId && !checkOnly) {
      try {
        // Verify the webflowId still exists in Webflow and get current data
        const currentWebflowItem = await webflowRequest(`/collections/${collectionId}/items/${existingId}`)
        console.log(`  ✅ Verified existing webflowId for ${mappingKey}:${item._id} → ${existingId}`)
        
        // Force hash recalculation by clearing stored hash when webflowId is verified
        // This ensures we compare against actual current state, not cached state
        const key = `${mappingKey}:${item._id}`
        console.log(`  🔄 Forcing hash recalculation for verified webflowId item`)
        persistentHashes.delete(key)
        // Ensure the Sanity document stores the verified webflowId
        try {
          if (!item.webflowId || item.webflowId !== existingId) {
            await sanityClient.patch(item._id)
              .set({ webflowId: existingId })
              .commit({ visibility: 'async' })
          }
        } catch (e) {
          console.warn(`  Failed to persist verified webflowId on ${item._id}: ${e.message}`)
        }
        
      } catch (error) {
        if (error.message.includes('404')) {
          console.log(`  ❌ webflowId ${existingId} not found in Webflow, will create new item`)
          existingId = null
        } else {
          console.warn(`  ⚠️  Could not verify webflowId ${existingId}: ${error.message}`)
        }
      }
    }

    // Prepare mapped fields once (also used for adoption by slug)
    let mappedFieldsForId
    try {
      mappedFieldsForId = fieldMapper(item)
    } catch (e) {
      mappedFieldsForId = null
    }

    // If still no ID, attempt to adopt by slug
    if (!existingId && mappedFieldsForId?.slug && !checkOnly) {
      const adopt = documentMode
        ? await getWebflowItemBySlug(collectionId, mappedFieldsForId.slug)
        : webflowBySlug.get(mappedFieldsForId.slug)
      if (adopt?.id) {
        existingId = adopt.id
        idMappings[mappingKey].set(item._id, existingId)
        // Write back to Sanity document to persist the adopted ID
        try {
          await sanityClient.patch(item._id).set({ webflowId: existingId }).commit({ visibility: 'async' })
          console.log(`  Adopted existing Webflow item by slug for ${mappingKey}:${item._id} → ${existingId}`)
        } catch (e) {
          console.warn(`  Failed to write back adopted webflowId for ${item._id}: ${e.message}`)
        }
      }
    }

    // If still no ID, attempt to adopt by name (only if unique)
    if (!existingId && mappedFieldsForId?.name && !checkOnly) {
      const candidates = webflowByName.get(mappedFieldsForId.name) || []
      if (candidates.length === 1) {
        const adopt = candidates[0]
        existingId = adopt.id
        idMappings[mappingKey].set(item._id, existingId)
        try {
          await sanityClient.patch(item._id).set({ webflowId: existingId }).commit({ visibility: 'async' })
          console.log(`  Adopted existing Webflow item by name for ${mappingKey}:${item._id} → ${existingId}`)
        } catch (e) {
          console.warn(`  Failed to write back adopted webflowId for ${item._id}: ${e.message}`)
        }
      } else if (candidates.length > 1) {
        // Ambiguous - skip creation to avoid duplicates
        skippedItems.push({ _id: item._id, reason: 'ambiguous-name', name: mappedFieldsForId.name })
        console.warn(`  Skipping create for ${mappingKey}:${item._id} due to ambiguous name match in Webflow (multiple items with name)`)
        continue
      }
    }

    if (checkOnly) {
      // Pure delta detection without network calls. We intentionally ignore slug
      // for delta hashes so a slug change alone does not force an update.
      const mapped = mappedFieldsForId || fieldMapper(item)
      // Do not consider slug for update delta
      if (mapped && typeof mapped === 'object') delete mapped.slug
      const webflowItem = { fieldData: mapped || {} }
      const key = `${mappingKey}:${item._id}`
      const hash = hashObjectStable(webflowItem.fieldData)
      const prev = persistentHashes.get(key)
      if (!existingId) {
        wouldCreate++
      } else if (prev !== hash) {
        wouldUpdate++
      }
    } else if (!existingId) {
      // Handle custom image sync for artworks
      let webflowItem
      if (customImageSync) {
        webflowItem = await customImageSync(item)
      } else {
        // Use the precomputed mapped fields if available
        const mapped = mappedFieldsForId || fieldMapper(item)
        webflowItem = { fieldData: mapped }
      }
      
      newItems.push({ item, webflowItem })
    } else {
      // Always update existing items (UPSERT)
      let webflowItem
      if (customImageSync) {
        webflowItem = await customImageSync(item)
      } else {
        const mapped = mappedFieldsForId || fieldMapper(item)
        // On update, DO NOT change slug to avoid collisions. Slug is content,
        // not identity. We keep the Webflow slug stable unless we purposely
        // decide to change it with collision handling.
        delete mapped.slug
        webflowItem = { fieldData: mapped }
      }
      // Fingerprint for delta detection
      const hash = hashObjectStable(webflowItem.fieldData)
      const key = `${mappingKey}:${item._id}`
      const prev = persistentHashes.get(key)
      
      if (prev !== hash || forceUpdate) {
        updateItems.push({ item, webflowId: existingId, webflowItem, hash, key })
      }
      existingCount++
    }
    processedCount++
    if (processedCount % 100 === 0) {
      console.log(`  • Processed ${processedCount}/${sanityData.length} ...`)
    }
  }
  
  if (checkOnly) {
    const totalWould = wouldCreate + wouldUpdate
    console.log(`  📊 Check-only: ${wouldCreate} create, ${wouldUpdate} update → ${totalWould} changes`)
    return totalWould
  }
  console.log(`  📊 ${newItems.length} new, ${existingCount} existing (scanned ${filteredData.length}/${sanityData.length})`)
  
  // Final preflight: adopt-by-slug before creating to avoid duplicates
  const finalNewItems = []
  for (const ni of newItems) {
    const slug = ni?.webflowItem?.fieldData?.slug
    let adopt = null
    if (slug) {
      adopt = documentMode
        ? await getWebflowItemBySlug(collectionId, slug)
        : webflowBySlug.get(slug)
    }
    if (adopt?.id) {
      idMappings[mappingKey].set(ni.item._id, adopt.id)
      try {
        await sanityClient.patch(ni.item._id).set({ webflowId: adopt.id }).commit({ visibility: 'async' })
        console.log(`  ↳ Adopted pre-create by slug for ${mappingKey}:${ni.item._id} → ${adopt.id}`)
      } catch (e) {
        console.warn(`  Failed to save adopted webflowId on ${ni.item._id}: ${e.message}`)
      }
      // Turn this into an update candidate with slug removed (keep WF slug)
      const mapped = { ...ni.webflowItem.fieldData }
      delete mapped.slug
      const webflowItem = { fieldData: mapped }
      const hash = hashObjectStable(webflowItem.fieldData)
      const key = `${mappingKey}:${ni.item._id}`
      const prev = persistentHashes.get(key)
      if (prev !== hash || forceUpdate) {
        updateItems.push({ item: ni.item, webflowId: adopt.id, webflowItem, hash, key })
      }
      existingCount++
    } else {
      finalNewItems.push(ni)
    }
  }

  // Create only truly new items in Webflow (after adoption guard)
  let results = []
  if (finalNewItems.length > 0) {
    results = await createWebflowItems(collectionId, finalNewItems.map(ni => ni.webflowItem))

    // Safer association: map by slug where possible
    const sanityBySlug = new Map()
    for (const ni of finalNewItems) {
      const slug = ni.webflowItem?.fieldData?.slug
      if (slug) sanityBySlug.set(slug, ni.item)
    }

    for (const wf of results) {
      const slug = wf?.fieldData?.slug
      const sanityItem = slug ? sanityBySlug.get(slug) : null
      const fallbackItem = sanityItem || (finalNewItems.find(ni => !ni._associated)?.item)
      const target = fallbackItem || null
      if (!target) continue
      // mark associated to avoid double pickup in rare cases
      finalNewItems.forEach(ni => { if (ni.item._id === target._id) ni._associated = true })

      idMappings[mappingKey].set(target._id, wf.id)
      sanityClient.patch(target._id)
        .set({ webflowId: wf.id })
        .commit({ visibility: 'async' })
        .then(() => {
          console.log(`  ↳ Saved webflowId on ${mappingKey}:${target._id}`)
        })
        .catch((e) => {
          console.warn(`  Failed to save webflowId on ${target._id}: ${e.message}`)
        })
    }
  }

  // Update existing items in Webflow (one by one; API has no bulk update)
  let updatedCount = 0
  const updatedItemIds = []
  if (updateItems.length > 0) {
    console.log(`  🔄 Updating ${updateItems.length} existing ${name} items (delta only)...`)
  }
  for (let i = 0; i < updateItems.length; i++) {
    const u = updateItems[i]
    try {
      await updateWebflowItem(collectionId, u.webflowId, u.webflowItem.fieldData, false) // Don't publish yet
      persistentHashes.set(u.key, u.hash)
      updatedItemIds.push(u.webflowId) // Collect for batch publishing
      updatedCount++
      if ((i + 1) % 25 === 0 || i === updateItems.length - 1) {
        console.log(`    ↳ Updated ${i + 1}/${updateItems.length}`)
      }
    } catch (e) {
      // if rate limited, brief backoff and retry once
      if (String(e.message).includes('429')) {
        await sleep(1500)
        await updateWebflowItem(collectionId, u.webflowId, u.webflowItem.fieldData, false)
        persistentHashes.set(u.key, u.hash)
        updatedItemIds.push(u.webflowId)
        updatedCount++
        if ((i + 1) % 25 === 0 || i === updateItems.length - 1) {
          console.log(`    ↳ Updated ${i + 1}/${updateItems.length}`)
        }
      } else {
        console.warn(`Update failed for ${u.webflowId}: ${e.message}`)
      }
    }
  }
  
  // Batch publish all updated items at once
  if (FLAG_PUBLISH && updatedItemIds.length > 0) {
    console.log(`  📢 Batch publishing ${updatedItemIds.length} updated items...`)
    await publishWebflowItems(collectionId, updatedItemIds)
  }

  const unchangedCount = Math.max(existingCount - updateItems.length, 0)
  const skippedCount = skippedItems.length
  if (skippedCount > 0) {
    console.log(`⚠️  ${name}: ${skippedCount} skipped (ambiguous name matches, manual review)`)
  }
  console.log(`✅ ${name}: ${results.length} created, ${updatedCount} updated, ${unchangedCount} unchanged`)
  return results.length + updatedCount
}

//------FIELD MAPPERS (Sanity → Webflow fieldData shape)------//
function mapExhibitionFields(item) {
  // Also capture from this Exhibition (in case of deltas)
  try {
    (item.exhibitionImages || []).forEach((ref, idx) => {
      if (ref && ref._ref) setBoth(orderIndexByExhibitionImageId, ref._ref, idx + 1)
    })
    (item.workReferences || []).forEach((ref, idx) => {
      if (ref && ref._ref) setBoth(orderIndexByWorkId, ref._ref, idx + 1)
    })
  } catch {}
  return {
    name: sanitizeName(item.exhibitionTitle || 'Untitled'),
    slug: item.slug?.current || generateSlug(item.exhibitionTitle),
    'year-3': item.year || null,
    'start-date': item.startDate || '',
    'end-date-3': item.endDate || '',
    location: item.location || '',
    'exhibition-city': item.exhibitionCity || '',
    'exhibition-type-3': (item.exhibitionType === 'Internal') ? 'Internal' : 'External',
    'solo-group-2': (item.artistType === 'group') ? 'Group' : 'Solo', 
    'press-release': item.pressRelease ? convertSanityBlocksToWebflowRichText(item.pressRelease) : null,
    // Drop any artist IDs that no longer exist in Webflow to avoid 400 validation errors
    'artist-2': filterToExistingIds('artist', item.artist?.filter(a => a?._id).map(a => idMappings.artist.get(a._id)) || []),
    'featured-image': item.featuredExhibitionImage?._ref ? idMappings.exhibitionImage.get(item.featuredExhibitionImage._ref) : null,
    // Direct thumbnail image asset mapped to Webflow image field (current slug)
    'thumbnail-image-3': processImageField(item.thumbnailImage, `Exhibition ${item.exhibitionTitle} thumbnail`),
    // Use compact arrays only when IDs exist, otherwise send empty array to avoid nulls
    'installation-views-2': filterToExistingIds('exhibitionImage', (item.exhibitionImages || [])
      .map(ref => idMappings.exhibitionImage.get(ref?._ref))),
    'work-reference': filterToExistingIds('work', (item.workReferences || [])
      .map(ref => idMappings.work.get(ref?._ref)))
  }
}

function mapArtistFields(item) {
  return {
    name: sanitizeName(item.name || 'Untitled'),
    slug: item.slug?.current || generateSlug(item.name),
    'last-name': item.lastName || '',
    'picture': processImageField(item.previewImageOverview, `Artist ${item.name} picture`),
    // Direct media thumbnail mapped via optimized URL
    'thumbnail-image': processImageField(item.thumbnailImage, `Artist ${item.name} thumbnail`),
    'bio-summary': item.bioSummary || '',
    'bio': item.cv ? convertSanityBlocksToWebflowRichText(item.cv) : null,
    'represented': item.artistType === 'gallery' ? 'Gallery Artist' : 'Non Gallery Artist',
    'work-slider': filterToExistingIds('work', item.workReferences?.map(work => idMappings.work.get(work._ref)) || []),
    'exhibitons': filterToExistingIds('exhibition', item.exhibitionReferences?.map(ex => idMappings.exhibition.get(ex._ref)) || [])
  }
}

function mapNewsFields(item) {
  const artistWebflowIds = (item.artist || []).map(a => idMappings.artist.get(a?._id)).filter(Boolean)
  
  // Debug logging for News artist mapping (only show for News)
  if (item.title && artistWebflowIds.length > 0) {
    console.log(`  🎯 News item "${item.title}": ${item.artist?.length || 0} Sanity artists → ${artistWebflowIds.length} Webflow IDs`)
  }
  
  return {
    name: sanitizeName((item.artist?.map(a => a.name).filter(Boolean).join(', ') || '').trim() ? `${item.title || 'Untitled'} — ${item.artist.map(a=>a.name).filter(Boolean).join(', ')}` : (item.title || 'Untitled')),
    slug: item.slug?.current || generateSlug(item.title),
    'main-image': processImageField(item.mainImage),
    // Clear legacy text field and populate new multi-reference field
    'artist-name': '',
    'artists': artistWebflowIds,
    title: item.title || '',
    location: item.location || '',
    'from-dates': item.fromDate || null,
    'till-dates': item.tillDate || null,
    announcement: item.announcement ? convertSanityBlocksToWebflowRichText(item.announcement) : null,
    featured: item.featured || false,
    'item-style': item.itemStyle || 'medium'
  }
}

function mapExhibitionImageFields(item) {
  // Map Sanity size values to Webflow option IDs
  const sizeOptionMap = {
    'fullscreen': '127931e8133c1212488267a2ce98dd07',
    'scaled down': 'd88bb99d51455932b3008dc4b503b552'
  }
  const sizeValue = item.size || 'fullscreen'
  const sizeOptionId = sizeOptionMap[sizeValue] || sizeOptionMap['fullscreen']
  
  return {
    name: sanitizeName(item.name || 'Untitled'),
    slug: item.slug?.current || generateSlug(item.name),
    image: processImageField(item.installationView),
    'size': sizeOptionId, // Map to Webflow Option field ID
    artist: filterToExistingIds('artist', item.artist?.filter(artist => artist?._id).map(artist => idMappings.artist.get(artist._id)) || []),
    'exhibition-2': (() => {
      const id = item.exhibitionName?._ref ? idMappings.exhibition.get(item.exhibitionName._ref) : null
      const set = getExistingIdSetForKey('exhibition')
      return set && id && !set.has(id) ? null : id
    })()
  }
}

function mapAnnouncementFields(item) {
  return {
    name: sanitizeName(item.name || 'Untitled'),
    slug: item.slug?.current || generateSlug(item.name),
    type: item.announcementType || '',
    date: item.date || null,
    text: item.text ? convertSanityBlocksToWebflowRichText(item.text) : null
  }
}

// Image optimization function
function processImageField(imageField, debugLabel = '') {
  // Try _ref first (for unexpanded references), then _id (for expanded references)
  let imageRef = imageField?.asset?._ref || imageField?.asset?._id;
  
  // Debug logging for troubleshooting
  if (debugLabel && !imageRef) {
    console.log(`⚠️  ${debugLabel}: No image reference found`);
    console.log(`   imageField structure:`, JSON.stringify(imageField, null, 2));
  }
  
  if (!imageRef) return null
  
  // Convert Sanity ref "image-<hash>-<WxH>-<ext>" → "<hash>-<WxH>.<ext>"
  const imagePath = imageRef
    .replace(/^image-/, '')
    .replace(/-(jpg|jpeg|png|tif|tiff|webp)$/i, '.$1');
  
  // Generate optimized Sanity image URL (using WebP for better compression)
  const url = `https://cdn.sanity.io/images/09c9shy3/production/${imagePath}?w=2000&h=2000&fit=max&q=50&dpr=2&fm=webp`
  
  if (debugLabel) {
    console.log(`✅ ${debugLabel}: Generated URL from ref ${imageRef.substring(0, 30)}...`);
  }
  
  return url
}

function mapWorkFields(item) {
  const orderIdx = getOrderIndex(orderIndexByWorkId, item._id)
  return {
    name: sanitizeName(item.name || 'Untitled Work'),
    slug: item.slug?.current || generateSlug(item.name),
    image: processImageField(item.image),
    title: item.title || '',
    year: item.year || '',
    technique: item.technique || '',
    height: item.height?.toString() || '',
    width: item.width?.toString() || '',
    depth: item.depth?.toString() || '',
    'duration-video': item.duration || '',
    'exhibition-venue': item.place || '',
    'photography-by': item.photographyBy || null,
    artists: item.artist?.filter(artist => artist?._id).map(artist => idMappings.artist.get(artist._id)).filter(Boolean) || [],
    'exhibition-2': item.exhibition?._ref ? idMappings.exhibition.get(item.exhibition._ref) : null
  }
}

// PHASE 1: Sync Exhibitions
async function syncExhibitions() {
  return syncCollection({
    name: 'Exhibitions',
    collectionId: WEBFLOW_COLLECTIONS.exhibition,
    mappingKey: 'exhibition',
    sanityQuery: `
      *[_type == "exhibition" && !(_id in path('drafts.**')) && defined(exhibitionTitle) && defined(slug)] | order(exhibitionTitle asc) {
        _id,
        webflowId,
        exhibitionTitle,
        slug,
        year,
        startDate,
        endDate,
        location,
        exhibitionCity,
        exhibitionType,
        artistType,
        pressRelease,
        artist[]->{name, _id},
        thumbnailImage,
        featuredExhibitionImage,
        exhibitionImages,
        workReferences
      }
    `,
    fieldMapper: mapExhibitionFields
  })
}

// PHASE 2: Sync Artists
async function syncArtists() {
  return syncCollection({
    name: 'Artists',
    collectionId: WEBFLOW_COLLECTIONS.artist,
    mappingKey: 'artist',
    sanityQuery: `
      *[_type == "artist" && !(_id in path('drafts.**')) && defined(name) && defined(slug)] | order(name asc) {
        _id,
        webflowId,
        name,
        slug,
        lastName,
        thumbnailImage,
        previewImageOverview,
        bioSummary,
        cv,
        artistType,
        workReferences,
        exhibitionReferences
      }
    `,
    fieldMapper: mapArtistFields,
    checkOnly: FLAG_CHECK_ONLY
  })
}

// PHASE 3: Sync News
async function syncNews() {
  return syncCollection({
    name: 'News',
    collectionId: WEBFLOW_COLLECTIONS.news,
    mappingKey: 'news',
    sanityQuery: `
      *[_type == "news" && !(_id in path('drafts.**')) && defined(title) && defined(slug)] | order(title asc) {
        _id,
        slug,
        mainImage,
        artist[]->{_id, name},
        title,
        location,
        fromDate,
        tillDate,
        announcement,
        featured,
        itemStyle
      }
    `,
    fieldMapper: mapNewsFields
  })
}

// PHASE 4: Sync Exhibition Images
async function syncExhibitionImages() {
  return syncCollection({
    name: 'Exhibition Images',
    collectionId: WEBFLOW_COLLECTIONS.exhibitionImage,
    mappingKey: 'exhibitionImage',
    sanityQuery: `
      *[_type == "exhibitionImage" && !(_id in path('drafts.**')) && defined(installationView) && defined(name) && defined(slug)] | order(name asc) {
        _id,
        webflowId,
        name,
        slug,
        installationView,
        size,
        artist[]->{name, _id},
        exhibitionName
      }
    `,
    fieldMapper: mapExhibitionImageFields
  })
}

async function syncAnnouncements() {
  return syncCollection({
    name: 'Announcements',
    collectionId: WEBFLOW_COLLECTIONS.announcement,
    mappingKey: 'announcement',
    sanityQuery: `
      *[_type == "announcement" && !(_id in path('drafts.**')) && defined(name) && defined(slug)] | order(name asc) {
        _id,
        name,
        slug,
        announcementType,
        date,
        text
      }
    `,
    fieldMapper: mapAnnouncementFields
  })
}

async function syncWorks() {
  return syncCollection({
    name: 'Works',
    collectionId: WEBFLOW_COLLECTIONS.work,
    mappingKey: 'work',
    sanityQuery: `
      *[_type == "work" && !(_id in path('drafts.**')) && defined(image) && defined(name) && defined(slug)] | order(name asc) {
        _id,
        webflowId,
        name,
        slug,
        image,
        artist[]->{name, _id},
        exhibition,
        title,
        year,
        technique,
        height,
        width,
        depth,
        duration,
        place,
        photographyBy
      }
    `,
    fieldMapper: mapWorkFields
  })
}

// All sync functions defined above

// Reverse linkage is handled in Phase 3 after all ID mappings are populated

//------BATCH SYNC (multi-collection phases, progress reporting)------//
async function performCompleteSync(progressCallback = null) {
  const startTime = Date.now()
  let totalSynced = 0
  
  const updateProgress = (step, message, currentCount = 0, totalCount = 0) => {
    if (progressCallback) {
      progressCallback({
        phase: step,
        message,
        currentCount,
        totalCount,
        totalSynced
      })
    }
  }
  
  try {
    console.log('🚀 Starting Complete Sanity → Webflow Sync')
    console.log('='.repeat(60))
    
    // Load asset mappings for incremental image sync
    await loadAssetMappings()
    
    // Load ID mappings for persistent ID matching
    await loadIdMappings()
    loadPersistentMappings()
    
    // PHASE 0: Load existing ID mappings (smart sync - no clearing)
    console.log('\n🔗 PHASE 0: Loading existing ID mappings for smart sync')
    
    await loadIdMappings()
    loadPersistentMappings()
    
    // Rebuild mappings from existing Webflow data if needed
    // Skip heavy rebuild during targeted check-only runs
    if (!(FLAG_CHECK_ONLY && ARG_ONLY)) {
      await rebuildIdMappings()
    } else {
      console.log(`Skipping mapping rebuild in check-only mode for --only=${ARG_ONLY}`)
    }
    
    console.log('✅ Smart sync enabled - no duplicates will be created')
    
    // Build order indices once at start
    await buildOrderIndexMaps()

    // Phase 1: Foundation data (no dependencies)
    updateProgress('Phase 1', 'Starting foundation data sync...', 0, 4)
    console.log('\n📋 PHASE 1: Foundation Data')
    
    const syncFunctions = [
      { key: 'exhibition', name: 'Exhibitions', func: syncExhibitions },
      { key: 'artist', name: 'Artists', func: syncArtists },
      { key: 'news', name: 'News', func: syncNews },
      { key: 'announcement', name: 'Announcements', func: syncAnnouncements }
    ].filter(s => !ARG_ONLY || s.key === ARG_ONLY)
    
    for (let i = 0; i < syncFunctions.length; i++) {
      const { name, func } = syncFunctions[i]
      try {
        updateProgress('Phase 1', `Syncing ${name}...`, i + 1, 4)
        totalSynced += await func()
      } catch (error) {
        console.error(`❌ Failed to sync ${name}: ${error.message}`)
        updateProgress('Phase 1', `Failed to sync ${name}: ${error.message}`, i + 1, 4)
        // Continue with other collections instead of failing completely
      }
    }
    
    // Phase 2: Reference data (with dependencies)
    updateProgress('Phase 2', 'Starting reference data sync...', 0, 2)
    console.log('\n🔗 PHASE 2: Reference Data')
    
    const syncFunctions2 = [
      { key: 'exhibitionImage', name: 'Exhibition Images', func: syncExhibitionImages },
      { key: 'work', name: 'Works', func: syncWorks }
    ].filter(s => !ARG_ONLY || s.key === ARG_ONLY)
    
    for (let i = 0; i < syncFunctions2.length; i++) {
      const { name, func } = syncFunctions2[i]
      try {
        updateProgress('Phase 2', `Syncing ${name}...`, i + 1, 2)
        totalSynced += await func()
      } catch (error) {
        console.error(`❌ Failed to sync ${name}: ${error.message}`)
        updateProgress('Phase 2', `Failed to sync ${name}: ${error.message}`, i + 1, 2)
        // Continue with other collections instead of failing completely
      }
    }
    
    // Phase 3: Reverse linking (now that all ID mappings are populated)
    if (!ARG_ONLY || ARG_ONLY === 'exhibition') {
      updateProgress('Phase 3', 'Starting reverse linking for exhibitions...', 0, 1)
      console.log('\n🔗 PHASE 3: Reverse Linking')
      console.log('Re-syncing exhibitions with populated reference mappings...')
      try {
        const exhibitionReverseLinks = await syncExhibitions()
        totalSynced += exhibitionReverseLinks
        console.log(`✅ Updated ${exhibitionReverseLinks} exhibitions with reverse links`)
      } catch (error) {
        console.error(`❌ Failed to update exhibition reverse links: ${error.message}`)
        updateProgress('Phase 3', `Failed to update exhibition reverse links: ${error.message}`, 1, 1)
      }
    }
    
    // Phase 4: All collections synced with reverse links
    console.log('\n✅ All Collections Synced Successfully with Reverse Links!')
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ Complete sync finished in ${duration}s`)
    console.log(`📊 Total items synced: ${totalSynced}`)
    
    // Save asset mappings for future incremental syncs
    await saveAssetMappings()
    
    // Save ID mappings for future persistent ID matching
    await saveIdMappings()
    
    updateProgress('Complete', `Sync completed! ${totalSynced} items synced`, totalSynced, totalSynced)
    
    return {
      success: true,
      totalSynced,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    if (progressCallback) {
      progressCallback({
        phase: 'Error',
        message: error.message,
        error: true
      })
    }
    throw error
  }
}

//------CASCADE SYNC (Dependencies first)------//
async function syncExhibitionDependencies(exhibitionId) {
  console.log(`🔍 Analyzing dependencies for exhibition: ${exhibitionId}`)
  
  try {
    // Get the exhibition with all its references
    const exhibition = await sanityClient.fetch(`
      *[_id == $exhibitionId][0] {
        _id,
        exhibitionTitle,
        artist[]->{_id, name},
        exhibitionImages[]->{_id, name},
        workReferences[]->{_id, name}
      }
    `, { exhibitionId })

    if (!exhibition) {
      console.log(`❌ Exhibition not found: ${exhibitionId}`)
      return
    }

    console.log(`📋 Exhibition "${exhibition.exhibitionTitle}" has:`)
    console.log(`  - ${exhibition.artist?.length || 0} artists`)
    console.log(`  - ${exhibition.exhibitionImages?.length || 0} exhibition images`)
    console.log(`  - ${exhibition.workReferences?.length || 0} works`)

    let totalSynced = 0

    // 1. Sync missing artists first (batched)
    if (exhibition.artist?.length > 0) {
      const missingArtists = exhibition.artist.filter(artist => 
        artist._id && !idMappings.artist.has(artist._id)
      )
      if (missingArtists.length > 0) {
        const artistIds = missingArtists.map(a => a._id).join('", "')
        console.log(`🎨 Batch syncing ${missingArtists.length} artists...`)
        await syncCollection({
          name: `Artist Dependencies`,
          collectionId: WEBFLOW_COLLECTIONS.artist,
          mappingKey: 'artist',
          sanityQuery: `*[_type == "artist" && _id in ["${artistIds}"]] {
            _id, webflowId, name, slug, lastName, previewImageOverview, thumbnailImage,
            bioSummary, cv, artistType, workReferences[]->{_ref}, exhibitionReferences[]->{_ref}
          }`,
          fieldMapper: mapArtistFields,
          documentMode: true
        })
        totalSynced += missingArtists.length
        console.log(`  ✅ Batch synced ${missingArtists.length} artists`)
      }
    }

    // 2. Sync missing exhibition images (batched)
    if (exhibition.exhibitionImages?.length > 0) {
      const missingImages = exhibition.exhibitionImages.filter(img => 
        img._id && !idMappings.exhibitionImage.has(img._id)
      )
      if (missingImages.length > 0) {
        const imageIds = missingImages.map(i => i._id).join('", "')
        console.log(`🖼️  Batch syncing ${missingImages.length} exhibition images...`)
        await syncCollection({
          name: `Exhibition Image Dependencies`,
          collectionId: WEBFLOW_COLLECTIONS.exhibitionImage,
          mappingKey: 'exhibitionImage',
          sanityQuery: `*[_type == "exhibitionImage" && _id in ["${imageIds}"]] {
            _id, webflowId, name, slug, installationView, size,
            artist[]->{name, _id}, exhibitionName
          }`,
          fieldMapper: mapExhibitionImageFields,
          documentMode: true
        })
        totalSynced += missingImages.length
        console.log(`  ✅ Batch synced ${missingImages.length} exhibition images`)
      }
    }

    // 3. Sync missing works (batched)
    if (exhibition.workReferences?.length > 0) {
      const missingWorks = exhibition.workReferences.filter(work => 
        work._id && !idMappings.work.has(work._id)
      )
      if (missingWorks.length > 0) {
        const workIds = missingWorks.map(w => w._id).join('", "')
        console.log(`🎭 Batch syncing ${missingWorks.length} works...`)
        await syncCollection({
          name: `Work Dependencies`,
          collectionId: WEBFLOW_COLLECTIONS.work,
          mappingKey: 'work',
          sanityQuery: `*[_type == "work" && _id in ["${workIds}"]] {
            _id, webflowId, name, slug, image, title, year, technique,
            height, width, depth, duration, place, photographyBy,
            artist[]->{name, _id}, exhibition->{_ref}
          }`,
          fieldMapper: mapWorkFields,
          documentMode: true
        })
        totalSynced += missingWorks.length
        console.log(`  ✅ Batch synced ${missingWorks.length} works`)
      }
    }

    if (totalSynced > 0) {
      console.log(`🎉 Cascade sync complete: ${totalSynced} dependencies synced`)
      // Reload mappings after syncing dependencies
      await loadIdMappings()
    } else {
      console.log(`✅ All dependencies already synced - no cascade needed`)
    }

  } catch (error) {
    console.error(`❌ Failed to sync exhibition dependencies: ${error.message}`)
    // Don't throw - continue with main exhibition sync even if dependencies fail
  }
}

//------SINGLE-ITEM SYNC (Studio-triggered, uses core engine)------//
async function performSingleItemViaCollectionSync(sanityId, documentType) {
  // Single-item entrypoint used by Studio button. Uses the same collection-sync
  // logic as batch so behavior is consistent (mapping adoption, slug policy,
  // publishing). This path persists webflowId mappings.
  console.log(`🚀 Single-item sync via collection logic: ${documentType}/${sanityId}`)
  
  // Load mappings (same as working bulk sync)
  await loadAssetMappings()
  await loadIdMappings() 
  loadPersistentMappings()
  
  const baseId = typeof sanityId === 'string' ? sanityId.replace(/^drafts\./, '') : sanityId
  
  // CASCADE SYNC: For exhibitions, sync dependencies first
  if (documentType === 'exhibition') {
    console.log(`🔗 Checking for exhibition dependencies to sync first...`)
    await syncExhibitionDependencies(baseId)
  }
  
  // Use the SAME syncCollection logic that works for bulk, but with single-item query
  if (documentType === 'news') {
    return await syncCollection({
      name: 'Single News Item',
      collectionId: WEBFLOW_COLLECTIONS.news,
      mappingKey: 'news', 
      sanityQuery: `*[_type == "news" && _id in ["${baseId}", "drafts.${baseId}"] && defined(title)] | order(_id desc) [0] {
        _id, slug, title, summary, content, publicationDate, externalLink,
        artist[]->{_id, name}, featuredImage
      }`,
      fieldMapper: mapNewsFields,
      autoPublish: true
    })
  } else if (documentType === 'exhibition') {
    return await syncCollection({
      name: 'Single Exhibition Item',
      collectionId: WEBFLOW_COLLECTIONS.exhibition,
      mappingKey: 'exhibition',
      // Align fields with bulk exhibition sync (uses exhibitionTitle, startDate/endDate, etc.)
      sanityQuery: `*[_type == "exhibition" && _id in ["${baseId}", "drafts.${baseId}"] && defined(exhibitionTitle)] | order(_id desc) [0] {
        _id,
        slug,
        exhibitionTitle,
        year,
        startDate,
        endDate,
        location,
        exhibitionCity,
        exhibitionType,
        artistType,
        pressRelease,
        artist[]->{_id, name},
        featuredExhibitionImage,
        thumbnailImage,
        exhibitionImages,
        workReferences
      }`,
      fieldMapper: mapExhibitionFields,
      autoPublish: true
    })
  } else {
    throw new Error(`Single-item sync not implemented for type: ${documentType}`)
  }
}

// Lightweight single-item sync - only loads needed mappings  
async function performLightweightSingleSync(sanityId, documentType) {
  const startTime = Date.now()
  console.log(`🚀 Lightweight single sync: ${documentType}/${sanityId}`)
  
  try {
    // Get the specific item from Sanity
    const baseId = typeof sanityId === 'string' ? sanityId.replace(/^drafts\./, '') : sanityId
    const item = await sanityClient.fetch(`*[_id in ["${baseId}", "drafts.${baseId}"]] | order(_id desc) [0]`)
    
    if (!item) {
      throw new Error(`Item not found: ${sanityId}`)
    }
    
    // Load only the mappings we need for this specific item
    const neededMappings = await loadSelectiveMappings(item, documentType)
    
    // Load asset mappings for images (to prevent duplicate uploads)
    await loadSelectiveAssetMappings(item)
    
    console.log(`  📋 Loaded ${Object.keys(neededMappings).length} selective mappings + asset mappings`)
    
    // Sync this single item with minimal mapping overhead
    const result = await syncSingleItemWithMappings(item, documentType, neededMappings)
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ Lightweight sync completed in ${duration}s`)
    
    return { success: true, totalSynced: result ? 1 : 0, message: `Synced ${documentType} item` }
    
  } catch (error) {
    console.error('❌ Lightweight sync failed:', error.message)
    throw error
  }
}

// Load only the mappings needed for a specific item
async function loadSelectiveMappings(item, documentType) {
  const mappings = {}
  
  // Always need the item's own webflowId if it exists
  if (item.webflowId) {
    mappings[`${documentType}:${item._id}`] = item.webflowId
  }
  
  // Load reference mappings based on item type
  const referenceIds = []
  
  if (documentType === 'news' && item.artist) {
    referenceIds.push(...item.artist.map(a => `artist:${a._id}`).filter(Boolean))
  } else if (documentType === 'exhibition' && item.artist) {
    referenceIds.push(...item.artist.map(a => `artist:${a._id}`).filter(Boolean))
  } else if (documentType === 'work' && item.artist) {
    referenceIds.push(...item.artist.map(a => `artist:${a._id}`).filter(Boolean))
  }
  
  // Fetch only the specific reference mappings we need
  if (referenceIds.length > 0) {
    try {
      const result = await sanityClient.fetch(`
        *[_type == "webflowSyncSettings" && _id == "id-mappings"][0] {
          idMappings
        }
      `)
      
      if (result?.idMappings) {
        const allMappings = JSON.parse(result.idMappings)
        referenceIds.forEach(refId => {
          if (allMappings[refId]) {
            mappings[refId] = allMappings[refId]
          }
        })
      }
    } catch (error) {
      console.log('Failed to load reference mappings:', error.message)
    }
  }
  
  return mappings
}

// Load only asset mappings needed for this specific item's images
async function loadSelectiveAssetMappings(item) {
  const imageAssetIds = []
  
  // Collect all image asset IDs from this item
  if (item.featuredImage?._ref) imageAssetIds.push(item.featuredImage._ref)
  if (item.thumbnailImage?._ref) imageAssetIds.push(item.thumbnailImage._ref)
  if (item.image?._ref) imageAssetIds.push(item.image._ref)
  if (item.installationView?._ref) imageAssetIds.push(item.installationView._ref)
  
  if (imageAssetIds.length === 0) {
    console.log('  📸 No images to check for asset mappings')
    return
  }
  
  try {
    const result = await sanityClient.fetch(`
      *[_type == "webflowSyncSettings" && _id == "asset-mappings"][0] {
        assetMappings
      }
    `)
    
    if (result?.assetMappings) {
      const allAssetMappings = JSON.parse(result.assetMappings)
      
      // Load only the asset mappings for images in this item
      imageAssetIds.forEach(assetId => {
        if (allAssetMappings[assetId]) {
          assetMappings.set(assetId, allAssetMappings[assetId])
        }
      })
      
      console.log(`  📸 Loaded ${assetMappings.size} selective asset mappings`)
    }
  } catch (error) {
    console.log('Failed to load selective asset mappings:', error.message)
  }
}

// Sync single item with pre-loaded selective mappings
async function syncSingleItemWithMappings(item, documentType, mappings) {
  const collections = await getWebflowCollections()
  const collection = collections.find(c => c.key === documentType)
  
  if (!collection) {
    throw new Error(`Collection not found for type: ${documentType}`)
  }
  
  // Map the item fields using selective mappings
  let mappedFields
  if (documentType === 'news') {
    mappedFields = mapNewsFieldsSelective(item, mappings)
  } else if (documentType === 'exhibition') {
    mappedFields = mapExhibitionFieldsSelective(item, mappings)
  } else if (documentType === 'artist') {
    mappedFields = mapArtistFieldsSelective(item, mappings)
  } else if (documentType === 'work') {
    mappedFields = mapWorkFieldsSelective(item, mappings)
  } else {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  // Check if item exists in Webflow
  const existingId = mappings[`${documentType}:${item._id}`]
  
  if (existingId) {
    // Update existing item
    console.log(`  🔄 Updating existing ${documentType}: ${existingId}`)
    await updateWebflowItem(collection.id, existingId, mappedFields, true) // autoPublish = true
    return true
  } else {
    // Create new item
    console.log(`  ➕ Creating new ${documentType}`)
    const newItem = await createWebflowItem(collection.id, mappedFields, true) // autoPublish = true
    
    // Save the mapping
    await sanityClient.patch(item._id).set({ webflowId: newItem.id }).commit({ visibility: 'async' })
    console.log(`  💾 Saved webflowId ${newItem.id} to Sanity`)
    
    return true
  }
}

// Selective field mappers (no global mapping dependencies)
function mapNewsFieldsSelective(item, mappings) {
  const artistWebflowIds = (item.artist || []).map(a => mappings[`artist:${a._id}`]).filter(Boolean)
  
  return {
    name: item.title || 'Untitled News',
    slug: generateSlug(item.title || 'untitled-news'),
    'post-summary': item.summary || null,
    'post-content': item.content ? convertSanityBlocksToWebflowRichText(item.content) : null,
    'publication-date': item.publicationDate || null,
    'external-link': item.externalLink || null,
    artists: artistWebflowIds,
    'featured-image': processImageField(item.featuredImage),
    _archived: false,
    _draft: false
  }
}

function mapExhibitionFieldsSelective(item, mappings) {
  const artistWebflowIds = (item.artist || []).map(a => mappings[`artist:${a._id}`]).filter(Boolean)
  
  return {
    name: item.title || 'Untitled Exhibition',
    slug: generateSlug(item.title || 'untitled-exhibition'),
    'exhibition-title': item.title || null,
    'opening-date': item.openingDate || null,
    'closing-date': item.closingDate || null,
    'press-release': item.pressRelease ? convertSanityBlocksToWebflowRichText(item.pressRelease) : null,
    'artist-2': artistWebflowIds,
    'thumbnail-image-3': processImageField(item.thumbnailImage),
    _archived: false,
    _draft: false
  }
}

function mapArtistFieldsSelective(item, mappings) {
  return {
    name: item.name || 'Untitled Artist',
    slug: generateSlug(item.name || 'untitled-artist'),
    'artist-name': item.name || null,
    biography: item.biography ? convertSanityBlocksToWebflowRichText(item.biography) : null,
    'represented': item.artistType === 'gallery' ? 'Gallery Artist' : 'Non Gallery Artist',
    _archived: false,
    _draft: false
  }
}

function mapWorkFieldsSelective(item, mappings) {
  const artistWebflowIds = (item.artist || []).map(a => mappings[`artist:${a._id}`]).filter(Boolean)
  
  return {
    name: item.title || 'Untitled Work',
    slug: generateSlug(item.title || 'untitled-work'),
    'work-title': item.title || null,
    'work-year': item.year?.toString() || null,
    'work-medium': item.medium || null,
    'work-dimensions': item.dimensions || null,
    artists: filterToExistingIds('artist', artistWebflowIds),
    image: processImageField(item.image),
    _archived: false,
    _draft: false
  }
}

// Sync single item by Sanity ID (legacy function - kept for CLI usage)
async function performSingleItemSync(sanityId, progressCallback = null) {
  const startTime = Date.now()
  
  const updateProgress = (step, message) => {
    if (progressCallback) {
      progressCallback({ phase: step, message })
    }
  }
  
  try {
    console.log(`🎯 Starting single item sync for: ${sanityId}`)
    
    // Load mappings
    await loadAssetMappings()
    await loadIdMappings()
    loadPersistentMappings()
    
    // Determine document type from Sanity ID
    const baseId = typeof sanityId === 'string' ? sanityId.replace(/^drafts\./, '') : sanityId
    const item = await sanityClient.fetch(`*[_id in ["${baseId}", "drafts.${baseId}"]] | order(_id desc) [0] { _type, _id }`)
    
    if (!item) {
      throw new Error(`Item not found: ${sanityId}`)
    }
    
    const documentType = item._type
    console.log(`  📄 Item type: ${documentType}`)
    
    // USE CASCADE SYNC for exhibitions (same as API path)
    if (documentType === 'exhibition') {
      console.log(`🔗 Using cascade sync for exhibition...`)
      return await performSingleItemViaCollectionSync(sanityId, documentType)
    } else {
      // Use existing document sync logic for other types
      const result = await performDocumentSync(sanityId, documentType, progressCallback, false)
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`✅ Single item sync completed in ${duration}s`)
      
      return result
    }
    
  } catch (error) {
    console.error('❌ Single item sync failed:', error.message)
    if (progressCallback) {
      progressCallback({ phase: 'Error', message: error.message, error: true })
    }
    throw error
  }
}

// Sync specific document type
async function performDocumentSync(documentId, documentType, progressCallback = null, checkOnly = false) {
  const startTime = Date.now()
  let totalSynced = 0
  
  const updateProgress = (step, message, currentCount = 0, totalCount = 0) => {
    if (progressCallback) {
      progressCallback({
        phase: step,
        message,
        currentCount,
        totalCount,
        totalSynced
      })
    }
  }
  
  try {
    console.log(`🚀 Starting ${documentType} sync for document: ${documentId}`)
    const baseId = typeof documentId === 'string' ? documentId.replace(/^drafts\./, '') : documentId
    
    // Load mappings (hashes + ids)
    await loadAssetMappings()
    await loadIdMappings()
    loadPersistentMappings()
    
    // Sync based on document type
    switch (documentType) {
      case 'exhibition':
        updateProgress('Document Sync', 'Syncing exhibition...', 1, 1)
        totalSynced = await syncCollection({
          name: 'Exhibition',
          collectionId: WEBFLOW_COLLECTIONS.exhibition,
          mappingKey: 'exhibition',
          sanityQuery: `*[_type == "exhibition" && _id in ["${baseId}", "drafts.${baseId}"] && defined(exhibitionTitle) && defined(slug)] | order(_id desc) [0] {
            _id, exhibitionTitle, slug, year, startDate, endDate, location, exhibitionCity,
            exhibitionType, artistType, pressRelease, artist[]->{name, _id},
            thumbnailImage, featuredExhibitionImage, exhibitionImages, workReferences
          }`,
          fieldMapper: mapExhibitionFields,
          documentMode: true,
          checkOnly
        })
        break
        
      case 'artist':
        updateProgress('Document Sync', 'Syncing artist...', 1, 1)
        totalSynced = await syncCollection({
          name: 'Artist',
          collectionId: WEBFLOW_COLLECTIONS.artist,
          mappingKey: 'artist',
          sanityQuery: `*[_type == "artist" && _id in ["${baseId}", "drafts.${baseId}"] && defined(name) && defined(slug)] | order(_id desc) [0] {
            _id, name, slug, lastName, thumbnailImage, previewImageOverview, bioSummary, cv,
            artistType, workReferences, exhibitionReferences
          }`,
          fieldMapper: mapArtistFields,
          documentMode: true,
          checkOnly
        })
        break
        
      case 'work':
        updateProgress('Document Sync', 'Syncing work...', 1, 1)
        totalSynced = await syncCollection({
          name: 'Work',
          collectionId: WEBFLOW_COLLECTIONS.work,
          mappingKey: 'work',
          sanityQuery: `*[_type == "work" && _id in ["${baseId}", "drafts.${baseId}"] && defined(image) && defined(name) && defined(slug)] | order(_id desc) [0] {
            _id, name, slug, image, artist[]->{name, _id}, exhibition,
            title, year, technique, height, width, depth, duration, place, photographyBy
          }`,
          fieldMapper: mapWorkFields,
          documentMode: true,
          checkOnly
        })
        break
        
      case 'news':
        updateProgress('Document Sync', 'Syncing news...', 1, 1)
        totalSynced = await syncCollection({
          name: 'News',
          collectionId: WEBFLOW_COLLECTIONS.news,
          mappingKey: 'news',
          sanityQuery: `*[_type == "news" && _id in ["${baseId}", "drafts.${baseId}"] && defined(title) && defined(slug)] | order(_id desc) [0] {
            _id, slug, mainImage, artist[]->{_id, name}, title, location,
            fromDate, tillDate, announcement, featured, itemStyle
          }`,
          fieldMapper: mapNewsFields,
          documentMode: true,
          checkOnly
        })
        break
        
      case 'announcement':
        updateProgress('Document Sync', 'Syncing announcement...', 1, 1)
        totalSynced = await syncCollection({
          name: 'Announcement',
          collectionId: WEBFLOW_COLLECTIONS.announcement,
          mappingKey: 'announcement',
          sanityQuery: `*[_type == "announcement" && _id == "${documentId}" && defined(name) && defined(slug)] {
            _id, name, slug, announcementType, date, text
          }`,
          fieldMapper: mapAnnouncementFields
        })
        break
        
      case 'exhibitionImage':
        updateProgress('Document Sync', 'Syncing exhibition image...', 1, 1)
        totalSynced = await syncCollection({
          name: 'Exhibition Image',
          collectionId: WEBFLOW_COLLECTIONS.exhibitionImage,
          mappingKey: 'exhibitionImage',
          sanityQuery: `*[_type == "exhibitionImage" && _id in ["${baseId}", "drafts.${baseId}"] && defined(installationView) && defined(name) && defined(slug)] | order(_id desc) [0] {
            _id, name, slug, installationView, size, artist[]->{name, _id}, exhibition
          }`,
          fieldMapper: mapExhibitionImageFields,
          documentMode: true,
          checkOnly
        })
        break
        
      default:
        throw new Error(`Unsupported document type: ${documentType}`)
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ Document sync finished in ${duration}s`)
    console.log(`📊 Total items synced: ${totalSynced}`)
    
    // Save mappings unless this was a no-op check
    if (!checkOnly) {
      await saveAssetMappings()
      await saveIdMappings()
    }
    
    updateProgress('Complete', `Document synced! ${totalSynced} items processed`, totalSynced, totalSynced)
    
    return {
      success: true,
      totalSynced,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('❌ Document sync failed:', error.message)
    if (progressCallback) {
      progressCallback({
        phase: 'Error',
        message: error.message,
        error: true
      })
    }
    throw error
  }
}

//------API HANDLER (Vercel endpoint wrapper; supports streaming)------//
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    console.log('🔍 API handler started, method:', req.method)
    console.log('🔍 Request body keys:', Object.keys(req.body || {}))
    
    // Test endpoint
    if (req.body?.test) {
      // Quick test to verify API is working
      const exhibitions = await sanityClient.fetch(`count(*[_type == "exhibition"])`)
      const artists = await sanityClient.fetch(`count(*[_type == "artist"])`)
      const works = await sanityClient.fetch(`count(*[_type == "work"])`)
      
      return res.status(200).json({
        message: 'Connection test successful',
        success: true,
        data: { exhibitions, artists, works },
        timestamp: new Date().toISOString()
      })
    }
    
    // Verify required environment variables
    if (!process.env.SANITY_API_TOKEN) {
      throw new Error('SANITY_API_TOKEN environment variable is required')
    }
    if (!process.env.WEBFLOW_API_TOKEN) {
      throw new Error('WEBFLOW_API_TOKEN environment variable is required')
    }
    
    // Check request parameters
    const { streaming, documentId, documentType, syncType, checkOnly, autoPublish } = req.body || {}
    
    // Set publish flag globally if requested
    if (autoPublish) {
      process.env.API_PUBLISH_FLAG = 'true'
    }
    
    // Determine sync function to use
    let syncFunction
    let syncParams = []
    
    if (documentId && documentType) {
      // Document-specific sync - use lightweight single-item approach
      if (syncType === 'single-item') {
        // SELECTIVE LOADING: Only load mappings needed for this specific item
        console.log(`🎯 Single item sync triggered via API: ${documentType}/${documentId} (publish: ${Boolean(autoPublish)})`)
        
        // Use the SAME working collection sync logic, but filtered to one item
        syncFunction = performSingleItemViaCollectionSync
        syncParams = [documentId, documentType]
      } else {
        syncFunction = performDocumentSync
        syncParams = [documentId, documentType, undefined, Boolean(checkOnly)]
        console.log(`🔔 Document sync triggered via API: ${documentType}/${documentId} (${checkOnly ? 'checkOnly' : 'run'})`)
      }
    } else {
      // TEMPORARILY DISABLE BULK SYNC to stop the 406 spam
      console.log(`🚫 Bulk sync temporarily disabled to stop API overload`)
      return res.status(503).json({ 
        error: 'Bulk sync temporarily disabled due to API overload', 
        message: 'Use single-item sync instead',
        success: false 
      })
    }
    
    if (streaming && !checkOnly) {
      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      
      const sendProgress = (progress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`)
      }
      
      try {
        const result = await syncFunction(...syncParams, sendProgress)
        res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`)
        res.end()
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
        res.end()
      }
    } else {
      // Regular sync without streaming
      const result = await syncFunction(...syncParams)
      
      res.status(200).json({
        message: documentId ? (checkOnly ? 'Check completed' : 'Document synced successfully') : 'Sync completed successfully',
        ...result
      })
    }
    
  } catch (error) {
    console.error('API Error:', error.message)
    res.status(500).json({
      error: 'Sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
} 

// Allow running directly from command line
if (require.main === module) {
  console.log('🚀 Running sync directly...')
  
  // One-off publish-all for a collection if requested
  if (FLAG_PUBLISH_ALL && ARG_ONLY) {
    (async () => {
      try {
        const collectionId = WEBFLOW_COLLECTIONS[ARG_ONLY]
        if (!collectionId) throw new Error(`Unknown collection for --only=${ARG_ONLY}`)
        const items = await getWebflowItems(collectionId)
        const ids = items.map(i => i?.id).filter(Boolean)
        console.log(`📣 Publishing all ${ids.length} items in ${ARG_ONLY}...`)
        await publishWebflowItems(collectionId, ids)
        console.log('✅ Publish-all completed!')
        process.exit(0)
      } catch (e) {
        console.error('❌ Publish-all failed:', e.message)
        process.exit(1)
      }
    })()
    return
  }

  // Check for single item sync
  if (ARG_ITEM) {
    performSingleItemSync(ARG_ITEM, (progress) => {
      console.log(`[${progress.phase}] ${progress.message}`)
    }).then(() => {
      console.log('✅ Single item sync completed!')
      process.exit(0)
    }).catch((error) => {
      console.error('❌ Single item sync failed:', error.message)
      process.exit(1)
    })
  } else {
    // Regular full sync
    performCompleteSync((progress) => {
      console.log(`[${progress.phase}] ${progress.message}`)
    }).then(() => {
      console.log('✅ Sync completed!')
      process.exit(0)
    }).catch((error) => {
      console.error('❌ Sync failed:', error.message)
      process.exit(1)
    })
  }
  // debugImageUpload().catch(console.error)
} 

// New isolated test function for debugging image uploads
async function debugImageUpload() {
  console.log('🧪 Starting isolated image upload debug...')

  // 1. Load mappings needed for the test
  await loadAssetMappings()
  
  // 2. Fetch one artwork with images from Sanity
  const testArtwork = await sanityClient.fetch(`
    *[_type == "artwork" && count(images) > 0][0] {
      _id,
      name,
      images[]{ 
        asset->{
          _id,
          url,
          originalFilename
        },
        alt
      }
    }
  `)

  if (!testArtwork) {
    console.error('❌ No artworks with images found to test.')
    return
  }

  console.log(`🖼️  Testing with artwork: "${testArtwork.name}" (${testArtwork.images.length} images)`)

  // 3. Run only the image sync logic
  try {
    const webflowAssetIds = await syncArtworkImages(testArtwork.images)
    console.log('✅ Debug image sync complete.')
    console.log('Uploaded Webflow Asset IDs:', webflowAssetIds)
    
    // 4. Save any new asset mappings
    await saveAssetMappings()

  } catch (error) {
    console.error('❌ Debug image sync failed:', error)
  }
}

// To run the debug function: comment out the performCompleteSync call and uncomment this
// if (require.main === module) {
//   debugImageUpload().catch(console.error)
// } 