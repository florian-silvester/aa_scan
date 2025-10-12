const fs = require('fs')
const path = require('path')

// Load environment variables
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

let createClient
try {
  createClient = require('@sanity/client').createClient
} catch (e) {
  createClient = require(path.join(__dirname, '..', 'sanity-cms', 'node_modules', '@sanity', 'client')).createClient
}

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

async function clearCreatorHashes() {
  console.log('🧹 Clearing Creator hashes to force full re-sync\n')
  
  try {
    // Load existing hashes
    const result = await sanityClient.fetch(`
      *[_type == "webflowSyncSettings" && _id == "sync-hashes"][0] {
        hashes
      }
    `)
    
    if (!result?.hashes) {
      console.log('No hashes found')
      return
    }
    
    const hashes = JSON.parse(result.hashes)
    console.log(`Found ${Object.keys(hashes).length} total hashes`)
    
    // Remove all creator: prefixed hashes
    const creatorHashes = Object.keys(hashes).filter(k => k.startsWith('creator:'))
    console.log(`Removing ${creatorHashes.length} creator hashes...`)
    
    creatorHashes.forEach(key => delete hashes[key])
    
    // Save back
    await sanityClient.createOrReplace({
      _type: 'webflowSyncSettings',
      _id: 'sync-hashes',
      hashes: JSON.stringify(hashes),
      lastUpdated: new Date().toISOString()
    })
    
    console.log(`✅ Cleared creator hashes! Now run: node api/sync-to-webflow.js --only=creator`)
    console.log('   This will force update ALL creator locales with correct content.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

clearCreatorHashes().catch(console.error)

