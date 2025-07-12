import sanity from './sanity-client.js';

async function checkMaterials() {
    try {
        const materials = await sanity.fetch(`
            *[_type == "material"]{
                name,
                slug,
                category
            } | order(category, name.en)
        `);
        
        console.log(`🎯 Available Materials (${materials.length}):\n`);
        
        const byCategory = {};
        materials.forEach(material => {
            if (!byCategory[material.category]) {
                byCategory[material.category] = [];
            }
            byCategory[material.category].push(`${material.name.en} (${material.slug.current})`);
        });
        
        Object.entries(byCategory).forEach(([category, materials]) => {
            console.log(`📂 ${category.toUpperCase()}:`);
            materials.forEach(material => {
                console.log(`  - ${material}`);
            });
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error fetching materials:', error);
    }
}

checkMaterials(); 