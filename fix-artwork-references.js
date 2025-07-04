import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: 'sk7uAh61yXEyBnKEvAfMmR2p5tWyk6ERdI3hbYFcGjoB0X0O7iByy1ok7msBoe8nARWSgCmmRi6YG7PnzPperbTC9FWmRg2OHFLEMdOcR4qKVXCGchoIgFMaQqDyjoOCwR1r3eOeDMLgVxhH7VYEGWZzDZ2AmrGn2zDiPpPWn702ImpNvvW1'
})

async function fixArtworkReferences() {
  try {
    console.log('🔧 Fixing artwork references...')
    
    // Get artworks with images
    const artworksWithImages = await client.fetch(`
      *[_type == "artwork" && defined(images[0])]{
        _id,
        workTitle,
        maker,
        "imageCount": count(images)
      }
    `)
    
    console.log('\n✅ Artworks WITH images:')
    artworksWithImages.forEach(artwork => {
      console.log(`  - ${artwork.workTitle} by ${artwork.maker} (${artwork.imageCount} images) [${artwork._id}]`)
    })
    
    // Get the main article that needs fixing
    const articleToFix = await client.fetch(`
      *[_type == "article" && titleEn == "Woodworking: Crafting with Precision" && defined(images[0])][0]{
        _id,
        titleEn,
        images
      }
    `)
    
    if (articleToFix) {
      console.log(`\n📄 Found article to fix: ${articleToFix.titleEn}`)
      console.log(`Current references: ${articleToFix.images.length}`)
      
      // Create new references to artworks with images
      const newReferences = artworksWithImages.map(artwork => ({
        _type: 'reference',
        _ref: artwork._id
      }))
      
      // Update the article
      const result = await client
        .patch(articleToFix._id)
        .set({ images: newReferences })
        .commit()
      
      console.log(`\n✅ Updated article "${articleToFix.titleEn}"`)
      console.log(`   Linked to ${newReferences.length} artworks with images`)
      
      // Clean up duplicate artworks without images
      const artworksWithoutImages = await client.fetch(`
        *[_type == "artwork" && !defined(images[0])]{_id, workTitle, maker}
      `)
      
      console.log('\n🗑️ Found duplicate artworks without images:')
      artworksWithoutImages.forEach(artwork => {
        console.log(`  - ${artwork.workTitle} by ${artwork.maker} [${artwork._id}]`)
      })
      
      if (artworksWithoutImages.length > 0) {
        console.log('\n⚠️ Would you like to delete these duplicates? (Run the delete script separately)')
      }
      
    } else {
      console.log('\n❌ Could not find the article to fix')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixArtworkReferences() 