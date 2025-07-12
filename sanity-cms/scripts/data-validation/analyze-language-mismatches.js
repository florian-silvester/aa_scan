import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN
})

// Language detection patterns
const englishIndicators = [
  'ring', 'rings', 'necklace', 'necklaces', 'bracelet', 'bracelets', 
  'earrings', 'pendant', 'pendants', 'platinum', 'gold', 'silver',
  'diamonds', 'diamond', 'custom-made', 'handmade', 'piece', 'pieces',
  'jewelry', 'jewellery', 'design', 'collection', 'limited', 'edition',
  'unique', 'crafted', 'polished', 'finished', 'contemporary', 'modern',
  'vintage', 'classic', 'elegant', 'sophisticated', 'luxury', 'fine',
  'chain', 'chains', 'stone', 'stones', 'gem', 'gems', 'carat', 'carats',
  'watch', 'watches', 'brooch', 'brooches', 'cufflinks', 'the', 'and',
  'with', 'from', 'made', 'using', 'featuring', 'created', 'designed'
]

const germanIndicators = [
  'ring', 'ringe', 'halskette', 'halsketten', 'armband', 'armbänder',
  'ohrringe', 'anhänger', 'platin', 'gold', 'silber', 'diamant', 'diamanten',
  'maßgefertigt', 'handgefertigt', 'schmuck', 'schmuckstück', 'kollektion',
  'limitiert', 'auflage', 'einzigartig', 'gefertigt', 'poliert', 'zeitgenössisch',
  'modern', 'vintage', 'klassisch', 'elegant', 'luxus', 'fein', 'kette',
  'ketten', 'stein', 'steine', 'edelstein', 'edelsteine', 'karat',
  'uhr', 'uhren', 'brosche', 'broschen', 'manschettenknöpfe', 'der', 'die',
  'das', 'und', 'mit', 'aus', 'hergestellt', 'verwendet', 'erstellt', 'entworfen',
  'für', 'von', 'zu', 'ist', 'sind', 'wurde', 'wurden', 'einem', 'einer', 'eines'
]

function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'unknown'
  
  const lowerText = text.toLowerCase()
  
  // Remove HTML tags for analysis
  const cleanText = text.replace(/<[^>]*>/g, ' ').toLowerCase()
  
  let englishScore = 0
  let germanScore = 0
  
  // Count English indicators
  englishIndicators.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = cleanText.match(regex)
    if (matches) englishScore += matches.length
  })
  
  // Count German indicators
  germanIndicators.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = cleanText.match(regex)
    if (matches) germanScore += matches.length
  })
  
  // Additional German-specific patterns
  if (cleanText.match(/\b(der|die|das|ein|eine|einen|einem|einer|eines)\b/g)) {
    germanScore += 3
  }
  
  // Additional English-specific patterns
  if (cleanText.match(/\b(the|a|an|of|in|on|at|to|for|with|by)\b/g)) {
    englishScore += 2
  }
  
  if (englishScore > germanScore && englishScore > 0) return 'english'
  if (germanScore > englishScore && germanScore > 0) return 'german'
  
  return 'neutral'
}

async function analyzeLanguageMismatches() {
  console.log('🔍 Analyzing all artwork descriptions for language mismatches...\n')
  
  const artworks = await client.fetch(`
    *[_type == "artwork" && defined(description)] {
      _id, name, creator->{name}, description
    }
  `)
  
  console.log(`📊 Analyzing ${artworks.length} artworks...\n`)
  
  let report = []
  let mismatches = 0
  let identical = 0
  let suspicious = 0
  
  artworks.forEach(art => {
    const desc = art.description
    if (!desc) return
    
    const enText = desc.en?.trim()
    const deText = desc.de?.trim()
    
    if (!enText || !deText) return
    
    // Check for identical text (suspicious)
    if (enText === deText) {
      identical++
      report.push({
        type: 'IDENTICAL',
        id: art._id,
        creator: art.creator?.name || 'Unknown',
        name: art.name || 'Untitled',
        enText: enText.substring(0, 100),
        deText: deText.substring(0, 100),
        issue: 'English and German text are identical'
      })
      return
    }
    
    // Detect languages
    const enLanguage = detectLanguage(enText)
    const deLanguage = detectLanguage(deText)
    
    // Check for mismatches
    if (enLanguage === 'german' || deLanguage === 'english') {
      mismatches++
      let issue = []
      if (enLanguage === 'german') issue.push('German text in English field')
      if (deLanguage === 'english') issue.push('English text in German field')
      
      report.push({
        type: 'MISMATCH',
        id: art._id,
        creator: art.creator?.name || 'Unknown',
        name: art.name || 'Untitled',
        enText: enText.substring(0, 100),
        deText: deText.substring(0, 100),
        enLanguage,
        deLanguage,
        issue: issue.join(', ')
      })
    }
    
    // Check for suspicious patterns
    if (enLanguage === 'neutral' && deLanguage === 'neutral') {
      const similarity = calculateSimilarity(enText, deText)
      if (similarity > 0.8) {
        suspicious++
        report.push({
          type: 'SUSPICIOUS',
          id: art._id,
          creator: art.creator?.name || 'Unknown',
          name: art.name || 'Untitled',
          enText: enText.substring(0, 100),
          deText: deText.substring(0, 100),
          issue: `Texts are ${Math.round(similarity * 100)}% similar - possibly copied`
        })
      }
    }
  })
  
  // Generate human-readable report
  console.log('📋 LANGUAGE MISMATCH ANALYSIS REPORT')
  console.log('=====================================\n')
  
  console.log(`📊 SUMMARY:`)
  console.log(`Total artworks analyzed: ${artworks.length}`)
  console.log(`🚨 Identical texts: ${identical}`)
  console.log(`🔄 Language mismatches: ${mismatches}`)
  console.log(`❓ Suspicious similarities: ${suspicious}`)
  console.log(`\n`)
  
  // Sort by type for better readability
  const sortedReport = report.sort((a, b) => {
    const typeOrder = { 'IDENTICAL': 1, 'MISMATCH': 2, 'SUSPICIOUS': 3 }
    return typeOrder[a.type] - typeOrder[b.type]
  })
  
  // Write detailed report to file
  let reportText = `LANGUAGE MISMATCH ANALYSIS REPORT\n`
  reportText += `Generated: ${new Date().toISOString()}\n`
  reportText += `==============================================\n\n`
  
  reportText += `SUMMARY:\n`
  reportText += `Total artworks analyzed: ${artworks.length}\n`
  reportText += `Identical texts: ${identical}\n`
  reportText += `Language mismatches: ${mismatches}\n`
  reportText += `Suspicious similarities: ${suspicious}\n\n`
  
  if (sortedReport.length === 0) {
    console.log('✅ No language mismatches found!')
    reportText += 'No language mismatches found!\n'
  } else {
    sortedReport.forEach((item, index) => {
      console.log(`${index + 1}. [${item.type}] ${item.creator} - ${item.name}`)
      console.log(`   ID: ${item.id}`)
      console.log(`   Issue: ${item.issue}`)
      console.log(`   EN: "${item.enText}${item.enText.length > 100 ? '...' : ''}"`)
      console.log(`   DE: "${item.deText}${item.deText.length > 100 ? '...' : ''}"`)
      if (item.enLanguage) console.log(`   Detected: EN=${item.enLanguage}, DE=${item.deLanguage}`)
      console.log('')
      
      reportText += `${index + 1}. [${item.type}] ${item.creator} - ${item.name}\n`
      reportText += `   ID: ${item.id}\n`
      reportText += `   Issue: ${item.issue}\n`
      reportText += `   EN: "${item.enText}${item.enText.length > 100 ? '...' : ''}"\n`
      reportText += `   DE: "${item.deText}${item.deText.length > 100 ? '...' : ''}"\n`
      if (item.enLanguage) reportText += `   Detected: EN=${item.enLanguage}, DE=${item.deLanguage}\n`
      reportText += `\n`
    })
  }
  
  // Save report to file
  fs.writeFileSync('language-mismatch-report.txt', reportText)
  console.log(`\n📄 Full report saved to: language-mismatch-report.txt`)
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0
  
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1, str2) {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

analyzeLanguageMismatches() 