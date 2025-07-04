import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables from a .env file if it exists
dotenv.config()

// Sanity Client Configuration
// It's recommended to use environment variables for sensitive data
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'b8bczekj',
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_API_TOKEN, // Needs write access
  useCdn: false,
  apiVersion: '2024-03-01',
})

/**
 * Groups items in an array by a specified key.
 * @param {Array} array The array to group.
 * @param {string} key The key to group by.
 * @returns {Object} An object where keys are group keys and values are arrays of items.
 */
function groupBy(array, key) {
  return array.reduce((result, currentValue) => {
    ;(result[currentValue[key]] = result[currentValue[key]] || []).push(
      currentValue
    )
    return result
  }, {})
}

/**
 * Finds and deletes duplicate artworks.
 * It keeps the artwork that has an image defined, or the most recently created one.
 */
async function cleanupArtworkDuplicates() {
  console.log('\n🎨 Checking for duplicate artworks...')
  const artworks = await sanityClient.fetch(`*[_type == "artwork"]{_id, _createdAt, workTitle, "hasImage": defined(images[0])}`)
  
  const groupedByTitle = groupBy(artworks, 'workTitle')
  const idsToDelete = []

  for (const title in groupedByTitle) {
    const group = groupedByTitle[title]
    if (group.length > 1) {
      console.log(`  > Found ${group.length} artworks titled "${title}". Analyzing...`)
      
      // Sort to find the "best" one to keep
      group.sort((a, b) => {
        if (a.hasImage && !b.hasImage) return -1 // a is better
        if (!a.hasImage && b.hasImage) return 1  // b is better
        return new Date(b._createdAt) - new Date(a._createdAt) // newest is better
      })

      const toKeep = group.shift() // The first one is the one to keep
      const toDelete = group.map(doc => doc._id) // The rest are duplicates
      
      console.log(`    - Keeping document: ${toKeep._id} (hasImage: ${toKeep.hasImage})`)
      toDelete.forEach(id => console.log(`    - 💥 Marking for deletion: ${id}`))
      
      idsToDelete.push(...toDelete)
    }
  }

  if (idsToDelete.length === 0) {
    console.log('  ✅ No duplicate artworks found.')
    return
  }

  console.log(`\n  🔥 Deleting ${idsToDelete.length} duplicate artworks...`)
  await sanityClient.delete({ query: '*[_id in $ids]', params: { ids: idsToDelete } })
  console.log('  ✅ Artwork cleanup complete.')
}

/**
 * Finds and deletes duplicate articles.
 * It keeps the article that has a specific author (not 'Unknown'), or the most recently created one.
 */
async function cleanupArticleDuplicates() {
  console.log('\n📝 Checking for duplicate articles...')
  const articles = await sanityClient.fetch(`*[_type == "article"]{_id, _createdAt, titleEn, author}`)
  
  const groupedByTitle = groupBy(articles, 'titleEn')
  const idsToDelete = []

  for (const title in groupedByTitle) {
    const group = groupedByTitle[title]
    if (group.length > 1) {
      console.log(`  > Found ${group.length} articles titled "${title}". Analyzing...`)

      group.sort((a, b) => {
        if (a.author !== 'Unknown' && b.author === 'Unknown') return -1
        if (a.author === 'Unknown' && b.author !== 'Unknown') return 1
        return new Date(b._createdAt) - new Date(a._createdAt)
      })

      const toKeep = group.shift()
      const toDelete = group.map(doc => doc._id)
      
      console.log(`    - Keeping document: ${toKeep._id} (author: ${toKeep.author})`)
      toDelete.forEach(id => console.log(`    - 💥 Marking for deletion: ${id}`))
      
      idsToDelete.push(...toDelete)
    }
  }

  if (idsToDelete.length === 0) {
    console.log('  ✅ No duplicate articles found.')
    return
  }
  
  console.log(`\n  🔥 Deleting ${idsToDelete.length} duplicate articles...`)
  await sanityClient.delete({ query: '*[_id in $ids]', params: { ids: idsToDelete } })
  console.log('  ✅ Article cleanup complete.')
}

/**
 * Main function to run the cleanup process.
 */
async function runCleanup() {
  console.log('🧹 Starting database cleanup...')
  if (!process.env.SANITY_API_TOKEN) {
    console.error('❌ ERROR: SANITY_API_TOKEN environment variable is not set.')
    console.error('   Please create a .env file with your token.')
    return
  }
  
  await cleanupArtworkDuplicates()
  await cleanupArticleDuplicates()
  
  console.log('\n🎉 Cleanup finished!')
}

runCleanup().catch(err => {
  console.error('❌ An error occurred during cleanup:', err)
}) 