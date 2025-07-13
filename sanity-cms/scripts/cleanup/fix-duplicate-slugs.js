import { sanityClient } from './sanity-client.js';

// Helper function to create slug from text
function createSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim('-'); // Remove leading/trailing hyphens
}

// Helper function to extract meaningful name from filename
function extractNameFromFilename(filename) {
    if (!filename) return null;
    
    // Remove file extension and ID prefix
    let name = filename.replace(/\.(jpg|jpeg|png)$/i, '');
    name = name.replace(/^\d+_/, ''); // Remove ID prefix like "1000_"
    
    // Replace dashes and underscores with spaces
    name = name.replace(/[-_]/g, ' ');
    
    // Capitalize words
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    
    return name.trim();
}

async function fixDuplicateSlugs() {
    console.log('🔧 FIXING DUPLICATE SLUGS AND NULL NAMES...\n');
    
    try {
        // Get all artworks with their names, slugs, and images
        const artworks = await sanityClient.fetch(`
            *[_type == "artwork"]{
                _id,
                name,
                slug,
                creator->{
                    name
                },
                images[]{
                    asset->{
                        originalFilename,
                        url
                    }
                }
            }
        `);
        
        console.log(`📊 Total artworks: ${artworks.length}`);
        
        let fixedCount = 0;
        let errorCount = 0;
        
        // Process in batches
        const batchSize = 20;
        
        for (let i = 0; i < artworks.length; i += batchSize) {
            const batch = artworks.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(artworks.length / batchSize);
            
            console.log(`📦 Processing batch ${batchNum}/${totalBatches}...`);
            
            const updatePromises = batch.map(async (artwork) => {
                try {
                    let needsUpdate = false;
                    let newName = artwork.name;
                    let newSlug = artwork.slug?.current;
                    
                    // Fix null names first
                    if (!newName || newName === 'null') {
                        // Try to get name from first image filename
                        const firstImage = artwork.images?.[0];
                        if (firstImage?.asset?.originalFilename) {
                            newName = extractNameFromFilename(firstImage.asset.originalFilename);
                        }
                        
                        // Fallback to creator name + ID
                        if (!newName) {
                            newName = `${artwork.creator?.name || 'Unknown'} Artwork ${artwork._id.slice(-6)}`;
                        }
                        
                        needsUpdate = true;
                    }
                    
                    // Create base slug from name
                    const baseSlug = createSlug(newName);
                    
                    // Check if slug needs to be unique
                    if (!newSlug || newSlug === 'untitled' || baseSlug !== newSlug) {
                        // Check if base slug exists
                        const existingWithSlug = await sanityClient.fetch(
                            `*[_type == "artwork" && slug.current == $slug && _id != $id]`,
                            { slug: baseSlug, id: artwork._id }
                        );
                        
                        if (existingWithSlug.length > 0) {
                            // Make slug unique by adding creator name and ID
                            const creatorSlug = createSlug(artwork.creator?.name || 'unknown');
                            newSlug = `${baseSlug}-${creatorSlug}-${artwork._id.slice(-6)}`;
                        } else {
                            newSlug = baseSlug;
                        }
                        
                        needsUpdate = true;
                    }
                    
                    // Update if needed
                    if (needsUpdate) {
                        await sanityClient
                            .patch(artwork._id)
                            .set({
                                name: newName,
                                slug: { current: newSlug, _type: 'slug' }
                            })
                            .commit();
                        
                        return { 
                            status: 'success', 
                            id: artwork._id, 
                            oldName: artwork.name,
                            newName: newName,
                            oldSlug: artwork.slug?.current,
                            newSlug: newSlug
                        };
                    }
                    
                    return { status: 'skipped', id: artwork._id };
                    
                } catch (error) {
                    return { 
                        status: 'error', 
                        id: artwork._id, 
                        error: error.message 
                    };
                }
            });
            
            const results = await Promise.all(updatePromises);
            
            // Process results
            results.forEach(result => {
                if (result.status === 'success') {
                    fixedCount++;
                    console.log(`✅ ${result.id.slice(-6)}: "${result.oldName}" → "${result.newName}" (slug: ${result.newSlug})`);
                } else if (result.status === 'error') {
                    errorCount++;
                    console.log(`❌ ${result.id.slice(-6)}: ${result.error}`);
                }
            });
            
            console.log(`📊 Batch ${batchNum}: ${fixedCount} total fixed, ${errorCount} total errors`);
            
            // Small delay between batches
            if (i + batchSize < artworks.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`\n🎉 SLUG FIX COMPLETE!`);
        console.log(`📊 Results:`);
        console.log(`  - Fixed: ${fixedCount}`);
        console.log(`  - Errors: ${errorCount}`);
        console.log(`  - Skipped: ${artworks.length - fixedCount - errorCount}`);
        
        // Verify no more duplicates
        console.log('\n🔍 Verifying fixes...');
        const slugCheck = await sanityClient.fetch(`
            *[_type == "artwork"]{
                "slug": slug.current
            } | {
                "slug": slug,
                "count": count(*)
            } [count > 1]
        `);
        
        if (slugCheck.length === 0) {
            console.log('✅ No duplicate slugs remaining!');
        } else {
            console.log(`⚠️ Still ${slugCheck.length} duplicate slug groups found`);
        }
        
    } catch (error) {
        console.error('❌ Error fixing slugs:', error);
    }
}

fixDuplicateSlugs(); 