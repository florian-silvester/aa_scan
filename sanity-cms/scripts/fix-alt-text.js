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

function cleanAltText(text) {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\s*\[[^\]]+\]\s*/g, '') // Remove translation notes like [Contemporary Witnesses]
    .replace(/\n/g, ' ') // Remove line breaks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

async function main() {
  console.log('🔍 Analyzing alt text consistency...\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  // Fetch all artworks with images
  const artworks = await client.fetch(`
    *[_type == "artwork" && defined(mainImage)] | order(name) {
      _id,
      name,
      "currentAltEn": mainImage.alt.en,
      "currentAltDe": mainImage.alt.de,
      "descEn": description.en,
      "descDe": description.de
    }
  `)
  
  console.log(`Found ${artworks.length} artworks with images\n`)
  
  const fixes = []
  let inconsistentCount = 0
  
  for (const artwork of artworks) {
    const cleanedDescEn = cleanAltText(artwork.descEn || '')
    const cleanedDescDe = cleanAltText(artwork.descDe || '')
    const currentAltEn = artwork.currentAltEn || ''
    const currentAltDe = artwork.currentAltDe || ''
    
    const needsFixEn = cleanedDescEn && cleanedDescEn !== currentAltEn
    const needsFixDe = cleanedDescDe && cleanedDescDe !== currentAltDe
    
    if (needsFixEn || needsFixDe) {
      inconsistentCount++
      
      fixes.push({
        artworkId: artwork._id,
        artworkName: artwork.name,
        needsFixEn,
        needsFixDe,
        oldAltEn: currentAltEn,
        newAltEn: cleanedDescEn,
        oldAltDe: currentAltDe,
        newAltDe: cleanedDescDe
      })
    }
  }
  
  if (fixes.length === 0) {
    console.log('✅ All alt texts are consistent with descriptions!')
    return
  }
  
  console.log(`📊 Found ${inconsistentCount} artworks with inconsistent alt text\n`)
  
  // Show first 10 examples
  console.log('Examples of inconsistencies:\n')
  fixes.slice(0, 10).forEach(fix => {
    console.log(`${fix.artworkName}:`)
    if (fix.needsFixEn) {
      console.log(`  EN Old: ${fix.oldAltEn.substring(0, 60)}${fix.oldAltEn.length > 60 ? '...' : ''}`)
      console.log(`  EN New: ${fix.newAltEn.substring(0, 60)}${fix.newAltEn.length > 60 ? '...' : ''}`)
    }
    if (fix.needsFixDe) {
      console.log(`  DE Old: ${fix.oldAltDe.substring(0, 60)}${fix.oldAltDe.length > 60 ? '...' : ''}`)
      console.log(`  DE New: ${fix.newAltDe.substring(0, 60)}${fix.newAltDe.length > 60 ? '...' : ''}`)
    }
    console.log('')
  })
  
  if (fixes.length > 10) {
    console.log(`... and ${fixes.length - 10} more\n`)
  }
  
  if (!doApply) {
    console.log('🔎 Run with --apply to update all artworks')
    return
  }
  
  console.log('✅ Applying fixes...\n')
  
  let processed = 0
  for (const fix of fixes) {
    try {
      const updates = {}
      
      if (fix.needsFixEn) {
        updates['mainImage.alt.en'] = fix.newAltEn
      }
      if (fix.needsFixDe) {
        updates['mainImage.alt.de'] = fix.newAltDe
      }
      
      await client.patch(fix.artworkId).set(updates).commit()
      processed++
      
      if (processed % 50 === 0) {
        console.log(`  Processed ${processed}/${fixes.length}...`)
      }
    } catch (error) {
      console.error(`  ❌ ${fix.artworkName}: ${error.message}`)
    }
  }
  
  console.log(`\n✅ Updated ${processed} artworks!`)
}

main().catch(console.error)

