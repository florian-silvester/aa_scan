import client from '../sanity-client.js';

async function checkAllMaterials() {
  console.log('🔍 Checking all materials...');
  
  // Get all materials
  const materials = await client.fetch(`*[_type == "material"] {
    _id,
    title
  } | order(title.en asc)`);
  
  console.log(`Found ${materials.length} materials:`);
  
  materials.forEach((material, index) => {
    console.log(`${index + 1}. EN: "${material.title?.en || 'N/A'}" | DE: "${material.title?.de || 'N/A'}" | ID: ${material._id}`);
  });
  
  // Check if any material contains "stone" in lowercase
  const stoneMatches = materials.filter(m => 
    m.title?.en?.toLowerCase().includes('stone') || 
    m.title?.de?.toLowerCase().includes('stein')
  );
  
  console.log('\nMaterials containing "stone/stein":');
  stoneMatches.forEach(material => {
    console.log(`- EN: "${material.title?.en || 'N/A'}" | DE: "${material.title?.de || 'N/A'}"`);
  });
}

checkAllMaterials().catch(console.error); 