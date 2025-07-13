import client from '../sanity-client.js';

async function checkRawStructure() {
  console.log('🔍 Checking raw material structure...');
  
  // Get first few materials with ALL fields
  const materials = await client.fetch(`*[_type == "material"][0...3]`);
  
  console.log(`Found ${materials.length} materials:`);
  
  materials.forEach((material, index) => {
    console.log(`\n${index + 1}. Material ${material._id}:`);
    console.log(JSON.stringify(material, null, 2));
  });
}

checkRawStructure().catch(console.error); 