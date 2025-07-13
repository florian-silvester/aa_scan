import sanity from '../../sanity-client.js';

async function analyzeUnlinkedSamples() {
    try {
        console.log('📋 ANALYZING 10 UNLINKED ARTWORK SAMPLES...\n');
        
        // Get 10 unlinked artworks
        const unlinkedArtworks = await sanity.fetch(`
            *[_type == "artwork" && !defined(images[0].asset._ref) && defined(originalFilename)][0...10]{
                _id,
                workTitle,
                originalFilename,
                creator->{name}
            }
        `);
        
        console.log(`Found ${unlinkedArtworks.length} sample unlinked artworks\n`);
        
        // Get some media assets to compare
        const mediaAssets = await sanity.fetch(`
            *[_type == "sanity.imageAsset"][0...50]{
                originalFilename
            }
        `);
        
        console.log('SAMPLE UNLINKED ARTWORKS:');
        console.log('================================================\n');
        
        for (let i = 0; i < unlinkedArtworks.length; i++) {
            const artwork = unlinkedArtworks[i];
            const creatorName = artwork.creator?.name?.en || artwork.creator?.name || 'Unknown';
            const title = artwork.workTitle?.en || artwork.workTitle || 'Untitled';
            
            console.log(`${i+1}. ${creatorName} - ${title}`);
            console.log(`   Artwork filename: ${artwork.originalFilename}`);
            
            // Look for similar media filenames
            const similarMedia = mediaAssets.filter(media => {
                if (!media.originalFilename) return false;
                
                // Strip common prefixes/suffixes for comparison
                const artworkClean = artwork.originalFilename
                    .toLowerCase()
                    .replace(/-\d+x\d+/, '')
                    .replace(/^\d+_/, '');
                    
                const mediaClean = media.originalFilename
                    .toLowerCase()
                    .replace(/^\d+_/, '');
                
                // Check for partial matches
                return artworkClean.includes(mediaClean.split('.')[0]) || 
                       mediaClean.includes(artworkClean.split('.')[0]) ||
                       artworkClean.split('.')[0].includes(mediaClean.split('.')[0]);
            }).slice(0, 3);
            
            if (similarMedia.length > 0) {
                console.log('   🔍 Possible media matches:');
                similarMedia.forEach(media => {
                    console.log(`      - ${media.originalFilename}`);
                });
            } else {
                console.log('   ❌ No similar media found');
            }
            
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

analyzeUnlinkedSamples(); 