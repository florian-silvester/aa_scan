import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

console.log('🧹 FIXING PREPENDED DESIGNER NAMES IN DESCRIPTIONS\n')

function cleanCaption(caption, creatorName) {
  if (!caption || !creatorName) return caption
  
  // Remove various formats of prepended creator names
  const patterns = [
    `${creatorName}, Schmuckkunst`,
    `${creatorName}, Schmuckdesign`, 
    `${creatorName}, Ceramic Art`,
    `${creatorName}, Keramikkunst`,
    `${creatorName}, Keramik`,
    `${creatorName}, Schmuck`,
    `${creatorName}`,
  ]
  
  let cleaned = caption
  
  for (const pattern of patterns) {
    // Remove from start with optional whitespace/punctuation
    const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\.,]*`, 'i')
    cleaned = cleaned.replace(regex, '')
  }
  
  // Remove multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

async function fixArtworkDescriptions() {
  try {
    // Get all artworks with their creators
    const artworks = await client.fetch(`
      *[_type == "artwork" && defined(description)] {
        _id,
        workTitle,
        description,
        "creatorName": creator->name
      }
    `)
    
    console.log(`🎨 Found ${artworks.length} artworks with descriptions`)
    
    let fixed = 0
    let unchanged = 0
    
    for (const artwork of artworks) {
      const originalEn = artwork.description?.en || ''
      const originalDe = artwork.description?.de || ''
      
      const cleanedEn = cleanCaption(originalEn, artwork.creatorName)
      const cleanedDe = cleanCaption(originalDe, artwork.creatorName)
      
      // Check if anything changed
      if (cleanedEn !== originalEn || cleanedDe !== originalDe) {
        try {
          await client.patch(artwork._id)
            .set({
              description: {
                en: cleanedEn,
                de: cleanedDe
              }
            })
            .commit()
          
          const titleDisplay = artwork.workTitle?.en || artwork.workTitle?.de || 'Untitled'
          console.log(`✅ Fixed: "${titleDisplay}" by ${artwork.creatorName}`)
          console.log(`   EN: "${originalEn.substring(0, 50)}..." → "${cleanedEn.substring(0, 50)}..."`)
          console.log(`   DE: "${originalDe.substring(0, 50)}..." → "${cleanedDe.substring(0, 50)}..."`)
          
          fixed++
        } catch (error) {
          console.error(`❌ Error fixing ${artwork._id}:`, error.message)
        }
      } else {
        unchanged++
      }
    }
    
    console.log(`\n🎉 CLEANUP COMPLETE!`)
    console.log(`✅ Fixed: ${fixed} artworks`)
    console.log(`➡️ Unchanged: ${unchanged} artworks`)
    
  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

fixArtworkDescriptions() 