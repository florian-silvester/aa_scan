import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2023-01-01'
})

async function createSampleLocation() {
  console.log('Creating sample location...')
  
  try {
    const location = {
      _type: 'location',
      name: 'Porzellanikon – Staatliches Museum für Porzellan',
      type: 'museum',
      country: 'Germany',
      location: 'Selb',
      address: 'Werner-Schürer-Platz 1\n95100 Selb\nGermany',
      times: 'Tue–Sun 10 am–5 pm',
      phone: '+49 (0)9287 91 80 00',
      email: 'info@porzellanikon.org',
      website: 'https://www.porzellanikon.org',
      description: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'The Porzellanikon is the state museum for porcelain in Bavaria, Germany. It showcases the history and artistry of porcelain manufacturing, with extensive collections and exhibitions dedicated to this fine ceramic art form.'
            }
          ]
        }
      ],
      slug: {
        _type: 'slug',
        current: 'porzellanikon-selb'
      }
    }
    
    const result = await client.create(location)
    console.log('✓ Created sample location:', result.name)
    console.log('Location ID:', result._id)
    
  } catch (error) {
    console.error('Error creating sample location:', error)
  }
}

createSampleLocation() 