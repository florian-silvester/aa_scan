import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.bak' });

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID;

async function webflowRequest(path) {
  const response = await fetch(`https://api.webflow.com/v2${path}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Webflow API error ${response.status}: ${error}`);
  }
  return response.json();
}

async function checkWebflowCollections() {
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
  
  console.log('📋 WEBFLOW COLLECTIONS:\n');
  
  const relevantCollections = ['material', 'finish', 'medium', 'creator', 'type'];
  const collectionList = collections.collections || [];
  
  for (const col of collectionList) {
    const slug = col.slug?.toLowerCase() || '';
    const name = col.displayName?.toLowerCase() || '';
    if (relevantCollections.some(term => slug.includes(term) || name.includes(term))) {
      const itemsResponse = await webflowRequest(`/collections/${col.id}/items`);
      console.log(`${col.displayName} (${col.slug}):`);
      console.log(`  Items: ${itemsResponse.items?.length || 0}`);
      console.log(`  Collection ID: ${col.id}\n`);
    }
  }
}

checkWebflowCollections().catch(console.error);

