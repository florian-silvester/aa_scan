import sanity from '../../sanity-client.js';

/**
 * CONSERVATIVE HYPHEN FORMAT MATCHING
 * 
 * ONLY handles safe formatting differences like:
 * ✅ endless2 <-> endless-2 (same number, different hyphen format)
 * 
 * AVOIDS risky number variations like:
 * ❌ monochrom4 <-> monochrom-6 (different numbers = different artworks!)
 */

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

// Normalize filename for comparison
function normalizeFilename(filename) {
    if (!filename) return '';
    
    let normalized = filename.toLowerCase().trim();
    normalized = stripPrependedNumbers(normalized);
    normalized = stripWordPressSizes(normalized);
    
    return normalized;
}

// Create hyphen format variations (endless2 -> endless-2, endless2)
function createHyphenVariations(filename) {
    const variations = [filename];
    
    // Convert "word2" to "word-2" pattern
    const withHyphens = filename.replace(/([a-z])(\d+)/g, '$1-$2');
    if (withHyphens !== filename) {
        variations.push(withHyphens);
    }
    
    // Convert "word-2" to "word2" pattern  
    const withoutHyphens = filename.replace(/([a-z])-(\d+)/g, '$1$2');
    if (withoutHyphens !== filename) {
        variations.push(withoutHyphens);
    }
    
    return [...new Set(variations)]; // Remove duplicates
}

async function linkMediaWithHyphenFormat() {
    try {
        console.log('🔗 LINKING MEDIA - HYPHEN FORMAT ONLY...\n');
        
        // Get unlinked artworks
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
        
        // Create media lookup map with hyphen variations
        const mediaMap = new Map();
        mediaAssets.forEach(asset => {
            if (asset.originalFilename) {
                const normalizedFilename = normalizeFilename(asset.originalFilename);
                const variations = createHyphenVariations(normalizedFilename);
                
                variations.forEach(variation => {
                    if (!mediaMap.has(variation)) {
                        mediaMap.set(variation, []);
                    }
                    mediaMap.get(variation).push(asset);
                });
            }
        });
        
        let matchCount = 0;
        let noMatchCount = 0;
        let hyphenFormatMatches = 0;
        const patches = [];
        
        // Process each artwork
        for (const artwork of artworks) {
            if (!artwork.originalFilename) continue;
            
            const artworkFilename = normalizeFilename(artwork.originalFilename);
            const artworkVariations = createHyphenVariations(artworkFilename);
            
            let foundMatch = false;
            
            // Try each variation
            for (const variation of artworkVariations) {
                if (mediaMap.has(variation)) {
                    const matchingMedia = mediaMap.get(variation);
                    
                    if (matchingMedia.length === 1) {
                        const mediaAsset = matchingMedia[0];
                        
                        // Check if this was a hyphen format difference
                        const isHyphenFormatMatch = variation !== artworkFilename;
                        
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
                        
                        if (isHyphenFormatMatch) {
                            console.log(`✅ HYPHEN FORMAT: ${creatorName} - ${title}`);
                            console.log(`   Artwork: ${artwork.originalFilename}`);
                            console.log(`   Media: ${mediaAsset.originalFilename}`);
                            console.log(`   Matched via: ${artworkFilename} -> ${variation}\n`);
                            hyphenFormatMatches++;
                        } else {
                            console.log(`✅ EXACT: ${creatorName} - ${title}`);
                        }
                        
                        matchCount++;
                        foundMatch = true;
                        break;
                    } else if (matchingMedia.length > 1) {
                        console.log(`⚠️ SKIPPED (${matchingMedia.length} duplicates): ${artwork.originalFilename}`);
                        foundMatch = true;
                        break;
                    }
                }
            }
            
            if (!foundMatch) {
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
        console.log(`🔗 Hyphen format matches: ${hyphenFormatMatches}`);
        console.log(`❌ No matches: ${noMatchCount}`);
        console.log(`📈 Success rate: ${Math.round((matchCount / artworks.length) * 100)}%`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

linkMediaWithHyphenFormat(); 