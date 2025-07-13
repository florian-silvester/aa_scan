import sanity from '../../sanity-client.js';

async function fixLocalCategories() {
    console.log('🔍 Checking local categories...\n');
    
    // Get all categories
    const categories = await sanity.fetch(`
        *[_type == "category"]{
            _id,
            _rev,
            title,
            titleDe
        }
    `);
    
    console.log(`Found ${categories.length} categories to check`);
    
    const categoriesToFix = categories.filter(cat => 
        typeof cat.title === 'string' // Old format
    );
    
    if (categoriesToFix.length === 0) {
        console.log('✅ All categories already in correct format!');
        return;
    }
    
    console.log(`📝 Found ${categoriesToFix.length} categories to migrate:\n`);
    
    // Define known German translations
    const translations = {
        'Art Jewelry': 'Kunstschmuck',
        'Ceramic Art': 'Keramikkunst', 
        'Design Jewelry': 'Designschmuck',
        'Diverse Design Objects': 'Verschiedene Designobjekte',
        'Furniture | Objects': 'Möbel | Objekte',
        'Lighting': 'Beleuchtung',
        'Metal Art': 'Metallkunst',
        'Rugs | Interior Textiles': 'Teppiche | Innenraum-Textilien',
        'Studio Glass': 'Studioglas',
        'Textile | Accessories': 'Textilien | Accessoires',
        'Woodwork | Paper': 'Holzarbeiten | Papier'
    };
    
    for (const category of categoriesToFix) {
        const englishTitle = category.title;
        const germanTitle = category.titleDe || translations[englishTitle] || englishTitle;
        
        console.log(`🔄 ${englishTitle} → {en: "${englishTitle}", de: "${germanTitle}"}`);
        
        await sanity
            .patch(category._id)
            .set({
                title: {
                    en: englishTitle,
                    de: germanTitle
                }
            })
            .unset(['titleDe'])
            .commit();
    }
    
    console.log('\n📤 All changes committed!');
    
    console.log('✅ Local categories fixed!');
    console.log('\n🔄 Refresh Sanity Studio to see the changes.');
}

fixLocalCategories().catch(console.error); 