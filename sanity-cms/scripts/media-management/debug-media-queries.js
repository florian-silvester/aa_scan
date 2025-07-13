import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

async function debugMediaQueries() {
  console.log('🔍 DEBUGGING MEDIA QUERIES...\n')
  
  try {
    // Test 1: Basic media asset count
    console.log('1. Testing basic media count:')
    const mediaCount = await client.fetch('count(*[_type == "sanity.imageAsset"])')
    console.log(`   Result: ${mediaCount}`)
    
    // Test 2: List a few media assets to check structure
    console.log('\n2. Sample media assets:')
    const sampleMedia = await client.fetch('*[_type == "sanity.imageAsset"][0...3]{_id, originalFilename, title, size}')
    console.log('   Sample:', JSON.stringify(sampleMedia, null, 2))
    
    // Test 3: Check if any artworks exist
    console.log('\n3. Artwork count:')
    const artworkCount = await client.fetch('count(*[_type == "artwork"])')
    console.log(`   Result: ${artworkCount}`)
    
    // Test 4: Test the linkage query
    console.log('\n4. Testing linkage query:')
    const linkedCount = await client.fetch('count(*[_type == "sanity.imageAsset" && count(*[_type == "artwork" && references(^._id)]) > 0])')
    console.log(`   Result: ${linkedCount}`)
    
    // Test 5: Get file extensions
    console.log('\n5. File extensions:')
    const extensions = await client.fetch('*[_type == "sanity.imageAsset"]{extension} | {"ext": extension, "count": count(*)} | order(count desc)')
    console.log('   Extensions:', JSON.stringify(extensions.slice(0, 5), null, 2))
    
    // Test 6: Size statistics
    console.log('\n6. Size statistics:')
    const sizeStats = await client.fetch('*[_type == "sanity.imageAsset"]{size} | {"totalSize": sum(size), "avgSize": avg(size), "count": count(*)}[0]')
    console.log('   Size stats:', JSON.stringify(sizeStats, null, 2))
    
    // Test 7: Recent uploads
    console.log('\n7. Recent uploads (last 30 days):')
    const recentCount = await client.fetch('count(*[_type == "sanity.imageAsset" && _createdAt > now() - 60*60*24*30])')
    console.log(`   Result: ${recentCount}`)
    
    // Test 8: Images with titles
    console.log('\n8. Images with titles:')
    const withTitles = await client.fetch('count(*[_type == "sanity.imageAsset" && defined(title) && title != ""])')
    console.log(`   Result: ${withTitles}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugMediaQueries() 