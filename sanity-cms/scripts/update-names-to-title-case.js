import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

// Helper function to convert text to title case
function toTitleCase(str) {
  if (!str) return str
  
  // Handle common exceptions that shouldn't be capitalized
  const exceptions = ['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with', 'without']
  
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word and words not in exceptions
      if (index === 0 || !exceptions.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    .join(' ')
}

async function updateDocumentType(documentType) {
  console.log(`\n🔄 Processing ${documentType} documents...`)
  
  try {
    // Fetch all documents of this type
    const documents = await client.fetch(`
      *[_type == "${documentType}"] {
        _id,
        name
      }
    `)

    console.log(`📊 Found ${documents.length} ${documentType} documents`)

    if (documents.length === 0) {
      console.log(`✅ No ${documentType} documents to update`)
      return
    }

    // Process each document
    const mutations = []
    
    for (const doc of documents) {
      const updates = {}
      let hasUpdates = false

      // Update English name
      if (doc.name?.en) {
        const titleCaseEn = toTitleCase(doc.name.en)
        if (titleCaseEn !== doc.name.en) {
          updates['name.en'] = titleCaseEn
          hasUpdates = true
          console.log(`🇺🇸 ${doc.name.en} → ${titleCaseEn}`)
        }
      }

      // Update German name
      if (doc.name?.de) {
        const titleCaseDe = toTitleCase(doc.name.de)
        if (titleCaseDe !== doc.name.de) {
          updates['name.de'] = titleCaseDe
          hasUpdates = true
          console.log(`🇩🇪 ${doc.name.de} → ${titleCaseDe}`)
        }
      }

      // Add mutation if there are updates
      if (hasUpdates) {
        mutations.push({
          patch: {
            id: doc._id,
            set: updates
          }
        })
      }
    }

    if (mutations.length > 0) {
      console.log(`\n🔧 Updating ${mutations.length} ${documentType} documents...`)
      
      // Execute mutations in batches
      const batchSize = 10
      for (let i = 0; i < mutations.length; i += batchSize) {
        const batch = mutations.slice(i, i + batchSize)
        await client.mutate(batch)
        console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(mutations.length / batchSize)}`)
      }
      
      console.log(`✅ Successfully updated ${mutations.length} ${documentType} documents`)
    } else {
      console.log(`✅ No ${documentType} documents needed updating`)
    }

  } catch (error) {
    console.error(`❌ Error updating ${documentType} documents:`, error)
  }
}

async function main() {
  console.log('🚀 Starting title case update for all name fields...')
  
  if (!process.env.SANITY_API_TOKEN) {
    console.error('❌ Missing SANITY_API_TOKEN environment variable')
    process.exit(1)
  }

  try {
    // Update all document types
    await updateDocumentType('material')
    await updateDocumentType('medium')
    await updateDocumentType('finish')
    await updateDocumentType('materialType')

    console.log('\n🎉 Title case update completed successfully!')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

// Run the script
main() 