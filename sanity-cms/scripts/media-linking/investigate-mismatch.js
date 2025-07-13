import sanity from '../../sanity-client.js';

async function investigateMismatch() {
    try {
        console.log('🔍 INVESTIGATING 27% MISMATCH');
        console.log('==============================\n');
        
        // Get unlinked artworks
        const unlinkedArtworks = await sanity.fetch(`
            *[_type == "artwork" && !defined(images[0].asset._ref) && defined(originalFilename)][0...20]{
                originalFilename,
                workTitle,
                creator->{name}
            }
        `);
        
        console.log(`Analyzing ${unlinkedArtworks.length} unlinked artwork filenames...\n`);
        
        // Analyze filename patterns
        const patterns = {
            wordPressSize: 0,    // -1024x672.jpg
            urlEncoded: 0,       // %C3%BC
            specialChars: 0,     // unusual characters
            veryLong: 0,         // suspiciously long names
            timestamped: 0,      // e1407329737734
            numbered: 0          // ending in numbers
        };
        
        console.log('📋 SAMPLE UNLINKED FILENAMES:');
        console.log('============================');
        
        unlinkedArtworks.forEach((artwork, i) => {
            const filename = artwork.originalFilename;
            const title = artwork.workTitle?.en || artwork.workTitle || 'Untitled';
            const creator = artwork.creator?.name?.en || artwork.creator?.name || 'Unknown';
            
            console.log(`${i+1}. ${creator} - ${title}`);
            console.log(`   Filename: ${filename}`);
            
            // Pattern analysis
            if (/-\d+x\d+/.test(filename)) patterns.wordPressSize++;
            if (/%[0-9A-Fa-f]{2}/.test(filename)) patterns.urlEncoded++;
            if (/[^a-zA-Z0-9._%-]/.test(filename)) patterns.specialChars++;
            if (filename.length > 80) patterns.veryLong++;
            if (/e\d{10,}/.test(filename)) patterns.timestamped++;
            if (/\d+[^.]*\.jpg$/.test(filename)) patterns.numbered++;
            
            // Check for obvious issues
            const issues = [];
            if (filename.includes('%')) issues.push('URL encoded');
            if (filename.includes('e14073')) issues.push('Timestamp');
            if (filename.length > 80) issues.push('Very long');
            if (/[^a-zA-Z0-9._%-]/.test(filename)) issues.push('Special chars');
            
            if (issues.length > 0) {
                console.log(`   ⚠️  Issues: ${issues.join(', ')}`);
            }
            
            console.log('');
        });
        
        // Summary
        console.log('📊 PATTERN ANALYSIS:');
        console.log('===================');
        Object.entries(patterns).forEach(([pattern, count]) => {
            const percentage = Math.round((count / unlinkedArtworks.length) * 100);
            console.log(`${pattern}: ${count}/${unlinkedArtworks.length} (${percentage}%)`);
        });
        
        // Now check if these filenames exist in a different format in media
        console.log('\n🔍 CHECKING FOR ALTERNATE FORMATS IN MEDIA:');
        console.log('============================================');
        
        // Get media filenames for comparison
        const mediaAssets = await sanity.fetch(`
            *[_type == "sanity.imageAsset"]{originalFilename}[0...1000]
        `);
        
        const mediaFilenames = new Set(mediaAssets.map(m => m.originalFilename?.toLowerCase()));
        
        // Check first few unlinked filenames
        for (let i = 0; i < Math.min(5, unlinkedArtworks.length); i++) {
            const artwork = unlinkedArtworks[i];
            const filename = artwork.originalFilename;
            
            console.log(`\nChecking: ${filename}`);
            
            // Try different variations
            const variations = [
                filename.toLowerCase(),
                filename.replace(/-\d+x\d+/, ''),  // Remove size
                decodeURIComponent(filename.toLowerCase()),  // URL decode
                filename.replace(/e\d{10,}-/, ''),  // Remove timestamp
                '.*' + filename.split('-').slice(-2).join('-').toLowerCase() // Last two parts
            ];
            
            let found = false;
            for (const variation of variations) {
                if (mediaFilenames.has(variation)) {
                    console.log(`   ✅ Found variation: ${variation}`);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                // Check for partial matches
                const baseName = filename.toLowerCase().replace(/-\d+x\d+/, '').replace(/\.jpg$/, '');
                const partialMatches = Array.from(mediaFilenames).filter(media => 
                    media && (media.includes(baseName.split('-')[0]) || baseName.includes(media.split('_')[1]?.split('-')[0] || ''))
                ).slice(0, 2);
                
                if (partialMatches.length > 0) {
                    console.log(`   🔍 Partial matches: ${partialMatches.join(', ')}`);
                } else {
                    console.log(`   ❌ No matches found`);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

investigateMismatch(); 