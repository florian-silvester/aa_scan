const fs = require('fs');

// Read the unique images data
const uniqueImagesData = JSON.parse(fs.readFileSync('unique-images-for-import.json', 'utf8'));

function extractCleanTitle(rawCaption, filename) {
    if (!rawCaption) {
        // Fallback to filename-based title
        return filename.replace(/[-_]/g, ' ').replace(/\.(jpg|jpeg|png|gif)$/i, '').replace(/\d+x\d+/g, '').trim();
    }
    
    // Remove HTML tags
    let title = rawCaption.replace(/<[^>]*>/g, '');
    
    // Extract title from various patterns
    // Pattern 1: "Title, year. Material..." - take everything before first comma or period
    let match = title.match(/^([^,.]+)/);
    if (match) {
        title = match[1].trim();
    }
    
    // Pattern 2: Remove common suffixes
    title = title.replace(/\s*©.*$/i, ''); // Remove copyright
    title = title.replace(/\s*Photo.*$/i, ''); // Remove photo credits
    title = title.replace(/\s*Foto.*$/i, ''); // Remove German photo credits
    title = title.replace(/\s*\d{4}.*$/i, ''); // Remove year and everything after
    
    // Clean up
    title = title.trim();
    
    // If too short or empty, use filename
    if (title.length < 2) {
        title = filename.replace(/[-_]/g, ' ').replace(/\.(jpg|jpeg|png|gif)$/i, '').replace(/\d+x\d+/g, '').trim();
    }
    
    return title;
}

function extractMaterials(caption) {
    if (!caption) return [];
    
    const materials = [];
    const materialPatterns = [
        /silver|silber/i,
        /gold/i,
        /platinum|platin/i,
        /porcelain|porzellan/i,
        /ceramic|keramik/i,
        /stoneware|steinzeug/i,
        /glass|glas/i,
        /wood|holz/i,
        /metal|metall/i,
        /bronze/i,
        /copper|kupfer/i,
        /steel|stahl/i,
        /titanium/i,
        /textile|textil/i,
        /fabric|stoff/i,
        /paper|papier/i,
        /leather|leder/i
    ];
    
    materialPatterns.forEach(pattern => {
        if (pattern.test(caption)) {
            const match = caption.match(pattern);
            if (match) {
                materials.push(match[0].toLowerCase());
            }
        }
    });
    
    return [...new Set(materials)]; // Remove duplicates
}

function extractDimensions(caption) {
    if (!caption) return null;
    
    // Look for dimension patterns like "20x30 cm", "H 25 cm", "Ø 15 cm"
    const dimensionPatterns = [
        /(\d+)\s*x\s*(\d+)\s*(x\s*(\d+))?\s*cm/i,
        /H\s*(\d+)\s*cm/i,
        /Ø\s*(\d+)\s*cm/i,
        /(\d+)\s*cm/i
    ];
    
    for (const pattern of dimensionPatterns) {
        const match = caption.match(pattern);
        if (match) {
            return match[0];
        }
    }
    
    return null;
}

function mergeCaption(rawCaption_en, rawCaption_de) {
    const merged = {
        en: rawCaption_en || '',
        de: rawCaption_de || ''
    };
    
    // If they're identical, just use one
    if (merged.en === merged.de) {
        merged.de = '';
    }
    
    return merged;
}

function createArtworkFromImage(imageData) {
    const cleanTitle = extractCleanTitle(imageData.rawCaption_en || imageData.rawCaption, imageData.filename);
    const materials = extractMaterials((imageData.rawCaption_en || '') + ' ' + (imageData.rawCaption_de || ''));
    const dimensions = extractDimensions(imageData.rawCaption_en || imageData.rawCaption);
    const mergedCaption = mergeCaption(imageData.rawCaption_en, imageData.rawCaption_de);
    
    return {
        // Basic Info
        filename: imageData.filename,
        title: cleanTitle,
        creator: imageData.designerName,
        
        // Image
        imageUrl: imageData.imageUrl,
        
        // Descriptions (bilingual)
        description: mergedCaption,
        
        // Extracted Metadata
        materials: materials,
        dimensions: dimensions,
        
        // Original Data (for reference)
        originalData: {
            rawCaption: imageData.rawCaption,
            rawCaption_en: imageData.rawCaption_en,
            rawCaption_de: imageData.rawCaption_de,
            title: imageData.title,
            slideIndex: imageData.slideIndex
        }
    };
}

function mergeCaptionData() {
    console.log('🔄 Merging caption data for 1,351 unique images...');
    
    const artworks = [];
    let processedCount = 0;
    let titlesExtracted = 0;
    let materialsFound = 0;
    let dimensionsFound = 0;
    
    // Process each unique image
    for (const imageData of uniqueImagesData.uniqueImages) {
        const artwork = createArtworkFromImage(imageData);
        artworks.push(artwork);
        
        processedCount++;
        if (artwork.title && artwork.title !== artwork.filename) titlesExtracted++;
        if (artwork.materials.length > 0) materialsFound++;
        if (artwork.dimensions) dimensionsFound++;
        
        // Show progress
        if (processedCount % 100 === 0) {
            console.log(`  📊 Processed ${processedCount}/1351 images...`);
        }
    }
    
    console.log('\n📊 MERGE COMPLETE:');
    console.log(`   📂 Total artworks created: ${artworks.length}`);
    console.log(`   🎯 Titles extracted: ${titlesExtracted}`);
    console.log(`   🧪 Materials found: ${materialsFound}`);
    console.log(`   📏 Dimensions found: ${dimensionsFound}`);
    
    // Save merged data
    const outputData = {
        summary: {
            totalArtworks: artworks.length,
            titlesExtracted,
            materialsFound,
            dimensionsFound,
            mergedFrom: 'unique-images-for-import.json',
            mergedAt: new Date().toISOString()
        },
        artworks: artworks
    };
    
    const outputFilename = 'merged-artwork-data.json';
    fs.writeFileSync(outputFilename, JSON.stringify(outputData, null, 2));
    console.log(`💾 Merged artwork data saved to: ${outputFilename}`);
    
    // Show sample data
    console.log('\n📝 SAMPLE MERGED DATA:');
    console.log('='.repeat(60));
    
    artworks.slice(0, 3).forEach((artwork, index) => {
        console.log(`\n🎨 ARTWORK ${index + 1}:`);
        console.log(`   📁 Filename: ${artwork.filename}`);
        console.log(`   🎯 Title: "${artwork.title}"`);
        console.log(`   👤 Creator: ${artwork.creator}`);
        console.log(`   🧪 Materials: [${artwork.materials.join(', ')}]`);
        console.log(`   📏 Dimensions: ${artwork.dimensions || 'Not found'}`);
        console.log(`   🌐 Description EN: "${artwork.description.en.substring(0, 100)}${artwork.description.en.length > 100 ? '...' : ''}"`);
        console.log(`   🇩🇪 Description DE: "${artwork.description.de.substring(0, 100)}${artwork.description.de.length > 100 ? '...' : ''}"`);
    });
    
    return outputData;
}

// Run the merge
if (require.main === module) {
    try {
        mergeCaptionData();
        console.log('\n🎉 Caption merge completed successfully!');
    } catch (error) {
        console.error('❌ Merge failed:', error);
        process.exit(1);
    }
}

module.exports = { mergeCaptionData, createArtworkFromImage }; 