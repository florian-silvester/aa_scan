import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.bak' });

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;

async function checkNeyuq() {
  let allItems = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const response = await fetch(`https://api.webflow.com/v2/collections/68c6785963cdfa79c3a138ab/items?limit=${limit}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    allItems.push(...data.items);
    
    if (data.items.length < limit) break;
    offset += limit;
  }
  
  console.log(`\nTotal creators: ${allItems.length}`);
  const neyuq = allItems.find(item => item.fieldData.name === 'neyuQ ceramics');
  
  if (neyuq) {
    console.log('\n📋 neyuQ in Webflow:\n');
    console.log('creator-materials:', neyuq.fieldData['creator-materials'] || '[]');
    console.log('creator-finishes:', neyuq.fieldData['creator-finishes'] || '[]');
    console.log('creator-medium-types:', neyuq.fieldData['creator-medium-types'] || '[]');
  } else {
    console.log('❌ neyuQ not found in any page');
    console.log('Sample names:', allItems.slice(0, 5).map(i => i.fieldData.name));
  }
}

checkNeyuq().catch(console.error);

