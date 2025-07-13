import { sanityClient } from './sanity-client.js';

async function fixArtworkNames() {
    console.log('🎨 FIXING ARTWORK NAMES TO Creator_work title FORMAT...\n');
    
    try {
        // Get all artworks with their current name, workTitle, and creator
        const artworks = await sanityClient.fetch(`
            *[_type == "artwork"]{
                _id,
                name,
                workTitle,
                creator->{
                    name
                }
            }
        `);
        
        console.log(`📊 Total artworks to process: ${artworks.length}`);
        
        // Analyze current patterns
        let transformedCount = 0;
        let errors = 0;
        
        console.log('\n🔄 TRANSFORMING NAMES...\n');
        
        // Process in batches
        const batchSize = 20;
        
        for (let i = 0; i < artworks.length; i += batchSize) {
            const batch = artworks.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(artworks.length / batchSize);
            
            console.log(`📦 Processing batch ${batchNum}/${totalBatches}...`);
            
            const updatePromises = batch.map(async (artwork) => {
                try {
                    const creatorName = artwork.creator?.name || 'Unknown';
                    const workTitleEn = artwork.workTitle?.en || '';
                    const workTitleDe = artwork.workTitle?.de || '';
                    const workTitle = workTitleEn || workTitleDe || 'Untitled';
                    
                    // Create new name in format: Creator_work title
                    const newName = `${creatorName}_${workTitle}`;
                    
                    // Only update if different from current name
                    if (artwork.name !== newName) {
                        await sanityClient
                            .patch(artwork._id)
                            .set({ name: newName })
                            .commit();
                        
                        return { 
                            status: 'success', 
                            id: artwork._id,
                            oldName: artwork.name,
                            newName: newName
                        };
                    } else {
                        return { 
                            status: 'unchanged', 
                            id: artwork._id,
                            name: artwork.name
                        };
                    }
                    
                } catch (error) {
                    return { 
                        status: 'error', 
                        id: artwork._id, 
                        error: error.message 
                    };
                }
            });
            
            const results = await Promise.all(updatePromises);
            
            // Process results
            results.forEach(result => {
                if (result.status === 'success') {
                    transformedCount++;
                    console.log(`✅ ${result.id.slice(-6)}: "${result.oldName}" → "${result.newName}"`);
                } else if (result.status === 'unchanged') {
                    console.log(`⏭️ ${result.id.slice(-6)}: Already correct format`);
                } else {
                    errors++;
                    console.log(`❌ ${result.id.slice(-6)}: ${result.error}`);
                }
            });
            
            console.log(`📊 Batch ${batchNum}: ${transformedCount} total transformed, ${errors} total errors`);
            
            // Small delay between batches
            if (i + batchSize < artworks.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`\n🎉 NAME TRANSFORMATION COMPLETE!`);
        console.log(`📊 Results:`);
        console.log(`  - Transformed: ${transformedCount} artworks`);
        console.log(`  - Errors: ${errors}`);
        
        // Show sample of transformed names
        console.log(`\n📋 Sample of new names:`);
        const sampleTransformed = await sanityClient.fetch(`
            *[_type == "artwork"][0...5]{
                _id,
                name,
                workTitle,
                creator->{name}
            }
        `);
        
        sampleTransformed.forEach((artwork, i) => {
            console.log(`${i+1}. Name: "${artwork.name}"`);
            console.log(`   Creator: ${artwork.creator?.name}`);
            console.log(`   Work Title: ${JSON.stringify(artwork.workTitle)}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error fixing artwork names:', error);
    }
}

fixArtworkNames(); 