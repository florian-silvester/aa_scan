import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

async function findTranslationNeeds() {
  console.log('🔍 Finding artworks that need real translation...\n')
  
  const artworks = await client.fetch(`
    *[_type == "artwork" && defined(description)] {
      _id, name, creator->{name}, description
    }
  `)
  
  let needsEnglish = []
  let needsGerman = []
  let hasPlaceholders = 0
  let bothFilled = 0
  
  artworks.forEach(art => {
    const desc = art.description
    if (!desc) return
    
    const en = desc.en?.trim()
    const de = desc.de?.trim()
    
    // Check for placeholder pollution
    if (en?.includes('[TRANSLATED_') || de?.includes('[TRANSLATED_')) {
      hasPlaceholders++
      return
    }
    
    // Check what needs real translation
    if (!en && de) {
      needsEnglish.push({
        id: art._id, 
        name: art.name, 
        creator: art.creator?.name, 
        germanText: de
      })
    } else if (!de && en) {
      needsGerman.push({
        id: art._id, 
        name: art.name, 
        creator: art.creator?.name, 
        englishText: en
      })
    } else if (en && de) {
      bothFilled++
    }
  })
  
  console.log(`📊 SUMMARY:`)
  console.log(`🚨 Placeholder pollution: ${hasPlaceholders}`)
  console.log(`🇩🇪→🇺🇸 Need English: ${needsEnglish.length}`)
  console.log(`🇺🇸→🇩🇪 Need German: ${needsGerman.length}`)
  console.log(`✅ Both filled (clean): ${bothFilled}`)
  
  console.log(`\n📝 FIRST 5 NEEDING ENGLISH TRANSLATION:`)
  needsEnglish.slice(0, 5).forEach((item, i) => {
    console.log(`${i+1}. ${item.creator} - ${item.name}`)
    console.log(`   German: "${item.germanText.substring(0, 100)}..."`)
    console.log(`   ID: ${item.id}\n`)
  })
  
  console.log(`\n📝 FIRST 5 NEEDING GERMAN TRANSLATION:`)
  needsGerman.slice(0, 5).forEach((item, i) => {
    console.log(`${i+1}. ${item.creator} - ${item.name}`)
    console.log(`   English: "${item.englishText.substring(0, 100)}..."`)
    console.log(`   ID: ${item.id}\n`)
  })
}

findTranslationNeeds() 