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

function cleanText(text) {
  if (!text || typeof text !== 'string') return text
  
  return text
    // Remove wrong HTML tags (keep <em> and </em>)
    .replace(/<br\s*\/?>/gi, ' ') // <br>, <br/> → space
    .replace(/<\/br>/gi, ' ') // </br> → space
    .replace(/<EM>/g, '<em>') // <EM> → <em>
    .replace(/<\/EM>/g, '</em>') // </EM> → </em>
    .replace(/<en>/gi, '') // Remove <en> tags
    .replace(/<\/en>/gi, '') // Remove </en> tags
    
    // Fix spacing issues
    .replace(/\n/g, ' ') // Line breaks → space
    .replace(/\t/g, ' ') // Tabs → space
    .replace(/\s+/g, ' ') // Multiple spaces → single space
    
    // Fix punctuation spacing
    .replace(/\s+\./g, '.') // Space before period
    .replace(/\s+,/g, ',') // Space before comma
    .replace(/\.\./g, '.') // Double period → single period
    .replace(/,,/g, ',') // Double comma → single comma
    .replace(/([a-z])\.([A-Z])/g, '$1. $2') // Add space after period if missing
    
    // Fix parentheses spacing
    .replace(/\(\s+/g, '(') // Space after opening parenthesis
    .replace(/\s+\)/g, ')') // Space before closing parenthesis
    
    // Clean up whitespace
    .trim() // Remove leading/trailing whitespace
}

function cleanSize(text) {
  if (!text || typeof text !== 'string') return text
  
  return text
    .replace(/^[,\s]+/, '') // Remove leading comma or space
    .replace(/[,\s]+$/, '') // Remove trailing comma or space
    .replace(/\s+/g, ' ') // Multiple spaces → single space
    .replace(/\s*,\s*/g, ', ') // Normalize comma spacing
    .trim()
}

async function main() {
  console.log('🔍 Analyzing formatting issues...\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  // Fetch all artworks
  const artworks = await client.fetch(`
    *[_type == "artwork"] | order(name) {
      _id,
      name,
      "workTitleEn": workTitle.en,
      "workTitleDe": workTitle.de,
      "descEn": description.en,
      "descDe": description.de,
      "altEn": mainImage.alt.en,
      "altDe": mainImage.alt.de,
      size
    }
  `)
  
  console.log(`Found ${artworks.length} artworks\n`)
  
  const fixes = []
  
  for (const artwork of artworks) {
    const updates = {}
    let needsUpdate = false
    const changes = []
    
    // Clean work titles
    if (artwork.workTitleEn) {
      const cleaned = cleanText(artwork.workTitleEn)
      if (cleaned !== artwork.workTitleEn) {
        updates['workTitle.en'] = cleaned
        needsUpdate = true
        changes.push('Work Title EN')
      }
    }
    
    if (artwork.workTitleDe) {
      const cleaned = cleanText(artwork.workTitleDe)
      if (cleaned !== artwork.workTitleDe) {
        updates['workTitle.de'] = cleaned
        needsUpdate = true
        changes.push('Work Title DE')
      }
    }
    
    // Clean descriptions
    if (artwork.descEn) {
      const cleaned = cleanText(artwork.descEn)
      if (cleaned !== artwork.descEn) {
        updates['description.en'] = cleaned
        needsUpdate = true
        changes.push('Description EN')
      }
    }
    
    if (artwork.descDe) {
      const cleaned = cleanText(artwork.descDe)
      if (cleaned !== artwork.descDe) {
        updates['description.de'] = cleaned
        needsUpdate = true
        changes.push('Description DE')
      }
    }
    
    // Clean alt text
    if (artwork.altEn) {
      const cleaned = cleanText(artwork.altEn)
      if (cleaned !== artwork.altEn) {
        updates['mainImage.alt.en'] = cleaned
        needsUpdate = true
        changes.push('Alt Text EN')
      }
    }
    
    if (artwork.altDe) {
      const cleaned = cleanText(artwork.altDe)
      if (cleaned !== artwork.altDe) {
        updates['mainImage.alt.de'] = cleaned
        needsUpdate = true
        changes.push('Alt Text DE')
      }
    }
    
    // Clean size
    if (artwork.size) {
      const cleaned = cleanSize(artwork.size)
      if (cleaned !== artwork.size) {
        updates['size'] = cleaned
        needsUpdate = true
        changes.push('Size')
      }
    }
    
    if (needsUpdate) {
      fixes.push({
        artworkId: artwork._id,
        artworkName: artwork.name,
        updates,
        changes,
        examples: {
          descEnBefore: artwork.descEn?.substring(0, 60),
          descEnAfter: updates['description.en']?.substring(0, 60),
          descDeBefore: artwork.descDe?.substring(0, 60),
          descDeAfter: updates['description.de']?.substring(0, 60)
        }
      })
    }
  }
  
  if (fixes.length === 0) {
    console.log('✅ All formatting is already clean!')
    return
  }
  
  console.log(`📊 Found ${fixes.length} artworks with formatting issues\n`)
  
  // Group by type of change
  const changeGroups = new Map()
  fixes.forEach(fix => {
    fix.changes.forEach(change => {
      if (!changeGroups.has(change)) {
        changeGroups.set(change, 0)
      }
      changeGroups.set(change, changeGroups.get(change) + 1)
    })
  })
  
  console.log('Summary by field:')
  Array.from(changeGroups.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => {
      console.log(`  ${field}: ${count}`)
    })
  console.log('')
  
  // Show examples
  console.log('Examples of fixes:\n')
  fixes.slice(0, 10).forEach(fix => {
    console.log(`${fix.artworkName}:`)
    console.log(`  Fields: ${fix.changes.join(', ')}`)
    
    if (fix.examples.descEnBefore && fix.examples.descEnAfter) {
      console.log(`  EN Before: "${fix.examples.descEnBefore}..."`)
      console.log(`  EN After:  "${fix.examples.descEnAfter}..."`)
    } else if (fix.examples.descDeBefore && fix.examples.descDeAfter) {
      console.log(`  DE Before: "${fix.examples.descDeBefore}..."`)
      console.log(`  DE After:  "${fix.examples.descDeAfter}..."`)
    }
    console.log('')
  })
  
  if (fixes.length > 10) {
    console.log(`... and ${fixes.length - 10} more\n`)
  }
  
  if (!doApply) {
    console.log('🔎 Run with --apply to clean all formatting issues')
    return
  }
  
  console.log('✅ Applying fixes...\n')
  
  let processed = 0
  for (const fix of fixes) {
    try {
      await client.patch(fix.artworkId).set(fix.updates).commit()
      processed++
      
      if (processed % 50 === 0) {
        console.log(`  Processed ${processed}/${fixes.length}...`)
      }
    } catch (error) {
      console.error(`  ❌ ${fix.artworkName}: ${error.message}`)
    }
  }
  
  console.log(`\n✅ Cleaned ${processed} artworks!`)
}

main().catch(console.error)

