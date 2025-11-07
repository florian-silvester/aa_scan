import { createClient } from '@sanity/client'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env from project root .env.bak if present
function loadEnvFromRoot() {
  try {
    const root = join(__dirname, '../..')
    const envBak = join(root, '.env.bak')
    if (fs.existsSync(envBak)) {
      const text = fs.readFileSync(envBak, 'utf8')
      text.split(/\r?\n/).forEach(line => {
        const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
        if (m) {
          const key = m[1]
          let val = m[2]
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
            val = val.slice(1, -1)
          }
          process.env[key] = val
        }
      })
    }
  } catch (_) {}
}

loadEnvFromRoot()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

// Generate slug from text
function generateSlug(text) {
  if (!text) return ''
  
  return text
    .toLowerCase()
    // Normalize German umlauts FIRST
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Then remove all non-alphanumeric characters
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 96)
}

// Extract category (medium) from caption
function extractCategory(caption) {
  if (!caption) return null
  
  const categoryMap = {
    // German terms
    'keramik': 'Ceramics',
    'porzellan': 'Ceramics',
    'steinzeug': 'Ceramics',
    'ton': 'Ceramics',
    'glas': 'Glass',
    'schmuck': 'Jewelry',
    'metall': 'Metalwork',
    'textil': 'Textiles',
    'holz': 'Woodwork',
    'woodwork': 'Woodwork',
    // English terms
    'ceramic': 'Ceramics',
    'ceramics': 'Ceramics',
    'porcelain': 'Ceramics',
    'stoneware': 'Ceramics',
    'clay': 'Ceramics',
    'glass': 'Glass',
    'jewelry': 'Jewelry',
    'jewellery': 'Jewelry',
    'metal': 'Metalwork',
    'metalwork': 'Metalwork',
    'textile': 'Textiles',
    'textiles': 'Textiles',
    'wood': 'Woodwork',
    'woodwork': 'Woodwork'
  }
  
  const captionLower = caption.toLowerCase()
  for (const [term, category] of Object.entries(categoryMap)) {
    if (captionLower.includes(term)) {
      return category
    }
  }
  
  return null
}

// Extract type (medium) from caption
function extractType(caption) {
  if (!caption) return []
  
  // Remove HTML tags first
  const cleanCaption = caption.replace(/<[^>]+>/g, ' ')
  
  const typeKeywords = {
    // German - include umlaut variants
    'gefäß': 'Vessel',
    'gefäße': 'Vessel',
    'vase': 'Vase',
    'vasen': 'Vase',
    'schale': 'Bowl',
    'schalen': 'Bowl',
    'schüssel': 'Bowl',
    'tasse': 'Cup',
    'becher': 'Mug',
    'teller': 'Plate',
    'platte': 'Plate',
    'krug': 'Jug',
    'ring': 'Ring',
    'halskette': 'Necklace',
    'ohrring': 'Earring',
    'armband': 'Bracelet',
    'brosche': 'Brooch',
    'anhänger': 'Pendant',
    'kette': 'Necklace', // FIXED: Kette = Necklace in jewelry context, not Chain
    // English
    'vessel': 'Vessel',
    'vessels': 'Vessel',
    'vase': 'Vase',
    'vases': 'Vase',
    'bowl': 'Bowl',
    'bowls': 'Bowl',
    'dish': 'Dish',
    'cup': 'Cup',
    'mug': 'Mug',
    'plate': 'Plate',
    'pot': 'Pot',
    'jar': 'Jar',
    'container': 'Container',
    'ring': 'Ring',
    'necklace': 'Necklace',
    'earring': 'Earring',
    'earrings': 'Earring',
    'bracelet': 'Bracelet',
    'brooch': 'Brooch',
    'pendant': 'Pendant',
    'chain': 'Chain'
  }
  
  const foundTypes = new Set()
  const captionLower = cleanCaption.toLowerCase()
  
  for (const [term, type] of Object.entries(typeKeywords)) {
    const regex = new RegExp(`\\b${term}\\b`, 'i')
    if (regex.test(captionLower)) {
      foundTypes.add(type)
    }
  }
  
  return Array.from(foundTypes)
}

// Extract finishes from caption
function extractFinishes(caption) {
  if (!caption) return []
  
  // Remove HTML tags first
  const cleanCaption = caption.replace(/<[^>]+>/g, ' ')
  
  const finishKeywords = {
    // German
    'patiniert': 'Patinated',
    'geschnitten': 'Cut',
    'graviert': 'Engraved',
    'gepresst': 'Pressed',
    'fertig': 'Finished',
    'geschnitzt': 'Carved',
    'geschmiedet': 'Forged',
    'oxidiert': 'Oxidized',
    'montiert': 'Mounted',
    'geschliffen': 'Ground',
    'geölt': 'Oiled',
    'beschichtet': 'Coated',
    'gewachst': 'Waxed',
    'perlen': 'Beaded',
    'glasiert': 'Glazed',
    'genietet': 'Riveted',
    'gemalt': 'Painted',
    'satin': 'Satin',
    'roh': 'Raw',
    'plattiert': 'Plated',
    'gefärbt': 'Colored',
    'poliert': 'Polished',
    'natürlich': 'Natural',
    'matt': 'Matt',
    'lackiert': 'Lacquered',
    'gefaltet': 'Folded',
    'gebürstet': 'Brushed',
    'gedreht': 'Twisted',
    'getönt': 'Tinted',
    'gegossen': 'Cast',
    'gebürstet': 'Burnished',
    'glatt': 'Plain',
    // English
    'patinated': 'Patinated',
    'cut': 'Cut',
    'engraved': 'Engraved',
    'pressed': 'Pressed',
    'finished': 'Finished',
    'carved': 'Carved',
    'forged': 'Forged',
    'oxidized': 'Oxidized',
    'mounted': 'Mounted',
    'ground': 'Ground',
    'oiled': 'Oiled',
    'coated': 'Coated',
    'waxed': 'Waxed',
    'beaded': 'Beaded',
    'glazed': 'Glazed',
    'riveted': 'Riveted',
    'painted': 'Painted',
    'satin': 'Satin',
    'raw': 'Raw',
    'plated': 'Plated',
    'colored': 'Colored',
    'polished': 'Polished',
    'natural': 'Natural',
    'matt': 'Matt',
    'lacquered': 'Lacquered',
    'folded': 'Folded',
    'brushed': 'Brushed',
    'twisted': 'Twisted',
    'tinted': 'Tinted',
    'cast': 'Cast',
    'burnished': 'Burnished',
    'plain': 'Plain'
  }
  
  const foundFinishes = new Set()
  const captionLower = cleanCaption.toLowerCase()
  
  for (const [term, finish] of Object.entries(finishKeywords)) {
    const regex = new RegExp(`\\b${term}\\b`, 'i')
    if (regex.test(captionLower)) {
      foundFinishes.add(finish)
    }
  }
  
  return Array.from(foundFinishes)
}

// Extract materials from caption
function extractMaterials(caption) {
  if (!caption) return []
  
  const materialKeywords = {
    // German
    'porzellan': 'Porcelain',
    'keramik': 'Ceramic',
    'steinzeug': 'Stoneware',
    'ton': 'Clay',
    'glas': 'Glass',
    'silber': 'Silver',
    'gold': 'Gold',
    'platin': 'Platinum',
    'bronze': 'Bronze',
    'kupfer': 'Copper',
    'messing': 'Brass',
    'tombak': 'Red brass',
    'textil': 'Textile',
    'wolle': 'Wool',
    'seide': 'Silk',
    'baumwolle': 'Cotton',
    'leder': 'Leather',
    'ebenholz': 'Ebony',
    // English
    'porcelain': 'Porcelain',
    'ceramic': 'Ceramic',
    'stoneware': 'Stoneware',
    'clay': 'Clay',
    'glass': 'Glass',
    'silver': 'Silver',
    'gold': 'Gold',
    'platinum': 'Platinum',
    'bronze': 'Bronze',
    'copper': 'Copper',
    'brass': 'Brass',
    'red brass': 'Red brass',
    'textile': 'Textile',
    'wool': 'Wool',
    'silk': 'Silk',
    'cotton': 'Cotton',
    'leather': 'Leather',
    'ebony': 'Ebony'
  }
  
  const foundMaterials = new Set()
  const captionLower = caption.toLowerCase()
  
  for (const [term, material] of Object.entries(materialKeywords)) {
    const regex = new RegExp(`\\b${term}\\b`, 'i')
    if (regex.test(caption)) {
      foundMaterials.add(material)
    }
  }
  
  return Array.from(foundMaterials)
}

// Create alt text from caption (clean description)
function createAltText(caption) {
  if (!caption) return ''
  
  // Remove HTML tags
  let clean = caption.replace(/<[^>]+>/g, ' ')
  
  // Remove photographer credits (common patterns)
  clean = clean.replace(/\b(Photo|Foto|Fotograf|Photographer|©|Copyright)\s+[^,.\n]+/gi, '')
  clean = clean.replace(/\bPhoto\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g, '') // Photo FirstName LastName
  clean = clean.replace(/Photo\s+Frank\s+Kleinbach/gi, '')
  
  // Remove dimensions and measurements
  clean = clean.replace(/[\dØø,.\s×xX-]+\s*cm(?:\/[\dØø,.\s×xX-]+\s*cm)*/gi, '')
  
  // Remove year
  clean = clean.replace(/\b(19|20)\d{2}\b/g, '')
  
  // Remove common material keywords (they're already in materials field)
  clean = clean.replace(/\b(porcelain|ceramic|stoneware|clay|glass|silver|gold|platinum|bronze|copper|brass|textile|wool|silk|cotton|leather|ebony|porzellan|keramik|steinzeug|ton|glas|silber|gold|platin|bronze|kupfer|messing|textil|wolle|seide|baumwolle|leder|ebenholz)\b/gi, '')
  
  // Remove incomplete sentence fragments FIRST
  clean = clean.replace(/,\s*\./g, '') // Remove ", ." completely
  clean = clean.replace(/\.\s*\./g, '.') // Fix ".." to "."
  clean = clean.replace(/\b(and|und|or|oder)\s*\./gi, '') // Remove "and." or "und."
  clean = clean.replace(/\b(on|auf|in|von|by|mit|with)\s+\w+\s+(and|und)\s*\./gi, '') // Remove "on metal and."
  
  // Clean up trailing punctuation
  clean = clean.replace(/,\s*$/g, '') // Remove trailing comma
  clean = clean.replace(/\.\s*$/g, '') // Remove trailing period
  
  // Clean up whitespace
  clean = clean.replace(/\s+/g, ' ').trim()
  
  // Remove leading/trailing punctuation
  clean = clean.replace(/^[.,;:]+|[.,;:]+$/g, '')
  
  // Remove single-word fragments that don't make sense
  const words = clean.split(/\s+/)
  if (words.length === 1 && words[0].length < 3) {
    clean = ''
  }
  
  // Final cleanup - ensure it's a proper sentence
  clean = clean.replace(/^\s*[.,;:]+\s*/g, '') // Remove leading punctuation
  clean = clean.replace(/\s*[.,;:]+\s*$/g, '') // Remove trailing punctuation
  
  return clean.trim() || ''
}

async function main() {
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  const overwrite = argv.includes('--overwrite')
  const limitArg = argv.find(a => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null
  const filterArg = argv.find(a => a.startsWith('--filter='))
  const nameFilter = filterArg ? filterArg.split('=')[1] : null

  if (!process.env.SANITY_API_TOKEN) {
    console.error('❌ Missing SANITY_API_TOKEN in environment')
    process.exit(1)
  }

  console.log(`🚀 Extracting data from captions and updating artworks`)
  console.log(`   Mode: ${doApply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`   Overwrite existing: ${overwrite ? 'YES' : 'NO (add only)'}`)
  if (limit) console.log(`   Limit: ${limit} artworks`)
  if (nameFilter) console.log(`   Filter: name contains "${nameFilter}"`)
  console.log('')

  // Fetch all categories, mediums, materials, and finishes for reference matching
  console.log('📥 Loading reference data...')
  const [categories, mediums, materials, finishes] = await Promise.all([
    client.fetch(`*[_type == "category"] {_id, "titleEn": title.en, "titleDe": title.de}`),
    client.fetch(`*[_type == "medium"] {_id, "nameEn": name.en, "nameDe": name.de}`),
    client.fetch(`*[_type == "material"] {_id, "nameEn": name.en, "nameDe": name.de}`),
    client.fetch(`*[_type == "finish"] {_id, "nameEn": name.en, "nameDe": name.de}`)
  ])

  // Create lookup maps
  const categoryMap = new Map()
  categories.forEach(cat => {
    const key = cat.titleEn?.toLowerCase() || cat.titleDe?.toLowerCase()
    if (key) categoryMap.set(key, cat._id)
  })

  const mediumMap = new Map()
  mediums.forEach(med => {
    const keyEn = med.nameEn?.toLowerCase()
    const keyDe = med.nameDe?.toLowerCase()
    if (keyEn) mediumMap.set(keyEn, med._id)
    if (keyDe) mediumMap.set(keyDe, med._id)
  })

  const materialMap = new Map()
  materials.forEach(mat => {
    const keyEn = mat.nameEn?.toLowerCase()
    const keyDe = mat.nameDe?.toLowerCase()
    if (keyEn) materialMap.set(keyEn, mat._id)
    if (keyDe) materialMap.set(keyDe, mat._id)
  })

  const finishMap = new Map()
  finishes.forEach(fin => {
    const keyEn = fin.nameEn?.toLowerCase()
    const keyDe = fin.nameDe?.toLowerCase()
    if (keyEn) finishMap.set(keyEn, fin._id)
    if (keyDe) finishMap.set(keyDe, fin._id)
  })

  console.log(`   Categories: ${categories.length}`)
  console.log(`   Mediums: ${mediums.length}`)
  console.log(`   Materials: ${materials.length}`)
  console.log(`   Finishes: ${finishes.length}\n`)

  // Fetch artworks with captions
  let query = `*[_type == "artwork" && (defined(mainImage.asset) || defined(images[0].asset))] | order(_createdAt asc) {
    _id,
    name,
    workTitle,
    slug,
    category,
    medium,
    materials,
    finishes,
    description,
    year,
    creator->{_id, name},
    mainImage{
      asset->{_id},
      alt
    },
    images[0]{
      asset->{_id},
      alt
    }
  }`
  
  if (nameFilter) {
    query = `*[_type == "artwork" && (defined(mainImage.asset) || defined(images[0].asset)) && name match "*${nameFilter}*"] | order(_createdAt asc) {
      _id,
      name,
      workTitle,
      slug,
      category,
      medium,
      materials,
      finishes,
      description,
      year,
      creator->{_id, name},
      mainImage{
        asset->{_id},
        alt
      },
      images[0]{
        asset->{_id},
        alt
      }
    }`
  }

  let artworks = await client.fetch(query)
  if (limit && Number.isFinite(limit) && artworks.length > limit) {
    artworks = artworks.slice(0, limit)
  }

  console.log(`📋 Found ${artworks.length} artworks to process\n`)

  // Build slug map for duplicate detection
  const slugMap = new Map()
  artworks.forEach(art => {
    const creatorName = art.creator?.name || ''
    const year = art.year || ''
    const workTitleEn = art.workTitle?.en || ''
    const workTitleDe = art.workTitle?.de || ''
    // Clean title for slug (remove year patterns like "2019/27")
    const cleanedTitle = (workTitleEn || workTitleDe)
      .replace(/,\s*\d{4}\s*$/, '')
      .replace(/\s+\d{4}\s*$/, '')
      .replace(/\s*\d{4}\/\d+\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const titleForSlug = cleanedTitle || art.name || 'Untitled'
    const artistSlug = creatorName ? generateSlug(creatorName) : ''
    const titleSlug = titleForSlug ? generateSlug(titleForSlug) : ''
    const yearSlug = year ? `-${year}` : ''
    const baseSlug = artistSlug && titleSlug ? `${artistSlug}-${titleSlug}${yearSlug}` : titleSlug || artistSlug || 'untitled'
    
    if (!slugMap.has(baseSlug)) {
      slugMap.set(baseSlug, [])
    }
    slugMap.get(baseSlug).push(art._id)
  })

  let updated = 0
  let skipped = 0
  let processed = 0

  for (const art of artworks) {
    processed++
    
    if (processed % 50 === 0) {
      console.log(`\n📊 Progress: ${processed}/${artworks.length} (${Math.round(processed/artworks.length*100)}%)`)
      console.log(`   Updated: ${updated} | Skipped: ${skipped}\n`)
    }

    const captionDE = art.description?.de || ''
    const captionEN = art.description?.en || ''
    // Use BOTH captions to extract types - combine them
    const caption = `${captionEN} ${captionDE}`.trim()
    
    if (!caption) {
      if (processed <= 5) console.log(`⏭️  Skipping ${art._id}: No caption`)
      skipped++
      continue
    }

    const artworkName = art.name || art.workTitle?.en || art.workTitle?.de || 'Untitled'
    const updates = {}
    let hasUpdates = false

    // 0. Remove year from workTitle.en if present (including patterns like "2019/27")
    const workTitleEn = art.workTitle?.en || ''
    const workTitleDe = art.workTitle?.de || ''
    // Remove year patterns: ", 2019" or " 2019" at end, or "2019/27" anywhere
    let cleanedWorkTitleEn = workTitleEn
      .replace(/,\s*\d{4}\s*$/, '') // Remove ", 2019" at end
      .replace(/\s+\d{4}\s*$/, '') // Remove " 2019" at end
      .replace(/\s*\d{4}\/\d+\s*/g, ' ') // Remove "2019/27" pattern
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    if (cleanedWorkTitleEn !== workTitleEn && cleanedWorkTitleEn) {
      updates.workTitle = {
        ...art.workTitle,
        en: cleanedWorkTitleEn
      }
      hasUpdates = true
      if (processed <= 5) console.log(`🔧 ${art._id}: Remove year from workTitle.en "${workTitleEn}" → "${cleanedWorkTitleEn}"`)
    }

    // 1. Fix slug - artist name + title + year + number if duplicates
    const creatorName = art.creator?.name || ''
    const year = art.year || ''
    const titleForSlug = cleanedWorkTitleEn || workTitleDe || artworkName
    const artistSlug = creatorName ? generateSlug(creatorName) : ''
    const titleSlug = titleForSlug ? generateSlug(titleForSlug) : ''
    const yearSlug = year ? `-${year}` : ''
    
    // Build base slug
    let baseSlug = artistSlug && titleSlug ? `${artistSlug}-${titleSlug}${yearSlug}` : titleSlug || artistSlug || 'untitled'
    
    // Check for duplicates and add number if needed
    const currentSlug = art.slug?.current
    const duplicateIds = slugMap.get(baseSlug) || []
    let expectedSlug = baseSlug
    
    if (duplicateIds.length > 1) {
      // Multiple artworks with same slug - add number
      const index = duplicateIds.indexOf(art._id)
      if (index > 0) {
        expectedSlug = `${baseSlug}-${index + 1}`
      }
    }
    
    if (currentSlug !== expectedSlug && expectedSlug) {
      updates.slug = { current: expectedSlug }
      hasUpdates = true
      if (processed <= 5) console.log(`🔧 ${art._id}: Fix slug "${currentSlug}" → "${expectedSlug}"`)
    }

    // 2. Extract and set category (medium)
    const extractedCategory = extractCategory(caption)
    if (extractedCategory) {
      const categoryId = categoryMap.get(extractedCategory.toLowerCase())
      if (categoryId && (overwrite || !art.category || art.category._id !== categoryId)) {
        updates.category = { _type: 'reference', _ref: categoryId }
        hasUpdates = true
        if (processed <= 5) console.log(`📂 ${art._id}: ${overwrite && art.category ? 'Overwrite' : 'Set'} category "${extractedCategory}"`)
      }
    }

    // 3. Extract and set type (medium)
    const extractedTypes = extractType(caption)
    if (extractedTypes.length > 0) {
      const currentMediumIds = (art.medium || []).map(m => m._id).filter(Boolean)
      const newMediumIds = []
      
      for (const type of extractedTypes) {
        const mediumId = mediumMap.get(type.toLowerCase())
        if (mediumId && (overwrite || !currentMediumIds.includes(mediumId))) {
          newMediumIds.push({ 
            _key: `medium-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            _type: 'reference', 
            _ref: mediumId 
          })
        }
      }
      
      if (newMediumIds.length > 0) {
        const existingMediums = overwrite ? [] : (art.medium || []).map(m => ({
          _key: m._key || `medium-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          _type: 'reference',
          _ref: m._id
        }))
        updates.medium = [...existingMediums, ...newMediumIds]
        hasUpdates = true
        if (processed <= 5) console.log(`🎨 ${art._id}: ${overwrite ? 'Overwrite' : 'Add'} types ${extractedTypes.join(', ')}`)
      }
    }

    // 4. Extract and set materials
    const extractedMaterials = extractMaterials(caption)
    if (extractedMaterials.length > 0) {
      const currentMaterialIds = (art.materials || []).map(m => m._id).filter(Boolean)
      const newMaterialIds = []
      
      for (const material of extractedMaterials) {
        const materialId = materialMap.get(material.toLowerCase())
        if (materialId && (overwrite || !currentMaterialIds.includes(materialId))) {
          newMaterialIds.push({ 
            _key: `material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            _type: 'reference', 
            _ref: materialId 
          })
        }
      }
      
      if (newMaterialIds.length > 0) {
        const existingMaterials = overwrite ? [] : (art.materials || []).map(m => ({
          _key: m._key || `material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          _type: 'reference',
          _ref: m._id
        }))
        updates.materials = [...existingMaterials, ...newMaterialIds]
        hasUpdates = true
        if (processed <= 5) console.log(`🧪 ${art._id}: ${overwrite ? 'Overwrite' : 'Add'} materials ${extractedMaterials.join(', ')}`)
      }
    }

    // 5. Extract and set finishes
    const extractedFinishes = extractFinishes(caption)
    if (extractedFinishes.length > 0) {
      const currentFinishIds = (art.finishes || []).map(f => f._id).filter(Boolean)
      const newFinishIds = []
      
      for (const finish of extractedFinishes) {
        const finishId = finishMap.get(finish.toLowerCase())
        if (finishId && (overwrite || !currentFinishIds.includes(finishId))) {
          newFinishIds.push({ 
            _key: `finish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            _type: 'reference', 
            _ref: finishId 
          })
        }
      }
      
      if (newFinishIds.length > 0) {
        const existingFinishes = overwrite ? [] : (art.finishes || []).map(f => ({
          _key: f._key || `finish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          _type: 'reference',
          _ref: f._id
        }))
        updates.finishes = [...existingFinishes, ...newFinishIds]
        hasUpdates = true
        if (processed <= 5) console.log(`✨ ${art._id}: ${overwrite ? 'Overwrite' : 'Add'} finishes ${extractedFinishes.join(', ')}`)
      }
    }

    // 6. Create alt texts from captions - ALT TEXT = DESCRIPTION (strip HTML tags and translation notes)
    const image = art.mainImage || art.images?.[0]
    // Check if image exists (don't require asset to exist - alt text can be set without asset)
    if (image) {
      // Strip HTML tags and remove translation notes like [Intestine]
      let altTextEN = (captionEN || '').replace(/<[^>]+>/g, '').trim()
      let altTextDE = (captionDE || '').replace(/<[^>]+>/g, '').trim()
      
      // Remove translation notes in square brackets: [Intestine], [Translation], etc.
      altTextEN = altTextEN.replace(/\s*\[[^\]]+\]\s*/g, ' ').trim()
      altTextDE = altTextDE.replace(/\s*\[[^\]]+\]\s*/g, ' ').trim()
      
      // Normalize whitespace (remove double spaces)
      altTextEN = altTextEN.replace(/\s+/g, ' ').trim()
      altTextDE = altTextDE.replace(/\s+/g, ' ').trim()
      
      // Remove trailing periods and spaces
      altTextEN = altTextEN.replace(/\.\s*$/, '').trim()
      altTextDE = altTextDE.replace(/\.\s*$/, '').trim()
      
      const currentAltEn = image.alt?.en || ''
      const currentAltDe = image.alt?.de || ''
      
      // ALWAYS overwrite alt text with description when --overwrite flag is set
      if (overwrite || altTextEN !== currentAltEn || altTextDE !== currentAltDe) {
        if (processed <= 5) {
          console.log(`🔍 DEBUG: Alt text check for ${art._id}:`)
          console.log(`   Current EN: "${currentAltEn}"`)
          console.log(`   New EN: "${altTextEN}"`)
          console.log(`   Current DE: "${currentAltDe}"`)
          console.log(`   New DE: "${altTextDE}"`)
          console.log(`   Overwrite flag: ${overwrite}`)
        }
        
        // Only update alt field, preserve asset reference
        if (art.mainImage) {
          updates['mainImage.alt'] = {
            ...(art.mainImage.alt || {}),
            ...(altTextEN ? { en: altTextEN } : {}),
            ...(altTextDE ? { de: altTextDE } : {})
          }
          hasUpdates = true
          if (processed <= 5) console.log(`🖼️  ${art._id}: ${overwrite ? 'Overwrite' : 'Set'} alt text EN: "${altTextEN}" DE: "${altTextDE}"`)
        } else if (art.images?.[0]) {
          updates['images[0].alt'] = {
            ...(art.images[0].alt || {}),
            ...(altTextEN ? { en: altTextEN } : {}),
            ...(altTextDE ? { de: altTextDE } : {})
          }
          hasUpdates = true
          if (processed <= 5) console.log(`🖼️  ${art._id}: ${overwrite ? 'Overwrite' : 'Set'} alt text EN: "${altTextEN}" DE: "${altTextDE}"`)
        } else if (processed <= 5) {
          console.log(`⚠️  ${art._id}: No mainImage or images[0] found`)
        }
      } else if (processed <= 5) {
        console.log(`⏭️  ${art._id}: Alt text unchanged, skipping`)
      }
    } else if (processed <= 5) {
      console.log(`⏭️  ${art._id}: No image found`)
    }

    if (hasUpdates && doApply) {
      try {
        let patch = client.patch(art._id)
        Object.keys(updates).forEach(key => {
          patch = patch.set({ [key]: updates[key] })
        })
        await patch.commit()
        updated++
        if (processed <= 5) console.log(`✅ ${art._id}: Updated "${artworkName}"`)
      } catch (error) {
        console.error(`❌ ${art._id}: Failed to update - ${error.message}`)
      }
    } else if (hasUpdates && !doApply) {
      updated++
      if (processed <= 10) {
        console.log(`🔎 Would update ${art._id}: "${artworkName}"`)
        console.log(`   Updates: ${Object.keys(updates).join(', ')}`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  if (doApply) {
    console.log(`✅ Processing complete!`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total processed: ${artworks.length}`)
  } else {
    console.log(`🧪 Dry run complete`)
    console.log(`   Would update: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`\n💡 Run with --apply to execute updates`)
  }
}

main().catch(err => {
  console.error('❌ Script failed:', err.message)
  console.error(err.stack)
  process.exit(1)
})

