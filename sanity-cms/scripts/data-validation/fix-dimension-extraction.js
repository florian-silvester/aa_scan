import sanity from '../../sanity-client.js';

/**
 * FIX DIMENSION EXTRACTION FROM RAW CAPTIONS
 * 
 * The original migration had faulty regex that only captured partial dimensions.
 * This script re-extracts dimensions from raw captions with better patterns.
 */

// Improved dimension extraction patterns
function extractDimensionsImproved(text) {
    if (!text) return null;
    
    // Remove HTML tags first
    const cleanText = text.replace(/<[^>]*>/g, ' ');
    
    // Enhanced patterns to capture full dimension strings
    const dimensionPatterns = [
        // Complex patterns with multiple dimensions: "20 × 7.5 cm, 18.5 × 11 cm"
        /\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*\s*cm(?:\s*,\s*\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*\s*cm)*/gi,
        
        // Three dimensions: "30,5 x 2,3 x 8 cm"
        /\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*\s*cm/gi,
        
        // Simple two dimensions: "126x197 cm"
        /\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*\s*cm/gi,
        
        // Height notation: "H 13,5 cm"
        /[HhWwDd]\.?\s*\d+[.,]?\d*\s*cm/gi,
        
        // Diameter: "Ø 15 cm" or "Dia. 20 cm"
        /(?:Ø|Dia\.?|diameter)\s*\d+[.,]?\d*\s*cm/gi,
        
        // Single dimension with context: "ca. 2 x 6 cm"
        /(?:ca\.?\s*)?\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*\s*cm/gi,
    ];
    
    // Try each pattern and return the first (usually most comprehensive) match
    for (const pattern of dimensionPatterns) {
        const matches = cleanText.match(pattern);
        if (matches && matches.length > 0) {
            // Return the longest match (most comprehensive)
            const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
            return longestMatch.trim();
        }
    }
    
    return null;
}

async function fixDimensionExtraction() {
    console.log('🔧 FIXING DIMENSION EXTRACTION FROM RAW CAPTIONS...\n');
    
    try {
        // Get all artworks with raw captions
        const artworks = await sanity.fetch(`
            *[_type == "artwork" && (defined(rawCaption.en) || defined(rawCaption.de))]{
                _id,
                workTitle,
                size,
                rawCaption,
                originalFilename
            }
        `);
        
        console.log(`📊 Found ${artworks.length} artworks with raw captions`);
        
        let fixed = 0;
        let improved = 0;
        let unchanged = 0;
        let errors = 0;
        
        console.log('\n🔍 Processing artworks...\n');
        
        for (let i = 0; i < artworks.length; i++) {
            const artwork = artworks[i];
            const title = artwork.workTitle?.en || artwork.workTitle?.de || 'Untitled';
            
            // Extract dimensions from raw caption (prefer English, fall back to German)
            const rawCaption = artwork.rawCaption?.en || artwork.rawCaption?.de || '';
            const extractedDimensions = extractDimensionsImproved(rawCaption);
            
            const currentSize = artwork.size?.en || artwork.size?.de || '';
            
            // Determine action needed
            let action = 'none';
            let newSize = null;
            
            if (extractedDimensions) {
                if (!currentSize || currentSize === '') {
                    // No size data, add extracted dimensions
                    action = 'add';
                    newSize = extractedDimensions;
                } else if (currentSize !== extractedDimensions) {
                    // Size data exists but different - check if extracted is more comprehensive
                    if (extractedDimensions.length > currentSize.length + 5) {
                        action = 'improve';
                        newSize = extractedDimensions;
                    } else {
                        action = 'none';
                    }
                }
            }
            
            // Apply updates
            try {
                if (action === 'add' || action === 'improve') {
                    await sanity.patch(artwork._id)
                        .set({
                            size: {
                                en: newSize,
                                de: newSize
                            }
                        })
                        .commit();
                        
                    if (action === 'add') {
                        fixed++;
                        console.log(`✅ [${i+1}/${artworks.length}] ADDED size to "${title}"`);
                        console.log(`   📏 New: "${newSize}"`);
                    } else {
                        improved++;
                        console.log(`⬆️  [${i+1}/${artworks.length}] IMPROVED "${title}"`);
                        console.log(`   📏 Old: "${currentSize}"`);
                        console.log(`   📏 New: "${newSize}"`);
                    }
                } else {
                    unchanged++;
                    if (i % 50 === 0) {
                        console.log(`➡️  [${i+1}/${artworks.length}] Processed ${i+1} artworks...`);
                    }
                }
            } catch (error) {
                errors++;
                console.log(`❌ [${i+1}/${artworks.length}] ERROR updating "${title}": ${error.message}`);
            }
        }
        
        console.log('\n🎉 DIMENSION EXTRACTION FIX COMPLETE!\n');
        console.log('📊 RESULTS:');
        console.log(`   ✅ Added dimensions: ${fixed}`);
        console.log(`   ⬆️  Improved dimensions: ${improved}`);
        console.log(`   ➡️  Unchanged: ${unchanged}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log(`   📊 Total processed: ${artworks.length}`);
        
        if (fixed + improved > 0) {
            console.log('\n💡 Refresh your Sanity Studio to see the updated dimensions!');
        }
        
    } catch (error) {
        console.error('❌ Script failed:', error);
        throw error;
    }
}

fixDimensionExtraction(); 