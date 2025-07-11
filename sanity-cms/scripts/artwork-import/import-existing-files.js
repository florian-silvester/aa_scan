import sanity from './sanity-client.js';
import fs from 'fs';
import path from 'path';

console.log('📁 SIMPLE IMPORT: Upload actual files from directories...\n');

async function importExistingFiles() {
    try {
        // Get all files from both directories
        const wordpressAllDir = '../wordpress-all-images';
        const wordpressOriginalsDir = '../wordpress-originals';
        
        let allFiles = [];
        
        // Get files from wordpress-all-images
        if (fs.existsSync(wordpressAllDir)) {
            const files = fs.readdirSync(wordpressAllDir)
                .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
                .map(file => ({ file, dir: wordpressAllDir }));
            allFiles = allFiles.concat(files);
            console.log(`📂 Found ${files.length} images in wordpress-all-images`);
        }
        
        // Get files from wordpress-originals
        if (fs.existsSync(wordpressOriginalsDir)) {
            const files = fs.readdirSync(wordpressOriginalsDir)
                .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
                .map(file => ({ file, dir: wordpressOriginalsDir }));
            allFiles = allFiles.concat(files);
            console.log(`📂 Found ${files.length} images in wordpress-originals`);
        }
        
        console.log(`📊 Total files to import: ${allFiles.length}`);
        
        // Remove duplicates (prefer wordpress-all-images)
        const uniqueFiles = [];
        const seen = new Set();
        
        for (const item of allFiles) {
            if (!seen.has(item.file)) {
                seen.add(item.file);
                uniqueFiles.push(item);
            }
        }
        
        console.log(`📊 Unique files after deduplication: ${uniqueFiles.length}`);
        
        // Import in batches  
        const batchSize = 50;
        let importedCount = 0;
        let skippedCount = 0;
        
        for (let i = 0; i < uniqueFiles.length; i += batchSize) {
            const batch = uniqueFiles.slice(i, i + batchSize);
            
            console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueFiles.length/batchSize)} (${batch.length} files)...`);
            
            for (const item of batch) {
                try {
                    const filePath = path.join(item.dir, item.file);
                    
                    if (fs.existsSync(filePath)) {
                        // Upload to Sanity
                        const asset = await sanity.assets.upload('image', fs.createReadStream(filePath), {
                            filename: item.file
                        });
                        
                        importedCount++;
                        console.log(`✅ ${item.file}`);
                        
                    } else {
                        skippedCount++;
                        console.log(`❌ ${item.file} (not found)`);
                    }
                    
                } catch (error) {
                    skippedCount++;
                    console.log(`❌ ${item.file} (error: ${error.message})`);
                }
            }
            
            console.log(`📊 Batch: ${importedCount} imported, ${skippedCount} skipped`);
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`\n🎉 IMPORT COMPLETE!`);
        console.log(`📊 Final: ${importedCount} imported, ${skippedCount} skipped`);
        
        // Verify
        const importedMedia = await sanity.fetch(`*[_type == 'sanity.imageAsset']{_id, originalFilename}`);
        console.log(`📊 Verified: ${importedMedia.length} media assets in Sanity`);
        
    } catch (error) {
        console.error('❌ Error during import:', error);
    }
}

importExistingFiles(); 