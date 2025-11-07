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

function removeYearFromTitle(title, year) {
  if (!title || typeof title !== 'string') return title
  
  // Remove patterns like ", 2014" or " 2014" at the end
  let cleaned = title
    .replace(/[,\s]+\d{4}$/, '') // ", 2014" or " 2014" at end
    .replace(/\s+\d{4}\/\d+\s*$/, '') // " 2019/27" at end
    .trim()
  
  return cleaned
}

function normalizeForSlug(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateSlug(artistName, workTitle, year, existingSlugs) {
  const artistPart = normalizeForSlug(artistName || '')
  const titlePart = normalizeForSlug(workTitle || 'untitled')
  const yearPart = year ? `-${year}` : ''
  
  let baseSlug = `${artistPart}-${titlePart}${yearPart}`
  let slug = baseSlug
  let counter = 2
  
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  
  existingSlugs.add(slug)
  return slug
}

function extractType(text) {
  if (!text) return null
  
  const textLower = text.toLowerCase()
  
  // Comprehensive type keywords (ordered by priority)
  const typeKeywords = {
    // Vessels
    'bowl': 'Bowl',
    'schale': 'Bowl',
    'vase': 'Vase',
    'bottle': 'Bottle',
    'flasche': 'Bottle',
    'vessel': 'Vessel',
    'gefäß': 'Vessel',
    'gefaess': 'Vessel',
    'jar': 'Jar',
    'pot': 'Pot',
    'cup': 'Cup',
    'pokal': 'Cup',
    'becher': 'Cup',
    'teller': 'Plate',
    'plate': 'Plate',
    'dish': 'Dish',
    'platter': 'Platter',
    'dose': 'Can',
    'can': 'Can',
    'box': 'Box',
    
    // Jewelry
    'ring': 'Ring',
    'necklace': 'Necklace',
    'kette': 'Necklace',
    'halsschmuck': 'Necklace',
    'brooch': 'Brooch',
    'brosche': 'Brooch',
    'bracelet': 'Bracelet',
    'armband': 'Bracelet',
    'armreif': 'Bracelet',
    'earring': 'Earrings',
    'ohrring': 'Earrings',
    'ohrhänger': 'Earrings',
    'pendant': 'Pendant',
    'anhänger': 'Pendant',
    
    // Objects
    'sculpture': 'Sculpture',
    'skulptur': 'Sculpture',
    'object': 'Object',
    'objekt': 'Object',
    'installation': 'Installation'
  }
  
  // Check for each type keyword
  for (const [keyword, type] of Object.entries(typeKeywords)) {
    if (textLower.includes(keyword)) {
      return type
    }
  }
  
  return null
}

function extractFinishes(text) {
  if (!text) return []
  
  const textLower = text.toLowerCase()
  const finishes = []
  
  const finishKeywords = {
    // Glazes
    'glaze': 'Glazed',
    'glasur': 'Glazed',
    'glasiert': 'Glazed',
    'crystal': 'Crystal glaze',
    'kristall': 'Crystal glaze',
    'celadon': 'Celadon',
    'raku': 'Raku',
    'crackle': 'Crackle glaze',
    'ash glaze': 'Ash glaze',
    'ascheglas': 'Ash glaze',
    'salt glaze': 'Salt glazed',
    'salzglas': 'Salt glazed',
    
    // Surface treatments
    'poliert': 'Polished',
    'polished': 'Polished',
    'matt': 'Matte',
    'matte': 'Matte',
    'glänzend': 'Glossy',
    'glossy': 'Glossy',
    'satin': 'Satin',
    'burnished': 'Burnished',
    'patina': 'Patina',
    'oxidiert': 'Oxidized',
    'oxidized': 'Oxidized',
    'sandgestrahlt': 'Sandblasted',
    'sandblasted': 'Sandblasted',
    'hammered': 'Hammered',
    'gehämmert': 'Hammered',
    'brushed': 'Brushed',
    'gebürstet': 'Brushed',
    'textured': 'Textured',
    'strukturiert': 'Textured',
    
    // Metal finishes
    'gold plated': 'Gold plated',
    'vergoldet': 'Gold plated',
    'silver plated': 'Silver plated',
    'versilbert': 'Silver plated',
    'rhodium': 'Rhodium plated',
    'rhodiniert': 'Rhodium plated',
    'blackened': 'Blackened',
    'geschwärzt': 'Blackened',
    
    // Ceramic specific
    'engobe': 'Engobe',
    'slip': 'Slip',
    'terra sigillata': 'Terra sigillata',
    'unglazed': 'Unglazed',
    'unglasiert': 'Unglazed',
    'smoke firing': 'Smoke fired',
    'rauchbrand': 'Smoke fired',
    'pit fired': 'Pit fired',
    'wood fired': 'Wood fired',
    'holzbrand': 'Wood fired',
    
    // Glass specific
    'iridescent': 'Iridescent',
    'irisierend': 'Iridescent',
    'frosted': 'Frosted',
    'matt geschliffen': 'Frosted',
    'sandblasted': 'Sandblasted',
    'etched': 'Etched',
    'geätzt': 'Etched',
    'cut': 'Cut',
    'geschliffen': 'Cut'
  }
  
  for (const [keyword, finish] of Object.entries(finishKeywords)) {
    if (textLower.includes(keyword) && !finishes.includes(finish)) {
      finishes.push(finish)
    }
  }
  
  return finishes
}

async function main() {
  console.log('🔍 Analyzing titles, slugs, and metadata...\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  // Fetch reference data
  const [mediums, finishesRef] = await Promise.all([
    client.fetch('*[_type == "medium"] {_id, "name": name.en}'),
    client.fetch('*[_type == "finish"] {_id, "name": name.en}')
  ])
  
  const mediumMap = new Map(mediums.map(m => [m.name, m._id]))
  const finishMap = new Map(finishesRef.map(f => [f.name, f._id]))
  
  console.log(`📚 Loaded ${mediums.length} medium types, ${finishesRef.length} finishes\n`)
  
  // Fetch all artworks
  const artworks = await client.fetch(`
    *[_type == "artwork"] | order(name) {
      _id,
      name,
      "workTitleEn": workTitle.en,
      "workTitleDe": workTitle.de,
      "descEn": description.en,
      "descDe": description.de,
      "slug": slug.current,
      year,
      "artistName": creator->name,
      "hasMedium": defined(medium) && length(medium) > 0,
      "hasFinishes": defined(finishes) && length(finishes) > 0,
      medium,
      finishes
    }
  `)
  
  console.log(`Found ${artworks.length} artworks\n`)
  
  const fixes = []
  const existingSlugs = new Set()
  
  // Collect existing good slugs first
  artworks.forEach(art => {
    if (art.slug && !art.slug.startsWith('image-') && art.slug.length < 100) {
      existingSlugs.add(art.slug)
    }
  })
  
  for (const artwork of artworks) {
    const updates = {}
    let needsUpdate = false
    
    // 1. Remove years from work titles
    const cleanedTitleEn = removeYearFromTitle(artwork.workTitleEn, artwork.year)
    const cleanedTitleDe = removeYearFromTitle(artwork.workTitleDe, artwork.year)
    
    if (cleanedTitleEn !== artwork.workTitleEn) {
      updates['workTitle.en'] = cleanedTitleEn
      needsUpdate = true
    }
    
    if (cleanedTitleDe !== artwork.workTitleDe) {
      updates['workTitle.de'] = cleanedTitleDe
      needsUpdate = true
    }
    
    // 2. Fix slugs (generic or overly long)
    const needsNewSlug = !artwork.slug || 
                         artwork.slug.startsWith('image-') || 
                         artwork.slug.length > 100 ||
                         artwork.slug.includes('brutto-gusto') ||
                         artwork.slug.includes('photo-def-image')
    
    if (needsNewSlug) {
      const newSlug = generateSlug(
        artwork.artistName,
        cleanedTitleEn || artwork.workTitleEn,
        artwork.year,
        existingSlugs
      )
      updates['slug.current'] = newSlug
      needsUpdate = true
    }
    
    // 3. Extract missing medium (type)
    if (!artwork.hasMedium) {
      const caption = `${artwork.descEn || ''} ${artwork.descDe || ''} ${artwork.workTitleEn || ''} ${artwork.workTitleDe || ''}`
      const extractedType = extractType(caption)
      
      if (extractedType && mediumMap.has(extractedType)) {
        updates['medium'] = [{
          _type: 'reference',
          _ref: mediumMap.get(extractedType),
          _key: `medium-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }]
        needsUpdate = true
      }
    }
    
    // 4. Extract missing finishes
    if (!artwork.hasFinishes) {
      const caption = `${artwork.descEn || ''} ${artwork.descDe || ''}`
      const extractedFinishes = extractFinishes(caption)
      
      if (extractedFinishes.length > 0) {
        const finishRefs = []
        for (const finish of extractedFinishes) {
          if (finishMap.has(finish)) {
            finishRefs.push({
              _type: 'reference',
              _ref: finishMap.get(finish),
              _key: `finish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })
          }
        }
        
        if (finishRefs.length > 0) {
          updates['finishes'] = finishRefs
          needsUpdate = true
        }
      }
    }
    
    if (needsUpdate) {
      fixes.push({
        artworkId: artwork._id,
        artworkName: artwork.name,
        updates,
        oldTitleEn: artwork.workTitleEn,
        newTitleEn: updates['workTitle.en'],
        oldTitleDe: artwork.workTitleDe,
        newTitleDe: updates['workTitle.de'],
        oldSlug: artwork.slug,
        newSlug: updates['slug.current'],
        addedMedium: updates['medium'] ? extractType(`${artwork.descEn} ${artwork.descDe}`) : null,
        addedFinishes: updates['finishes'] ? extractFinishes(`${artwork.descEn} ${artwork.descDe}`) : null
      })
    }
  }
  
  if (fixes.length === 0) {
    console.log('✅ Everything is already consistent!')
    return
  }
  
  console.log(`📊 Found ${fixes.length} artworks needing updates\n`)
  
  // Show examples
  console.log('Examples:\n')
  fixes.slice(0, 10).forEach(fix => {
    console.log(`${fix.artworkName}:`)
    if (fix.newTitleEn) {
      console.log(`  Title EN: "${fix.oldTitleEn}" → "${fix.newTitleEn}"`)
    }
    if (fix.newTitleDe) {
      console.log(`  Title DE: "${fix.oldTitleDe}" → "${fix.newTitleDe}"`)
    }
    if (fix.newSlug) {
      console.log(`  Slug: "${fix.oldSlug}" → "${fix.newSlug}"`)
    }
    if (fix.addedMedium) {
      console.log(`  + Added type: ${fix.addedMedium}`)
    }
    if (fix.addedFinishes) {
      console.log(`  + Added finishes: ${fix.addedFinishes.join(', ')}`)
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
      await client.patch(fix.artworkId).set(fix.updates).commit()
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

