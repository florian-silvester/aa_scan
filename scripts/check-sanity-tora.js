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

async function checkSanityData() {
  console.log('🔍 Checking Sanity Data for Tora Urup\n')
  
  const creator = await sanityClient.fetch(`
    *[_type == "creator" && name == "Tora Urup"][0] {
      name,
      biography,
      portrait
    }
  `)
  
  if (!creator) {
    console.log('❌ Tora Urup not found in Sanity')
    return
  }
  
  console.log('📝 Sanity Data:\n')
  
  console.log('ENGLISH (biography.en):')
  console.log(extractTextFromBlocks(creator.biography?.en).substring(0, 150))
  console.log('\nGERMAN (biography.de):')
  console.log(extractTextFromBlocks(creator.biography?.de).substring(0, 150))
  
  console.log('\n---\n')
  
  console.log('ENGLISH (portrait.en):')
  console.log(extractTextFromBlocks(creator.portrait?.en).substring(0, 150))
  console.log('\nGERMAN (portrait.de):')
  console.log(extractTextFromBlocks(creator.portrait?.de).substring(0, 150))
}

checkSanityData().catch(console.error)

