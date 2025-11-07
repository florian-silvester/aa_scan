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

async function fixDuplicateNames() {
  console.log('🔧 Fixing duplicate artwork names\n')
  
  const argv = process.argv.slice(2)
  const doApply = argv.includes('--apply')
  
  console.log(`Mode: ${doApply ? 'APPLY' : 'DRY-RUN'}\n`)
  
  const duplicates = await client.fetch(`
    *[_type == "artwork" && name in ["Ute Kathrin Beck_Sissi", "Ute Kathrin Beck_Glanz und Glimmer", "Sarah Cossham_Darm"]] | order(name, _createdAt) {
      _id,
      name,
      year,
      "descEn": description.en,
      "descDe": description.de,
      slug
    }
  `)
  
  // Group by name
  const grouped = {}
  duplicates.forEach(art => {
    if (!grouped[art.name]) grouped[art.name] = []
    grouped[art.name].push(art)
  })
  
  const updates = []
  
  Object.keys(grouped).forEach(name => {
    const arts = grouped[name]
    if (arts.length <= 1) return
    
    console.log(`\n${name} (${arts.length} duplicates):`)
    
    arts.forEach((art, index) => {
      let newName = name
      
      // Extract unique identifier from description
      const desc = art.descEn || art.descDe || ''
      
      if (name === 'Sarah Cossham_Darm') {
        // Extract type (Brooch/Necklace)
        if (desc.includes('Brooch') || desc.includes('Brosche')) {
          newName = 'Sarah Cossham_Darm (Brooch)'
        } else if (desc.includes('Necklace') || desc.includes('Kette')) {
          if (desc.includes('pink')) {
            newName = 'Sarah Cossham_Darm (Necklace, pink)'
          } else {
            newName = `Sarah Cossham_Darm (Necklace ${index + 1})`
          }
        }
      } else if (name === 'Ute Kathrin Beck_Sissi') {
        // Extract type (vase/can) and dimensions
        if (desc.includes('can') || desc.includes('Dose')) {
          newName = 'Ute Kathrin Beck_Sissi (Can)'
        } else if (desc.includes('h 22 cm') || desc.includes('H 22 cm')) {
          newName = 'Ute Kathrin Beck_Sissi (Vase, h 22 cm)'
        } else if (desc.includes('h 25cm') || desc.includes('H 25cm')) {
          newName = 'Ute Kathrin Beck_Sissi (Vase, h 25 cm)'
        }
      } else if (name === 'Ute Kathrin Beck_Glanz und Glimmer') {
        // Different years or descriptions
        if (art.year === 2018) {
          if (desc.includes('Gefäße') || desc.includes('vessels')) {
            newName = 'Ute Kathrin Beck_Glanz und Glimmer (2018, vessels)'
          } else if (desc.includes('Gefäß') || desc.includes('vessel')) {
            newName = 'Ute Kathrin Beck_Glanz und Glimmer (2018, vessel)'
          } else {
            newName = 'Ute Kathrin Beck_Glanz und Glimmer (2018)'
          }
        } else if (art.year === 2019 || desc.includes('2019')) {
          if (desc.includes('cooperation') || desc.includes('Kooperation')) {
            newName = 'Ute Kathrin Beck_Glanz und Glimmer (2019, cooperation)'
          } else if (desc.includes('Deckelgefäße') || desc.includes('Deckel')) {
            newName = 'Ute Kathrin Beck_Glanz und Glimmer (2019, Deckelgefäße)'
          } else {
            newName = 'Ute Kathrin Beck_Glanz und Glimmer (2019)'
          }
        } else {
          newName = `Ute Kathrin Beck_Glanz und Glimmer (${index + 1})`
        }
      }
      
      if (newName !== name) {
        console.log(`  ${art._id.slice(-6)}: "${name}" → "${newName}"`)
        updates.push({ _id: art._id, newName })
      } else {
        console.log(`  ${art._id.slice(-6)}: Keep as "${name}"`)
      }
    })
  })
  
  if (doApply && updates.length > 0) {
    console.log(`\n✅ Applying ${updates.length} renames...`)
    for (const update of updates) {
      try {
        await client.patch(update._id).set({ name: update.newName }).commit()
        console.log(`  ✅ ${update._id.slice(-6)}: "${update.newName}"`)
      } catch (error) {
        console.error(`  ❌ ${update._id.slice(-6)}: ${error.message}`)
      }
    }
  } else if (updates.length > 0) {
    console.log(`\n🔎 Would rename ${updates.length} artworks`)
  }
}

fixDuplicateNames().catch(console.error)

