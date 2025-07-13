import sanityClient from '../sanity-client.js';

// Define material types and their associated materials
const materialTypes = [
  {
    name: { en: 'Metals', de: 'Metalle' },
    description: { 
      en: 'Precious and non-precious metals used in jewelry and art',
      de: 'Edle und unedle Metalle für Schmuck und Kunst' 
    },
    sortOrder: 1,
    materials: ['silver', 'gold', 'copper', 'bronze', 'steel', 'platinum', 'aluminum', 'brass', 'iron', 'palladium', 'titanium', 'alloy', 'metal']
  },
  {
    name: { en: 'Stones & Minerals', de: 'Steine & Mineralien' },
    description: { 
      en: 'Natural stones, crystals, and mineral materials',
      de: 'Natürliche Steine, Kristalle und Mineralien' 
    },
    sortOrder: 2,
    materials: ['diamond', 'crystal', 'quartz', 'turquoise', 'stone', 'opal', 'amber', 'ruby', 'garnet', 'onyx', 'jade', 'saphir', 'limestone', 'granite', 'sandstone', 'concrete']
  },
  {
    name: { en: 'Organic Materials', de: 'Organische Materialien' },
    description: { 
      en: 'Natural materials from plants and animals',
      de: 'Natürliche Materialien von Pflanzen und Tieren' 
    },
    sortOrder: 3,
    materials: ['wood', 'oak', 'walnut', 'maple', 'pine', 'ebony', 'birch', 'bamboo', 'bone', 'ivory', 'shell', 'coral', 'pearl', 'cork', 'leather']
  },
  {
    name: { en: 'Ceramics & Clay', de: 'Keramik & Ton' },
    description: { 
      en: 'Fired clay materials and ceramic products',
      de: 'Gebrannte Tonmaterialien und Keramikprodukte' 
    },
    sortOrder: 4,
    materials: ['ceramic', 'porcelain', 'clay', 'enamel']
  },
  {
    name: { en: 'Glass & Crystal', de: 'Glas & Kristall' },
    description: { 
      en: 'All types of glass and crystal materials',
      de: 'Alle Arten von Glas und Kristallmaterialien' 
    },
    sortOrder: 5,
    materials: ['glass']
  },
  {
    name: { en: 'Textiles & Fibers', de: 'Textilien & Fasern' },
    description: { 
      en: 'Natural and synthetic textile materials',
      de: 'Natürliche und synthetische Textilmaterialien' 
    },
    sortOrder: 6,
    materials: ['silk', 'wool', 'cotton', 'linen', 'merino', 'cashmere', 'velvet', 'felt', 'alpaca']
  },
  {
    name: { en: 'Paper & Cardboard', de: 'Papier & Pappe' },
    description: { 
      en: 'Paper-based materials for art and crafts',
      de: 'Papierbasierte Materialien für Kunst und Handwerk' 
    },
    sortOrder: 7,
    materials: ['paper']
  },
  {
    name: { en: 'Synthetic Materials', de: 'Synthetische Materialien' },
    description: { 
      en: 'Man-made plastics, resins, and synthetic materials',
      de: 'Künstliche Kunststoffe, Harze und synthetische Materialien' 
    },
    sortOrder: 8,
    materials: ['plastic', 'resin', 'rubber', 'acrylic']
  },
  {
    name: { en: 'Pigments & Coatings', de: 'Pigmente & Beschichtungen' },
    description: { 
      en: 'Coloring materials and surface treatments',
      de: 'Farbstoffe und Oberflächenbehandlungen' 
    },
    sortOrder: 9,
    materials: ['pigment', 'paint', 'lacquer', 'wax', 'plaster']
  },
  {
    name: { en: 'Other Materials', de: 'Andere Materialien' },
    description: { 
      en: 'Miscellaneous materials that don\'t fit other categories',
      de: 'Verschiedene Materialien, die nicht in andere Kategorien passen' 
    },
    sortOrder: 10,
    materials: ['sand', 'wire', 'charcoal', 'chain', 'graphite', 'earth']
  }
];

// Create slug from name
function createSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createMaterialTypesAndOrganize() {
  console.log('🔄 Creating material types and organizing materials...');
  
  try {
    // Create material types
    const createdTypes = {};
    
    for (const typeData of materialTypes) {
      const doc = {
        _type: 'materialType',
        name: typeData.name,
        description: typeData.description,
        sortOrder: typeData.sortOrder,
        slug: {
          current: createSlug(typeData.name.en)
        }
      };
      
      const result = await sanityClient.create(doc);
      createdTypes[typeData.name.en] = result._id;
      console.log(`✅ Created material type: ${typeData.name.en} (${typeData.name.de})`);
    }
    
    // Get all materials
    const materials = await sanityClient.fetch('*[_type == "material"]');
    
    // Organize materials by type
    console.log('\n📦 Organizing materials by type...');
    for (const material of materials) {
      const materialName = material.name.en.toLowerCase();
      
      // Find which type this material belongs to
      const matchingType = materialTypes.find(type => 
        type.materials.includes(materialName)
      );
      
      if (matchingType) {
        const typeId = createdTypes[matchingType.name.en];
        
        await sanityClient.patch(material._id).set({
          materialType: { _ref: typeId }
        }).commit();
        
        console.log(`✅ Assigned ${material.name.en} to ${matchingType.name.en}`);
      } else {
        console.log(`⚠️  No type found for material: ${material.name.en}`);
      }
    }
    
    console.log('\n🎉 Material types created and materials organized!');
    console.log(`📊 Summary:`);
    console.log(`   Material Types: ${materialTypes.length}`);
    console.log(`   Materials organized: ${materials.length}`);
    
  } catch (error) {
    console.error('❌ Error creating material types:', error);
  }
}

// Run the creation
createMaterialTypesAndOrganize(); 