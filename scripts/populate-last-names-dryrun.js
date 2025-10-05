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
    return null // Return null to indicate "skip this one"
  }
  
  // Handle special cases for person names
  const specialPrefixes = ['van', 'von', 'de', 'del', 'della', 'di', 'da', 'le', 'la']
  
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  
  // Check if second-to-last word is a prefix (e.g., "Vincent van Gogh")
  if (parts.length >= 2) {
    const secondLast = parts[parts.length - 2].toLowerCase()
    if (specialPrefixes.includes(secondLast)) {
      // Return prefix + last word
      return parts.slice(-2).join(' ')
    }
  }
  
  // Default: return last word
  return parts[parts.length - 1]
}

async function dryRunLastNames() {
  console.log('🔍 DRY RUN: Extracting last names from creator names...')
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
    
    const updates = []
    const noChange = []
    const needsReview = []
    
    const skipped = []
    
    creators.forEach(creator => {
      const extracted = extractLastName(creator.name)
      const current = creator.lastName || ''
      
      if (extracted === null) {
        // Studio/collective - skip
        skipped.push({ _id: creator._id, name: creator.name })
      } else if (!current) {
        updates.push({ _id: creator._id, name: creator.name, extracted, current: '(empty)' })
      } else if (current !== extracted) {
        needsReview.push({ _id: creator._id, name: creator.name, extracted, current })
      } else {
        noChange.push({ _id: creator._id, name: creator.name, lastName: current })
      }
    })
    
    console.log(`📊 Summary:`)
    console.log(`  ${updates.length} creators need lastName populated`)
    console.log(`  ${skipped.length} studios/collectives skipped (no lastName)`)
    console.log(`  ${needsReview.length} creators have different lastName (needs review)`)
    console.log(`  ${noChange.length} creators already correct\n`)
    
    if (updates.length > 0) {
      console.log(`\n✏️  WOULD POPULATE (${updates.length} creators):`)
      console.log('-'.repeat(80))
      updates.slice(0, 20).forEach(u => {
        console.log(`  "${u.name}" → lastName: "${u.extracted}"`)
      })
      if (updates.length > 20) {
        console.log(`  ... and ${updates.length - 20} more`)
      }
    }
    
    if (skipped.length > 0) {
      console.log(`\n🏢 SKIPPED (Studios/Collectives - ${skipped.length}):`)
      console.log('-'.repeat(80))
      skipped.forEach(s => {
        console.log(`  "${s.name}"`)
      })
    }
    
    if (needsReview.length > 0) {
      console.log(`\n⚠️  NEEDS REVIEW (${needsReview.length} creators):`)
      console.log('-'.repeat(80))
      needsReview.forEach(u => {
        console.log(`  "${u.name}"`)
        console.log(`    Current: "${u.current}"`)
        console.log(`    Extracted: "${u.extracted}"`)
      })
    }
    
    console.log(`\n💡 To apply these changes, run:`)
    console.log(`   node scripts/populate-last-names.js`)
    
  } catch (error) {
    console.error('❌ Dry run failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  dryRunLastNames().then(() => {
    console.log('\n✅ Dry run complete!')
    process.exit(0)
  }).catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
}
