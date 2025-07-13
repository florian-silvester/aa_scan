import sanityClient from '../../sanity-client.js';

// Creator-category mapping extracted from https://artaurea.com/profiles
const creatorCategoryMap = {
    // A
    'ATARA design / Heike Stuckstedde': 'category-lighting',
    
    // B  
    'Ute Kathrin Beck': 'category-ceramic-art',
    'Friedrich Becker': 'category-art-jewelry',
    'Sofia Beilharz': 'category-design-jewelry', 
    'Benjamin Bigot': 'category-textile-accessories',
    'Uli Biskup': 'category-design-jewelry',
    'Bodyfurnitures': 'category-art-jewelry',
    'Thomas Bohle': 'category-ceramic-art',
    'Patrizia Bonati': 'category-art-jewelry',
    'Bosna Quilt Werkstatt': 'category-rugs-interior-textiles',
    'Dorothea Brill': 'category-design-jewelry',
    'Beate Brinkmann': 'category-design-jewelry',
    'Friedemann Buehler': 'category-woodwork-paper',
    'burggrafburggraf': 'category-textile-accessories',
    
    // C
    "'Comme il faut' floorcloth(e)s": 'category-rugs-interior-textiles',
    'Robert Comploj': 'category-studio-glass',
    'Hans Coper': 'category-ceramic-art',
    'Sarah Cossham': 'category-art-jewelry',
    
    // D
    'Carl Dau': 'category-design-jewelry',
    'Martina Dempf': 'category-art-jewelry',
    'Georg Dobler': 'category-art-jewelry',
    'Babette von Dohnanyi': 'category-art-jewelry',
    'Pippin Drysdale': 'category-ceramic-art',
    
    // E
    'Martina Ege': 'category-art-jewelry',
    'Eiden – Porzellan': 'category-ceramic-art',
    'Beate Eismann': 'category-art-jewelry',
    'Susanne Elstner': 'category-art-jewelry',
    'Emquies-Holstein': 'category-design-jewelry',
    'Sophia Epp': 'category-design-jewelry',
    
    // F
    'Felicia Mülbaier': 'category-art-jewelry',
    'Pura Ferreiro': 'category-design-jewelry',
    'Fine Light': 'category-design-jewelry',
    'Fingerglück': 'category-design-jewelry',
    'Anne Fischer': 'category-metal-art',
    'Formfeld': 'category-furniture-objects',
    'Simon Freund': 'category-textile-accessories',
    'Tanja Friedrichs': 'category-design-jewelry',
    'Stefanie Frye': 'category-design-jewelry',
    
    // G
    'Bettina Geistlich': 'category-design-jewelry',
    'Achim Gersmann': 'category-design-jewelry',
    'Goldmiss Design': 'category-design-jewelry',
    'Batho Gündra': 'category-design-jewelry',
    
    // H
    'Bernard Heesen': 'category-studio-glass',
    'Emil Heger': 'category-ceramic-art',
    'Corinna Heller': 'category-design-jewelry',
    'Kerstin Henke': 'category-design-jewelry',
    'Anke Hennig': 'category-textile-accessories',
    'Henrich & Denzel': 'category-design-jewelry',
    'Leen Heyne': 'category-design-jewelry',
    'Mirjam Hiller': 'category-art-jewelry',
    'Hirsch – Woodenheart': 'category-woodwork-paper',
    'Tomáš Hlavička': 'category-studio-glass',
    'Claudia Hoppe': 'category-design-jewelry',
    'Angela Huebel': 'category-design-jewelry',
    'Kap Sun Hwang': 'category-ceramic-art',
    
    // I
    'Koichi Io': 'category-metal-art',
    'Ulrike Isensee': 'category-textile-accessories',
    
    // J
    'JaKyung Shin': 'category-metal-art',
    'Angelika Jansen': 'category-ceramic-art',
    'Silke Janssen': 'category-textile-accessories',
    'Isezaki Jun': 'category-ceramic-art',
    
    // K
    'Anne Ute Kaden': 'category-art-jewelry',
    'Si-Sook Kang': 'category-ceramic-art',
    'Kristiina Karinen': 'category-textile-accessories',
    'Ulla & Martin Kaufmann': 'category-metal-art',
    'Deok Ho Kim': 'category-ceramic-art',
    'Dong-Hyun Kim': 'category-metal-art',
    'Sung Chul Kim': 'category-ceramic-art',
    'Robert Korsikowski': 'category-woodwork-paper',
    'Susanna Kuschek': 'category-design-jewelry',
    
    // L
    'Dominique Labordery': 'category-art-jewelry',
    'Lut Laleman': 'category-ceramic-art',
    'Kristiina Lassus': 'category-rugs-interior-textiles',
    'Annette Lechler': 'category-design-jewelry',
    'In Hwa Lee': 'category-ceramic-art',
    'Jeong Won Lee': 'category-ceramic-art',
    'Minsoo Lee': 'category-ceramic-art',
    'Lehmann & Schmedding': 'category-design-jewelry',
    'Ria Lins': 'category-art-jewelry',
    'Sabine Lintzen': 'category-studio-glass',
    'Morten Lobner Espersen': 'category-ceramic-art',
    'Hanne Bay Luehrssen': 'category-design-jewelry',
    'Josephine Lützel': 'category-metal-art',
    'Christof Lungwitz': 'category-woodwork-paper',
    'Lyk Carpet': 'category-rugs-interior-textiles',
    
    // M
    'Ulrike Maeder': 'category-lighting',
    'Manu Schmuck': 'category-design-jewelry',
    'Sonngard Marcks': 'category-ceramic-art',
    'Gigi Mariani': 'category-art-jewelry',
    'Iris Merkle': 'category-art-jewelry',
    'Eric Mertens': 'category-furniture-objects',
    'Massimo Micheluzzi': 'category-studio-glass',
    'Claudia Milić': 'category-design-jewelry',
    'Mille Fiabe': 'category-diverse-design-objects',
    'Ritsue Mishima': 'category-studio-glass',
    'Eva Moosbrugger': 'category-studio-glass',
    'Felix Mueller': 'category-furniture-objects',
    'Sabine Müller': 'category-design-jewelry',
    'Jutta Müntefering': 'category-lighting',
    'Julia Münzing, Schmuque': 'category-design-jewelry',
    
    // N
    'Johannes Nagel': 'category-ceramic-art',
    'Barbara Nanning': 'category-ceramic-art', // Note: has both ceramic and glass, using ceramic as primary
    'Aino Nebel': 'category-ceramic-art',
    'Neo/Craft': 'category-lighting',
    'neyuQ ceramics / Quyen Mac': 'category-ceramic-art',
    'Niessing': 'category-design-jewelry',
    'Niessing Wedding Rings': 'category-design-jewelry',
    'Kazuko Nishibayashi': 'category-ceramic-art',
    'Kay Eppi Nölke': 'category-design-jewelry',
    
    // O
    'Johanna Otto': 'category-ceramic-art',
    
    // P
    'Gottfried Palatin': 'category-ceramic-art',
    'Joo Hyung Park': 'category-ceramic-art',
    'Noon Passama': 'category-textile-accessories',
    'Christina Pauls': 'category-design-jewelry',
    'Gitta Pielcke': 'category-ceramic-art',
    'Thomas Pildner': 'category-ceramic-art',
    'Ulrike Poelk': 'category-ceramic-art',
    'Martin Potsch': 'category-ceramic-art',
    'Stefan Prattes, Juustdesign': 'category-furniture-objects',
    'Stefanie Prießnitz': 'category-design-jewelry',
    
    // R
    'Ulrike Ramin': 'category-ceramic-art',
    'Cornelius Réer': 'category-ceramic-art',
    'Lotte Reimers': 'category-ceramic-art',
    'Vera Rhodius': 'category-ceramic-art',
    'Lucie Rie': 'category-ceramic-art',
    'Hendrike Roers': 'category-design-jewelry',
    'Kristina Rothe': 'category-ceramic-art',
    'Jochen Rüth': 'category-metal-art',
    
    // S
    'Elke Sada': 'category-ceramic-art',
    'Nikolay Sardamov': 'category-ceramic-art',
    'Kathrin Sättele': 'category-textile-accessories',
    'Nils Schmalenbach': 'category-ceramic-art',
    'Claudia Schoemig': 'category-design-jewelry',
    'Oliver Schmidt': 'category-studio-glass',
    'Freia Schulze': 'category-ceramic-art',
    'Nicole Schuster': 'category-design-jewelry',
    'Johanna Schweizer': 'category-ceramic-art',
    'Scorpiodesign': 'category-design-jewelry',
    'Ulrike Scriba': 'category-ceramic-art',
    'Hiawatha Seiffert': 'category-ceramic-art',
    'Violetta Elisa Seliger': 'category-design-jewelry',
    'Sian Design': 'category-design-jewelry',
    'Bibi Smit': 'category-design-jewelry',
    'Pia Sommerlad': 'category-design-jewelry',
    'Katja Stelz': 'category-design-jewelry',
    'Laurenz Stockner': 'category-woodwork-paper',
    'Eva Strepp': 'category-ceramic-art',
    'Dagmar Stuehler': 'category-ceramic-art',
    'Studio Drift': 'category-lighting',
    'Studio Formafantasma': 'category-furniture-objects',
    'Elisa Stützle-Siegsmund': 'category-design-jewelry',
    'Anna Sykora': 'category-design-jewelry',
    
    // T
    'Louisa Taylor': 'category-design-jewelry',
    'Sven Temper': 'category-ceramic-art',
    
    // U
    'Jutta Ulland': 'category-textile-accessories',
    'Erik Urbschat': 'category-studio-glass',
    'Tora Urup': 'category-ceramic-art',
    
    // V
    'Andrea Vaggione': 'category-ceramic-art',
    'Gabi Veit': 'category-ceramic-art',
    'Evelyn Vanderloock': 'category-design-jewelry',
    'Maria Verburg': 'category-design-jewelry',
    'Monika Vesely': 'category-ceramic-art',
    'Vickermann & Stoya Bespoke Shoes': 'category-textile-accessories',
    'Peter Vogel': 'category-lighting',
    'Asta Volkensfeld': 'category-textile-accessories',
    
    // W
    'Edmund de Waal': 'category-ceramic-art',
    'Christine Wagner': 'category-ceramic-art',
    'Nicole Walger': 'category-design-jewelry',
    'Hans J. Wegner': 'category-furniture-objects',
    'w e i s s über den tod hinaus': 'category-diverse-design-objects',
    'Dorothee Wenz': 'category-ceramic-art',
    'Babette Wiezorek': 'category-ceramic-art',
    'Tapio Wirkkala': 'category-studio-glass',
    'Birgit Wortmann': 'category-textile-accessories',
    
    // Additional missing creators
    'Sarah Küffer': 'category-design-jewelry',
    'Sebastian Hepp': 'category-design-jewelry',
    'Renate Erlacher': 'category-textile-accessories',
    'Siebörger Handweberei, Anja Ritter': 'category-rugs-interior-textiles',
    'Simply Wear': 'category-textile-accessories',
    'Erich Zimmermann': 'category-design-jewelry',
    'Heide Nonnenmacher': 'category-ceramic-art'
};

// Add the creator with curly quotes separately 
creatorCategoryMap[''Comme il faut' floorcloth(e)s'] = 'category-rugs-interior-textiles';

async function assignCreatorCategories() {
    console.log('🎯 Assigning categories to creators based on Art Aurea data...\n');
    
    // Get all creators
    const creators = await sanityClient.fetch(`
        *[_type == "creator"]{
            _id,
            name,
            category
        }
    `);
    
    console.log(`📊 Found ${creators.length} creators in Sanity`);
    
    let matchedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const creator of creators) {
        const categoryId = creatorCategoryMap[creator.name];
        
        if (categoryId) {
            matchedCount++;
            
            // Skip if already has this category
            if (creator.category?._ref === categoryId) {
                console.log(`✓ ${creator.name} - already has correct category`);
                continue;
            }
            
            try {
                await sanityClient
                    .patch(creator._id)
                    .set({
                        category: {
                            _type: 'reference',
                            _ref: categoryId
                        }
                    })
                    .commit();
                
                updatedCount++;
                console.log(`✅ ${creator.name} → ${categoryId.replace('category-', '')}`);
                
            } catch (error) {
                errorCount++;
                console.log(`❌ ${creator.name} - Error: ${error.message}`);
            }
        } else {
            console.log(`⚠️  ${creator.name} - No category mapping found`);
        }
    }
    
    console.log('\n📊 RESULTS:');
    console.log(`  - Total creators: ${creators.length}`);
    console.log(`  - Matched in Art Aurea: ${matchedCount}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - No mapping: ${creators.length - matchedCount}`);
}

assignCreatorCategories().catch(console.error); 