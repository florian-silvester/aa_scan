// sanity-cms/scripts/debug-materials.cjs
const sanityClient = require('@sanity/client');

const client = sanityClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
});

async function getMaterials() {
  try {
    const materials = await client.fetch('*[_type == "material"]{_id, name}');
    console.log('--- Material Data ---');
    console.log(JSON.stringify(materials, null, 2));
    console.log('---------------------');
  } catch (error) {
    console.error('Error fetching materials:', error);
  }
}

getMaterials(); 