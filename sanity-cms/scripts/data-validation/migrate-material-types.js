import { sanityClient } from '../../sanity-client.js'

const MATERIAL_TYPE_MAPPINGS = {
  'metals': {
    en: 'Metals',
    de: 'Metalle',
    description: {
      en: 'Precious and base metals used in jewelry and metalwork',
      de: 'Edle und unedele Metalle für Schmuck und Metallarbeit'
    },
    sortOrder: 10
  },
  'stones': {
    en: 'Stones & Minerals',
    de: 'Steine & Mineralien',
    description: {
      en: 'Gemstones, crystals, and natural minerals',
      de: 'Edelsteine, Kristalle und natürliche Mineralien'
    },
    sortOrder: 20
  },
  'organic': {
    en: 'Organic',
    de: 'Organisch',
    description: {
      en: 'Natural materials from plants and animals',
      de: 'Natürliche Materialien von Pflanzen und Tieren'
    },
    sortOrder: 30
  },
  'ceramics': {
    en: 'Ceramics & Glass',
    de: 'Keramik & Glas',
    description: {
      en: 'Fired clay, porcelain, and glass materials',
      de: 'Gebrannter Ton, Porzellan und Glasmaterialien'
    },
    sortOrder: 40
  },
  'textiles': {
    en: 'Textiles',
    de: 'Textilien',
    description: {
      en: 'Fabrics, fibers, and woven materials',
      de: 'Stoffe, Fasern und gewebte Materialien'
    },
    sortOrder: 50
  },
  'synthetic': {
    en: 'Synthetic',
    de: 'Synthetisch',
    description: {
      en: 'Man-made materials and plastics',
      de: 'Künstliche Materialien und Kunststoffe'
    },
    sortOrder: 60
  },
  'treatments': {
    en: 'Treatments',
    de: 'Behandlungen',
    description: {
      en: 'Surface treatments and finishes',
      de: 'Oberflächenbehandlungen und Finishes'
    },
    sortOrder: 70
  },
  'other': {
    en: 'Other',
    de: 'Andere',
    description: {
      en: 'Miscellaneous materials',
      de: 'Sonstige Materialien'
    },
    sortOrder: 80
  }
}

// Smart material type detection based on material names
const SMART_MATERIAL_MAPPINGS = {
  // Metals
  'gold': 'metals',
  'silver': 'metals',
  'brass': 'metals',
  'bronze': 'metals',
  'copper': 'metals',
  'steel': 'metals',
  'platinum': 'metals',
  'rhodium-plated': 'metals',
  'oxidized': 'treatments',
  
  // Stones & Minerals
  'diamond': 'stones',
  'crystal': 'stones',
  'labradorite': 'stones',
  'stone': 'stones',
  'zirconia': 'stones',
  'pearl': 'stones',
  'coral': 'stones',
  
  // Organic
  'wood': 'organic',
  'oak': 'organic',
  'leather': 'organic',
  'cordovan leather': 'organic',
  'cotton': 'textiles',
  'silk': 'textiles',
  'wool': 'textiles',
  'yarn': 'textiles',
  'paper': 'organic',
  
  // Ceramics & Glass
  'ceramic': 'ceramics',
  'clay': 'ceramics',
  'porcelain': 'ceramics',
  'glass': 'ceramics',
  'enamel': 'ceramics',
  
  // Synthetic
  'plastic': 'synthetic',
  'resin': 'synthetic',
  'acrylic': 'synthetic',
  
  // Treatments
  'lacquer': 'treatments'
}

async function migrateMaterialTypes() {
  console.log('🔄 Starting material type migration...')
  
  try {
    // Step 1: Create material type documents
    console.log('\n📝 Creating material type documents...')
    const materialTypeDocuments = []
    
    for (const [key, config] of Object.entries(MATERIAL_TYPE_MAPPINGS)) {
      const materialTypeDoc = {
        _type: 'materialType',
        _id: `materialType-${key}`,
        name: {
          en: config.en,
          de: config.de
        },
        description: config.description,
        sortOrder: config.sortOrder,
        slug: {
          _type: 'slug',
          current: key
        }
      }
      
      materialTypeDocuments.push(materialTypeDoc)
      console.log(`  ✅ Created: ${config.en} (${config.de})`)
    }
    
    // Create all material type documents
    for (const doc of materialTypeDocuments) {
      await sanityClient.createOrReplace(doc)
    }
    console.log(`\n✅ Created ${materialTypeDocuments.length} material type documents`)
    
    // Step 2: Get all materials and update their material types
    console.log('\n🔍 Fetching materials to update...')
    const materials = await sanityClient.fetch(`
      *[_type == "material"] {
        _id,
        name,
        materialType,
        slug
      }
    `)
    
    console.log(`📋 Found ${materials.length} materials to update`)
    
    // Step 3: Update materials with proper material type references
    console.log('\n🔄 Updating materials with material type references...')
    const updates = []
    
    for (const material of materials) {
      const materialNameEn = material.name?.en?.toLowerCase() || ''
      const materialSlug = material.slug?.current?.toLowerCase() || ''
      
      // Try to find the best material type match
      let bestType = 'other' // default fallback
      
      // First try exact slug match
      if (SMART_MATERIAL_MAPPINGS[materialSlug]) {
        bestType = SMART_MATERIAL_MAPPINGS[materialSlug]
      } 
      // Then try name match
      else if (SMART_MATERIAL_MAPPINGS[materialNameEn]) {
        bestType = SMART_MATERIAL_MAPPINGS[materialNameEn]
      }
      // Finally try partial matches
      else {
        for (const [materialName, type] of Object.entries(SMART_MATERIAL_MAPPINGS)) {
          if (materialNameEn.includes(materialName) || materialSlug.includes(materialName)) {
            bestType = type
            break
          }
        }
      }
      
      const materialTypeRef = {
        _type: 'reference',
        _ref: `materialType-${bestType}`
      }
      
      updates.push({
        id: material._id,
        patch: {
          materialType: materialTypeRef
        }
      })
      
      console.log(`  📌 ${material.name?.en || 'Unknown'} → ${MATERIAL_TYPE_MAPPINGS[bestType].en}`)
    }
    
    // Apply all updates
    const transaction = sanityClient.transaction()
    updates.forEach(update => {
      transaction.patch(update.id, update.patch)
    })
    
    await transaction.commit()
    
    console.log(`\n✅ Updated ${updates.length} materials with material type references`)
    
    // Step 4: Verify the migration
    console.log('\n🔍 Verifying migration...')
    const updatedMaterials = await sanityClient.fetch(`
      *[_type == "material"] {
        _id,
        name,
        "materialTypeName": materialType->name.en,
        "materialTypeSlug": materialType->slug.current
      }
    `)
    
    console.log('\n📊 Migration results:')
    const typeCount = {}
    updatedMaterials.forEach(material => {
      const typeName = material.materialTypeName || 'No type'
      typeCount[typeName] = (typeCount[typeName] || 0) + 1
    })
    
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} materials`)
    })
    
    console.log('\n🎉 Material type migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

migrateMaterialTypes() 