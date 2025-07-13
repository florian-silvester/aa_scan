// Run this in the browser console while in Sanity Studio
// Go to http://localhost:3333 and open browser dev tools, then paste this code

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

async function createCategories() {
  console.log('Creating categories...')
  
  // Get the Sanity client from the studio
  const client = window.__sanityStudio?.client || window.sanityClient
  
  if (!client) {
    console.error('Sanity client not found. Make sure you\'re in the Studio.')
    return
  }
  
  for (const category of categories) {
    try {
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
  
  console.log('Finished creating categories!')
}

// Run the function
createCategories() 