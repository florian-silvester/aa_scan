import {createClient} from '@sanity/client'
import {v4 as uuidv4} from 'uuid'

// Initialize Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: 'sk7uAh61yXEyBnKEvAfMmR2p5tWyk6ERdI3hbYFcGjoB0X0O7iByy1ok7msBoe8nARWSgCmmRi6YG7PnzPperbTC9FWmRg2OHFLEMdOcR4qKVXCGchoIgFMaQqDyjoOCwR1r3eOeDMLgVxhH7VYEGWZzDZ2AmrGn2zDiPpPWn702ImpNvvW1',
})

// Function to convert a string to a Sanity block array
function stringToBlocks(text, style = 'normal') {
  if (typeof text !== 'string' || !text.trim()) {
    return [] // Return empty array if text is not a string or is empty
  }

  return [
    {
      _type: 'block',
      _key: uuidv4(),
      style: style,
      children: [
        {
          _type: 'span',
          _key: uuidv4(),
          text: text,
          marks: [],
        },
      ],
    },
  ]
}

async function migrateTextFields() {
  console.log('🚀 Starting migration of text fields to rich text...')

  const transaction = client.transaction()
  let documentsToPatch = []

  // Fetch all articles and artworks
  const articles = await client.fetch(`*[_type == "article"]`)
  const artworks = await client.fetch(`*[_type == "artwork"]`)

  console.log(`Found ${articles.length} articles and ${artworks.length} artworks to check.`)

  // Prepare article patches
  articles.forEach((doc) => {
    const patch = {
      id: doc._id,
      patch: {
        set: {},
      },
    }
    let needsPatch = false

    const textFields = ['introductionEn', 'introductionDe', 'fullTextEn', 'fullTextDe']
    textFields.forEach((field) => {
      if (typeof doc[field] === 'string') {
        console.log(`- Converting "${field}" in article: ${doc.titleEn || doc._id}`)
        patch.patch.set[field] = stringToBlocks(doc[field])
        needsPatch = true
      }
    })

    if (needsPatch) {
      documentsToPatch.push(patch)
    }
  })

  // Prepare artwork patches
  artworks.forEach((doc) => {
    const patch = {
      id: doc._id,
      patch: {
        set: {},
      },
    }
    let needsPatch = false

    const textFields = ['commentsEn', 'commentsDe']
    textFields.forEach((field) => {
      if (typeof doc[field] === 'string') {
        console.log(`- Converting "${field}" in artwork: ${doc.workTitle || doc._id}`)
        patch.patch.set[field] = stringToBlocks(doc[field])
        needsPatch = true
      }
    })

    if (needsPatch) {
      documentsToPatch.push(patch)
    }
  })

  if (documentsToPatch.length === 0) {
    console.log('✅ No documents needed migration. All text fields are already in the correct format.')
    return
  }

  // Create a transaction to perform all patches
  documentsToPatch.forEach(({id, patch: {set}}) => {
    transaction.patch(id, {set})
  })

  console.log(`\n✨ Applying patches to ${documentsToPatch.length} documents...`)
  await transaction.commit()
  console.log('✅ Migration complete! All text fields have been successfully converted to rich text.')
}

migrateTextFields().catch((err) => {
  console.error('Migration failed:', err.message)
}) 