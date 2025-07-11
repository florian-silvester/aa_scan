import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2023-01-01'
})

const queryCreators = async () => {
  try {
    const creators = await client.fetch(
      `*[_type == "creator" && name match "*Heike*"] { name, _id }`
    )
    
    console.log('Found creators matching "Heike":')
    console.log(JSON.stringify(creators, null, 2))
    
    // Also check for ATARA
    const ataraCreators = await client.fetch(
      `*[_type == "creator" && name match "*ATARA*"] { name, _id }`
    )
    
    console.log('\nFound creators matching "ATARA":')
    console.log(JSON.stringify(ataraCreators, null, 2))
    
  } catch (error) {
    console.error('Error querying creators:', error)
  }
}

queryCreators() 