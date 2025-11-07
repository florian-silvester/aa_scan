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

function findTypos(text) {
  if (!text || typeof text !== 'string') return []
  
  const issues = []
  
  // Common typos and issues
  const patterns = [
    { pattern: /\s{2,}/g, issue: 'Multiple consecutive spaces' },
    { pattern: /\s+\./g, issue: 'Space before period' },
    { pattern: /\s+,/g, issue: 'Space before comma' },
    { pattern: /\(\s+/g, issue: 'Space after opening parenthesis' },
    { pattern: /\s+\)/g, issue: 'Space before closing parenthesis' },
    { pattern: /[a-z]\.[A-Z]/g, issue: 'Missing space after period' },
    { pattern: /,,/g, issue: 'Double comma' },
    { pattern: /\.\./g, issue: 'Double period' },
    { pattern: /\s+$/g, issue: 'Trailing whitespace' },
    { pattern: /^\s+/g, issue: 'Leading whitespace' },
    { pattern: /<\/?\w+[^>]*>/g, issue: 'HTML tags (should only be <em>)' },
    { pattern: /\n/g, issue: 'Line breaks' },
    { pattern: /\t/g, issue: 'Tab characters' },
  ]
  
  for (const { pattern, issue } of patterns) {
    // Skip <em> tags check
    if (issue === 'HTML tags (should only be <em>)') {
      const nonEmTags = text.match(/<(?!\/?(em)>)\/?[a-zA-Z][^>]*>/g)
      if (nonEmTags) {
        issues.push(`${issue}: ${nonEmTags.join(', ')}`)
      }
      continue
    }
    
    if (pattern.test(text)) {
      issues.push(issue)
    }
  }
  
  return issues
}

async function main() {
  console.log('🔍 Running comprehensive artwork audit...\n')
  
  // Fetch all artworks
  const artworks = await client.fetch(`
    *[_type == "artwork"] | order(name) {
      _id,
      name,
      "slug": slug.current,
      "workTitleEn": workTitle.en,
      "workTitleDe": workTitle.de,
      "descEn": description.en,
      "descDe": description.de,
      "altEn": mainImage.alt.en,
      "altDe": mainImage.alt.de,
      "hasImage": defined(mainImage.asset._ref),
      "hasCategory": defined(category._ref),
      "hasMedium": defined(medium) && length(medium) > 0,
      "hasMaterials": defined(materials) && length(materials) > 0,
      "hasFinishes": defined(finishes) && length(finishes) > 0,
      "hasYear": defined(year),
      year,
      size,
      "artistName": creator->name,
      "hasArtist": defined(creator._ref)
    }
  `)
  
  console.log(`📊 Analyzing ${artworks.length} artworks...\n`)
  
  const issues = {
    duplicateSlugs: [],
    duplicateNames: [],
    missingInfo: [],
    typos: [],
    suspiciousContent: []
  }
  
  // 1. Check for duplicate slugs
  const slugMap = new Map()
  artworks.forEach(art => {
    if (art.slug) {
      if (!slugMap.has(art.slug)) {
        slugMap.set(art.slug, [])
      }
      slugMap.get(art.slug).push(art)
    }
  })
  
  slugMap.forEach((arts, slug) => {
    if (arts.length > 1) {
      issues.duplicateSlugs.push({
        slug,
        artworks: arts.map(a => ({ id: a._id, name: a.name }))
      })
    }
  })
  
  // 2. Check for duplicate names
  const nameMap = new Map()
  artworks.forEach(art => {
    if (art.name) {
      if (!nameMap.has(art.name)) {
        nameMap.set(art.name, [])
      }
      nameMap.get(art.name).push(art)
    }
  })
  
  nameMap.forEach((arts, name) => {
    if (arts.length > 1) {
      issues.duplicateNames.push({
        name,
        count: arts.length,
        artworks: arts.map(a => ({ id: a._id, slug: a.slug }))
      })
    }
  })
  
  // 3. Check for missing required info
  artworks.forEach(art => {
    const missing = []
    
    if (!art.hasImage) missing.push('image')
    if (!art.hasArtist) missing.push('artist')
    if (!art.hasCategory) missing.push('category')
    if (!art.hasMedium) missing.push('medium/type')
    if (!art.hasMaterials) missing.push('materials')
    if (!art.hasYear) missing.push('year')
    if (!art.workTitleEn) missing.push('work title EN')
    if (!art.workTitleDe) missing.push('work title DE')
    if (!art.descEn) missing.push('description EN')
    if (!art.descDe) missing.push('description DE')
    if (!art.slug) missing.push('slug')
    
    if (missing.length > 0) {
      issues.missingInfo.push({
        name: art.name,
        id: art._id,
        missing
      })
    }
  })
  
  // 4. Check for typos and formatting issues
  artworks.forEach(art => {
    const checks = [
      { field: 'Work Title EN', text: art.workTitleEn },
      { field: 'Work Title DE', text: art.workTitleDe },
      { field: 'Description EN', text: art.descEn },
      { field: 'Description DE', text: art.descDe },
      { field: 'Alt Text EN', text: art.altEn },
      { field: 'Alt Text DE', text: art.altDe },
      { field: 'Size', text: art.size }
    ]
    
    checks.forEach(({ field, text }) => {
      const foundIssues = findTypos(text)
      if (foundIssues.length > 0) {
        issues.typos.push({
          name: art.name,
          id: art._id,
          field,
          issues: foundIssues
        })
      }
    })
  })
  
  // 5. Check for suspicious content
  artworks.forEach(art => {
    const suspicious = []
    
    // Check for years in titles (should have been removed)
    if (art.workTitleEn?.match(/,?\s*\d{4}$/)) {
      suspicious.push('Year in English title')
    }
    if (art.workTitleDe?.match(/,?\s*\d{4}$/)) {
      suspicious.push('Year in German title')
    }
    
    // Check for very short descriptions
    if (art.descEn && art.descEn.length < 10) {
      suspicious.push('Very short English description')
    }
    if (art.descDe && art.descDe.length < 10) {
      suspicious.push('Very short German description')
    }
    
    // Check for mismatched language content
    if (art.descEn && art.descEn === art.descDe) {
      suspicious.push('English and German descriptions are identical')
    }
    
    // Check for placeholder text
    if (art.name?.includes('_Untitled') || art.workTitleEn?.toLowerCase() === 'untitled') {
      suspicious.push('Has "Untitled" as title')
    }
    
    // Check slug issues
    if (art.slug && art.slug.includes('--')) {
      suspicious.push('Slug has double dashes')
    }
    if (art.slug && art.slug.match(/^-|-$/)) {
      suspicious.push('Slug starts or ends with dash')
    }
    
    // Check for size format issues
    if (art.size && art.size.match(/^[,\s]/)) {
      suspicious.push('Size starts with comma or space')
    }
    
    if (suspicious.length > 0) {
      issues.suspiciousContent.push({
        name: art.name,
        id: art._id,
        issues: suspicious
      })
    }
  })
  
  // Print results
  console.log('=' .repeat(80))
  console.log('AUDIT RESULTS')
  console.log('=' .repeat(80))
  console.log('')
  
  // Duplicate Slugs
  if (issues.duplicateSlugs.length > 0) {
    console.log(`❌ DUPLICATE SLUGS: ${issues.duplicateSlugs.length}`)
    console.log('')
    issues.duplicateSlugs.slice(0, 10).forEach(issue => {
      console.log(`  Slug: "${issue.slug}"`)
      issue.artworks.forEach(art => {
        console.log(`    - ${art.name}`)
      })
      console.log('')
    })
    if (issues.duplicateSlugs.length > 10) {
      console.log(`  ... and ${issues.duplicateSlugs.length - 10} more\n`)
    }
  } else {
    console.log('✅ NO DUPLICATE SLUGS\n')
  }
  
  // Duplicate Names
  if (issues.duplicateNames.length > 0) {
    console.log(`⚠️  DUPLICATE NAMES: ${issues.duplicateNames.length}`)
    console.log('')
    issues.duplicateNames.slice(0, 10).forEach(issue => {
      console.log(`  Name: "${issue.name}" (${issue.count} artworks)`)
    })
    if (issues.duplicateNames.length > 10) {
      console.log(`  ... and ${issues.duplicateNames.length - 10} more`)
    }
    console.log('')
  } else {
    console.log('✅ NO DUPLICATE NAMES\n')
  }
  
  // Missing Info
  if (issues.missingInfo.length > 0) {
    console.log(`⚠️  MISSING REQUIRED INFO: ${issues.missingInfo.length} artworks`)
    console.log('')
    
    // Group by what's missing
    const missingGroups = new Map()
    issues.missingInfo.forEach(issue => {
      issue.missing.forEach(field => {
        if (!missingGroups.has(field)) {
          missingGroups.set(field, 0)
        }
        missingGroups.set(field, missingGroups.get(field) + 1)
      })
    })
    
    console.log('  Summary by field:')
    Array.from(missingGroups.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([field, count]) => {
        console.log(`    ${field}: ${count} artworks`)
      })
    console.log('')
    
    console.log('  Examples:')
    issues.missingInfo.slice(0, 5).forEach(issue => {
      console.log(`    ${issue.name}`)
      console.log(`      Missing: ${issue.missing.join(', ')}`)
    })
    if (issues.missingInfo.length > 5) {
      console.log(`    ... and ${issues.missingInfo.length - 5} more`)
    }
    console.log('')
  } else {
    console.log('✅ NO MISSING REQUIRED INFO\n')
  }
  
  // Typos
  if (issues.typos.length > 0) {
    console.log(`⚠️  FORMATTING/TYPO ISSUES: ${issues.typos.length} instances`)
    console.log('')
    
    // Group by issue type
    const typoGroups = new Map()
    issues.typos.forEach(issue => {
      issue.issues.forEach(typo => {
        if (!typoGroups.has(typo)) {
          typoGroups.set(typo, 0)
        }
        typoGroups.set(typo, typoGroups.get(typo) + 1)
      })
    })
    
    console.log('  Summary by type:')
    Array.from(typoGroups.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([typo, count]) => {
        console.log(`    ${typo}: ${count}`)
      })
    console.log('')
    
    console.log('  Examples:')
    issues.typos.slice(0, 5).forEach(issue => {
      console.log(`    ${issue.name} - ${issue.field}`)
      console.log(`      Issues: ${issue.issues.join(', ')}`)
    })
    if (issues.typos.length > 5) {
      console.log(`    ... and ${issues.typos.length - 5} more`)
    }
    console.log('')
  } else {
    console.log('✅ NO TYPOS OR FORMATTING ISSUES\n')
  }
  
  // Suspicious Content
  if (issues.suspiciousContent.length > 0) {
    console.log(`⚠️  SUSPICIOUS CONTENT: ${issues.suspiciousContent.length} artworks`)
    console.log('')
    
    // Group by issue type
    const suspiciousGroups = new Map()
    issues.suspiciousContent.forEach(issue => {
      issue.issues.forEach(susp => {
        if (!suspiciousGroups.has(susp)) {
          suspiciousGroups.set(susp, 0)
        }
        suspiciousGroups.set(susp, suspiciousGroups.get(susp) + 1)
      })
    })
    
    console.log('  Summary by type:')
    Array.from(suspiciousGroups.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([susp, count]) => {
        console.log(`    ${susp}: ${count}`)
      })
    console.log('')
    
    console.log('  Examples:')
    issues.suspiciousContent.slice(0, 5).forEach(issue => {
      console.log(`    ${issue.name}`)
      console.log(`      Issues: ${issue.issues.join(', ')}`)
    })
    if (issues.suspiciousContent.length > 5) {
      console.log(`    ... and ${issues.suspiciousContent.length - 5} more`)
    }
    console.log('')
  } else {
    console.log('✅ NO SUSPICIOUS CONTENT\n')
  }
  
  console.log('=' .repeat(80))
  console.log('SUMMARY')
  console.log('=' .repeat(80))
  console.log(`Total artworks analyzed: ${artworks.length}`)
  console.log(`Duplicate slugs: ${issues.duplicateSlugs.length}`)
  console.log(`Duplicate names: ${issues.duplicateNames.length}`)
  console.log(`Missing required info: ${issues.missingInfo.length}`)
  console.log(`Formatting/typo issues: ${issues.typos.length}`)
  console.log(`Suspicious content: ${issues.suspiciousContent.length}`)
  console.log('')
}

main().catch(console.error)

