import {createClient} from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

class MaterialDiscovery {
  
  // Extract potential material words from text
  extractMaterialWords(text) {
    if (!text) return []
    
    const words = text
      .toLowerCase()
      .replace(/[^\w\säöüß-]/g, ' ') // Keep German characters
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter short words
      .filter(word => !this.isCommonWord(word)) // Filter common words
    
    return words
  }
  
  // Filter out common non-material words
  isCommonWord(word) {
    const commonWords = [
      // English common words
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were',
      'art', 'fair', 'exhibition', 'gallery', 'artist', 'design', 'show', 'work',
      'new', 'contemporary', 'modern', 'current', 'more', 'many', 'all', 'some',
      'read', 'see', 'look', 'view', 'photo', 'image', 'picture', 'color', 'bright',
      
      // German common words  
      'der', 'die', 'das', 'und', 'mit', 'von', 'für', 'aus', 'ist', 'eine', 'ein',
      'kunst', 'ausstellung', 'galerie', 'künstler', 'design', 'arbeiten', 'werk',
      'neue', 'aktuellen', 'mehr', 'viele', 'alle', 'einige', 'lesen', 'sehen',
      'foto', 'bild', 'farbe', 'hell', 'dunkel', 'groß', 'klein', 'schön',
      
      // Places & Names
      'berlin', 'amsterdam', 'düsseldorf', 'münchen', 'hamburg', 'köln',
      'germany', 'deutschland', 'netherlands', 'holland',
      
      // Years & Numbers
      '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'
    ]
    
    return commonWords.includes(word) || /^\d+$/.test(word)
  }
  
  // Check if a word might be a material
  isPotentialMaterial(word) {
    // Known material patterns
    const materialPatterns = [
      // Metal endings
      /silber|silver|gold|stahl|steel|eisen|iron|kupfer|copper|messing|brass/,
      // Material suffixes  
      /holz|wood|glas|glass|stein|stone|keramik|ceramic/,
      // Jewelry materials
      /perle|pearl|diamant|diamond|smaragd|emerald|rubin|ruby/,
      // Textures/treatments
      /oxidized|patina|matt|poliert|polished|geschliffen|cut/,
      // Fabric/textiles
      /stoff|fabric|textil|textile|leder|leather|seide|silk/
    ]
    
    return materialPatterns.some(pattern => pattern.test(word))
  }
}

async function discoverMaterials() {
  console.log('🔍 Discovering materials from all media assets...\n')
  
  try {
    // Get ALL image assets with any metadata
    const assets = await client.fetch(`
      *[_type == "sanity.imageAsset" && (
        defined(title) || 
        defined(altText) || 
        defined(description) ||
        defined(originalFilename)
      )]{
        _id,
        originalFilename,
        title,
        altText,
        description
      }
    `)
    
    console.log(`📊 Analyzing ${assets.length} media assets for materials...\n`)
    
    const discovery = new MaterialDiscovery()
    const materialCounts = new Map()
    const potentialMaterials = new Set()
    const allWords = new Set()
    
    // Process each asset
    assets.forEach((asset, index) => {
      if (index % 50 === 0) {
        console.log(`Processing asset ${index + 1}/${assets.length}...`)
      }
      
      // Combine all text from this asset
      const allText = [asset.title, asset.altText, asset.description, asset.originalFilename]
        .filter(Boolean)
        .join(' ')
      
      if (allText) {
        const words = discovery.extractMaterialWords(allText)
        
        words.forEach(word => {
          allWords.add(word)
          
          // Count frequency
          materialCounts.set(word, (materialCounts.get(word) || 0) + 1)
          
          // Check if it might be a material
          if (discovery.isPotentialMaterial(word)) {
            potentialMaterials.add(word)
          }
        })
      }
    })
    
    console.log(`\n📈 Analysis Complete!`)
    console.log(`- Total unique words found: ${allWords.size}`)
    console.log(`- Potential materials identified: ${potentialMaterials.size}`)
    
    // Sort by frequency
    const sortedMaterials = Array.from(materialCounts.entries())
      .sort((a, b) => b[1] - a[1])
    
    console.log(`\n🎯 TOP 50 MOST FREQUENT WORDS:`)
    console.log(`(These might include materials, artist names, and other terms)\n`)
    
    sortedMaterials.slice(0, 50).forEach(([word, count], index) => {
      const isPotential = potentialMaterials.has(word) ? '🔧' : '  '
      console.log(`${isPotential} ${(index + 1).toString().padStart(2)}: ${word.padEnd(20)} (${count}x)`)
    })
    
    console.log(`\n💎 IDENTIFIED POTENTIAL MATERIALS:`)
    console.log(`(Words that match known material patterns)\n`)
    
    const potentialSorted = Array.from(potentialMaterials)
      .map(word => [word, materialCounts.get(word) || 0])
      .sort((a, b) => b[1] - a[1])
    
    potentialSorted.forEach(([word, count], index) => {
      console.log(`🔧 ${(index + 1).toString().padStart(2)}: ${word.padEnd(20)} (${count}x)`)
    })
    
    console.log(`\n🔍 RARE WORDS (might be specific materials):`)
    console.log(`(Words mentioned 2-5 times - often specific materials)\n`)
    
    const rareWords = sortedMaterials
      .filter(([word, count]) => count >= 2 && count <= 5)
      .slice(0, 30)
    
    rareWords.forEach(([word, count], index) => {
      const isPotential = potentialMaterials.has(word) ? '🔧' : '❓'
      console.log(`${isPotential} ${word.padEnd(20)} (${count}x)`)
    })
    
    return {
      allWords: Array.from(allWords),
      potentialMaterials: Array.from(potentialMaterials),
      materialCounts: Object.fromEntries(materialCounts),
      topMaterials: sortedMaterials.slice(0, 100)
    }
    
  } catch (error) {
    console.error('❌ Error during discovery:', error.message)
    throw error
  }
}

async function analyzeSpecificAssets() {
  console.log('🔬 Detailed analysis of assets with rich material information...\n')
  
  try {
    // Get assets that likely contain material info
    const assets = await client.fetch(`
      *[_type == "sanity.imageAsset" && (
        title match "*silver*" ||
        title match "*gold*" ||
        title match "*steel*" ||
        title match "*ceramic*" ||
        altText match "*material*" ||
        description match "*material*"
      )][0...10]{
        _id,
        originalFilename,
        title,
        altText,
        description
      }
    `)
    
    console.log(`Found ${assets.length} assets with likely material references:`)
    
    assets.forEach((asset, index) => {
      console.log(`\n--- Asset ${index + 1}: ${asset.originalFilename} ---`)
      console.log(`Title: ${asset.title || 'None'}`)
      console.log(`Alt: ${asset.altText || 'None'}`)
      console.log(`Description: ${asset.description || 'None'}`)
    })
    
  } catch (error) {
    console.error('❌ Error analyzing specific assets:', error.message)
  }
}

async function main() {
  try {
    const command = process.argv[2]
    
    switch (command) {
      case 'specific':
        await analyzeSpecificAssets()
        break
      case 'discover':
      default:
        await discoverMaterials()
    }
    
  } catch (error) {
    console.error('💥 Discovery failed:', error.message)
    process.exit(1)
  }
}

main() 