import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2023-01-01'
})

// Category mappings based on Art Aurea website
const creatorCategoryMappings = {
  // Lighting
  'ATARA design / Heike Stuckstedde': 'category-lighting',
  'Ulrike Maeder': 'category-lighting',
  'Jutta Müntefering': 'category-lighting',
  'Neo/Craft': 'category-lighting',
  
  // Ceramic Art
  'Ute Kathrin Beck': 'category-ceramic-art',
  'Thomas Bohle': 'category-ceramic-art',
  'Hans Coper': 'category-ceramic-art',
  'Pippin Drysdale': 'category-ceramic-art',
  'Eiden – Porzellan': 'category-ceramic-art',
  'Emil Heger': 'category-ceramic-art',
  'Kap Sun Hwang': 'category-ceramic-art',
  'Angelika Jansen': 'category-ceramic-art',
  'Isezaki Jun': 'category-ceramic-art',
  'Si-Sook Kang': 'category-ceramic-art',
  'Deok Ho Kim': 'category-ceramic-art',
  'Sung Chul Kim': 'category-ceramic-art',
  'Lut Laleman': 'category-ceramic-art',
  'In Hwa Lee': 'category-ceramic-art',
  'Jeong Won Lee': 'category-ceramic-art',
  'Minsoo Lee': 'category-ceramic-art',
  'Morten Lobner Espersen': 'category-ceramic-art',
  'Sonngard Marcks': 'category-ceramic-art',
  'Johannes Nagel': 'category-ceramic-art',
  'Barbara Nanning': 'category-ceramic-art',
  'Aino Nebel': 'category-ceramic-art',
  'neyuQ ceramics / Quyen Mac': 'category-ceramic-art',
  
  // Art Jewelry
  'Friedrich Becker': 'category-art-jewelry',
  'Bodyfurnitures': 'category-art-jewelry',
  'Patrizia Bonati': 'category-art-jewelry',
  'Sarah Cossham': 'category-art-jewelry',
  'Martina Dempf': 'category-art-jewelry',
  'Georg Dobler': 'category-art-jewelry',
  'Babette von Dohnanyi': 'category-art-jewelry',
  'Martina Ege': 'category-art-jewelry',
  'Beate Eismann': 'category-art-jewelry',
  'Susanne Elstner': 'category-art-jewelry',
  'Felicia Mülbaier': 'category-art-jewelry',
  'Mirjam Hiller': 'category-art-jewelry',
  'Anne Ute Kaden': 'category-art-jewelry',
  'Dominique Labordery': 'category-art-jewelry',
  'Ria Lins': 'category-art-jewelry',
  'Gigi Mariani': 'category-art-jewelry',
  'Iris Merkle': 'category-art-jewelry',
  
  // Design Jewelry
  'Sofia Beilharz': 'category-design-jewelry',
  'Uli Biskup': 'category-design-jewelry',
  'Dorothea Brill': 'category-design-jewelry',
  'Beate Brinkmann': 'category-design-jewelry',
  'Carl Dau': 'category-design-jewelry',
  'Emquies-Holstein': 'category-design-jewelry',
  'Sophia Epp': 'category-design-jewelry',
  'Pura Ferreiro': 'category-design-jewelry',
  'Fine Light': 'category-design-jewelry',
  'Fingerglück': 'category-design-jewelry',
  'Tanja Friedrichs': 'category-design-jewelry',
  'Stefanie Frye': 'category-design-jewelry',
  'Bettina Geistlich': 'category-design-jewelry',
  'Achim Gersmann': 'category-design-jewelry',
  'Goldmiss Design': 'category-design-jewelry',
  'Batho Gündra': 'category-design-jewelry',
  'Corinna Heller': 'category-design-jewelry',
  'Kerstin Henke': 'category-design-jewelry',
  'Henrich & Denzel': 'category-design-jewelry',
  'Leen Heyne': 'category-design-jewelry',
  'Claudia Hoppe': 'category-design-jewelry',
  'Angela Huebel': 'category-design-jewelry',
  'Susanna Kuschek': 'category-design-jewelry',
  'Annette Lechler': 'category-design-jewelry',
  'Lehmann & Schmedding': 'category-design-jewelry',
  'Hanne Bay Luehrssen': 'category-design-jewelry',
  'Manu Schmuck': 'category-design-jewelry',
  'Claudia Milić': 'category-design-jewelry',
  'Sabine Müller': 'category-design-jewelry',
  'Julia Münzing, Schmuque': 'category-design-jewelry',
  'Niessing': 'category-design-jewelry',
  'Erich Zimmermann': 'category-design-jewelry',
  
  // Textile | Accessories
  'Benjamin Bigot': 'category-textile-accessories',
  'burggrafburggraf': 'category-textile-accessories',
  'Simon Freund': 'category-textile-accessories',
  'Anke Hennig': 'category-textile-accessories',
  'Ulrike Isensee': 'category-textile-accessories',
  'Silke Janssen': 'category-textile-accessories',
  'Kristiina Karinen': 'category-textile-accessories',
  
  // Rugs | Interior Textiles
  'Bosna Quilt Werkstatt': 'category-rugs-interior-textiles',
  "'Comme il faut' floorcloth(e)s": 'category-rugs-interior-textiles',
  'Kristiina Lassus': 'category-rugs-interior-textiles',
  'Lyk Carpet': 'category-rugs-interior-textiles',
  
  // Woodwork | Paper
  'Friedemann Buehler': 'category-woodwork-paper',
  'Hirsch – Woodenheart': 'category-woodwork-paper',
  'Robert Korsikowski': 'category-woodwork-paper',
  'Christof Lungwitz': 'category-woodwork-paper',
  
  // Studio Glass
  'Robert Comploj': 'category-studio-glass',
  'Bernard Heesen': 'category-studio-glass',
  'Tomáš Hlavička': 'category-studio-glass',
  'Sabine Lintzen': 'category-studio-glass',
  'Massimo Micheluzzi': 'category-studio-glass',
  'Ritsue Mishima': 'category-studio-glass',
  'Eva Moosbrugger': 'category-studio-glass',
  
  // Metal Art
  'Anne Fischer': 'category-metal-art',
  'Koichi Io': 'category-metal-art',
  'JaKyung Shin': 'category-metal-art',
  'Ulla & Martin Kaufmann': 'category-metal-art',
  'Dong-Hyun Kim': 'category-metal-art',
  'Josephine Lützel': 'category-metal-art',
  
  // Furniture | Objects
  'Formfeld': 'category-furniture-objects',
  'Eric Mertens': 'category-furniture-objects',
  'Felix Mueller': 'category-furniture-objects',
  
  // Diverse Design Objects
  'Mille Fiabe': 'category-diverse-design-objects'
}

async function updateCreatorsWithCategories() {
  console.log('Starting to update creators with categories...')
  
  try {
    // Get all creators
    const creators = await client.fetch(`*[_type == "creator"]`)
    console.log(`Found ${creators.length} creators`)
    
    for (const creator of creators) {
      const categoryId = creatorCategoryMappings[creator.name]
      
      if (categoryId) {
        try {
          await client
            .patch(creator._id)
            .set({
              category: {
                _type: 'reference',
                _ref: categoryId
              }
            })
            .commit()
          
          console.log(`✓ Updated ${creator.name} with category ${categoryId}`)
        } catch (error) {
          console.error(`✗ Error updating ${creator.name}:`, error.message)
        }
      } else {
        console.log(`⚠ No category mapping found for: ${creator.name}`)
      }
    }
    
    console.log('Finished updating creators!')
  } catch (error) {
    console.error('Error:', error)
  }
}

updateCreatorsWithCategories() 