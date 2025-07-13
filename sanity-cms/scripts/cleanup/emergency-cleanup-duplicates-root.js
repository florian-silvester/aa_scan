import sanity from './sanity-client.js';

console.log('🚨 EMERGENCY CLEANUP: Removing duplicate media assignments from Pass 6\n');

async function cleanupDuplicateMediaAssignments() {
    try {
        // Find all media assets that are assigned to multiple artworks (duplicates)
        console.log('🔍 Finding duplicate media assignments...');
        
        const artworksWithImages = await sanity.fetch(`
            *[_type == "artwork" && defined(images[0].asset._ref)]{
                _id,
                workTitle,
                originalFilename,
                creator->{name},
                "mediaId": images[0].asset._ref,
                "mediaFilename": images[0].asset->originalFilename
            }
        `);
        
        console.log(`📊 Found ${artworksWithImages.length} artworks with images`);
        
        // Group by media ID to find duplicates
        const mediaGroups = {};
        artworksWithImages.forEach(artwork => {
            if (!mediaGroups[artwork.mediaId]) {
                mediaGroups[artwork.mediaId] = [];
            }
            mediaGroups[artwork.mediaId].push(artwork);
        });
        
        // Find groups with multiple artworks (duplicates)
        const duplicateGroups = Object.values(mediaGroups).filter(group => group.length > 1);
        
        console.log(`🚨 Found ${duplicateGroups.length} media assets assigned to multiple artworks:`);
        
        let totalArtworksToFix = 0;
        duplicateGroups.forEach((group, i) => {
            console.log(`\n${i+1}. Media: ${group[0].mediaFilename} (${group.length} artworks)`);
            group.forEach((artwork, j) => {
                console.log(`   ${j+1}. "${artwork.workTitle?.en || 'Untitled'}" by ${artwork.creator?.name}`);
                console.log(`      File: ${artwork.originalFilename}`);
                totalArtworksToFix++;
            });
        });
        
        console.log(`\n💡 CLEANUP STRATEGY: Remove image links from ALL duplicated assignments`);
        console.log(`   This will unlink ${totalArtworksToFix} artworks that share media with others`);
        console.log(`   You can then re-run linking with more conservative matching\n`);
        
        // Ask for confirmation (in a real scenario, you'd want user input)
        console.log('🔧 Starting cleanup...');
        
        const transaction = sanity.transaction();
        let removedCount = 0;
        
        for (const group of duplicateGroups) {
            for (const artwork of group) {
                // Remove the images field to unlink the media
                transaction.patch(artwork._id, {
                    unset: ['images']
                });
                removedCount++;
            }
        }
        
        console.log(`📝 Preparing to remove image links from ${removedCount} artworks...`);
        
        await transaction.commit();
        
        console.log(`✅ CLEANUP COMPLETE!`);
        console.log(`   - Removed image links from ${removedCount} artworks`);
        console.log(`   - These artworks are now unlinked and safe`);
        console.log(`   - You can now re-run linking with better logic\n`);
        
        console.log(`💡 NEXT STEPS:`);
        console.log(`   1. Review the linking algorithm to be more conservative`);
        console.log(`   2. Don't remove meaningful numerical suffixes`);
        console.log(`   3. Re-run linking with stricter matching criteria`);
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        throw error;
    }
}

// Run the cleanup
if (import.meta.url === `file://${process.argv[1]}`) {
    cleanupDuplicateMediaAssignments()
        .then(() => {
            console.log('\n🎯 Emergency cleanup completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Emergency cleanup failed:', error);
            process.exit(1);
        });
} 