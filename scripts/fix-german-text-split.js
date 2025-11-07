const { createClient } = require('@sanity/client');
require('dotenv').config();

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

function generateKey() {
  return Math.random().toString(36).substring(2, 10);
}

async function fixGermanText() {
  const article = await client.fetch(`*[_id == 'T0zY3vaSb7fEMNaeV1iQjk'][0]{
    _id,
    'fullTextDE': fullText.de
  }`);
  
  const fullText = article.fullTextDE[0].children.map(c => c.text).join('');
  
  console.log(`Full German text length: ${fullText.length} chars`);
  
  // Find German equivalents of the English split points
  const splitPoints = [
    fullText.indexOf('Der Eliashof und seine Gemeinschaft'), // ~2500 chars
    fullText.indexOf('Das ganzheitliche Kunstverständnis'), // ~4200 chars  
    fullText.indexOf('Schließlich führt uns Raimer Jochims'), // ~6800 chars
    fullText.indexOf('Beim Abschied') // ~8300 chars
  ];
  
  console.log('German split points:', splitPoints);
  
  // Create text chunks
  const chunks = [
    fullText.substring(0, splitPoints[0]).trim(),
    fullText.substring(splitPoints[0], splitPoints[1]).trim(),
    fullText.substring(splitPoints[1], splitPoints[2]).trim(),
    fullText.substring(splitPoints[2], splitPoints[3]).trim(),
    fullText.substring(splitPoints[3]).trim()
  ];
  
  console.log('\nGerman chunk lengths:');
  chunks.forEach((chunk, i) => {
    console.log(`  ${i}: ${chunk.length} chars - "${chunk.substring(0, 50)}..."`);
  });
  
  // Build new fullText with image markers
  const newFullText = [];
  
  chunks.forEach((chunk, i) => {
    // Add text block
    newFullText.push({
      _type: 'block',
      _key: generateKey(),
      style: 'normal',
      markDefs: [],
      children: [{
        _type: 'span',
        _key: generateKey(),
        text: chunk,
        marks: []
      }]
    });
    
    // Add image marker after each chunk except the last
    if (i < chunks.length - 1) {
      newFullText.push({
        _type: 'imageMarker',
        _key: generateKey(),
        reference: `images${i + 1}`
      });
    }
  });
  
  console.log(`\nNew German fullText structure: ${newFullText.length} blocks`);
  
  // Update Sanity
  console.log('\n🔄 Updating German fullText in Sanity...');
  await client.patch('T0zY3vaSb7fEMNaeV1iQjk')
    .set({ 'fullText.de': newFullText })
    .commit();
  
  console.log('✅ Done!');
}

fixGermanText().catch(console.error);

