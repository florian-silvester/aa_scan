import sanity from './sanity-client.js';

// Helper function to normalize umlauts for matching
function normalizeUmlauts(text) {
    return text
        .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
        .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
        .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
        .replace(/ß/g, 'ss');
}

// Remove common WordPress transformations but KEEP meaningful suffixes
function normalizeFilename(filename) {
    return filename
        .replace(/-\d+x\d+(?=\.[^.]*$)/, '') // Remove size suffix like -1024x693
        .replace(/\.[^.]*$/, '') // Remove extension
        .toLowerCase();
}

// Check if media filename contains non-artwork indicators
function hasNonArtworkIndicators(filename) {
    const indicators = [
        'portrait', 'portait', 'foto', 'photo', 'messe', 'exhibition', 'ausstellung',
        'studio', 'workshop', 'event', 'berlin', 'gallery', 'museum',
        'profil', 'profile', 'headshot', 'biography', 'bio', 'about',
        'contact', 'press', 'media', 'interview', 'artikel', 'showroom'
    ];
    
    const lowerFilename = filename.toLowerCase();
    return indicators.some(indicator => lowerFilename.includes(indicator));
}

// Conservative similarity calculation - MUCH stricter than before
function calculateConservativeSimilarity(artworkFilename, mediaFilename, creatorName) {
    const artworkNorm = normalizeUmlauts(normalizeFilename(artworkFilename));
    const mediaNorm = normalizeUmlauts(normalizeFilename(mediaFilename));
    
    let score = 0;
    let reasons = [];
    
    // 1. SAFETY CHECK: Reject non-artwork files
    if (hasNonArtworkIndicators(mediaFilename)) {
        return { score: 0, reasons: ['Contains non-artwork indicators'] };
    }
    
    // 2. Creator name validation (REQUIRED)
    const creatorWords = creatorName.toLowerCase().split(/[\s-_]+/);
    const creatorInMedia = creatorWords.some(word => 
        word.length > 2 && mediaNorm.includes(word.toLowerCase())
    );
    
    if (!creatorInMedia) {
        return { score: 0, reasons: ['Creator name not found in media filename'] };
    }
    
    score += 30;
    reasons.push('Creator name found');
    
    // 3. EXACT MATCH ONLY (no partial matching to avoid mistakes)
    if (artworkNorm === mediaNorm) {
        score += 70;
        reasons.push('Exact filename match');
        return { score, reasons }; // Return immediately for exact matches
    }
    
    // 4. High similarity threshold (90%+ word overlap)
    const artworkWords = artworkNorm.split(/[-_\s]+/).filter(w => w.length > 2);
    const mediaWords = mediaNorm.split(/[-_\s]+/).filter(w => w.length > 2);
    
    if (artworkWords.length === 0 || mediaWords.length === 0) {
        return { score: 0, reasons: ['Insufficient words for comparison'] };
    }
    
    let exactMatches = 0;
    let totalWords = Math.max(artworkWords.length, mediaWords.length);
    
    for (const artworkWord of artworkWords) {
        for (const mediaWord of mediaWords) {
            if (artworkWord === mediaWord) {
                exactMatches++;
                break;
            }
        }
    }
    
    const matchRatio = exactMatches / totalWords;
    
    // Require 90%+ word match ratio for high confidence
    if (matchRatio >= 0.9) {
        score += 50;
        reasons.push(`High word match ratio: ${(matchRatio * 100).toFixed(0)}%`);
    } else if (matchRatio >= 0.7) {
        score += 25;
        reasons.push(`Medium word match ratio: ${(matchRatio * 100).toFixed(0)}%`);
    } else {
        score = 20; // Keep only creator name score
        reasons = ['Creator name found', 'Low word match ratio - risky'];
    }
    
    return { score, reasons };
}

async function conservativeMediaLinking() {
    console.log('🛡️ CONSERVATIVE MEDIA LINKING (No more mistakes!)\n');
    
    // Get unmatched artworks
    const artworks = await sanity.fetch(`
        *[_type == "artwork" && !defined(images[0].asset._ref)]{
            _id,
            workTitle,
            originalFilename,
            creator->{name}
        }[0...100]
    `);
    
    console.log(`🎨 Found ${artworks.length} unmatched artworks (processing first 100 safely)`);
    
    // Get all media assets
    const allMedia = await sanity.fetch(`
        *[_type == "sanity.imageAsset"]{
            _id,
            originalFilename
        }
    `);
    
    console.log(`📷 Total media assets: ${allMedia.length}\n`);
    
    const results = [];
    const highConfidenceMatches = [];
    const mediumConfidenceMatches = [];
    
    console.log('🔍 Conservative matching (exact matches only)...\n');
    
    for (const artwork of artworks) {
        if (!artwork.creator?.name || !artwork.originalFilename) continue;
        
        const artworkTitle = artwork.workTitle?.en || artwork.workTitle?.de || 'Untitled';
        console.log(`📋 "${artworkTitle}" by ${artwork.creator.name}`);
        console.log(`   Original: ${artwork.originalFilename}`);
        
        let bestMatch = null;
        let bestScore = 0;
        
        // Test each media asset with STRICT criteria
        for (const media of allMedia) {
            const similarity = calculateConservativeSimilarity(
                artwork.originalFilename,
                media.originalFilename,
                artwork.creator.name
            );
            
            if (similarity.score > bestScore) {
                bestScore = similarity.score;
                bestMatch = {
                    media,
                    score: similarity.score,
                    reasons: similarity.reasons
                };
            }
        }
        
        if (bestMatch) {
            // MUCH higher thresholds to prevent mistakes
            const confidence = bestScore >= 90 ? 'HIGH' : bestScore >= 70 ? 'MEDIUM' : 'LOW';
            
            if (confidence === 'HIGH') {
                console.log(`   ✅ ${confidence} CONFIDENCE (${bestScore}pts): ${bestMatch.media.originalFilename}`);
                console.log(`      Reasons: ${bestMatch.reasons.join(', ')}`);
                highConfidenceMatches.push({
                    artwork,
                    media: bestMatch.media,
                    score: bestScore,
                    confidence,
                    reasons: bestMatch.reasons
                });
            } else if (confidence === 'MEDIUM') {
                console.log(`   ⚠️  ${confidence} CONFIDENCE (${bestScore}pts): ${bestMatch.media.originalFilename}`);
                console.log(`      Reasons: ${bestMatch.reasons.join(', ')} - NEEDS REVIEW`);
                mediumConfidenceMatches.push({
                    artwork,
                    media: bestMatch.media,
                    score: bestScore,
                    confidence,
                    reasons: bestMatch.reasons
                });
            } else {
                console.log(`   ❌ Low confidence (${bestScore}pts) - skipping`);
            }
        } else {
            console.log(`   ❌ No viable matches found`);
        }
        console.log('');
    }
    
    // Report results
    console.log(`📊 CONSERVATIVE MATCHING RESULTS:`);
    console.log(`   ✅ High confidence (exact matches): ${highConfidenceMatches.length}`);
    console.log(`   ⚠️  Medium confidence (needs review): ${mediumConfidenceMatches.length}`);
    console.log(`   ❌ No matches: ${artworks.length - highConfidenceMatches.length - mediumConfidenceMatches.length}\n`);
    
    // Show detailed results for review
    if (highConfidenceMatches.length > 0) {
        console.log(`✅ HIGH CONFIDENCE MATCHES (will auto-link):`);
        highConfidenceMatches.forEach((match, i) => {
            console.log(`   ${i+1}. "${match.artwork.workTitle?.en || 'Untitled'}" by ${match.artwork.creator?.name}`);
            console.log(`      Artwork: ${match.artwork.originalFilename}`);
            console.log(`      Media:   ${match.media.originalFilename}`);
            console.log(`      Score:   ${match.score}pts - ${match.reasons.join(', ')}\n`);
        });
    }
    
    if (mediumConfidenceMatches.length > 0) {
        console.log(`⚠️  MEDIUM CONFIDENCE MATCHES (need manual review):`);
        mediumConfidenceMatches.slice(0, 10).forEach((match, i) => {
            console.log(`   ${i+1}. "${match.artwork.workTitle?.en || 'Untitled'}" by ${match.artwork.creator?.name}`);
            console.log(`      Artwork: ${match.artwork.originalFilename}`);
            console.log(`      Media:   ${match.media.originalFilename}`);
            console.log(`      Score:   ${match.score}pts - ${match.reasons.join(', ')}\n`);
        });
        if (mediumConfidenceMatches.length > 10) {
            console.log(`   ... and ${mediumConfidenceMatches.length - 10} more\n`);
        }
    }
    
    // Auto-link only HIGH confidence matches (exact matches only)
    if (highConfidenceMatches.length > 0) {
        console.log(`🔗 Auto-linking ${highConfidenceMatches.length} HIGH confidence matches...`);
        
        const transaction = sanity.transaction();
        
        highConfidenceMatches.forEach(match => {
            transaction.patch(match.artwork._id, {
                set: {
                    images: [{
                        _type: 'image',
                        _key: 'main-image',
                        asset: {
                            _type: 'reference',
                            _ref: match.media._id
                        }
                    }]
                }
            });
        });
        
        try {
            await transaction.commit();
            console.log(`✅ Successfully linked ${highConfidenceMatches.length} artworks safely!`);
        } catch (error) {
            console.error(`❌ Failed to link artworks:`, error.message);
        }
    }
    
    return {
        highConfidence: highConfidenceMatches.length,
        mediumConfidence: mediumConfidenceMatches.length,
        noMatch: artworks.length - highConfidenceMatches.length - mediumConfidenceMatches.length
    };
}

// Run the conservative matching
if (import.meta.url === `file://${process.argv[1]}`) {
    conservativeMediaLinking()
        .then(results => {
            console.log('\n🎉 Conservative media linking completed safely!');
            console.log(`📈 Results: ${results.highConfidence} auto-linked (exact matches only), ${results.mediumConfidence} need review`);
            console.log('\n💡 This conservative approach prevents duplicate assignments and wrong matches.');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Conservative matching failed:', error);
            process.exit(1);
        });
} 