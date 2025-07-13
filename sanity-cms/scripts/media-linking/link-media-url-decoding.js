import sanity from '../../sanity-client.js';

/**
 * URL DECODING ONLY - ARTWORK MEDIA LINKING
 * 
 * This script ONLY handles URL encoding issues like:
 * B%C3%BChlerWL19 -> BühlerWL19
 * 
 * NO numbering variations (endless2 vs endless) - too risky!
 */

// URL decode function
function urlDecode(str) {
    if (!str) return '';
    try {
        return decodeURIComponent(str);
    } catch (e) {
        return str; // Return original if decoding fails
    }
}

// Strip prepended numbers (1234_filename.jpg -> filename.jpg)
function stripPrependedNumbers(filename) {
    if (!filename) return '';
    return filename.replace(/^\d+_/, '');
}

// Strip WordPress size suffixes (image-1024x693.jpg -> image.jpg)
function stripWordPressSizes(filename) {
    if (!filename) return '';
    return filename.replace(/-\d+x\d+(\.\w+)?$/, '$1');
}

// Normalize for comparison - URL decode + strip prefixes/suffixes
function normalizeForUrlDecoding(filename) {
    if (!filename) return '';
    
    let normalized = filename.toLowerCase().trim();
    normalized = urlDecode(normalized);
    normalized = stripPrependedNumbers(normalized);
    normalized = stripWordPressSizes(normalized);
    
    return normalized;
}

// Check if this is a URL encoding case (contains % followed by hex)
function hasUrlEncoding(filename) {
    return /%[0-9A-Fa-f]{2}/.test(filename);
}

async function linkMediaWithUrlDecoding() {
    try {
        console.log('🔗 LINKING MEDIA - URL DECODING ONLY...\n');
        
        // Get unlinked artworks with originalFilename
        console.log('📥 Fetching unlinked artworks...');
        const artworks = await sanity.fetch(`
            *[_type == "artwork" && !defined(images[0].asset._ref) && defined(originalFilename)]{
                _id,
                workTitle,
                originalFilename,
                creator->{name}
            }
        `);
        
        console.log(`Found ${artworks.length} unlinked artworks with filenames\n`);
        
        // Get all media assets
        console.log('📥 Fetching all media assets...');
        const mediaAssets = await sanity.fetch(`
            *[_type == "sanity.imageAsset"]{
                _id,
                originalFilename,
                url
            }
        `);
        
        console.log(`Found ${mediaAssets.length} media assets\n`);
        
        // Create media lookup map
        const mediaMap = new Map();
        mediaAssets.forEach(asset => {
            if (asset.originalFilename) {
                const normalizedFilename = normalizeForUrlDecoding(asset.originalFilename);
                if (!mediaMap.has(normalizedFilename)) {
                    mediaMap.set(normalizedFilename, []);
                }
                mediaMap.get(normalizedFilename).push(asset);
            }
        });
        
        let matchCount = 0;
        let noMatchCount = 0;
        let urlDecodingMatches = 0;
        const patches = [];
        
        // Process each artwork
        for (const artwork of artworks) {
            if (!artwork.originalFilename) continue;
            
            const artworkFilename = normalizeForUrlDecoding(artwork.originalFilename);
            
            // Check if we have a match
            if (mediaMap.has(artworkFilename)) {
                const matchingMedia = mediaMap.get(artworkFilename);
                
                if (matchingMedia.length === 1) {
                    const mediaAsset = matchingMedia[0];
                    
                    // Check if this was a URL decoding case
                    const wasUrlDecoded = hasUrlEncoding(artwork.originalFilename) || hasUrlEncoding(mediaAsset.originalFilename);
                    
                    patches.push({
                        id: artwork._id,
                        patch: {
                            images: [{
                                _type: 'image',
                                asset: {
                                    _type: 'reference',
                                    _ref: mediaAsset._id
                                }
                            }]
                        }
                    });
                    
                    const creatorName = artwork.creator?.name?.en || artwork.creator?.name || 'Unknown';
                    const title = artwork.workTitle?.en || artwork.workTitle || 'Untitled';
                    
                    if (wasUrlDecoded) {
                        console.log(`✅ URL DECODED: ${creatorName} - ${title}`);
                        console.log(`   Artwork: ${artwork.originalFilename}`);
                        console.log(`   Media: ${mediaAsset.originalFilename}\n`);
                        urlDecodingMatches++;
                    } else {
                        console.log(`✅ EXACT: ${creatorName} - ${title}`);
                    }
                    
                    matchCount++;
                } else {
                    console.log(`⚠️ SKIPPED (${matchingMedia.length} duplicates): ${artwork.originalFilename}`);
                }
            } else {
                noMatchCount++;
            }
        }
        
        // Apply patches
        if (patches.length > 0) {
            console.log(`\n🔧 Applying ${patches.length} image links...`);
            
            for (const { id, patch } of patches) {
                await sanity.patch(id).set(patch).commit();
            }
            
            console.log('✅ All patches applied successfully!\n');
        }
        
        // Summary
        console.log('📊 SUMMARY:');
        console.log(`✅ Successfully linked: ${matchCount} artworks`);
        console.log(`🔗 URL decoding matches: ${urlDecodingMatches}`);
        console.log(`❌ No matches: ${noMatchCount}`);
        console.log(`📈 Success rate: ${Math.round((matchCount / artworks.length) * 100)}%`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

linkMediaWithUrlDecoding(); 