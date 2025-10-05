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
  try {
    createClient = require(path.join(__dirname, '..', 'sanity-cms', 'node_modules', '@sanity', 'client')).createClient
  } catch (e2) {
    throw new Error("@sanity/client not found")
  }
}

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

function isStudioOrCollective(fullName) {
  if (!fullName) return false
  
  const studioKeywords = [
    'atelier', 'studio', 'werkstatt', 'workshop', 'collective',
    'handweberei', 'quilt', 'manufaktur', 'gallery', 'shop', 'tierpuppen',
    '&', ' and ', ' + '
  ]
  
  const lowerName = fullName.toLowerCase()
  return studioKeywords.some(keyword => lowerName.includes(keyword))
}

function extractLastName(fullName) {
  if (!fullName) return null
  
  // Manual overrides for special cases
  const manualOverrides = {
    'Ulla & Martin Kaufmann': 'Kaufmann',
    'Atelier von Ehren': 'von Ehren',
    'Lyk Carpet': 'Lyk',
    'Made By Insect': 'Merhav', // Actually Ori Orisun Merhav
    'Siebörger Handweberei, Anja Ritter': 'Ritter',
    'neyuQ ceramics / Quyen Mac': 'neyuQ',
    'Bosna Quilt Werkstatt': 'Bosna'
  }
  
  if (manualOverrides[fullName]) {
    return manualOverrides[fullName]
  }
  
  // Skip studio/collective names (that don't have manual overrides)
  if (isStudioOrCollective(fullName)) {
    return null
  }
  
  // Handle special cases for person names
  const specialPrefixes = ['van', 'von', 'de', 'del', 'della', 'di', 'da', 'le', 'la']
  
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  
  // Check if second-to-last word is a prefix (e.g., "Vincent van Gogh")
  if (parts.length >= 2) {
    const secondLast = parts[parts.length - 2].toLowerCase()
    if (specialPrefixes.includes(secondLast)) {
      return parts.slice(-2).join(' ')
    }
  }
  
  // Default: return last word
  return parts[parts.length - 1]
}

async function populateLastNames() {
  console.log('🚀 Populating lastName field for all creators...')
  console.log('='.repeat(80))
  
  try {
    const creators = await sanityClient.fetch(`
      *[_type == "creator"] | order(name asc) {
        _id,
        name,
        lastName
      }
    `)
    
    console.log(`\nFound ${creators.length} creators\n`)
    
    let updatedCount = 0
    let skippedCount = 0
    let unchangedCount = 0
    
    for (const creator of creators) {
      const extracted = extractLastName(creator.name)
      const current = creator.lastName || ''
      
      if (extracted === null) {
        // Studio/collective - skip
        console.log(`  🏢 Skipping: ${creator.name}`)
        skippedCount++
        continue
      }
      
      if (current && current === extracted) {
        // Already correct
        unchangedCount++
        continue
      }
      
      // Update
      console.log(`  ✏️  Updating: ${creator.name} → "${extracted}"`)
      
      try {
        await sanityClient
          .patch(creator._id)
          .set({ lastName: extracted })
          .commit()
        updatedCount++
      } catch (error) {
        console.error(`    ❌ Failed: ${error.message}`)
      }
      
      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 100))
    }
    
    console.log(`\n✅ Complete!`)
    console.log(`  📊 ${updatedCount} creators updated`)
    console.log(`  🏢 ${skippedCount} studios/collectives skipped`)
    console.log(`  ⏭️  ${unchangedCount} already correct`)
    
  } catch (error) {
    console.error('❌ Population failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  populateLastNames().then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  }).catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
}
