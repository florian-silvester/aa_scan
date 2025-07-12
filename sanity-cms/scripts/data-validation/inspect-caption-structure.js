import { sanityClient } from './sanity-client.js';

async function inspectCaptionStructure() {
    console.log('🔍 INSPECTING CAPTION STRUCTURE...\n');
    
    try {
        // Get first 3 artworks with detailed field inspection
        const artworks = await sanityClient.fetch(`
            *[_type == "artwork"][0...3]{
                _id,
                name,
                description,
                rawCaption,
                creator->{
                    name
                }
            }
        `);
        
        artworks.forEach((artwork, i) => {
            console.log(`\n📋 ARTWORK ${i + 1}: ${artwork.name} by ${artwork.creator?.name}`);
            console.log(`ID: ${artwork._id.slice(-6)}`);
            
            console.log('\n🔤 RAW CAPTION:');
            console.log('Type:', typeof artwork.rawCaption);
            console.log('Value:', JSON.stringify(artwork.rawCaption, null, 2));
            
            console.log('\n📝 DESCRIPTION:');
            console.log('Type:', typeof artwork.description);
            console.log('Value:', JSON.stringify(artwork.description, null, 2));
            
            console.log('\n🔄 COMPARISON:');
            console.log('Are they equal?', JSON.stringify(artwork.rawCaption) === JSON.stringify(artwork.description));
            console.log('Are they the same reference?', artwork.rawCaption === artwork.description);
            
            console.log('\n' + '='.repeat(80));
        });
        
    } catch (error) {
        console.error('❌ Error inspecting captions:', error);
    }
}

inspectCaptionStructure(); 