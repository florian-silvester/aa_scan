import sanityClient from '../../sanity-client.js';

async function analyzeArtworkCategories() {
    console.log('🔍 Analyzing artwork categories...\n');
    
    // Check sample data structure
    const sampleArtwork = await sanityClient.fetch(`
        *[_type == "artwork"][0]{
            _id,
            title,
            creator->{
                name,
                category->{
                    title
                }
            },
            category->{
                title
            }
        }
    `);
    
    console.log('Sample artwork structure:');
    console.log(JSON.stringify(sampleArtwork, null, 2));
    
    // Count artworks with/without categories
    const categoryStats = await sanityClient.fetch(`
        {
            "total": count(*[_type == "artwork"]),
            "withCategory": count(*[_type == "artwork" && defined(category)]),
            "withoutCategory": count(*[_type == "artwork" && !defined(category)])
        }
    `);
    
    console.log('\n📊 Category Statistics:');
    console.log(`Total artworks: ${categoryStats.total}`);
    console.log(`With category: ${categoryStats.withCategory}`);
    console.log(`Without category: ${categoryStats.withoutCategory}`);
    
    // Sample artworks without categories
    const uncategorized = await sanityClient.fetch(`
        *[_type == "artwork" && !defined(category)][0...5]{
            _id,
            title,
            creator->{
                name,
                category->{
                    title
                }
            }
        }
    `);
    
    console.log('\n🚫 Sample uncategorized artworks:');
    uncategorized.forEach(artwork => {
        const creatorCategory = artwork.creator?.category?.title?.en || 'No creator category';
        console.log(`- "${artwork.title}" by ${artwork.creator?.name} (Creator category: ${creatorCategory})`);
    });
}

analyzeArtworkCategories().catch(console.error); 