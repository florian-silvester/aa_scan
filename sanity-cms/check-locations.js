import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2023-01-01'
})

async function checkLocations() {
  console.log('Checking for duplicate locations...')
  
  try {
    // Get all locations
    const locations = await client.fetch(`*[_type == "location"] {
      _id,
      name,
      type,
      country,
      location,
      _createdAt
    }`)
    
    console.log(`Found ${locations.length} locations:`)
    locations.forEach((location, index) => {
      console.log(`${index + 1}. ${location.name} (${location.type}) - Created: ${new Date(location._createdAt).toLocaleString()}`)
      console.log(`   ID: ${location._id}`)
    })
    
    // Find duplicates by name
    const nameGroups = {}
    locations.forEach(location => {
      if (!nameGroups[location.name]) {
        nameGroups[location.name] = []
      }
      nameGroups[location.name].push(location)
    })
    
    // Show duplicates and delete them
    console.log('\nDuplicates found:')
    for (const name of Object.keys(nameGroups)) {
      if (nameGroups[name].length > 1) {
        console.log(`\n"${name}" has ${nameGroups[name].length} entries:`)
        nameGroups[name].forEach((location, index) => {
          console.log(`  ${index + 1}. ID: ${location._id} - Created: ${new Date(location._createdAt).toLocaleString()}`)
        })
        
        // Delete all but the first one (oldest)
        const toDelete = nameGroups[name].slice(1) // Keep first, delete rest
        console.log(`\nWill delete ${toDelete.length} duplicate(s):`)
        
        for (const duplicate of toDelete) {
          try {
            await client.delete(duplicate._id)
            console.log(`✓ Deleted duplicate: ${duplicate._id}`)
          } catch (error) {
            console.error(`✗ Error deleting ${duplicate._id}:`, error.message)
          }
        }
      }
    }
    
    // Final count
    const finalCount = await client.fetch('count(*[_type == "location"])')
    console.log(`\nFinal location count: ${finalCount}`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkLocations() 