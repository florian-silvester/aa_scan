const fs = require('fs')
const path = require('path')

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const {createClient} = require('@sanity/client')
const crypto = require('crypto')
const https = require('https')

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

// Webflow site ID
const WEBFLOW_SITE_ID = '68664367794a916bfa6d247c'

// Webflow collection IDs
const WEBFLOW_COLLECTIONS = {
  materialType: '6873884cedcec21fab8dd8dc',
  material: '687388627483ef982c64eb3f',
  finish: '6873886339818fe4cd550b03',
  medium: '686e55eace746485413c6bfb',
  category: '686e4fd904ae9f54468f85df',
  location: '686e4ff7977797cc67e99b97',
  creator: '686e4d544cb3505ce3b1412c',
  artwork: '686e50ba1170cab27bfa6c49'
}

// Store mapping of Sanity IDs to Webflow IDs (in production, use database)
const idMappings = {
  materialType: new Map(),
  material: new Map(),
  finish: new Map(),
  medium: new Map(),
  category: new Map(),
  location: new Map(),
  creator: new Map(),
  artwork: new Map()
}

// Persistent ID mappings system (like asset mappings)
let persistentIdMappings = new Map()

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
      console.log(`🔗 Loaded ${persistentIdMappings.size} ID mappings from Sanity`)
    } else {
      console.log('🔗 No existing ID mappings found, starting fresh')
      persistentIdMappings = new Map()
    }
  } catch (error) {
    console.log('🔗 Failed to load ID mappings, starting fresh:', error.message)
    persistentIdMappings = new Map()
  }
}

// Clear stale ID mappings when Webflow is actually empty
async function clearStaleIdMappings() {
  console.log('🧹 Clearing stale ID mappings from Sanity...')
  
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
    
    console.log('✅ Cleared all stale ID mappings')
  } catch (error) {
    console.error('❌ Failed to clear ID mappings:', error.message)
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
    
    console.log(`💾 Saved ${Object.keys(allMappings).length} ID mappings to Sanity`)
  } catch (error) {
    console.error('❌ Failed to save ID mappings:', error.message)
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
  
  console.log(`🔄 Loaded mappings into memory: ${Object.entries(idMappings).map(([k,v]) => `${k}:${v.size}`).join(', ')}`)
}

// Rebuild ID mappings from existing Webflow data (if mappings are empty)
async function rebuildIdMappings() {
  const collections = [
    { key: 'creator', id: WEBFLOW_COLLECTIONS.creator, sanityType: 'creator' },
    { key: 'artwork', id: WEBFLOW_COLLECTIONS.artwork, sanityType: 'artwork' },
    { key: 'category', id: WEBFLOW_COLLECTIONS.category, sanityType: 'category' },
    { key: 'material', id: WEBFLOW_COLLECTIONS.material, sanityType: 'material' },
    { key: 'medium', id: WEBFLOW_COLLECTIONS.medium, sanityType: 'medium' },
    { key: 'finish', id: WEBFLOW_COLLECTIONS.finish, sanityType: 'finish' },
    { key: 'materialType', id: WEBFLOW_COLLECTIONS.materialType, sanityType: 'materialType' },
    { key: 'location', id: WEBFLOW_COLLECTIONS.location, sanityType: 'location' }
  ]
  
  for (const collection of collections) {
    if (idMappings[collection.key].size === 0) {
      console.log(`🔄 Rebuilding ${collection.key} mappings...`)
      
      // Get existing Webflow items
      const webflowItems = await getWebflowItems(collection.id)
      
      // Get corresponding Sanity items
      const sanityItems = await sanityClient.fetch(`*[_type == "${collection.sanityType}"] { _id, slug, name }`)
      
      // Match by slug or name
      for (const webflowItem of webflowItems) {
        const slug = webflowItem.fieldData.slug
        const name = webflowItem.fieldData.name
        
        const sanityItem = sanityItems.find(item => 
          item.slug?.current === slug || 
          item.name === name ||
          generateSlug(item.name) === slug
        )
        
        if (sanityItem) {
          idMappings[collection.key].set(sanityItem._id, webflowItem.id)
        }
      }
      
      console.log(`  ✅ Rebuilt ${idMappings[collection.key].size} ${collection.key} mappings`)
    }
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
      console.log(`📁 Loaded ${assetMappings.size} asset mappings from Sanity`)
    } else {
      console.log('📁 No existing asset mappings found, starting fresh')
      assetMappings = new Map()
    }
  } catch (error) {
    console.log('📁 Failed to load asset mappings, starting fresh:', error.message)
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
    
    console.log(`💾 Saved ${assetMappings.size} asset mappings to Sanity`)
  } catch (error) {
    console.error('❌ Failed to save asset mappings:', error.message)
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
    console.log(`  🏷️  Updated alt text: ${altText}`)
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
      console.log(`  🏷️  Updated alt text (alt format): ${altText}`)
      return true
    } catch (error2) {
      console.warn(`  ⚠️  Failed to update alt text (tried both formats): ${error.message}`)
      return false
    }
  }
}

// Convert Sanity block content to Webflow's Rich Text JSON format
function convertSanityBlocksToWebflowRichText(blocks) {
  if (!blocks || !Array.isArray(blocks)) return null

  const content = blocks.map(block => {
    if (block._type === 'block' && block.children) {
      const paragraphContent = block.children.map(child => {
        const marks = child.marks?.map(mark => {
          if (mark === 'strong') return { type: 'bold' }
          if (mark === 'em') return { type: 'italic' }
          if (mark.startsWith('link-')) return { type: 'link', attrs: { href: mark.substring(5) } }
          return { type: mark }
        }).filter(Boolean)

        return {
          type: 'text',
          text: child.text || '',
          ...(marks && marks.length > 0 && { marks })
        }
      })
      
      return {
        type: 'paragraph',
        content: paragraphContent
      }
    }
    return null
  }).filter(Boolean)

  if (content.length === 0) return null
  
  return {
    type: 'doc',
    content: content
  }
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
    .join(' ')
    .trim()
}

// Collection-specific mapping functions
function mapMaterialTypeFields(sanityItem) {
  return {
    'name-english': sanityItem.name?.en || '',
    'name-german': sanityItem.name?.de || '',
    'description-english': sanityItem.description?.en || '',
    'description-german': sanityItem.description?.de || '',
    'sort-order': sanityItem.sortOrder || 0,
    name: sanityItem.name?.en || sanityItem.name?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.name?.en || sanityItem.name?.de)
  }
}

function mapCategoryFields(sanityItem) {
  return {
    'title-german': sanityItem.title?.de || '',
    description: sanityItem.description?.en || sanityItem.description?.de || '',
    name: sanityItem.title?.en || sanityItem.title?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.title?.en || sanityItem.title?.de)
  }
}

function mapCreatorFields(sanityItem) {
  return {
    'name': sanityItem.name || 'Untitled',
    'slug': sanityItem.slug?.current || generateSlug(sanityItem.name),
    'biography-english': extractTextFromBlocks(sanityItem.biography?.en),
    'biography-german': extractTextFromBlocks(sanityItem.biography?.de),
    'portrait-english': extractTextFromBlocks(sanityItem.portrait?.en),
    'portrait-german': extractTextFromBlocks(sanityItem.portrait?.de),
    'website': sanityItem.website || '',
    'email': sanityItem.email || '',
    'nationality-english': sanityItem.nationality?.en || '',
    'nationality-german': sanityItem.nationality?.de || '',
    'birth-year': sanityItem.birthYear ? parseInt(sanityItem.birthYear, 10) : null,
    'specialties-english': sanityItem.specialties?.en?.join(', ') || '',
    'specialties-german': sanityItem.specialties?.de?.join(', ') || '',
    'category': sanityItem.category?._ref ? idMappings.category.get(sanityItem.category._ref) || null : null
  }
}

function mapLocationFields(sanityItem) {
  return {
    name: sanityItem.name?.en || sanityItem.name?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.name?.en || sanityItem.name?.de)
  }
}

function mapMediumFinishFields(sanityItem) {
  return {
    'name-english': sanityItem.name?.en || '',
    'name-german': sanityItem.name?.de || '',
    'description-english': sanityItem.description?.en || '',
    'description-german': sanityItem.description?.de || '',
    name: sanityItem.name?.en || sanityItem.name?.de || 'Untitled',
    slug: sanityItem.slug?.current || generateSlug(sanityItem.name?.en || sanityItem.name?.de)
  }
}

function generateSlug(text) {
  if (!text) return 'untitled'
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Map Sanity location types to Webflow location types
function mapLocationType(sanityType) {
  const typeMapping = {
    'museum': 'Museum',
    'shop-gallery': 'Shop / Gallery',
    'studio': 'Studio'
  }
  return typeMapping[sanityType] || 'Shop / Gallery' // Default to Shop / Gallery
}

// Webflow API helper with rate limit handling
async function webflowRequest(endpoint, options = {}, retryCount = 0) {
  const baseUrl = 'https://api.webflow.com/v2'
  const maxRetries = 3
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  // Handle rate limits with exponential backoff
  if (response.status === 429 && retryCount < maxRetries) {
    const waitTime = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
    console.log(`⏳ Rate limited, waiting ${waitTime/1000}s before retry ${retryCount + 1}/${maxRetries}`)
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
      results.push(...result.items)
    } catch (error) {
      console.error(`Batch failed:`, error.message)
      throw error
    }
  }
  
  return results
}

// Delete items from Webflow (with batch processing)
async function deleteWebflowItems(collectionId, itemIds) {
  const results = []
  const batchSize = 50 // Can use a larger batch size for logging, requests are sequential
  
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize)
    console.log(`  🗑️  Deleting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(itemIds.length/batchSize)} (${batch.length} items)`)
    
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
            console.log(`  ⏳ Rate limited, retrying ${itemId} in ${waitTime/1000}s...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          console.warn(`  ⚠️  Failed to delete ${itemId}: ${error.message}`)
          results.push({ itemId, status: 'error', error: error.message })
          break // Failure, exit while loop
        }
      }
    }
  }
  
  const successCount = results.filter(r => r.status === 'deleted').length
  const errorCount = results.filter(r => r.status === 'error').length
  
  if (errorCount > 0) {
    console.warn(`  ⚠️  ${errorCount} items failed to delete (${successCount} successful)`)
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
      const result = await webflowRequest(`/collections/${collectionId}/items?limit=${limit}&offset=${offset}`)
      const items = result.items || []
      
      allItems.push(...items)
      
      // If we got fewer items than the limit, we've reached the end
      if (items.length < limit) {
        break
      }
      
      offset += limit
    }
    
    console.log(`  📄 Found ${allItems.length} existing items`)
    return allItems
  } catch (error) {
    console.error(`Failed to get Webflow items:`, error.message)
    return []
  }
}

// Clear existing items from a collection
async function clearWebflowCollection(collectionId, collectionName) {
  console.log(`  🧹 Clearing existing ${collectionName}...`)
  const existingItems = await getWebflowItems(collectionId)
  
  if (existingItems.length === 0) {
    console.log(`  ✅ No existing ${collectionName} to clear`)
    return
  }
  
  console.log(`  🗑️  Deleting ${existingItems.length} existing ${collectionName}`)
  const itemIds = existingItems.map(item => item.id)
  await deleteWebflowItems(collectionId, itemIds)
  console.log(`  ✅ Cleared ${existingItems.length} existing ${collectionName}`)
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

async function uploadImageToWebflow(imageUrl, siteName, altText = null, originalFilename = null) {
  try {
    // Add a 5-second delay to respect asset creation rate limits
    await new Promise(resolve => setTimeout(resolve, 5000))

    // 1. Download image from Sanity
    console.log(`  📥 Downloading: ${imageUrl}`)
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
    console.log('  📤 Uploading to S3 with FormData...')
    
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
    console.log(`  ✅ Uploaded: ${filename}${altText ? ' (with alt text)' : ''}`)
    return metadataResponse.id
    
  } catch (error) {
    console.error(`❌ Failed to upload image. URL: ${imageUrl}, Error:`, error)
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

// Universal duplicate-aware collection sync helper
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
  
  // Process items and check for duplicates
  const newItems = []
  let existingCount = 0
  
  for (const item of sanityData) {
    const existingId = idMappings[mappingKey].get(item._id)
    if (!existingId) {
      // Handle custom image sync for artworks
      let webflowItem
      if (customImageSync) {
        webflowItem = await customImageSync(item)
      } else {
        webflowItem = {
          fieldData: fieldMapper(item)
        }
      }
      
      newItems.push({ item, webflowItem })
    } else {
      existingCount++
    }
  }
  
  console.log(`  📊 ${newItems.length} new, ${existingCount} existing`)
  
  // Create only new items in Webflow
  let results = []
  if (newItems.length > 0) {
    results = await createWebflowItems(collectionId, newItems.map(ni => ni.webflowItem))
    
    // Store new mappings
    results.forEach((webflowItem, index) => {
      const sanityItem = newItems[index].item
      idMappings[mappingKey].set(sanityItem._id, webflowItem.id)
    })
  }
  
  console.log(`✅ ${name}: ${results.length} created, ${existingCount} skipped (already exist)`)
  return results.length
}

// PHASE 1: Sync Material Types
async function syncMaterialTypes() {
  return syncCollection({
    name: 'Material Types',
    collectionId: WEBFLOW_COLLECTIONS.materialType,
    mappingKey: 'materialType',
    sanityQuery: `
      *[_type == "materialType"] | order(sortOrder asc, name.en asc) {
        _id,
        name,
        description,
        sortOrder,
        slug
      }
    `,
    fieldMapper: mapMaterialTypeFields
  })
}

// PHASE 2: Sync Finishes
async function syncFinishes() {
  return syncCollection({
    name: 'Finishes',
    collectionId: WEBFLOW_COLLECTIONS.finish,
    mappingKey: 'finish',
    sanityQuery: `
      *[_type == "finish"] | order(name.en asc) {
        _id,
        name,
        description,
        slug
      }
    `,
    fieldMapper: mapMediumFinishFields
  })
}

// PHASE 3: Sync Materials (with Material Type references)
async function syncMaterials() {
  return syncCollection({
    name: 'Materials',
    collectionId: WEBFLOW_COLLECTIONS.material,
    mappingKey: 'material',
    sanityQuery: `
      *[_type == "material"] | order(name.en asc) {
        _id,
        name,
        description,
        materialType->{_id, name},
        slug
      }
    `,
    fieldMapper: (item) => ({
      ...mapMediumFinishFields(item),
      'material-type': item.materialType?._id ? idMappings.materialType.get(item.materialType._id) || null : null
    })
  })
}

// PHASE 4: Sync other collections
async function syncMediums() {
  return syncCollection({
    name: 'Mediums',
    collectionId: WEBFLOW_COLLECTIONS.medium,
    mappingKey: 'medium',
    sanityQuery: `
      *[_type == "medium"] | order(name.en asc) {
        _id,
        name,
        description,
        slug
      }
    `,
    fieldMapper: mapMediumFinishFields
  })
}

async function syncCategories() {
  return syncCollection({
    name: 'Categories',
    collectionId: WEBFLOW_COLLECTIONS.category,
    mappingKey: 'category',
    sanityQuery: `
      *[_type == "category"] | order(title.en asc) {
        _id,
        title,
        description,
        slug
      }
    `,
    fieldMapper: (item) => ({
      name: item.title?.en || item.title?.de || 'Untitled',
      slug: item.slug?.current || generateSlug(item.title?.en || item.title?.de),
      'name-english': item.title?.en || '',
      'name-german': item.title?.de || '',
      'description-english': item.description?.en || '',
      'description-german': item.description?.de || ''
    })
  })
}

async function syncLocations() {
  return syncCollection({
    name: 'Locations',
    collectionId: WEBFLOW_COLLECTIONS.location,
    mappingKey: 'location',
    sanityQuery: `
      *[_type == "location"] | order(name.en asc) {
        _id,
        name,
        type,
        address,
        city->{name},
        country->{name},
        website,
        times,
        phone,
        email,
        description,
        slug
      }
    `,
    fieldMapper: (item) => ({
      name: item.name?.en || item.name?.de || 'Untitled',
      slug: item.slug?.current || generateSlug(item.name?.en || item.name?.de),
      'name-english': item.name?.en || '',
      'name-german': item.name?.de || '',
      'description-english': item.description?.en || '',
      'description-german': item.description?.de || '',
      'location-type': mapLocationType(item.type),
      address: item.address || '',
      'city-location': item.city?.name?.en || item.city?.name?.de || '',
      country: item.country?.name?.en || item.country?.name?.de || '',
      website: item.website || '',
      'opening-times-english': item.times?.en || '',
      'opening-times-german': item.times?.de || '',
      phone: item.phone || '',
      email: item.email || ''
    })
  })
}

async function syncCreators() {
  return syncCollection({
    name: 'Creators',
    collectionId: WEBFLOW_COLLECTIONS.creator,
    mappingKey: 'creator',
    sanityQuery: `
      *[_type == "creator"] | order(name asc) {
        _id,
        name,
        biography,
        portrait,
        nationality,
        specialties,
        galleryImages,
        slug,
        website,
        email,
        birthYear,
        tier,
        category
      }
    `,
    fieldMapper: mapCreatorFields
  })
}

// PHASE 8: Sync Artworks
async function syncArtworks() {
  // Custom artwork mapper with image handling
  const artworkCustomSync = async (item) => {
    // Simple URL-based image handling - let Webflow handle uploads
    const artworkImages = item.images?.map(image => {
      if (!image.asset?.url) return null
      
      // Create enhanced alt text
      const altText = image.alt?.en || image.alt?.de || ''
      const artworkName = item.name || item.workTitle?.en || item.workTitle?.de
      const creatorName = item.creator?.name
      
      let enhancedAltText = altText
      if (!enhancedAltText && artworkName) {
        const parts = []
        if (creatorName) parts.push(creatorName)
        if (artworkName) parts.push(artworkName)
        enhancedAltText = parts.join(' - ')
      }
      
      return {
        url: image.asset.url,
        alt: enhancedAltText || artworkName || 'Artwork image'
      }
    }).filter(Boolean) || []
    
    console.log(`  🖼️  Prepared ${artworkImages.length} images for upload via URLs`)
    
    // Validate and map references with error logging
    const creatorId = item.creator?._id ? idMappings.creator.get(item.creator._id) || null : null
    if (item.creator?._id && !creatorId) {
      console.warn(`  ⚠️  Creator reference not found for artwork '${item.name}': ${item.creator._id}`)
    }
    
    const categoryId = item.category?._id ? idMappings.category.get(item.category._id) || null : null
    if (item.category?._id && !categoryId) {
      console.warn(`  ⚠️  Category reference not found for artwork '${item.name}': ${item.category._id}`)
    }
    
    const materialIds = item.materials?.map(mat => {
      const mappedId = idMappings.material.get(mat._id)
      if (!mappedId) {
        console.warn(`  ⚠️  Material reference not found for artwork '${item.name}': ${mat._id}`)
      }
      return mappedId
    }).filter(Boolean) || []
    
    const mediumIds = item.medium?.map(med => {
      const mappedId = idMappings.medium.get(med._id)
      if (!mappedId) {
        console.warn(`  ⚠️  Medium reference not found for artwork '${item.name}': ${med._id}`)
      }
      return mappedId
    }).filter(Boolean) || []
    
    const finishIds = item.finishes?.map(fin => {
      const mappedId = idMappings.finish.get(fin._id)
      if (!mappedId) {
        console.warn(`  ⚠️  Finish reference not found for artwork '${item.name}': ${fin._id}`)
      }
      return mappedId
    }).filter(Boolean) || []
    
    return {
      fieldData: {
        name: item.name || 'Untitled',
        slug: item.slug?.current || generateSlug(item.name || item.workTitle?.en),
        'work-title': item.workTitle?.en || item.workTitle?.de || '',
        'work-title-english': item.workTitle?.en || '',
        'work-title-german': item.workTitle?.de || '',
        'description-english': item.description?.en || '',
        'description-german': item.description?.de || '',
        creator: creatorId,
        category: categoryId ? [categoryId] : [],
        materials: materialIds,
        medium: mediumIds,
        finishes: finishIds,
        'size-dimensions': item.size || '',
        year: item.year || '',
        price: item.price || '',
        'artwork-images': artworkImages
      }
    }
  }

  return syncCollection({
    name: 'Artworks',
    collectionId: WEBFLOW_COLLECTIONS.artwork,
    mappingKey: 'artwork',
    sanityQuery: `
      *[_type == "artwork"] | order(name asc) {
        _id,
        name,
        workTitle,
        description,
        creator->{_id},
        category->{_id},
        materials[]->{_id},
        medium[]->{_id},
        finishes[]->{_id},
        size,
        year,
        price,
        slug,
        images[]{ 
          asset->{
            _id,
            url,
            originalFilename
          },
          alt
        }
      }
    `,
    fieldMapper: null, // Not used since we use customImageSync
    customImageSync: artworkCustomSync
  })
}

// PHASE 4: Populate Creator Works (Reverse Linkage)
async function populateCreatorWorks() {
  console.log('\n🔗 PHASE 4: Populating Creator Works (Reverse Linkage)')
  
  try {
    // Get ALL creators from Webflow with pagination
    let allCreators = []
    let creatorsOffset = 0
    let hasMoreCreators = true
    
    while (hasMoreCreators) {
      const creatorsResponse = await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.creator}/items?limit=100&offset=${creatorsOffset}`)
      allCreators = allCreators.concat(creatorsResponse.items)
      
      hasMoreCreators = creatorsResponse.items.length === 100
      creatorsOffset += 100
    }
    
    console.log(`📋 Found ${allCreators.length} creators to process`)
    
    // Get ALL artworks from Webflow with pagination  
    let allArtworks = []
    let artworksOffset = 0
    let hasMoreArtworks = true
    
    while (hasMoreArtworks) {
      const artworksResponse = await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.artwork}/items?limit=100&offset=${artworksOffset}`)
      allArtworks = allArtworks.concat(artworksResponse.items)
      
      hasMoreArtworks = artworksResponse.items.length === 100
      artworksOffset += 100
    }
    
    console.log(`🖼️  Found ${allArtworks.length} artworks to process`)
    
    // Process each creator
    for (let i = 0; i < allCreators.length; i++) {
      const creator = allCreators[i]
      const creatorName = creator.fieldData.name
      
      // Find all artworks that belong to this creator
      const creatorArtworks = allArtworks.filter(artwork => 
        artwork.fieldData.creator === creator.id
      )
      
      if (creatorArtworks.length > 0) {
        console.log(`  🎨 ${creatorName}: ${creatorArtworks.length} artworks`)
        
        // Update creator's works field with artwork IDs
        const artworkIds = creatorArtworks.map(artwork => artwork.id)
        
        await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.creator}/items/${creator.id}`, {
          method: 'PATCH',
          body: {
            fieldData: {
              works: artworkIds
            }
          }
        })
      } else {
        console.log(`  ⚪ ${creatorName}: 0 artworks`)
      }
    }
    
    console.log(`✅ Creator works populated successfully`)
    
  } catch (error) {
    console.error(`❌ Error populating creator works:`, error)
    throw error
  }
}

// Main sync function
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
    await rebuildIdMappings()
    
    console.log('✅ Smart sync enabled - no duplicates will be created')
    
    // Phase 1: Foundation data (no dependencies)
    updateProgress('Phase 1', 'Starting foundation data sync...', 0, 4)
    console.log('\n📋 PHASE 1: Foundation Data')
    
    const syncFunctions = [
      { name: 'Material Types', func: syncMaterialTypes },
      { name: 'Finishes', func: syncFinishes },
      { name: 'Categories', func: syncCategories },
      { name: 'Locations', func: syncLocations }
    ]
    
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
    updateProgress('Phase 2', 'Starting reference data sync...', 0, 3)
    console.log('\n🔗 PHASE 2: Reference Data')
    
    const syncFunctions2 = [
      { name: 'Materials', func: syncMaterials },
      { name: 'Mediums', func: syncMediums },
      { name: 'Creators', func: syncCreators }
    ]
    
    for (let i = 0; i < syncFunctions2.length; i++) {
      const { name, func } = syncFunctions2[i]
      try {
        updateProgress('Phase 2', `Syncing ${name}...`, i + 1, 3)
        totalSynced += await func()
      } catch (error) {
        console.error(`❌ Failed to sync ${name}: ${error.message}`)
        updateProgress('Phase 2', `Failed to sync ${name}: ${error.message}`, i + 1, 3)
        // Continue with other collections instead of failing completely
      }
    }
    
    // Phase 3: Complex data (with multiple dependencies)
    updateProgress('Phase 3', 'Starting artwork sync...', 0, 1)
    console.log('\n🎨 PHASE 3: Complex Data')
    
    try {
      updateProgress('Phase 3', 'Syncing Artworks with Images...', 1, 1)
      totalSynced += await syncArtworks()
    } catch (error) {
      console.error(`❌ Failed to sync Artworks:`, error)
      updateProgress('Phase 3', `Failed to sync Artworks: ${error.message}`, 1, 1)
    }
    
    // PHASE 4: Populate Creator Works (Reverse Linkage)
    try {
      updateProgress('Phase 4', 'Linking artworks to creators...', 1, 1)
      await populateCreatorWorks()
    } catch (error) {
      console.error(`❌ Failed to populate creator works:`, error)
      updateProgress('Phase 4', `Failed to populate creator works: ${error.message}`, 1, 1)
    }
    
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

// Main API handler
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
    // Verify required environment variables
    if (!process.env.SANITY_API_TOKEN) {
      throw new Error('SANITY_API_TOKEN environment variable is required')
    }
    if (!process.env.WEBFLOW_API_TOKEN) {
      throw new Error('WEBFLOW_API_TOKEN environment variable is required')
    }
    
    // Check if client wants streaming progress
    const { streaming } = req.body || {}
    
    if (streaming) {
      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      
      const sendProgress = (progress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`)
      }
      
      try {
        console.log('🔔 Sync triggered via API (streaming)')
        const result = await performCompleteSync(sendProgress)
        res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`)
        res.end()
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
        res.end()
      }
    } else {
      // Regular sync without streaming
      console.log('🔔 Sync triggered via API')
      const result = await performCompleteSync()
      
      res.status(200).json({
        message: 'Sync completed successfully',
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
  performCompleteSync((progress) => {
    console.log(`[${progress.phase}] ${progress.message}`)
  }).then(() => {
    console.log('✅ Sync completed!')
    process.exit(0)
  }).catch((error) => {
    console.error('❌ Sync failed:', error.message)
    process.exit(1)
  })
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