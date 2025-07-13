const fs = require('fs');
const path = require('path');

// Load the artwork captions data
const captionsPath = path.join(__dirname, '../../../archive/migration-data/artwork-captions-2025-07-10.json');
const captionsData = JSON.parse(fs.readFileSync(captionsPath, 'utf8'));

console.log('File loaded successfully');
console.log('Type of captionsData:', typeof captionsData);
console.log('Keys in captionsData:', Object.keys(captionsData));

if (captionsData.designers) {
  console.log('Number of designers:', captionsData.designers.length);
  console.log('First designer:', captionsData.designers[0].designerName);
  console.log('First designer images count:', captionsData.designers[0].images.length);
}
