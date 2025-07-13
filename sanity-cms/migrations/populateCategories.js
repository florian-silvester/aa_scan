import { defineMigration, createDocument } from 'sanity/migrate'

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

export default defineMigration({
  title: 'Populate Categories',
  migrate: {
    async document(doc, context) {
      // Only run once - check if categories already exist
      const existingCategories = await context.client.fetch(
        `count(*[_type == "category"])`
      )
      
      if (existingCategories > 0) {
        console.log('Categories already exist, skipping...')
        return doc
      }
      
      // Create all categories
      for (const category of categories) {
        const slug = category.title.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[|]/g, '')
          .replace(/--+/g, '-')
          .replace(/^-|-$/g, '')
        
        await createDocument(context, {
          _type: 'category',
          title: category.title,
          titleDe: category.titleDe,
          slug: {
            _type: 'slug',
            current: slug
          }
        })
        
        console.log(`✓ Created category: ${category.title}`)
      }
      
      return doc
    }
  }
}) 