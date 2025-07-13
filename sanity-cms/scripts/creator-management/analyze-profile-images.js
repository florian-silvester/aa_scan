import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

// Artist profiles from artaurea.com/profiles
const artistProfiles = [
  // A
  { name: 'ATARA design / Heike Stuckstedde', location: 'Austria, Vienna', category: 'Lighting' },
  { name: 'Ute Kathrin Beck', location: 'Germany, Stuttgart', category: 'Ceramic Art' },
  { name: 'Friedrich Becker', location: 'Germany, Düsseldorf', category: 'Art Jewelry' },
  { name: 'Sofia Beilharz', location: 'Germany, Düsseldorf', category: 'Design Jewelry' },
  { name: 'Benjamin Bigot', location: 'Germany, Karlsruhe', category: 'Textile | Accessories' },
  { name: 'Uli Biskup', location: 'Germany, Düsseldorf', category: 'Design Jewelry' },
  { name: 'Bodyfurnitures', location: 'Italy, Bolzano', category: 'Art Jewelry' },
  { name: 'Thomas Bohle', location: 'Austria, Dornbirn', category: 'Ceramic Art' },
  { name: 'Patrizia Bonati', location: 'Italy, Cremona', category: 'Art Jewelry' },
  { name: 'Bosna Quilt Werkstatt', location: 'Austria, Bregenz', category: 'Rugs | Interior Textiles' },
  { name: 'Dorothea Brill', location: 'Germany, Berlin', category: 'Design Jewelry' },
  { name: 'Beate Brinkmann', location: 'Germany, Berlin', category: 'Design Jewelry' },
  { name: 'Friedemann Buehler', location: 'Germany, Langenburg', category: 'Woodwork | Paper' },
  { name: 'burggrafburggraf', location: 'Germany, Stuttgart', category: 'Textile | Accessories' },
  
  // C
  { name: 'Comme il faut floorcloth(e)s', location: 'Germany, Cologne', category: 'Rugs | Interior Textiles' },
  { name: 'Robert Comploj', location: 'Austria, Traun', category: 'Studio Glass' },
  { name: 'Hans Coper', location: 'Great Britain', category: 'Ceramic Art' },
  { name: 'Sarah Cossham', location: 'Germany, Munich', category: 'Art Jewelry' },
  
  // D
  { name: 'Carl Dau', location: 'Germany, Berlin', category: 'Design Jewelry' },
  { name: 'Martina Dempf', location: 'Germany, Berlin', category: 'Art Jewelry' },
  { name: 'Georg Dobler', location: 'Germany, Bayreuth', category: 'Art Jewelry' },
  { name: 'Babette von Dohnanyi', location: 'Germany, Hamburg', category: 'Art Jewelry' },
  { name: 'Pippin Drysdale', location: 'Australia, Fremantle', category: 'Ceramic Art' },
  
  // E
  { name: 'Martina Ege', location: 'Germany, Baltringen', category: 'Art Jewelry' },
  { name: 'Eiden – Porzellan', location: 'Germany, Ulm', category: 'Ceramic Art' },
  { name: 'Beate Eismann', location: 'Germany, Halle (Saale)', category: 'Art Jewelry' },
  { name: 'Susanne Elstner', location: 'Germany, Gräfelfing', category: 'Art Jewelry' },
  { name: 'Emquies-Holstein', location: 'Denmark, Copenhagen', category: 'Design Jewelry' },
  { name: 'Sophia Epp', location: 'Germany, Bernried', category: 'Design Jewelry' },
  
  // F
  { name: 'Felicia Mülbaier', location: 'Germany', category: 'Art Jewelry' },
  { name: 'Pura Ferreiro', location: 'Germany, Munich', category: 'Design Jewelry' },
  { name: 'Fine Light', location: 'USA, Los Angeles, Austria, Vienna', category: 'Design Jewelry' },
  { name: 'Fingerglück', location: 'Germany, Stuttgart', category: 'Design Jewelry' },
  { name: 'Anne Fischer', location: 'Germany, Nürnberg', category: 'Metal Art' },
  { name: 'Formfeld', location: 'Germany, Munich', category: 'Furniture | Objects' },
  { name: 'Simon Freund', location: 'Germany, Berlin', category: 'Textile | Accessories' },
  { name: 'Tanja Friedrichs', location: 'Germany, Duisburg', category: 'Design Jewelry' },
  { name: 'Stefanie Frye', location: 'Germany, Neuwied', category: 'Design Jewelry' },
  
  // G
  { name: 'Bettina Geistlich', location: 'Switzerland, Lucerne', category: 'Design Jewelry' },
  { name: 'Achim Gersmann', location: 'Germany, Bamberg', category: 'Design Jewelry' },
  { name: 'Goldmiss Design', location: 'Germany', category: 'Design Jewelry' },
  { name: 'Batho Gündra', location: 'Germany, Worms', category: 'Design Jewelry' },
  
  // H
  { name: 'Bernard Heesen', location: 'Netherlands, Acquoy', category: 'Studio Glass' },
  { name: 'Emil Heger', location: 'Germany, Höhr-Grenzhausen', category: 'Ceramic Art' },
  { name: 'Corinna Heller', location: 'Germany, Schwäbisch Gmünd', category: 'Design Jewelry' },
  { name: 'Kerstin Henke', location: 'Germany, Stuttgart', category: 'Design Jewelry' },
  { name: 'Anke Hennig', location: 'Germany, Dresden', category: 'Textile | Accessories' },
  { name: 'Henrich & Denzel', location: 'Germany, Radolfzell', category: 'Design Jewelry' },
  { name: 'Leen Heyne', location: 'Netherlands, Tilburg', category: 'Design Jewelry' },
  { name: 'Mirjam Hiller', location: 'Germany, Potsdam', category: 'Art Jewelry' },
  { name: 'Hirsch – Woodenheart', location: 'Germany, Bruchsal', category: 'Woodwork | Paper' },
  { name: 'Tomáš Hlavička', location: 'Czech Republic, Prague', category: 'Studio Glass' },
  { name: 'Claudia Hoppe', location: 'Germany, Düsseldorf', category: 'Design Jewelry' },
  { name: 'Angela Huebel', location: 'Germany, Munich', category: 'Design Jewelry' },
  { name: 'Kap Sun Hwang', location: 'Germany, Kellinghusen', category: 'Ceramic Art' },
  
  // Add more profiles as needed - this is a subset for demonstration
  { name: 'Adam Stoffel', location: 'Germany', category: 'Design Jewelry' },
  { name: 'Eva Maisch', location: 'Germany', category: 'Various' },
  { name: 'Erich Zimmermann', location: 'Germany, Augsburg', category: 'Design Jewelry' },
]

// Helper function to normalize names for matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Collapse multiple hyphens
    .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
}

// Helper function to extract possible artist names from filename
function extractArtistFromFilename(filename) {
  const normalized = filename.toLowerCase()
  
  // Common patterns in your uploaded files
  const patterns = [
    // Direct artist name patterns
    /^([a-z-]+)-([a-z-]+)[-_]/,           // firstname-lastname-
    /^([a-z-]+)[-_]([a-z-]+)[-_]/,        // firstname_lastname_
    /\/([a-z-]+)-([a-z-]+)[-_]/,          // /firstname-lastname-
    
    // Portrait patterns
    /([a-z-]+)[-_]portrait/,              // artistname_portrait
    /portrait[-_]([a-z-]+)/,              // portrait_artistname
    
    // Studio patterns
    /([a-z-]+)[-_]studio/,                // artistname_studio
    /studio[-_]([a-z-]+)/,                // studio_artistname
  ]
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) {
      // Return the captured groups joined with hyphen
      return match.slice(1).filter(Boolean).join('-')
    }
  }
  
  return null
}

async function analyzeProfileImages() {
  console.log('🎨 ANALYZING IMAGES LINKED TO ARTIST PROFILES\n')
  
  try {
    // Get all media assets
    const mediaAssets = await client.fetch(`
      *[_type == "sanity.imageAsset"]{
        _id,
        originalFilename,
        title,
        url,
        size
      } | order(originalFilename)
    `)
    
    console.log(`📊 Total media assets: ${mediaAssets.length}`)
    
    // Create normalized lookup for artist profiles
    const profileLookup = new Map()
    artistProfiles.forEach(profile => {
      const normalized = normalizeName(profile.name)
      profileLookup.set(normalized, profile)
      
      // Also add variations (first name, last name, etc.)
      const parts = profile.name.split(/[\s\/&]+/)
      parts.forEach(part => {
        if (part.length > 2) {
          const normalizedPart = normalizeName(part)
          if (!profileLookup.has(normalizedPart)) {
            profileLookup.set(normalizedPart, profile)
          }
        }
      })
    })
    
    console.log(`👥 Artist profiles loaded: ${artistProfiles.length}`)
    console.log(`🔍 Name variations created: ${profileLookup.size}`)
    console.log('')
    
    // Analyze each media asset
    const results = {
      profileLinked: [],
      possibleMatches: [],
      unlinked: [],
      byCategory: {}
    }
    
    for (const media of mediaAssets) {
      const filename = media.originalFilename || media.title || ''
      const extractedName = extractArtistFromFilename(filename)
      
      let matchedProfile = null
      
      // Direct filename matching
      if (extractedName) {
        matchedProfile = profileLookup.get(extractedName)
      }
      
      // If no direct match, try partial matching
      if (!matchedProfile) {
        for (const [key, profile] of profileLookup) {
          if (filename.toLowerCase().includes(key) && key.length > 3) {
            matchedProfile = profile
            break
          }
        }
      }
      
      if (matchedProfile) {
        results.profileLinked.push({
          media,
          profile: matchedProfile,
          extractedName,
          confidence: extractedName ? 'high' : 'medium'
        })
        
        // Track by category
        if (!results.byCategory[matchedProfile.category]) {
          results.byCategory[matchedProfile.category] = []
        }
        results.byCategory[matchedProfile.category].push({media, profile: matchedProfile})
        
      } else if (extractedName) {
        results.possibleMatches.push({
          media,
          extractedName,
          confidence: 'low'
        })
      } else {
        results.unlinked.push(media)
      }
    }
    
    // Display results
    console.log('📈 ANALYSIS RESULTS:')
    console.log(`✅ Profile-linked images: ${results.profileLinked.length}`)
    console.log(`🤔 Possible artist matches: ${results.possibleMatches.length}`)
    console.log(`❓ Unlinked images: ${results.unlinked.length}`)
    console.log('')
    
    console.log('📊 BY CATEGORY:')
    Object.entries(results.byCategory)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([category, items]) => {
        console.log(`  ${category}: ${items.length} images`)
      })
    console.log('')
    
    console.log('👥 TOP ARTISTS BY IMAGE COUNT:')
    const artistCounts = {}
    results.profileLinked.forEach(({profile}) => {
      artistCounts[profile.name] = (artistCounts[profile.name] || 0) + 1
    })
    
    Object.entries(artistCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([artist, count]) => {
        console.log(`  ${artist}: ${count} images`)
      })
    
    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: mediaAssets.length,
        profileLinked: results.profileLinked.length,
        possibleMatches: results.possibleMatches.length,
        unlinked: results.unlinked.length,
        byCategory: Object.fromEntries(
          Object.entries(results.byCategory).map(([cat, items]) => [cat, items.length])
        ),
        topArtists: Object.entries(artistCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20)
          .map(([name, count]) => ({name, count}))
      },
      profileLinkedImages: results.profileLinked.map(({media, profile, confidence}) => ({
        filename: media.originalFilename,
        title: media.title,
        artistName: profile.name,
        category: profile.category,
        location: profile.location,
        confidence,
        imageId: media._id
      })),
      possibleMatches: results.possibleMatches.map(({media, extractedName}) => ({
        filename: media.originalFilename,
        title: media.title,
        extractedName,
        imageId: media._id
      }))
    }
    
    // Save report
    const fs = await import('fs')
    const reportPath = `profile-images-analysis-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
    
    console.log(`\n💾 Detailed report saved: ${reportPath}`)
    
    return results
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

analyzeProfileImages() 