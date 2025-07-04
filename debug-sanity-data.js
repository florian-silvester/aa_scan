import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: 'sk7uAh61yXEyBnKEvAfMmR2p5tWyk6ERdI3hbYFcGjoB0X0O7iByy1ok7msBoe8nARWSgCmmRi6YG7PnzPperbTC9FWmRg2OHFLEMdOcR4qKVXCGchoIgFMaQqDyjoOCwR1r3eOeDMLgVxhH7VYEGWZzDZ2AmrGn2zDiPpPWn702ImpNvvW1'
})

async function debugSanityData() {
  try {
    console.log('🔍 Checking Sanity data...')
    
    // Check all artworks
    const artworks = await client.fetch('*[_type == "artwork"]{_id, workTitle, maker, images}')
    console.log('\n📦 Artworks in Sanity:')
    artworks.forEach(artwork => {
      console.log(`  - ${artwork.workTitle || artwork._id}`)
      console.log(`    Maker: ${artwork.maker || 'Unknown'}`)
      console.log(`    Images: ${artwork.images ? artwork.images.length : 0} image(s)`)
      if (artwork.images && artwork.images[0]) {
        console.log(`    First image: ${artwork.images[0]._type || 'Unknown type'}`)
      }
    })
    
    // Check all articles
    const articles = await client.fetch('*[_type == "article"]{_id, titleEn, author, images}')
    console.log('\n📄 Articles in Sanity:')
    articles.forEach(article => {
      console.log(`  - ${article.titleEn || article._id}`)
      console.log(`    Author: ${article.author || 'Unknown'}`)
      console.log(`    Linked artworks: ${article.images ? article.images.length : 0}`)
      if (article.images) {
        article.images.forEach((ref, i) => {
          console.log(`      ${i + 1}. ${ref._ref}`)
        })
      }
    })
    
    // Check if references are valid
    console.log('\n🔗 Checking reference integrity...')
    const articlesWithRefs = await client.fetch(`
      *[_type == "article"]{
        _id,
        titleEn,
        "linkedArtworks": images[]->{_id, workTitle, "hasImages": defined(images[0])}
      }
    `)
    
    articlesWithRefs.forEach(article => {
      console.log(`\n📄 ${article.titleEn}:`)
      if (article.linkedArtworks) {
        article.linkedArtworks.forEach(artwork => {
          console.log(`  ✅ ${artwork.workTitle} (${artwork.hasImages ? 'HAS IMAGES' : 'NO IMAGES'})`)
        })
      } else {
        console.log('  ❌ No linked artworks found')
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugSanityData() 