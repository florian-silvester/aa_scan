const fs = require('fs');

// Read the fixed captions data
const captionsData = JSON.parse(fs.readFileSync('carousel-captions-fixed-2025-07-11.json', 'utf8'));

function extractUniqueImages() {
    console.log('📊 Extracting unique images from fixed captions data...');
    
    const uniqueImages = new Map(); // Use Map to avoid duplicates by filename
    let totalProcessed = 0;
    let duplicatesSkipped = 0;
    
    // Process each designer
    for (const designer of captionsData.designers) {
        console.log(`👤 Processing: ${designer.designerName} (${designer.images.length} images)`);
        
        // Process each image
        for (const image of designer.images) {
            totalProcessed++;
            
            const filename = image.filename;
            
            // Check if we already have this image
            if (uniqueImages.has(filename)) {
                duplicatesSkipped++;
                console.log(`  🔄 Duplicate skipped: ${filename}`);
                continue;
            }
            
            // Store the unique image with all its data
            uniqueImages.set(filename, {
                filename: filename,
                designerName: designer.designerName,
                imageUrl: image.imageUrl,
                title: image.title,
                rawCaption: image.rawCaption,
                rawCaption_en: image.rawCaption_en,
                rawCaption_de: image.rawCaption_de,
                slideIndex: image.slideIndex
            });
            
            console.log(`  ✅ Added unique: ${filename}`);
        }
    }
    
    // Convert Map to Array
    const uniqueImagesArray = Array.from(uniqueImages.values());
    
    console.log('\n📊 EXTRACTION COMPLETE:');
    console.log(`   📂 Total processed: ${totalProcessed} image entries`);
    console.log(`   🔄 Duplicates skipped: ${duplicatesSkipped}`);
    console.log(`   ✨ Unique images: ${uniqueImagesArray.length}`);
    
    // Save to new file
    const outputData = {
        summary: {
            totalProcessed,
            duplicatesSkipped,
            uniqueImages: uniqueImagesArray.length,
            extractedFrom: 'carousel-captions-fixed-2025-07-11.json',
            extractedAt: new Date().toISOString()
        },
        uniqueImages: uniqueImagesArray
    };
    
    const outputFilename = 'unique-images-for-import.json';
    fs.writeFileSync(outputFilename, JSON.stringify(outputData, null, 2));
    console.log(`💾 Unique images saved to: ${outputFilename}`);
    
    return outputData;
}

// Run the extraction
if (require.main === module) {
    try {
        extractUniqueImages();
        console.log('\n🎉 Unique image extraction completed!');
    } catch (error) {
        console.error('❌ Extraction failed:', error);
        process.exit(1);
    }
}

module.exports = { extractUniqueImages }; 