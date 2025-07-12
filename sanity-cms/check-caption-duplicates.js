import { sanityClient } from './sanity-client.js';

// Helper function to extract text from various data types
function extractText(field) {
    if (!field) return '';
    
    if (typeof field === 'string') {
        return field.trim();
    }
    
    if (Array.isArray(field)) {
        // Handle Sanity blocks format
        return field.map(block => {
            if (block.children) {
                return block.children.map(child => child.text || '').join('');
            }
            return block.text || '';
        }).join(' ').trim();
    }
    
    if (typeof field === 'object' && field.text) {
        return field.text.trim();
    }
    
    // Try to stringify if it's some other object
    return String(field).trim();
}

async function checkCaptionDuplicates() {
    console.log('🔍 CHECKING FOR DUPLICATE CAPTIONS AND DESCRIPTIONS...\n');
    
    try {
        // Get all artworks with caption and description fields
        const artworks = await sanityClient.fetch(`
            *[_type == "artwork"]{
                _id,
                name,
                description,
                rawCaption,
                creator->{
                    name
                }
            }
        `);
        
        console.log(`📊 Total artworks: ${artworks.length}`);
        
        let hasRawCaption = 0;
        let hasDescription = 0;
        let hasBoth = 0;
        let duplicates = 0;
        let emptyRawCaptions = 0;
        let emptyDescriptions = 0;
        
        const duplicateExamples = [];
        
        artworks.forEach(artwork => {
            const rawCaption = extractText(artwork.rawCaption);
            const description = extractText(artwork.description);
            
            if (rawCaption && rawCaption.length > 0) hasRawCaption++;
            if (description && description.length > 0) hasDescription++;
            if (rawCaption && description && rawCaption.length > 0 && description.length > 0) hasBoth++;
            
            if (!rawCaption || rawCaption === '') emptyRawCaptions++;
            if (!description || description === '') emptyDescriptions++;
            
            // Check if they're identical
            if (rawCaption && description && rawCaption === description && rawCaption.length > 0) {
                duplicates++;
                if (duplicateExamples.length < 10) {
                    duplicateExamples.push({
                        id: artwork._id,
                        name: artwork.name,
                        creator: artwork.creator?.name,
                        content: rawCaption.substring(0, 100) + (rawCaption.length > 100 ? '...' : '')
                    });
                }
            }
        });
        
        console.log(`\n📊 FIELD ANALYSIS:`);
        console.log(`- Artworks with rawCaption: ${hasRawCaption}`);
        console.log(`- Artworks with description: ${hasDescription}`);
        console.log(`- Artworks with both fields: ${hasBoth}`);
        console.log(`- Empty rawCaptions: ${emptyRawCaptions}`);
        console.log(`- Empty descriptions: ${emptyDescriptions}`);
        
        console.log(`\n🔄 DUPLICATION ANALYSIS:`);
        console.log(`- Identical rawCaption & description: ${duplicates}`);
        console.log(`- Potential cleanup savings: ${duplicates} redundant fields`);
        
        if (duplicateExamples.length > 0) {
            console.log(`\n📋 EXAMPLES OF IDENTICAL CONTENT:`);
            duplicateExamples.forEach((example, i) => {
                console.log(`\n${i + 1}. ${example.name} by ${example.creator}`);
                console.log(`   ID: ${example.id.slice(-6)}`);
                console.log(`   Content: "${example.content}"`);
            });
        }
        
        // Check for cases where one is empty but the other has content
        let canTransfer = 0;
        const transferExamples = [];
        
        artworks.forEach(artwork => {
            const rawCaption = extractText(artwork.rawCaption);
            const description = extractText(artwork.description);
            
            // Raw caption has content but description is empty
            if (rawCaption && rawCaption.length > 0 && (!description || description.length === 0)) {
                canTransfer++;
                if (transferExamples.length < 5) {
                    transferExamples.push({
                        id: artwork._id,
                        name: artwork.name,
                        creator: artwork.creator?.name,
                        type: 'rawCaption → description',
                        content: rawCaption.substring(0, 100) + (rawCaption.length > 100 ? '...' : '')
                    });
                }
            }
            // Description has content but raw caption is empty  
            else if (description && description.length > 0 && (!rawCaption || rawCaption.length === 0)) {
                canTransfer++;
                if (transferExamples.length < 5) {
                    transferExamples.push({
                        id: artwork._id,
                        name: artwork.name,
                        creator: artwork.creator?.name,
                        type: 'description → rawCaption',
                        content: description.substring(0, 100) + (description.length > 100 ? '...' : '')
                    });
                }
            }
        });
        
        if (canTransfer > 0) {
            console.log(`\n📤 TRANSFER OPPORTUNITIES:`);
            console.log(`- ${canTransfer} artworks where content could be consolidated`);
            
            if (transferExamples.length > 0) {
                console.log(`\n📋 TRANSFER EXAMPLES:`);
                transferExamples.forEach((example, i) => {
                    console.log(`\n${i + 1}. ${example.name} by ${example.creator}`);
                    console.log(`   ID: ${example.id.slice(-6)}`);
                    console.log(`   Transfer: ${example.type}`);
                    console.log(`   Content: "${example.content}"`);
                });
            }
        }
        
        console.log(`\n🛠️ CLEANUP RECOMMENDATIONS:`);
        if (duplicates > 0) {
            console.log(`✅ Remove ${duplicates} redundant rawCaption fields (identical to description)`);
        }
        if (canTransfer > 0) {
            console.log(`✅ Consolidate ${canTransfer} single-field content into preferred field`);
        }
        if (duplicates === 0 && canTransfer === 0) {
            console.log(`✅ No cleanup needed - fields are properly differentiated`);
        }
        
    } catch (error) {
        console.error('❌ Error checking captions:', error);
    }
}

checkCaptionDuplicates(); 