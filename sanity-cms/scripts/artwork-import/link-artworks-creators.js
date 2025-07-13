import {createClient} from '@sanity/client'
import {nanoid} from 'nanoid'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

async function analyzeLinkingStatus() {
  console.log('🔍 Analyzing artwork-creator linking status...\n')
  
  try {
    // Get artwork statistics
    const artworkStats = await client.fetch(`
      {
        "total": count(*[_type == "artwork"]),
        "withCreator": count(*[_type == "artwork" && defined(creator)]),
        "withMaker": count(*[_type == "artwork" && defined(maker)]),
        "withoutAny": count(*[_type == "artwork" && !defined(creator) && !defined(maker)]),
        "withSourceArtist": count(*[_type == "artwork" && defined(sourceInfo.extractedArtist)])
      }
    `)
    
    console.log('📊 Artwork Statistics:')
    console.log(`- Total artworks: ${artworkStats.total}`)
    console.log(`- With creator linked: ${artworkStats.withCreator}`)
    console.log(`- With maker linked: ${artworkStats.withMaker}`)
    console.log(`- Without any creator: ${artworkStats.withoutAny}`)
    console.log(`- With extracted artist info: ${artworkStats.withSourceArtist}`)
    
    // Get creator statistics
    const creatorCount = await client.fetch('count(*[_type == "creator"])')
    console.log(`\n👨‍🎨 Total creators: ${creatorCount}`)
    
    // Sample problematic artworks
    const unlinkedArtworks = await client.fetch(`
      *[_type == "artwork" && !defined(creator)][0...5]{
        _id,
        workTitle,
        maker,
        sourceInfo
      }
    `)
    
    console.log('\n🔗 Sample unlinked artworks:')
    unlinkedArtworks.forEach(art => {
      const artist = art.sourceInfo?.extractedArtist || 'Unknown'
      console.log(`- "${art.workTitle || 'Untitled'}" by ${artist}`)
    })
    
    return artworkStats
    
  } catch (error) {
    console.error('❌ Error analyzing data:', error.message)
    throw error
  }
}

async function findCreatorByName(artistName) {
  if (!artistName) return null
  
  // Try exact match first
  const exactMatch = await client.fetch(`
    *[_type == "creator" && name == $name][0]{_id, name}
  `, { name: artistName })
  
  if (exactMatch) return exactMatch
  
  // Try fuzzy matching
  const fuzzyMatch = await client.fetch(`
    *[_type == "creator" && name match $pattern][0]{_id, name}
  `, { pattern: `*${artistName}*` })
  
  return fuzzyMatch
}

async function linkArtworksToCreators() {
  console.log('\n🔗 Starting automatic linking process...\n')
  
  try {
    // Get all unlinked artworks with artist info
    const unlinkedArtworks = await client.fetch(`
      *[_type == "artwork" && !defined(creator)]{
        _id,
        workTitle,
        maker,
        sourceInfo
      }
    `)
    
    console.log(`Found ${unlinkedArtworks.length} artworks to process`)
    
    let linked = 0
    let created = 0
    let skipped = 0
    
    for (const artwork of unlinkedArtworks) {
      const artistName = artwork.sourceInfo?.extractedArtist || artwork.maker?.name
      
      if (!artistName) {
        console.log(`⏭️  Skipping "${artwork.workTitle}" - no artist info`)
        skipped++
        continue
      }
      
      // Try to find existing creator
      let creator = await findCreatorByName(artistName)
      
      if (!creator) {
        // Create new creator
        const creatorData = {
          _type: 'creator',
          _id: `creator-${nanoid()}`,
          name: artistName,
          slug: { _type: 'slug', current: artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          tier: 'free'
        }
        
        creator = await client.create(creatorData)
        console.log(`✨ Created creator: ${creator.name}`)
        created++
      }
      
      // Link artwork to creator
      await client.patch(artwork._id)
        .set({ creator: { _type: 'reference', _ref: creator._id } })
        .commit()
      
      console.log(`🔗 Linked "${artwork.workTitle}" to ${creator.name}`)
      linked++
    }
    
    console.log(`\n✅ Linking complete!`)
    console.log(`- Artworks linked: ${linked}`)
    console.log(`- New creators created: ${created}`)
    console.log(`- Artworks skipped: ${skipped}`)
    
  } catch (error) {
    console.error('❌ Error during linking:', error.message)
    throw error
  }
}

async function updateCreatorArtworkReferences() {
  console.log('\n🔄 Updating creator artwork references...\n')
  
  try {
    const creators = await client.fetch('*[_type == "creator"]{_id, name}')
    
    for (const creator of creators) {
      // Get all artworks by this creator
      const artworks = await client.fetch(`
        *[_type == "artwork" && creator._ref == $creatorId]{_id}
      `, { creatorId: creator._id })
      
      const artworkRefs = artworks.map(art => ({
        _type: 'reference',
        _ref: art._id
      }))
      
      // Update creator with artwork references
      await client.patch(creator._id)
        .set({ artworks: artworkRefs })
        .commit()
      
      if (artworkRefs.length > 0) {
        console.log(`🎨 Updated ${creator.name} with ${artworkRefs.length} artworks`)
      }
    }
    
    console.log('✅ Creator references updated!')
    
  } catch (error) {
    console.error('❌ Error updating references:', error.message)
    throw error
  }
}

async function main() {
  try {
    await analyzeLinkingStatus()
    
    const proceed = process.argv.includes('--link')
    
    if (proceed) {
      await linkArtworksToCreators()
      await updateCreatorArtworkReferences()
      console.log('\n🎉 All done! Artworks and creators are now linked.')
    } else {
      console.log('\n💡 To proceed with linking, run: node link-artworks-creators.js --link')
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message)
    process.exit(1)
  }
}

main() 