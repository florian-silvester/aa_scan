import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2023-01-01'
})

async function cleanupDraftsAndRemaining() {
  console.log('Starting cleanup of drafts and remaining content...')
  
  try {
    // Get all draft documents
    const drafts = await client.fetch(`*[_id match "drafts.*"] {
      _id,
      _type,
      title,
      workTitle
    }`)
    console.log(`Found ${drafts.length} draft documents to delete`)
    
    // Delete all drafts first
    for (const draft of drafts) {
      try {
        await client.delete(draft._id)
        console.log(`✓ Deleted draft: ${draft._type} - "${draft.title || draft.workTitle || 'Untitled'}"`)
      } catch (error) {
        console.error(`✗ Error deleting draft "${draft._id}":`, error.message)
      }
    }
    
    // Now try to delete remaining artworks and articles
    const remainingArtworks = await client.fetch(`*[_type == "artwork"] {
      _id,
      workTitle
    }`)
    console.log(`Found ${remainingArtworks.length} remaining artworks to delete`)
    
    for (const artwork of remainingArtworks) {
      try {
        await client.delete(artwork._id)
        console.log(`✓ Deleted remaining artwork: "${artwork.workTitle || 'Untitled'}"`)
      } catch (error) {
        console.error(`✗ Error deleting artwork "${artwork.workTitle}":`, error.message)
      }
    }
    
    const remainingArticles = await client.fetch(`*[_type == "article"] {
      _id,
      title
    }`)
    console.log(`Found ${remainingArticles.length} remaining articles to delete`)
    
    for (const article of remainingArticles) {
      try {
        await client.delete(article._id)
        console.log(`✓ Deleted remaining article: "${article.title || 'Untitled'}"`)
      } catch (error) {
        console.error(`✗ Error deleting article "${article.title}":`, error.message)
      }
    }
    
    // Final count
    const finalArtworkCount = await client.fetch('count(*[_type == "artwork"])')
    const finalArticleCount = await client.fetch('count(*[_type == "article"])')
    const creatorCount = await client.fetch('count(*[_type == "creator"])')
    const categoryCount = await client.fetch('count(*[_type == "category"])')
    
    console.log(`\nFinal Cleanup Summary:`)
    console.log(`✓ Artworks remaining: ${finalArtworkCount}`)
    console.log(`✓ Articles remaining: ${finalArticleCount}`)
    console.log(`✓ Creators preserved: ${creatorCount}`)
    console.log(`✓ Categories preserved: ${categoryCount}`)
    console.log('\nDatabase is now completely clean!')
  } catch (error) {
    console.error('Error:', error)
  }
}

cleanupDraftsAndRemaining() 