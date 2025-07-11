import sanity from './sanity-client.js';

console.log('🔍 INVESTIGATING DUPLICATE MEDIA FILENAMES...\n');

async function investigateDuplicateFilenames() {
    try {
        // Get all media assets
        const mediaAssets = await sanity.fetch(`
            *[_type == 'sanity.imageAsset']{
                _id,
                originalFilename,
                url,
                size,
                metadata {
                    dimensions
                }
            }
        `);

        console.log(`📊 Total media assets: ${mediaAssets.length}`);

        // Group by filename to find duplicates
        const filenameGroups = {};
        mediaAssets.forEach(asset => {
            const filename = asset.originalFilename || 'unnamed';
            if (!filenameGroups[filename]) {
                filenameGroups[filename] = [];
            }
            filenameGroups[filename].push(asset);
        });

        // Find duplicates
        const duplicates = Object.entries(filenameGroups)
            .filter(([filename, assets]) => assets.length > 1)
            .sort(([,a], [,b]) => b.length - a.length);

        console.log(`🚨 Found ${duplicates.length} duplicate filenames!`);
        console.log('');

        // Show top 10 most duplicated filenames
        console.log('📋 Top 10 most duplicated filenames:');
        duplicates.slice(0, 10).forEach(([filename, assets], i) => {
            console.log(`${i+1}. "${filename}" - ${assets.length} copies`);
            
            // Show details of first few copies
            assets.slice(0, 3).forEach((asset, j) => {
                const dimensions = asset.metadata?.dimensions;
                const sizeInfo = dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown';
                console.log(`   Copy ${j+1}: ID=${asset._id.slice(-8)}, Size=${sizeInfo}, FileSize=${asset.size || 'unknown'}`);
            });
            
            if (assets.length > 3) {
                console.log(`   ... and ${assets.length - 3} more copies`);
            }
            console.log('');
        });

        // Check specifically for the Lassus example from the screenshot
        console.log('🔍 Checking specific "Kristina-Lassus-Rugs.jpg" duplicates:');
        const lassusFiles = filenameGroups['Kristina-Lassus-Rugs.jpg'] || [];
        if (lassusFiles.length > 0) {
            console.log(`Found ${lassusFiles.length} files with name "Kristina-Lassus-Rugs.jpg"`);
            lassusFiles.forEach((asset, i) => {
                const dimensions = asset.metadata?.dimensions;
                const sizeInfo = dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown';
                console.log(`   ${i+1}. ID: ${asset._id}`);
                console.log(`      Size: ${sizeInfo}, FileSize: ${asset.size}`);
                console.log(`      URL: ${asset.url}`);
                console.log('');
            });
        } else {
            console.log('No files found with that exact name');
        }

    } catch (error) {
        console.error('❌ Error investigating duplicates:', error);
    }
}

investigateDuplicateFilenames(); 