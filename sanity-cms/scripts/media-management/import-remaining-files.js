import sanity from '../../sanity-client.js';
import fs from 'fs';
import path from 'path';

async function importRemainingFiles() {
    try {
        console.log('🔍 FINDING REMAINING FILES TO UPLOAD...\n');
        
        // Get all files from source directory
        const sourceDir = '../../../wordpress-originals';
        const allSourceFiles = fs.readdirSync(sourceDir).filter(file => 
            file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')
        );
        
        console.log(`📂 Found ${allSourceFiles.length} files in source directory`);
        
        // Get all already uploaded filenames from Sanity
        const uploadedMedia = await sanity.fetch(`
            *[_type == "sanity.imageAsset"]{
                originalFilename
            }
        `);
        
        const uploadedFilenames = new Set(uploadedMedia.map(m => m.originalFilename));
        console.log(`📊 Already uploaded: ${uploadedFilenames.size} files`);
        
        // Find files that need to be uploaded
        const remainingFiles = allSourceFiles.filter(filename => {
            // Extract clean filename (remove ID prefix if present)
            const cleanFilename = filename.replace(/^\d+_/, '');
            
            // Check if neither the original filename nor clean version exists
            return !uploadedFilenames.has(filename) && !uploadedFilenames.has(cleanFilename);
        });
        
        console.log(`🎯 Found ${remainingFiles.length} files to upload\n`);
        
        if (remainingFiles.length === 0) {
            console.log('✅ All files already uploaded!');
            return;
        }
        
        // Show first few examples
        console.log('📋 Sample files to upload:');
        remainingFiles.slice(0, 5).forEach((file, i) => {
            console.log(`  ${i+1}. ${file}`);
        });
        console.log('');
        
        // Upload in balanced batches (20 files at a time, 5 parallel)
        const batchSize = 20;
        const parallelLimit = 5;
        let uploadedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < remainingFiles.length; i += batchSize) {
            const batch = remainingFiles.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(remainingFiles.length / batchSize);
            
            console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)...`);
            
            // Process batch with limited parallelism
            const chunks = [];
            for (let j = 0; j < batch.length; j += parallelLimit) {
                chunks.push(batch.slice(j, j + parallelLimit));
            }
            
            for (const chunk of chunks) {
                const uploadPromises = chunk.map(async (filename) => {
                    try {
                        const filePath = path.join(sourceDir, filename);
                        
                        if (!fs.existsSync(filePath)) {
                            return { status: 'error', filename, error: 'File not found' };
                        }
                        
                        // Upload to Sanity
                        const asset = await sanity.assets.upload('image', fs.createReadStream(filePath), {
                            filename: filename
                        });
                        
                        return { status: 'success', filename, assetId: asset._id };
                        
                    } catch (error) {
                        return { status: 'error', filename, error: error.message };
                    }
                });
                
                const results = await Promise.all(uploadPromises);
                
                // Process results
                results.forEach(result => {
                    if (result.status === 'success') {
                        uploadedCount++;
                        console.log(`✅ ${result.filename}`);
                    } else {
                        errorCount++;
                        console.log(`❌ ${result.filename} - ${result.error}`);
                    }
                });
                
                // Small delay between chunks to respect rate limits
                if (chunks.indexOf(chunk) < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            console.log(`📊 Batch ${batchNum}: ${uploadedCount} total uploaded, ${errorCount} total errors`);
            
            // Delay between batches
            if (i + batchSize < remainingFiles.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log(`\n🎉 UPLOAD COMPLETE!`);
        console.log(`📊 Results:`);
        console.log(`  - Successfully uploaded: ${uploadedCount}`);
        console.log(`  - Errors: ${errorCount}`);
        console.log(`  - Total processed: ${uploadedCount + errorCount}`);
        
        // Verify final count
        const finalCount = await sanity.fetch(`count(*[_type == "sanity.imageAsset"])`);
        console.log(`\n📊 Final Sanity media count: ${finalCount}`);
        
        if (finalCount >= 10370) {
            console.log('🎉 All WordPress images now uploaded!');
        } else {
            console.log(`📊 Remaining: ${10370 - finalCount} files`);
        }
        
    } catch (error) {
        console.error('❌ Error during remaining file import:', error);
    }
}

importRemainingFiles();