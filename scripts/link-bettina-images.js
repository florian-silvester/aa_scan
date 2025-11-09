import sanityClient from '../sanity-cms/sanity-client.js';

// Manual mappings based on artwork names and image filenames
const mappings = [
  {
    artworkId: 'hEWOpVV05Nk2Wkv6vKs74n', // Yedris
    imageId: 'image-3d0fdfaddcd5b48fbd25e6a24b90f99735dbf7e7-1920x1260-jpg', // 1243_bettina-geistlich-ring-yedris-3.jpg
    artworkName: 'Yedris'
  },
  {
    artworkId: 'hEWOpVV05Nk2Wkv6vKs799', // Velvel
    imageId: 'image-0296c4e7dec70f4f7a6439cac7c94cafa184f7f2-1920x1260-jpg', // 1239_bettina-geistlich-ring-velvel-3.jpg
    artworkName: 'Velvel'
  },
  {
    artworkId: 'hEWOpVV05Nk2Wkv6vKs7DV', // Trema
    imageId: 'image-1527a7d6a9f336a339c13a56e9659569192fe0c1-1920x1260-jpg', // 1233_bettina-geistlich-armreif-trema-3.jpg
    artworkName: 'Trema'
  },
  {
    artworkId: 'hEWOpVV05Nk2Wkv6vKs7Hr', // Circulus
    imageId: 'image-721e6f56d8d9c17fadf2e8d16f9cbd6ecd4a8256-1920x1260-jpg', // 1235_bettina-geistlich-ring-circulus-3.jpg
    artworkName: 'Circulus'
  }
];

async function linkImages() {
  console.log('🔗 Linking Bettina Geistlich artwork images...\n');
  
  for (const mapping of mappings) {
    try {
      const patch = {
        mainImage: {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: mapping.imageId
          },
          alt: {
            en: mapping.artworkName,
            de: mapping.artworkName
          }
        }
      };
      
      await sanityClient.patch(mapping.artworkId).set(patch).commit();
      console.log(`✅ Linked ${mapping.artworkName} to its image`);
    } catch (error) {
      console.error(`❌ Failed to link ${mapping.artworkName}:`, error.message);
    }
  }
  
  console.log('\n✅ Done!');
}

linkImages();

