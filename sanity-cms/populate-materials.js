import { sanityClient } from './sanity-client.js';

async function populateMaterials() {
    console.log('🎨 POPULATING MATERIALS DATABASE...\n');
    
    // Common materials with categories based on our analysis
    const materials = [
        // Metals (most common)
        { en: 'Silver', de: 'Silber', category: 'metals' },
        { en: 'Gold', de: 'Gold', category: 'metals' },
        { en: 'Platinum', de: 'Platin', category: 'metals' },
        { en: 'Copper', de: 'Kupfer', category: 'metals' },
        { en: 'Bronze', de: 'Bronze', category: 'metals' },
        { en: 'Steel', de: 'Stahl', category: 'metals' },
        { en: 'Brass', de: 'Messing', category: 'metals' },
        
        // Ceramics & Glass
        { en: 'Porcelain', de: 'Porzellan', category: 'ceramics' },
        { en: 'Glass', de: 'Glas', category: 'ceramics' },
        { en: 'Ceramic', de: 'Keramik', category: 'ceramics' },
        { en: 'Clay', de: 'Ton', category: 'ceramics' },
        { en: 'Crystal', de: 'Kristall', category: 'ceramics' },
        
        // Stones & Minerals
        { en: 'Diamond', de: 'Diamant', category: 'stones' },
        { en: 'Pearl', de: 'Perle', category: 'stones' },
        { en: 'Stone', de: 'Stein', category: 'stones' },
        { en: 'Coral', de: 'Koralle', category: 'stones' },
        { en: 'Labradorite', de: 'Labradorith', category: 'stones' },
        { en: 'Zirconia', de: 'Zirkonia', category: 'stones' },
        
        // Textiles
        { en: 'Silk', de: 'Seide', category: 'textiles' },
        { en: 'Cotton', de: 'Baumwolle', category: 'textiles' },
        { en: 'Wool', de: 'Wolle', category: 'textiles' },
        { en: 'Yarn', de: 'Garn', category: 'textiles' },
        
        // Organic
        { en: 'Wood', de: 'Holz', category: 'organic' },
        { en: 'Leather', de: 'Leder', category: 'organic' },
        { en: 'Cordovan Leather', de: 'Cordovan-Leder', category: 'organic' },
        { en: 'Oak', de: 'Eiche', category: 'organic' },
        { en: 'Paper', de: 'Papier', category: 'organic' },
        
        // Treatments
        { en: 'Oxidized', de: 'Oxidiert', category: 'treatments' },
        { en: 'Rhodium-plated', de: 'Rhodiniert', category: 'treatments' },
        { en: 'Lacquer', de: 'Lack', category: 'treatments' },
        { en: 'Enamel', de: 'Email', category: 'treatments' },
        
        // Synthetic
        { en: 'Plastic', de: 'Kunststoff', category: 'synthetic' },
        { en: 'Acrylic', de: 'Acryl', category: 'synthetic' },
        { en: 'Resin', de: 'Harz', category: 'synthetic' }
    ];
    
    console.log(`📊 Creating ${materials.length} materials...\n`);
    
    let created = 0;
    let errors = 0;
    
    for (const material of materials) {
        try {
            // Create slug from English name
            const slug = material.en.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            
            const doc = await sanityClient.create({
                _type: 'material',
                name: {
                    en: material.en,
                    de: material.de
                },
                slug: {
                    current: slug
                },
                category: material.category
            });
            
            created++;
            console.log(`✅ ${material.en} (${material.de}) - ${material.category}`);
            
        } catch (error) {
            errors++;
            console.log(`❌ ${material.en}: ${error.message}`);
        }
    }
    
    console.log(`\n🎉 MATERIALS POPULATION COMPLETE!`);
    console.log(`📊 Results:`);
    console.log(`  - Created: ${created} materials`);
    console.log(`  - Errors: ${errors}`);
    
    // Verify creation
    const totalMaterials = await sanityClient.fetch('count(*[_type == "material"])');
    console.log(`\n📊 Total materials in database: ${totalMaterials}`);
    
    // Show sample by category
    console.log(`\n📋 Sample materials by category:`);
    const categories = ['metals', 'ceramics', 'stones', 'textiles', 'organic', 'treatments', 'synthetic'];
    
    for (const category of categories) {
        const categoryMaterials = await sanityClient.fetch(`*[_type == "material" && category == "${category}"][0...3]{name}`);
        const names = categoryMaterials.map(m => m.name.en).join(', ');
        console.log(`  ${category}: ${names}${categoryMaterials.length > 3 ? '...' : ''}`);
    }
}

populateMaterials(); 