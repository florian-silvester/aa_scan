import sanity from '../../sanity-client.js';

/**
 * EXACT FILENAME MATCHING WITH PREPENDED NUMBER HANDLING
 * 
 * This script matches artwork.originalFilename with media.originalFilename
 * accounting for prepended numbers like "1234_" that were added during upload.
 * 
 * Strategy:
 * 1. Get unlinked artworks with originalFilename
 * 2. For each artwork, find media with exact filename match (after stripping prepended numbers)
 * 3. Only create links for perfect matches to avoid errors
 */

// Strip prepended numbers from filename (e.g., "1234_filename.jpg" -> "filename.jpg")
function stripPrependedNumbers(filename) {
    if (!filename) return '';
    
    // Remove pattern like "1234_" at the start
    const cleaned = filename.replace(/^\d+_/, '');
    return cleaned;
}

// Strip WordPress size suffixes (e.g., "image-1024x693.jpg" -> "image.jpg")
function stripWordPressSizes(filename) {
    if (!filename) return '';
    
    // Remove size suffixes like -1-1024x693, -2-760x1024, -1024x693, etc.
    // First try pattern with sequential number: -1-1024x693
    filename = filename.replace(/-\d+-\d+x\d+(?=\.[^.]*$)/, '');
    // Then try pattern without sequential number: -1024x693
    filename = filename.replace(/-\d+x\d+(?=\.[^.]*$)/, '');
    return filename;
}

// Normalize filename for comparison (consistent casing, etc.)
function normalizeForComparison(filename, isMediaFile = false) {
    let normalized = filename.toLowerCase().trim();
    
    // Only strip prepended numbers from MEDIA files (57924_), not artwork filenames
    if (isMediaFile) {
        normalized = stripPrependedNumbers(normalized);
    }
    
    // Always strip WordPress size suffixes from artwork filenames
    normalized = stripWordPressSizes(normalized);
    
    return normalized;
}

async function linkMediaExactOnly() {
    console.log('🎯 EXACT FILENAME MATCHING (Prepended Numbers Handled)\n');
    
    try {
        // Get artworks without linked images that have originalFilename
        const artworks = await sanity.fetch(`
            *[_type == "artwork" && !defined(images[0].asset._ref) && defined(originalFilename)]{
                _id,
                workTitle,
                originalFilename,
                creator->{name}
            }
        `);
        
        console.log(`🎨 Found ${artworks.length} unlinked artworks with original filenames`);
        
        // Get all media assets
        const mediaAssets = await sanity.fetch(`
            *[_type == "sanity.imageAsset"]{
                _id,
                originalFilename
            }
        `);
        
        console.log(`📷 Found ${mediaAssets.length} media assets\n`);
        
        // Create lookup map for media assets (normalized filename -> asset)
        const mediaLookup = new Map();
        const duplicateMediaFilenames = new Set();
        
        mediaAssets.forEach(media => {
            if (!media.originalFilename) return;
            
            const normalizedFilename = normalizeForComparison(media.originalFilename, true);
            
            if (mediaLookup.has(normalizedFilename)) {
                duplicateMediaFilenames.add(normalizedFilename);
                console.log(`⚠️  Duplicate media filename detected: ${normalizedFilename}`);
            } else {
                mediaLookup.set(normalizedFilename, media);
            }
        });
        
        console.log(`📊 Created lookup for ${mediaLookup.size} unique media filenames`);
        if (duplicateMediaFilenames.size > 0) {
            console.log(`⚠️  ${duplicateMediaFilenames.size} filenames have duplicates - will skip these\n`);
        }
        
        // Process exact matches
        const exactMatches = [];
        const noMatches = [];
        const duplicateSkipped = [];
        
        console.log('🔍 Processing exact matches...\n');
        
        for (const artwork of artworks) {
            const artworkTitle = artwork.workTitle?.en || artwork.workTitle?.de || 'Untitled';
            const creatorName = artwork.creator?.name || 'Unknown';
            
            console.log(`📋 "${artworkTitle}" by ${creatorName}`);
            console.log(`   Artwork filename: ${artwork.originalFilename}`);
            
            const normalizedArtworkFilename = normalizeForComparison(artwork.originalFilename, false);
            
            // Skip if this filename has duplicates in media
            if (duplicateMediaFilenames.has(normalizedArtworkFilename)) {
                console.log(`   ⚠️  SKIPPED - Multiple media assets have this filename`);
                duplicateSkipped.push({
                    artwork,
                    reason: 'Multiple media assets with same filename'
                });
                console.log('');
                continue;
            }
            
            // Look for exact match
            const matchedMedia = mediaLookup.get(normalizedArtworkFilename);
            
            if (matchedMedia) {
                console.log(`   ✅ EXACT MATCH: ${matchedMedia.originalFilename}`);
                exactMatches.push({
                    artwork,
                    media: matchedMedia,
                    artworkFilename: artwork.originalFilename,
                    mediaFilename: matchedMedia.originalFilename
                });
            } else {
                console.log(`   ❌ No exact match found`);
                noMatches.push({
                    artwork,
                    normalizedFilename: normalizedArtworkFilename
                });
            }
            console.log('');
        }
        
        // Report results
        console.log(`📊 EXACT MATCHING RESULTS:`);
        console.log(`   ✅ Exact matches found: ${exactMatches.length}`);
        console.log(`   ❌ No matches: ${noMatches.length}`);
        console.log(`   ⚠️  Skipped (duplicate media): ${duplicateSkipped.length}\n`);
        
        // Show sample exact matches
        if (exactMatches.length > 0) {
            console.log(`✅ EXACT MATCHES (will link these):`);
            exactMatches.slice(0, 10).forEach((match, i) => {
                console.log(`   ${i+1}. "${match.artwork.workTitle?.en || 'Untitled'}" by ${match.artwork.creator?.name}`);
                console.log(`      Artwork: ${match.artworkFilename}`);
                console.log(`      Media:   ${match.mediaFilename}`);
                console.log('');
            });
            
            if (exactMatches.length > 10) {
                console.log(`   ... and ${exactMatches.length - 10} more exact matches\n`);
            }
        }
        
        // Link exact matches
        if (exactMatches.length > 0) {
            console.log(`🔗 Linking ${exactMatches.length} exact matches...`);
            
            const transaction = sanity.transaction();
            
            exactMatches.forEach(match => {
                transaction.patch(match.artwork._id, {
                    set: {
                        images: [{
                            _type: 'image',
                            _key: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            asset: {
                                _type: 'reference',
                                _ref: match.media._id
                            },
                            alt: {
                                en: match.artwork.workTitle?.en || 'Artwork image',
                                de: match.artwork.workTitle?.de || 'Artwork image'
                            }
                        }]
                    }
                });
            });
            
            try {
                await transaction.commit();
                console.log(`✅ Successfully linked ${exactMatches.length} artworks with exact filename matches!`);
            } catch (error) {
                console.error(`❌ Failed to link artworks:`, error.message);
                throw error;
            }
        }
        
        // Show some examples of files that didn't match for debugging
        if (noMatches.length > 0) {
            console.log(`\n📋 SAMPLE FILES WITHOUT MATCHES (for debugging):`);
            noMatches.slice(0, 10).forEach((item, i) => {
                console.log(`   ${i+1}. Artwork: ${item.artwork.originalFilename}`);
                console.log(`      Normalized: ${item.normalizedFilename}`);
                console.log(`      Title: "${item.artwork.workTitle?.en || 'Untitled'}"`);
                console.log('');
            });
        }
        
        return {
            exactMatches: exactMatches.length,
            noMatches: noMatches.length,
            duplicateSkipped: duplicateSkipped.length,
            successRate: Math.round((exactMatches.length / artworks.length) * 100)
        };
        
    } catch (error) {
        console.error('❌ Exact filename matching failed:', error);
        throw error;
    }
}

// Run the exact matching
if (import.meta.url === `file://${process.argv[1]}`) {
    linkMediaExactOnly()
        .then(results => {
            console.log('\n🎉 Exact filename matching completed!');
            console.log(`📈 Results: ${results.exactMatches} linked, ${results.noMatches} no match, ${results.duplicateSkipped} skipped`);
            console.log(`🎯 Success rate: ${results.successRate}% of processed artworks`);
            console.log('\n💡 This conservative approach only links perfect filename matches.');
            console.log('🔍 For remaining files, check if they need fuzzy matching or manual review.');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Exact matching failed:', error);
            process.exit(1);
        });
} 