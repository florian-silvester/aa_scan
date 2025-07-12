import { sanityClient } from './sanity-client.js';

async function removeDuplicateCaptions() {
    console.log('🧹 REMOVING DUPLICATE RAW CAPTIONS...\n');
    
    try {
        // Get all artworks to verify duplication
        const artworks = await sanityClient.fetch(`
            *[_type == "artwork"]{
                _id,
                name,
                description,
                rawCaption,
                creator->{
                    name
                }
            }
        `);
        
        console.log(`📊 Total artworks: ${artworks.length}`);
        
        // Verify duplication before cleanup
        let duplicates = 0;
        let differences = 0;
        const differenceExamples = [];
        
        artworks.forEach(artwork => {
            const rawCaptionStr = JSON.stringify(artwork.rawCaption);
            const descriptionStr = JSON.stringify(artwork.description);
            
            if (rawCaptionStr === descriptionStr) {
                duplicates++;
            } else {
                differences++;
                if (differenceExamples.length < 3) {
                    differenceExamples.push({
                        id: artwork._id,
                        name: artwork.name,
                        creator: artwork.creator?.name,
                        rawCaption: artwork.rawCaption,
                        description: artwork.description
                    });
                }
            }
        });
        
        console.log(`🔄 VERIFICATION:`);
        console.log(`- Identical fields: ${duplicates}`);
        console.log(`- Different fields: ${differences}`);
        
        if (differences > 0) {
            console.log(`\n⚠️ FOUND ${differences} ARTWORKS WITH DIFFERENT CONTENT:`);
            differenceExamples.forEach((example, i) => {
                console.log(`\n${i + 1}. ${example.name} by ${example.creator}`);
                console.log(`   ID: ${example.id.slice(-6)}`);
                console.log(`   rawCaption: ${JSON.stringify(example.rawCaption)}`);
                console.log(`   description: ${JSON.stringify(example.description)}`);
            });
            
            console.log(`\n❌ CLEANUP ABORTED: Found differences between fields`);
            console.log(`Please review these ${differences} artworks before proceeding`);
            return;
        }
        
        console.log(`\n✅ ALL FIELDS ARE IDENTICAL - SAFE TO REMOVE rawCaption`);
        console.log(`\n🧹 Starting cleanup in batches...`);
        
        let removedCount = 0;
        let errorCount = 0;
        
        // Process in batches
        const batchSize = 20;
        
        for (let i = 0; i < artworks.length; i += batchSize) {
            const batch = artworks.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(artworks.length / batchSize);
            
            console.log(`📦 Processing batch ${batchNum}/${totalBatches}...`);
            
            const updatePromises = batch.map(async (artwork) => {
                try {
                    await sanityClient
                        .patch(artwork._id)
                        .unset(['rawCaption'])
                        .commit();
                    
                    return { status: 'success', id: artwork._id };
                    
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
                    removedCount++;
                    console.log(`✅ ${result.id.slice(-6)}: rawCaption removed`);
                } else {
                    errorCount++;
                    console.log(`❌ ${result.id.slice(-6)}: ${result.error}`);
                }
            });
            
            console.log(`📊 Batch ${batchNum}: ${removedCount} total removed, ${errorCount} total errors`);
            
            // Small delay between batches
            if (i + batchSize < artworks.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`\n🎉 CLEANUP COMPLETE!`);
        console.log(`📊 Results:`);
        console.log(`  - Removed rawCaption from: ${removedCount} artworks`);
        console.log(`  - Errors: ${errorCount}`);
        console.log(`  - Data savings: Eliminated ${removedCount} redundant multilingual fields`);
        
        // Verify cleanup
        const remainingRawCaptions = await sanityClient.fetch(`count(*[_type == "artwork" && defined(rawCaption)])`);
        console.log(`\n✅ Verification: ${remainingRawCaptions} artworks still have rawCaption field`);
        
        if (remainingRawCaptions === 0) {
            console.log(`🎉 Perfect! All rawCaption fields successfully removed`);
        }
        
    } catch (error) {
        console.error('❌ Error removing duplicate captions:', error);
    }
}

removeDuplicateCaptions(); 