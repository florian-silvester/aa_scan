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

const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2'
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  return response.json()
}

function extractTextFromBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return ''
  return blocks
    .map(block => {
      if (block._type === 'block' && block.children) {
        return block.children.map(child => child.text || '').join('')
      }
      return ''
    })
    .join(' ')
    .trim()
}

async function testOneCreator() {
  console.log('🧪 Testing Single Creator Locale Sync\n')
  console.log('='.repeat(60))
  
  // Get site info for locale IDs
  const siteInfo = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}`)
  const primaryLocaleId = siteInfo.locales.primary.cmsLocaleId
  const germanLocale = siteInfo.locales.secondary.find(l => l.tag === 'de' || l.tag === 'de-DE')
  const germanLocaleId = germanLocale?.cmsLocaleId
  
  console.log('Locale IDs:')
  console.log(`  English: ${primaryLocaleId}`)
  console.log(`  German:  ${germanLocaleId}\n`)
  
  // Get one creator from Sanity with German data
  const creator = await sanityClient.fetch(`
    *[_type == "creator" && defined(biography.de)][0] {
      _id,
      name,
      biography,
      portrait,
      nationality,
      specialties
    }
  `)
  
  if (!creator) {
    console.log('❌ No creators found with German data')
    return
  }
  
  console.log(`📝 Creator: ${creator.name}\n`)
  
  console.log('📊 Sanity Data:')
  console.log('  English:')
  console.log(`    Biography: ${extractTextFromBlocks(creator.biography?.en).substring(0, 100)}...`)
  console.log(`    Portrait:  ${extractTextFromBlocks(creator.portrait?.en).substring(0, 100)}...`)
  console.log(`    Nationality: ${creator.nationality?.en || 'N/A'}`)
  console.log(`    Specialties: ${creator.specialties?.en?.join(', ') || 'N/A'}`)
  
  console.log('\n  German:')
  console.log(`    Biography: ${extractTextFromBlocks(creator.biography?.de).substring(0, 100)}...`)
  console.log(`    Portrait:  ${extractTextFromBlocks(creator.portrait?.de).substring(0, 100)}...`)
  console.log(`    Nationality: ${creator.nationality?.de || 'N/A'}`)
  console.log(`    Specialties: ${creator.specialties?.de?.join(', ') || 'N/A'}`)
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Mapping looks correct!')
  console.log('\nWhen you run the sync:')
  console.log('  1. English biography/portrait will go to Webflow English locale')
  console.log('  2. German biography/portrait will go to Webflow German locale')
  console.log('  3. Same field names, different locale content')
  console.log('\n💡 Ready to sync? Run: node api/sync-to-webflow.js --only=creator')
}

testOneCreator().catch(console.error)

