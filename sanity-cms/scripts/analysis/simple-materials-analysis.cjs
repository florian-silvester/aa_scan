const fs = require('fs');
const path = require('path');

// Load the artwork captions data
const captionsPath = path.join(__dirname, '../../../archive/migration-data/artwork-captions-2025-07-10.json');
const captionsData = JSON.parse(fs.readFileSync(captionsPath, 'utf8'));

// Flatten the nested structure to get all images
const allImages = [];
captionsData.designers.forEach(designer => {
  designer.images.forEach(image => {
    allImages.push({
      ...image,
      designerName: designer.designerName,
      _id: image.filename
    });
  });
});

console.log(`📊 Analyzing ${allImages.length} artwork records from ${captionsData.designers.length} designers...`);

// Just get basic stats first
let captionsWithContent = 0;
let totalCaptions = 0;

const materialTerms = ['silver', 'gold', 'ceramic', 'metal', 'porcelain', 'glass', 'wood', 'ring', 'necklace', 'vase', 'bowl'];
const foundTerms = {};

allImages.forEach((artwork, index) => {
  totalCaptions++;
  
  const captionEN = artwork.rawCaption_en || '';
  const captionDE = artwork.rawCaption_de || '';
  
  if (!captionEN.trim() && !captionDE.trim()) {
    return;
  }
  
  captionsWithContent++;
  
  const combinedCaption = `${captionEN} ${captionDE}`.toLowerCase();
  
  materialTerms.forEach(term => {
    if (combinedCaption.includes(term)) {
      if (!foundTerms[term]) foundTerms[term] = 0;
      foundTerms[term]++;
    }
  });
  
  if (totalCaptions % 500 === 0) {
    console.log(`📊 Processed ${totalCaptions}/${allImages.length} records...`);
  }
});

console.log('\n📊 BASIC ANALYSIS RESULTS:');
console.log('=========================');
console.log(`Total Records: ${totalCaptions}`);
console.log(`Captions with Content: ${captionsWithContent}`);
console.log(`Empty Captions: ${totalCaptions - captionsWithContent}`);

console.log('\n🔍 TERM FREQUENCY:');
console.log('==================');
Object.keys(foundTerms)
  .sort((a, b) => foundTerms[b] - foundTerms[a])
  .forEach(term => {
    console.log(`${term}: ${foundTerms[term]} times`);
  });

console.log('\n✅ Basic analysis complete!');
