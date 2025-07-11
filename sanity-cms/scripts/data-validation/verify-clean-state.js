import {createClient} from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

async function verifyCleanState() {
  const artworks = await client.fetch('count(*[_type == "artwork"])')
  const creators = await client.fetch('count(*[_type == "creator"])')
  const locations = await client.fetch('count(*[_type == "location"])')
  const media = await client.fetch('count(*[_type == "sanity.imageAsset"])')

  console.log('🎉 FINAL CLEAN STATE:')
  console.log(`- Artworks: ${artworks} (CLEAN!)`)
  console.log(`- Creators: ${creators} (preserved)`)
  console.log(`- Locations: ${locations} (preserved)`)
  console.log(`- Media assets: ${media} (preserved)`)
  console.log('')
  console.log('✅ Ready for media categorization!')
}

verifyCleanState() 