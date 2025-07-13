import { sanityClient } from '../../sanity-client.js'
import fs from 'fs'
import path from 'path'

async function backupMaterials() {
  console.log('🔍 Backing up current materials data...')
  
  try {
    // Get all materials
    const materials = await sanityClient.fetch(`
      *[_type == "material"] | order(name.en asc) {
        _id,
        _type,
        name,
        slug,
        materialType,
        description,
        _createdAt,
        _updatedAt
      }
    `)
    
    console.log(`📋 Found ${materials.length} materials`)
    
    // Create backup file
    const backupData = {
      timestamp: new Date().toISOString(),
      count: materials.length,
      materials: materials
    }
    
    const backupPath = path.join(process.cwd(), 'scripts/data-validation/materials-backup.json')
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2))
    
    console.log(`💾 Backup saved to: ${backupPath}`)
    
    // Show summary
    const materialsByType = materials.reduce((acc, material) => {
      const type = material.materialType || 'unspecified'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
    
    console.log('\n📊 Materials by type:')
    Object.entries(materialsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    
    console.log('\n🔤 Sample materials:')
    materials.slice(0, 10).forEach(material => {
      const nameEn = material.name?.en || 'No English name'
      const nameDe = material.name?.de || 'No German name'
      const type = material.materialType || 'No type'
      console.log(`  - ${nameEn} (${nameDe}) - Type: ${type}`)
    })
    
    if (materials.length > 10) {
      console.log(`  ... and ${materials.length - 10} more`)
    }
    
  } catch (error) {
    console.error('❌ Error backing up materials:', error)
  }
}

backupMaterials() 