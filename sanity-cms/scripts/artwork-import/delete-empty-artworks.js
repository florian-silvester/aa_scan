import {createClient} from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

async function deleteEmptyArtworks() {
  console.log('🗑️  Starting safe deletion of empty artworks...\n')
  
  try {
    // First, let's see what we're deleting
    const artworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        workTitle,
        creator,
        material,
        description,
        "imageCount": count(images)
      }
    `)
    
    console.log(`📊 Found ${artworks.length} total artworks`)
    
    // Categorize artworks
    const completelyEmpty = artworks.filter(a => 
      !a.creator && !a.material && !a.description
    )
    const hasDescription = artworks.filter(a => 
      a.description && !a.creator && !a.material
    )
    const hasAnyContent = artworks.filter(a => 
      a.creator || a.material || a.description
    )
    
    console.log(`📋 Analysis:`)
    console.log(`- Completely empty: ${completelyEmpty.length}`)
    console.log(`- Has description only: ${hasDescription.length}`)  
    console.log(`- Has meaningful content: ${hasAnyContent.length}`)
    console.log('')
    
    if (completelyEmpty.length === 0) {
      console.log('✅ No empty artworks to delete!')
      return
    }
    
    // Ask for confirmation
    console.log(`🎯 DELETION PLAN:`)
    console.log(`- Delete ${completelyEmpty.length} completely empty artworks`)
    console.log(`- Keep ${hasAnyContent.length} artworks with content`)
    console.log('')
    
    const shouldDelete = process.argv[2] === '--confirm'
    
    if (!shouldDelete) {
      console.log('⚠️  DRY RUN MODE - No actual deletion')
      console.log('   Add --confirm flag to actually delete')
      console.log('')
      console.log('Sample artworks that would be deleted:')
      completelyEmpty.slice(0, 5).forEach((art, i) => {
        console.log(`${i+1}. "${art.workTitle}" (${art.imageCount} images)`)
      })
      return
    }
    
    // Perform deletion in batches
    console.log('🗑️  Starting deletion...')
    const batchSize = 50
    let deleted = 0
    
    for (let i = 0; i < completelyEmpty.length; i += batchSize) {
      const batch = completelyEmpty.slice(i, i + batchSize)
      const ids = batch.map(art => art._id)
      
      try {
        const transaction = client.transaction()
        ids.forEach(id => transaction.delete(id))
        await transaction.commit()
        
        deleted += batch.length
        console.log(`✅ Deleted batch ${Math.ceil((i + 1) / batchSize)}: ${deleted}/${completelyEmpty.length}`)
        
      } catch (error) {
        console.error(`❌ Error deleting batch:`, error.message)
        break
      }
    }
    
    console.log('')
    console.log(`🎉 Deletion complete!`)
    console.log(`- Deleted: ${deleted} empty artworks`)
    console.log(`- Remaining: ${artworks.length - deleted} artworks`)
    console.log('')
    console.log('🚀 Ready for fresh artwork creation with intelligent extraction!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

deleteEmptyArtworks() 