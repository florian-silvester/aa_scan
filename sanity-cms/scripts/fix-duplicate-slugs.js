import { createClient } from '@sanity/client'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFromRoot() {
  try {
    const envPath = join(__dirname, '../../.env')
    const env = readFileSync(envPath, 'utf8')
    env.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
        process.env[key.trim()] = value
      }
    })
  } catch (e) {}
}

loadEnvFromRoot()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

async function main() {
  console.log('🔍 Finding duplicate slugs...\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  // Fetch all artworks with their slugs
  const artworks = await client.fetch(`
    *[_type == "artwork"] | order(name) {
      _id,
      name,
      "slug": slug.current,
      year
    }
  `)
  
  console.log(`Found ${artworks.length} artworks\n`)
  
  // Group by slug
  const slugMap = new Map()
  artworks.forEach(art => {
    if (art.slug) {
      if (!slugMap.has(art.slug)) {
        slugMap.set(art.slug, [])
      }
      slugMap.get(art.slug).push(art)
    }
  })
  
  // Find duplicates
  const duplicates = []
  slugMap.forEach((arts, slug) => {
    if (arts.length > 1) {
      duplicates.push({
        slug,
        artworks: arts
      })
    }
  })
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate slugs found!')
    return
  }
  
  console.log(`❌ Found ${duplicates.length} duplicate slugs\n`)
  
  // Create fix plan
  const fixes = []
  const allUsedSlugs = new Set(Array.from(slugMap.keys()))
  
  duplicates.forEach(dup => {
    // First artwork keeps the original slug
    // Rest get numbered versions
    dup.artworks.forEach((art, index) => {
      if (index === 0) {
        // First one keeps the slug
        return
      }
      
      // Generate new slug with number
      let newSlug = `${dup.slug}-${index + 1}`
      let counter = index + 1
      
      // Make sure the new slug is unique
      while (allUsedSlugs.has(newSlug)) {
        counter++
        newSlug = `${dup.slug}-${counter}`
      }
      
      allUsedSlugs.add(newSlug)
      
      fixes.push({
        artworkId: art._id,
        artworkName: art.name,
        oldSlug: dup.slug,
        newSlug: newSlug
      })
    })
  })
  
  console.log(`📋 Need to update ${fixes.length} artworks\n`)
  
  // Show summary
  console.log('Duplicate slug groups:\n')
  duplicates.slice(0, 10).forEach(dup => {
    console.log(`  "${dup.slug}" (${dup.artworks.length} artworks):`)
    dup.artworks.forEach((art, index) => {
      if (index === 0) {
        console.log(`    ✓ ${art.name} (keeps slug)`)
      } else {
        const fix = fixes.find(f => f.artworkId === art._id)
        console.log(`    → ${art.name}`)
        console.log(`      New slug: "${fix.newSlug}"`)
      }
    })
    console.log('')
  })
  
  if (duplicates.length > 10) {
    console.log(`... and ${duplicates.length - 10} more duplicate groups\n`)
  }
  
  if (!doApply) {
    console.log('🔎 Run with --apply to update slugs')
    return
  }
  
  console.log('✅ Applying fixes...\n')
  
  let processed = 0
  for (const fix of fixes) {
    try {
      await client.patch(fix.artworkId).set({
        'slug.current': fix.newSlug
      }).commit()
      processed++
      
      if (processed % 10 === 0) {
        console.log(`  Processed ${processed}/${fixes.length}...`)
      }
    } catch (error) {
      console.error(`  ❌ ${fix.artworkName}: ${error.message}`)
    }
  }
  
  console.log(`\n✅ Updated ${processed} slugs!`)
  console.log('\nVerifying...')
  
  // Verify no duplicates remain
  const verification = await client.fetch(`
    *[_type == "artwork"] {
      "slug": slug.current
    }
  `)
  
  const verifyMap = new Map()
  verification.forEach(art => {
    if (art.slug) {
      verifyMap.set(art.slug, (verifyMap.get(art.slug) || 0) + 1)
    }
  })
  
  const remainingDuplicates = Array.from(verifyMap.entries()).filter(([slug, count]) => count > 1)
  
  if (remainingDuplicates.length === 0) {
    console.log('✅ No duplicate slugs remain!')
  } else {
    console.log(`⚠️  Warning: ${remainingDuplicates.length} duplicate slugs still remain`)
    remainingDuplicates.forEach(([slug, count]) => {
      console.log(`  "${slug}": ${count} artworks`)
    })
  }
}

main().catch(console.error)

