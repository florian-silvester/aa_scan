import {createClient} from '@sanity/client'
import fs from 'fs'
import path from 'path'
import {nanoid} from 'nanoid'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '', // Use environment variable
  apiVersion: '2023-01-01',
})

function toSlug(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

async function importRichLocations() {
  console.log('🚀 Starting rich location import...')

  const dataPath = path.join(process.cwd(), '..', 'galleries-clean-comprehensive-fixed.json')
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found at: ${dataPath}`)
    return
  }

  const galleries = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  console.log(`📊 Found ${galleries.length} galleries in the JSON file.`)

  let updated = 0
  let created = 0
  let failed = 0

  for (const gallery of galleries) {
    if (!gallery.name) {
      console.warn('Skipping gallery with no name:', gallery)
      failed++
      continue
    }

    try {
      const slug = toSlug(gallery.name)
      const existingLocation = await client.fetch(`*[_type == "location" && slug.current == $slug][0]{_id}`, {slug})
      
      const doc = {
        _type: 'location',
        name: gallery.name,
        slug: { _type: 'slug', current: slug },
        type: 'shop-gallery', // Defaulting based on previous script
        address: gallery.address || '',
        location: gallery.city || '',
        country: gallery.country || '',
        phone: gallery.phone || '',
        email: gallery.email || '',
        website: gallery.website || '',
        times: gallery.times || ''
      }

      if (existingLocation) {
        // Update existing location
        await client.patch(existingLocation._id).set(doc).commit()
        console.log(`✓ Updated: ${gallery.name}`)
        updated++
      } else {
        // Create new location
        doc._id = `location-${nanoid()}`
        await client.create(doc)
        console.log(`✨ Created: ${gallery.name}`)
        created++
      }
    } catch (error) {
      console.error(`✗ Error processing ${gallery.name}:`, error.message)
      failed++
    }
    await new Promise(resolve => setTimeout(resolve, 50)) // API Rate limiting
  }

  console.log('\n\n✅ Import Complete!')
  console.log('--- Summary ---')
  console.log(`✨ Created: ${created}`)
  console.log(`✓ Updated: ${updated}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('-----------------')
}

importRichLocations().catch(console.error) 