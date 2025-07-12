import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

async function fixPlaceholderTranslations() {
  console.log('🚨 EMERGENCY FIX: Removing placeholder translations...')
  
  try {
    // Find all artworks with placeholder translations
    const damagedArtworks = await client.fetch(`
      *[_type == "artwork" && (
        description.en match "*TRANSLATED_*" ||
        description.de match "*TRANSLATED_*"
      )]{
        _id,
        name,
        creator->{name},
        description
      }
    `)

    console.log(`💥 Found ${damagedArtworks.length} damaged artworks`)

    if (damagedArtworks.length === 0) {
      console.log('✅ No damaged records found!')
      return
    }

    const mutations = []

    for (const artwork of damagedArtworks) {
      const desc = artwork.description || {}
      let needsUpdate = false
      const updates = {}

      // Fix English description
      if (desc.en && desc.en.includes('[TRANSLATED_EN]')) {
        const cleaned = desc.en.replace(/^\[TRANSLATED_EN\]\s*/, '').trim()
        updates['description.en'] = cleaned || ''
        needsUpdate = true
        console.log(`🇺🇸 Fixing EN: "${artwork.creator?.name} - ${artwork.name}"`)
      }

      // Fix German description  
      if (desc.de && desc.de.includes('[TRANSLATED_DE]')) {
        const cleaned = desc.de.replace(/^\[TRANSLATED_DE\]\s*/, '').trim()
        updates['description.de'] = cleaned || ''
        needsUpdate = true
        console.log(`🇩🇪 Fixing DE: "${artwork.creator?.name} - ${artwork.name}"`)
      }

      if (needsUpdate) {
        mutations.push({
          patch: {
            id: artwork._id,
            set: updates
          }
        })
      }
    }

    console.log(`\n🔧 Preparing to fix ${mutations.length} artworks...`)

    if (mutations.length === 0) {
      console.log('✅ No mutations needed!')
      return
    }

    // Execute the fixes in batches
    const batchSize = 10
    for (let i = 0; i < mutations.length; i += batchSize) {
      const batch = mutations.slice(i, i + batchSize)
      await client.mutate(batch)
      console.log(`✅ Fixed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(mutations.length/batchSize)}`)
    }

    console.log('\n🎉 EMERGENCY FIX COMPLETE!')
    console.log(`✅ Cleaned ${mutations.length} placeholder translations`)
    console.log('The damaged data has been restored to clean text (without placeholders)')

  } catch (error) {
    console.error('❌ Emergency fix failed:', error)
    process.exit(1)
  }
}

// Run the emergency fix
fixPlaceholderTranslations() 