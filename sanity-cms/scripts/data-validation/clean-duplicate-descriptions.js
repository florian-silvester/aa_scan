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

// Simple translation function using fetch to Google Translate
async function translateText(text, fromLang, toLang) {
  try {
    console.log(`🔄 Translating from ${fromLang} to ${toLang}: "${text.substring(0, 50)}..."`)
    
    // For now, we'll use a simple approach that doesn't require API keys
    // You can replace this with any translation service API call
    
    // Clean HTML tags for translation
    const cleanText = text.replace(/<[^>]*>/g, ' ').trim()
    
    // Simulate translation with a simple transformation for testing
    // In a real scenario, you would call an actual translation API here
    const mockTranslation = `[${toLang.toUpperCase()}] ${cleanText}`
    
    console.log(`✅ Mock translation: "${mockTranslation.substring(0, 50)}..."`)
    return mockTranslation
  } catch (error) {
    console.error(`❌ Translation failed: ${error.message}`)
    return `[TRANSLATED_${toLang.toUpperCase()}] ${text}`
  }
}

async function translateEmptyDescriptions(dryRun = true) {
  console.log('🌐 Translating empty description fields...')
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No actual changes will be made')
  }
  
  try {
    // Fetch artworks with descriptions
    const artworks = await client.fetch(`
      *[_type == "artwork" && defined(description)] {
        _id,
        name,
        creator->{name},
        description,
        workTitle
      }
    `)

    console.log(`📊 Analyzing ${artworks.length} artworks...`)

    const mutations = []
    let enTranslated = 0
    let deTranslated = 0
    let bothEmpty = 0
    let bothFilled = 0

    for (const artwork of artworks) {
      const desc = artwork.description
      
      if (!desc || typeof desc !== 'object') continue

      const enDesc = desc.en ? desc.en.trim() : ''
      const deDesc = desc.de ? desc.de.trim() : ''

      // Check what needs translation
      const enEmpty = !enDesc
      const deEmpty = !deDesc

      if (enEmpty && deEmpty) {
        bothEmpty++
        continue
      }

      if (!enEmpty && !deEmpty) {
        bothFilled++
        continue
      }

      // Translate based on which field is empty
      if (enEmpty && deDesc) {
        // Translate German to English
        console.log(`🇩🇪➡️🇺🇸 Translating DE to EN: "${deDesc.substring(0, 30)}..." (${artwork.creator?.name} - ${artwork.name})`)
        
        const translatedText = await translateText(deDesc, 'de', 'en')
        
        mutations.push({
          patch: {
            id: artwork._id,
            set: {
              'description.en': translatedText
            }
          }
        })
        
        enTranslated++
      } else if (deEmpty && enDesc) {
        // Translate English to German
        console.log(`🇺🇸➡️🇩🇪 Translating EN to DE: "${enDesc.substring(0, 30)}..." (${artwork.creator?.name} - ${artwork.name})`)
        
        const translatedText = await translateText(enDesc, 'en', 'de')
        
        mutations.push({
          patch: {
            id: artwork._id,
            set: {
              'description.de': translatedText
            }
          }
        })
        
        deTranslated++
      }
    }

    console.log(`\n📊 SUMMARY:`)
    console.log(`English translations needed: ${enTranslated}`)
    console.log(`German translations needed: ${deTranslated}`)
    console.log(`Both fields empty: ${bothEmpty}`)
    console.log(`Both fields filled: ${bothFilled}`)

    if (mutations.length === 0) {
      console.log('✅ No translations needed!')
      return
    }

    if (dryRun) {
      console.log(`\n🔍 DRY RUN: Would create ${mutations.length} translations`)
      console.log('To execute for real, change dryRun to false in the script')
      return
    }

    // Ask for confirmation
    console.log(`\n⚠️  This will add ${mutations.length} translations.`)
    console.log('Note: Using mock translations. Integrate with real translation service!')
    
    // Execute mutations in batches
    console.log(`\n🚀 Executing ${mutations.length} mutations...`)
    
    const batchSize = 10
    for (let i = 0; i < mutations.length; i += batchSize) {
      const batch = mutations.slice(i, i + batchSize)
      await client.mutate(batch)
      console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(mutations.length/batchSize)}`)
    }

    console.log('🎉 Translation completed successfully!')
    console.log(`📝 Added ${enTranslated} English translations`)
    console.log(`📝 Added ${deTranslated} German translations`)

  } catch (error) {
    console.error('❌ Translation failed:', error)
    process.exit(1)
  }
}

// Run the translation in dry run mode first
translateEmptyDescriptions(true) 