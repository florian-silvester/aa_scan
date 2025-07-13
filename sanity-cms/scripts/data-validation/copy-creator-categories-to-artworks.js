import sanityClient from '../../sanity-client.js';

async function copyCreatorCategoriesToArtworks() {
    console.log('🎨 Copying creator categories to artworks...\n');
    
    // Get artworks with creators that have categories
    const artworksWithCreatorCategories = await sanityClient.fetch(`
        *[_type == "artwork" && defined(creator) && defined(creator->category)]{
            _id,
            title,
            creator->{
                name,
                category->{
                    _id,
                    title
                }
            },
            category
        }
    `);
    
    console.log(`📊 Found ${artworksWithCreatorCategories.length} artworks with categorized creators`);
    
    if (artworksWithCreatorCategories.length === 0) {
        console.log('❌ No artworks found with categorized creators');
        return;
    }
    
    // Show sample data
    console.log('\n📋 Sample artworks to update:');
    artworksWithCreatorCategories.slice(0, 3).forEach(artwork => {
        const title = artwork.title || 'Untitled';
        const creatorName = artwork.creator?.name || 'Unknown';
        const categoryTitle = artwork.creator?.category?.title?.en || 'Unknown';
        console.log(`  - "${title}" by ${creatorName} → ${categoryTitle}`);
    });
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Processing artworks...');
    
    for (const artwork of artworksWithCreatorCategories) {
        try {
            const creatorCategoryId = artwork.creator.category._id;
            
            // Skip if artwork already has this category
            if (artwork.category?._ref === creatorCategoryId) {
                skippedCount++;
                continue;
            }
            
            // Update artwork with creator's category
            await sanityClient
                .patch(artwork._id)
                .set({
                    category: {
                        _type: 'reference',
                        _ref: creatorCategoryId
                    }
                })
                .commit();
            
            updatedCount++;
            
            const title = artwork.title || 'Untitled';
            const creatorName = artwork.creator?.name || 'Unknown';
            const categoryTitle = artwork.creator?.category?.title?.en || 'Unknown';
            
            if (updatedCount % 50 === 0) {
                console.log(`✅ ${updatedCount} updated - Latest: "${title}" by ${creatorName} → ${categoryTitle}`);
            }
            
        } catch (error) {
            errorCount++;
            console.log(`❌ Error updating ${artwork._id}: ${error.message}`);
        }
    }
    
    console.log('\n📊 RESULTS:');
    console.log(`  - Total processed: ${artworksWithCreatorCategories.length}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Already had category: ${skippedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    // Final statistics
    const finalStats = await sanityClient.fetch(`
        {
            "totalArtworks": count(*[_type == "artwork"]),
            "artworksWithCategory": count(*[_type == "artwork" && defined(category)]),
            "artworksWithoutCategory": count(*[_type == "artwork" && !defined(category)])
        }
    `);
    
    console.log('\n🎯 FINAL ARTWORK CATEGORY STATS:');
    console.log(`  - Total artworks: ${finalStats.totalArtworks}`);
    console.log(`  - With category: ${finalStats.artworksWithCategory} (${Math.round(finalStats.artworksWithCategory/finalStats.totalArtworks*100)}%)`);
    console.log(`  - Without category: ${finalStats.artworksWithoutCategory}`);
}

copyCreatorCategoriesToArtworks().catch(console.error); 