import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  token: 'skkotLFor8Qt3XhelWTpBvVqaaQb3Qnx7CD84O14cKOg35WEhdXqnFS2jOh9T54WrzIZ93MKt1Pgtyv4uVjhsQCRTwF9tzbq3riNrp4b2q2MKEhT3kB9GCOfQpZfp9LZE8NmN5fZ2ZvmfDDfBdkNElvfxKyVnbmeLhS2jjru0A9IODQGwv0D',
  useCdn: false,
  apiVersion: '2024-01-01'
})

async function deleteAllCreators() {
  try {
    console.log('🗑️  Starting creator deletion...')
    
    // Get all creators
    const creators = await client.fetch('*[_type == "creator"]')
    console.log(`Found ${creators.length} creators to delete`)
    
    if (creators.length === 0) {
      console.log('✅ No creators found - nothing to delete')
      return
    }
    
    // Delete in batches of 10
    const batchSize = 10
    let deleted = 0
    
    for (let i = 0; i < creators.length; i += batchSize) {
      const batch = creators.slice(i, i + batchSize)
      const deletePromises = batch.map(creator => 
        client.delete(creator._id)
      )
      
      await Promise.all(deletePromises)
      deleted += batch.length
      console.log(`Deleted ${deleted}/${creators.length} creators...`)
    }
    
    console.log('✅ All creators deleted successfully!')
    console.log('Ready for fresh import with new EN/DE schema structure')
    
  } catch (error) {
    console.error('❌ Error deleting creators:', error)
  }
}

deleteAllCreators() 