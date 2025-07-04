import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2023-01-01'
})

async function updateArtworkMakers() {
  console.log('Starting to update artwork makers...')
  
  try {
    // Get all artworks
    const artworks = await client.fetch(`*[_type == "artwork"] {
      _id,
      workTitle,
      maker
    }`)
    console.log(`Found ${artworks.length} artworks`)
    
    // Get all creators for reference lookup
    const creators = await client.fetch(`*[_type == "creator"] {
      _id,
      name
    }`)
    console.log(`Found ${creators.length} creators`)
    
    // Create a lookup map from creator name to creator ID
    const creatorLookup = {}
    creators.forEach(creator => {
      creatorLookup[creator.name] = creator._id
    })
    
    let updatedCount = 0
    let notFoundCount = 0
    
    for (const artwork of artworks) {
      // Skip if artwork already has a maker reference (not a string)
      if (artwork.maker && typeof artwork.maker === 'object' && artwork.maker._ref) {
        console.log(`⚠ Skipping ${artwork.workTitle} - already has maker reference`)
        continue
      }
      
      // Skip if no maker or maker is empty
      if (!artwork.maker || artwork.maker.trim() === '') {
        console.log(`⚠ Skipping ${artwork.workTitle} - no maker specified`)
        continue
      }
      
      const makerName = artwork.maker.trim()
      const creatorId = creatorLookup[makerName]
      
      if (creatorId) {
        try {
          await client
            .patch(artwork._id)
            .set({
              maker: {
                _type: 'reference',
                _ref: creatorId
              }
            })
            .commit()
          
          console.log(`✓ Updated "${artwork.workTitle}" - linked to creator: ${makerName}`)
          updatedCount++
        } catch (error) {
          console.error(`✗ Error updating "${artwork.workTitle}":`, error.message)
        }
      } else {
        console.log(`⚠ No creator found for maker: "${makerName}" in artwork: "${artwork.workTitle}"`)
        notFoundCount++
      }
    }
    
    console.log(`\nSummary:`)
    console.log(`✓ Updated: ${updatedCount} artworks`)
    console.log(`⚠ Not found: ${notFoundCount} makers`)
    console.log('Finished updating artwork makers!')
  } catch (error) {
    console.error('Error:', error)
  }
}

updateArtworkMakers() 