// sanity-cms/scripts/debug-materials.js
import {createClient} from 'sanity'

// Ensure you have your project ID and dataset configured
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false, // `false` if you want to ensure fresh data
  apiVersion: '2023-01-01',
});

async function getMaterials() {
  try {
    const materials = await client.fetch('*[_type == "material"]{_id, name}');
    console.log('--- Material Data ---');
    console.log(JSON.stringify(materials, null, 2));
    console.log('---------------------');
    if (materials.every(m => !m.name)) {
      console.log('CONCLUSION: All material documents are missing a `name`. This is the root cause.');
    } else {
      const problematic = materials.filter(m => !m.name);
      console.log(`CONCLUSION: Found ${problematic.length} materials with a missing name.`);
    }
  } catch (error) {
    console.error('Error fetching materials:', error);
  }
}

getMaterials(); 