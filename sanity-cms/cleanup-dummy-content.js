import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2023-01-01'
})

async function cleanupDummyContent() {
  console.log('Starting cleanup of dummy content...')
  
  try {
    // Get all artworks
    const artworks = await client.fetch(`*[_type == "artwork"] {
      _id,
      workTitle,
      maker
    }`)
    console.log(`Found ${artworks.length} artworks to delete`)
    
    // Get all articles
    const articles = await client.fetch(`*[_type == "article"] {
      _id,
      title,
      author
    }`)
    console.log(`Found ${articles.length} articles to delete`)
    
    let deletedArtworks = 0
    let deletedArticles = 0
    
    // Delete all artworks
    for (const artwork of artworks) {
      try {
        await client.delete(artwork._id)
        console.log(`✓ Deleted artwork: "${artwork.workTitle || 'Untitled'}"`)
        deletedArtworks++
      } catch (error) {
        console.error(`✗ Error deleting artwork "${artwork.workTitle}":`, error.message)
      }
    }
    
    // Delete all articles
    for (const article of articles) {
      try {
        await client.delete(article._id)
        console.log(`✓ Deleted article: "${article.title || 'Untitled'}"`)
        deletedArticles++
      } catch (error) {
        console.error(`✗ Error deleting article "${article.title}":`, error.message)
      }
    }
    
    console.log(`\nCleanup Summary:`)
    console.log(`✓ Deleted ${deletedArtworks} artworks`)
    console.log(`✓ Deleted ${deletedArticles} articles`)
    console.log(`✓ Kept ${await client.fetch('count(*[_type == "creator"])')} creators`)
    console.log(`✓ Kept ${await client.fetch('count(*[_type == "category"])')} categories`)
    console.log('\nDatabase is now clean and ready for real Art Aurea content!')
  } catch (error) {
    console.error('Error:', error)
  }
}

cleanupDummyContent() 