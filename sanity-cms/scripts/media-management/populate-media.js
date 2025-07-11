import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2023-01-01'
})

const categories = [
  // Left column
  { title: 'Diverse Design Objects', titleDe: 'Verschiedene Designobjekte' },
  { title: 'Furniture | Objects', titleDe: 'Möbel | Objekte' },
  { title: 'Lighting', titleDe: 'Beleuchtung' },
  { title: 'Rugs | Interior Textiles', titleDe: 'Teppiche | Innenraum-Textilien' },
  
  // Middle column
  { title: 'Ceramic Art', titleDe: 'Keramikkunst' },
  { title: 'Metal Art', titleDe: 'Metallkunst' },
  { title: 'Studio Glass', titleDe: 'Studioglas' },
  { title: 'Woodwork | Paper', titleDe: 'Holzarbeiten | Papier' },
  
  // Right column
  { title: 'Art Jewelry', titleDe: 'Kunstschmuck' },
  { title: 'Design Jewelry', titleDe: 'Designschmuck' },
  { title: 'Textile | Accessories', titleDe: 'Textilien | Accessoires' }
]

async function populateCategories() {
  console.log('Starting to populate categories...')
  
  for (const category of categories) {
    try {
      // Create slug from title
      const slug = category.title.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[|]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '')
      
      const doc = {
        _type: 'category',
        title: category.title,
        titleDe: category.titleDe,
        slug: {
          _type: 'slug',
          current: slug
        }
      }
      
      const result = await client.create(doc)
      console.log(`✓ Created category: ${category.title} (${result._id})`)
    } catch (error) {
      console.error(`✗ Error creating category ${category.title}:`, error.message)
    }
  }
  
  console.log('Finished populating categories!')
}

populateCategories().catch(console.error) 