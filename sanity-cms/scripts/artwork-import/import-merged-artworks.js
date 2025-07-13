import sanity from './sanity-client.js';
import fs from 'fs';

// Read the merged artwork data
const mergedDataFile = JSON.parse(fs.readFileSync('../merged-artwork-data.json', 'utf8'));
const mergedData = mergedDataFile.artworks;
console.log(`📁 Loading merged data... found ${mergedData.length} artworks`);

async function findCreatorByName(creatorName) {
    console.log(`🔍 Looking for creator: ${creatorName}`);
    
    // Try exact match first
    let query = `*[_type == "creator" && name match "${creatorName}"][0]`;
    let result = await sanity.fetch(query);
    
    if (result) {
        console.log(`✅ Found exact match: ${result.name}`);
        return result;
    }
    
    // Try fuzzy matching
    const nameParts = creatorName.split(/[\s,&\/]/).filter(part => part.length > 2);
    for (const part of nameParts) {
        query = `*[_type == "creator" && name match "*${part}*"][0]`;
        result = await sanity.fetch(query);
        if (result) {
            console.log(`✅ Found fuzzy match: ${result.name} (searched: ${part})`);
            return result;
        }
    }
    
    console.log(`❌ No creator found for: ${creatorName}`);
    return null;
}

async function createArtworkDocument(artworkData) {
    const {filename, title, creator, description, materials, dimensions, imageUrl, rawCaption} = artworkData;
    
    console.log(`\n📝 Creating artwork: ${title}`);
    console.log(`   Creator: ${creator}`);
    console.log(`   Materials: ${materials?.join(', ') || 'None'}`);
    console.log(`   Dimensions: ${dimensions || 'None'}`);
    
    // Find the creator
    const creatorRef = await findCreatorByName(creator);
    
    // Create the artwork document
    const artworkDoc = {
        _type: 'artwork',
        workTitle: {
            en: title,
            de: title  // Using same title for now - could be enhanced later
        },
        creator: creatorRef ? {_type: 'reference', _ref: creatorRef._id} : null,
        material: {
            en: materials?.join(', ') || '',
            de: materials?.join(', ') || ''
        },
        size: {
            en: dimensions || '',
            de: dimensions || ''
        },
        description: {
            en: description?.en || '',
            de: description?.de || ''
        },
        rawCaption: {
            en: rawCaption || '',
            de: rawCaption || ''
        },
        originalFilename: filename,
        // Images will be added later when we match media assets
        images: []
    };
    
    try {
        const result = await sanity.create(artworkDoc);
        console.log(`✅ Created artwork: ${result._id}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to create artwork: ${error.message}`);
        return null;
    }
}

async function importArtworks() {
    console.log(`🎨 Starting artwork import...`);
    console.log(`📊 Total artworks to import: ${mergedData.length}`);
    
    const results = {
        created: 0,
        failed: 0,
        total: mergedData.length
    };
    
    // Process in batches of 10 to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < mergedData.length; i += batchSize) {
        const batch = mergedData.slice(i, i + batchSize);
        
        console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(mergedData.length/batchSize)} (${batch.length} artworks)`);
        
        const batchPromises = batch.map(async (artworkData) => {
            const result = await createArtworkDocument(artworkData);
            if (result) {
                results.created++;
            } else {
                results.failed++;
            }
        });
        
        await Promise.all(batchPromises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`📈 Progress: ${results.created} created, ${results.failed} failed`);
    }
    
    console.log(`\n🎉 IMPORT COMPLETE!`);
    console.log(`📊 Final Results:`);
    console.log(`   ✅ Created: ${results.created}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📊 Total: ${results.total}`);
    
    return results;
}

// Run the import
if (import.meta.url === `file://${process.argv[1]}`) {
    importArtworks()
        .then(results => {
            console.log('\n🎯 Import completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Import failed:', error);
            process.exit(1);
        });
}

export { importArtworks, createArtworkDocument }; 