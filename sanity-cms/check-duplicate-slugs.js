import { sanityClient } from './sanity-client.js';

async function checkDuplicateSlugs() {
    console.log('🔍 CHECKING FOR DUPLICATE ARTWORK NAMES AND SLUGS...\n');
    
    try {
        // Get all artworks with their names and slugs
        const artworks = await sanityClient.fetch(`
            *[_type == "artwork"]{
                _id,
                name,
                slug,
                creator->{
                    name
                }
            }
        `);
        
        console.log(`📊 Total artworks: ${artworks.length}`);
        
        // Check for duplicate names
        const nameGroups = {};
        const slugGroups = {};
        
        artworks.forEach(artwork => {
            const name = artwork.name;
            const slug = artwork.slug?.current;
            
            // Group by name
            if (name) {
                if (!nameGroups[name]) {
                    nameGroups[name] = [];
                }
                nameGroups[name].push(artwork);
            }
            
            // Group by slug
            if (slug) {
                if (!slugGroups[slug]) {
                    slugGroups[slug] = [];
                }
                slugGroups[slug].push(artwork);
            }
        });
        
        // Find duplicates
        const duplicateNames = Object.entries(nameGroups).filter(([name, artworks]) => artworks.length > 1);
        const duplicateSlugs = Object.entries(slugGroups).filter(([slug, artworks]) => artworks.length > 1);
        
        console.log(`\n📊 DUPLICATE ANALYSIS:`);
        console.log(`- Duplicate names: ${duplicateNames.length}`);
        console.log(`- Duplicate slugs: ${duplicateSlugs.length}`);
        
        if (duplicateNames.length > 0) {
            console.log(`\n🔴 DUPLICATE NAMES:`);
            duplicateNames.slice(0, 10).forEach(([name, artworks]) => {
                console.log(`\n"${name}" (${artworks.length} artworks):`);
                artworks.forEach(artwork => {
                    console.log(`  - ${artwork._id} by ${artwork.creator?.name || 'Unknown'} (slug: ${artwork.slug?.current || 'none'})`);
                });
            });
            
            if (duplicateNames.length > 10) {
                console.log(`\n... and ${duplicateNames.length - 10} more duplicate name groups`);
            }
        }
        
        if (duplicateSlugs.length > 0) {
            console.log(`\n🔴 DUPLICATE SLUGS:`);
            duplicateSlugs.slice(0, 10).forEach(([slug, artworks]) => {
                console.log(`\n"${slug}" (${artworks.length} artworks):`);
                artworks.forEach(artwork => {
                    console.log(`  - ${artwork._id}: "${artwork.name}" by ${artwork.creator?.name || 'Unknown'}`);
                });
            });
            
            if (duplicateSlugs.length > 10) {
                console.log(`\n... and ${duplicateSlugs.length - 10} more duplicate slug groups`);
            }
        }
        
        // Check for missing slugs
        const missingSlugArtworks = artworks.filter(artwork => !artwork.slug?.current);
        if (missingSlugArtworks.length > 0) {
            console.log(`\n⚠️ MISSING SLUGS: ${missingSlugArtworks.length} artworks`);
            missingSlugArtworks.slice(0, 5).forEach(artwork => {
                console.log(`  - ${artwork._id}: "${artwork.name}" by ${artwork.creator?.name || 'Unknown'}`);
            });
        }
        
        if (duplicateNames.length === 0 && duplicateSlugs.length === 0 && missingSlugArtworks.length === 0) {
            console.log('\n✅ No duplicate names, slugs, or missing slugs found!');
        } else {
            console.log(`\n🛠️ SUMMARY:`);
            console.log(`- ${duplicateNames.length} name groups with duplicates`);
            console.log(`- ${duplicateSlugs.length} slug groups with duplicates`);
            console.log(`- ${missingSlugArtworks.length} artworks missing slugs`);
        }
        
    } catch (error) {
        console.error('❌ Error checking duplicates:', error);
    }
}

checkDuplicateSlugs(); 