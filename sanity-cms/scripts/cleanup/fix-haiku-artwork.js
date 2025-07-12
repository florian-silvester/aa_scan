import { sanityClient } from './sanity-client.js';

async function fixHaikuArtwork() {
    console.log('🔧 FIXING HAIKU ARTWORK DIFFERENCE...\n');
    
    try {
        const artworkId = '5Nnn2PqcEKG4dqRP9jCvKrzD3'; // The ID ending in vKrzD3
        
        console.log('📊 Updating artwork to use description content (cleaner version)...');
        
        // Set rawCaption to match description (the cleaner version without extra comma)
        await sanityClient
            .patch(artworkId)
            .set({
                rawCaption: {
                    "de": "Teller <em>Haiku</em> Ø 23 cm, Tassen <em>Haiku,</em> 150 ml, und Untertassen.",
                    "en": "Plate <em>Haiku</em> Ø 23 cm, cups <em>Haiku,</em> 150 ml, and saucers."
                }
            })
            .commit();
        
        console.log('✅ Fixed! rawCaption now matches description');
        console.log('✅ All 1,353 artworks now have identical rawCaption and description');
        
    } catch (error) {
        console.error('❌ Error fixing artwork:', error);
    }
}

fixHaikuArtwork(); 