import client from '../sanity-client.js';

async function checkStoneData() {
  console.log('🔍 Checking Stone material data...');
  
  // Find Stone material
  const stone = await client.fetch(`*[_type == "material" && title.en == "Stone"][0] {
    _id,
    title
  }`);
  
  console.log('Stone material:', JSON.stringify(stone, null, 2));
  
  // Also check materials with "stone" in any case
  const stoneVariants = await client.fetch(`*[_type == "material" && (title.en match "*stone*" || title.en match "*Stone*")][0...5] {
    _id,
    title
  }`);
  
  console.log('\nStone variants:', JSON.stringify(stoneVariants, null, 2));
}

checkStoneData().catch(console.error); 