import sanity from '../../sanity-client.js';

async function analyzeSpecificPatterns() {
    try {
        console.log('📋 ANALYZING SPECIFIC FILENAME PATTERNS...\n');
        
        // Sample problematic filenames from our analysis
        const problematicFilenames = [
            'beate-brinkmann-bangle-endless2-1024x672.jpg',
            'beate-brinkmann-ring-endless2-1024x672.jpg', 
            'friedemann-buehler-schale-rot1-1024x672.jpg',
            'BuehlerWL18-1024x672.jpg',
            'B%C3%BChlerWL19-1024x672.jpg',
            'burggrafburggraf_Como_navy-1024x693.jpg',
            'carl-dau-anhaenger-monochrom4-1024x672.jpg'
        ];
        
        // Get media that might contain similar patterns
        const relevantMedia = await sanity.fetch(`
            *[_type == "sanity.imageAsset" && (
                originalFilename match "*brinkmann*" ||
                originalFilename match "*buehler*" || 
                originalFilename match "*burggraff*" ||
                originalFilename match "*carl-dau*" ||
                originalFilename match "*endless*" ||
                originalFilename match "*como*"
            )]{
                originalFilename
            }[0...50]
        `);
        
        console.log(`Found ${relevantMedia.length} potentially relevant media files\n`);
        
        console.log('🔍 PATTERN ANALYSIS:');
        console.log('==========================================\n');
        
        for (const filename of problematicFilenames) {
            console.log(`📄 ARTWORK: ${filename}`);
            
            // Extract base name without size suffix
            const baseName = filename.replace(/-\d+x\d+/, '').replace(/\.jpg$/, '');
            console.log(`   Base name: ${baseName}`);
            
            // Look for matches
            const matches = relevantMedia.filter(media => {
                const mediaBase = media.originalFilename.replace(/^\d+_/, '').replace(/\.jpg$/, '').toLowerCase();
                const artworkBase = baseName.toLowerCase();
                
                // Try different matching strategies
                return mediaBase.includes(artworkBase) || 
                       artworkBase.includes(mediaBase) ||
                       // Check without numbers/suffixes
                       mediaBase.replace(/\d+/g, '').includes(artworkBase.replace(/\d+/g, '')) ||
                       // URL decode check
                       decodeURIComponent(artworkBase).includes(mediaBase) ||
                       mediaBase.includes(decodeURIComponent(artworkBase));
            });
            
            if (matches.length > 0) {
                console.log(`   ✅ Found ${matches.length} potential matches:`);
                matches.forEach(match => {
                    console.log(`      - ${match.originalFilename}`);
                });
            } else {
                console.log(`   ❌ No matches found`);
                
                // Check for partial name matches
                const creatorName = baseName.split('-')[0] + '-' + baseName.split('-')[1];
                const creatorMatches = relevantMedia.filter(media => 
                    media.originalFilename.toLowerCase().includes(creatorName.toLowerCase())
                );
                
                if (creatorMatches.length > 0) {
                    console.log(`   🔍 Found ${creatorMatches.length} files by same creator:`);
                    creatorMatches.slice(0, 3).forEach(match => {
                        console.log(`      - ${match.originalFilename}`);
                    });
                }
            }
            
            console.log('');
        }
        
        // Additional analysis: show general media patterns
        console.log('\n📊 SAMPLE MEDIA FILENAMES FOR COMPARISON:');
        console.log('==========================================');
        relevantMedia.slice(0, 10).forEach((media, i) => {
            console.log(`${i+1}. ${media.originalFilename}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

analyzeSpecificPatterns(); 