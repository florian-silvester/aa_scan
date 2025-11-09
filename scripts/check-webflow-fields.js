import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.bak' })

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID

const COLLECTION_IDS = {
  creator: '68c6785963cdfa79c3a138ab',
  artwork: '68c6785963cdfa79c3a138d1'
}

async function checkCollectionFields(collectionId, collectionName) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📋 ${collectionName.toUpperCase()} COLLECTION FIELDS`)
  console.log(`${'='.repeat(60)}`)
  
  const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'accept': 'application/json'
    }
  })
  
  if (!response.ok) {
    throw new Error(`Webflow API error ${response.status}: ${await response.text()}`)
  }
  
  const data = await response.json()
  const fields = data.fields || []
  
  console.log(`\nTotal fields: ${fields.length}\n`)
  
  console.log(`📋 ALL FIELDS:\n`)
  
  fields.forEach(field => {
    const isRef = field.type?.toLowerCase().includes('ref') || 
                  field.type?.toLowerCase().includes('reference')
    const icon = isRef ? '🔗' : '  '
    console.log(`${icon} "${field.displayName}"`)
    console.log(`   Slug: ${field.slug}`)
    console.log(`   Type: ${field.type}`)
    console.log('')
  })
  
  return fields
}

async function main() {
  console.log('🔍 Checking Webflow Collection Field Slugs\n')
  
  try {
    await checkCollectionFields(COLLECTION_IDS.artwork, 'Artwork')
    await checkCollectionFields(COLLECTION_IDS.creator, 'Creator')
    
    console.log('\n' + '='.repeat(60))
    console.log('📝 EXPECTED SLUGS IN SYNC SCRIPT:')
    console.log('='.repeat(60))
    console.log('\nArtwork fields:')
    console.log('  - creator (single reference)')
    console.log('  - category (single reference)')
    console.log('  - materials (multi-reference)')
    console.log('  - medium (multi-reference)')
    console.log('  - finishes (multi-reference)')
    
    console.log('\nCreator fields:')
    console.log('  - category (single reference)')
    console.log('  - creator-materials (multi-reference)')
    console.log('  - creator-finishes (multi-reference)')
    console.log('  - creator-medium-types (multi-reference)')
    
    console.log('\n✅ Compare the slugs above with expected slugs!\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()

