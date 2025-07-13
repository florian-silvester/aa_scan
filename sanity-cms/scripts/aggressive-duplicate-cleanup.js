import sanityClient from '../sanity-client.js';

// Function to convert to title case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

async function aggressiveDuplicateCleanup() {
  console.log('🔥 AGGRESSIVE DUPLICATE CLEANUP...\n');
  
  try {
    // Step 1: Handle Materials
    console.log('📦 CLEANING MATERIALS...');
    const materials = await sanityClient.fetch('*[_type == "material"] | order(name.en asc)');
    
    // Group by exact name match (case-insensitive)
    const materialGroups = {};
    materials.forEach(m => {
      const normalizedName = m.name.en.toLowerCase();
      if (!materialGroups[normalizedName]) materialGroups[normalizedName] = [];
      materialGroups[normalizedName].push(m);
    });
    
    for (const [groupName, docs] of Object.entries(materialGroups)) {
      if (docs.length > 1) {
        // Sort by usage count (highest first)
        docs.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        const keeper = docs[0];
        const duplicates = docs.slice(1);
        
        const titleCaseName = toTitleCase(groupName);
        console.log(`\n🔥 Processing "${titleCaseName}" group (${docs.length} duplicates)`);
        console.log(`   ✅ Keeping: ${keeper.name.en} (${keeper.usageCount || 0} usages)`);
        
        // Update keeper to title case
        await sanityClient.patch(keeper._id).set({
          'name.en': titleCaseName
        }).commit();
        
        // Process each duplicate
        for (const duplicate of duplicates) {
          console.log(`   🔄 Merging: ${duplicate.name.en} (${duplicate.usageCount || 0} usages)`);
          
          // Find all artwork references to this material
          const artworksWithMaterial = await sanityClient.fetch(`
            *[_type == "artwork" && references($materialId)]
          `, { materialId: duplicate._id });
          
          // Update each artwork to use the keeper instead
          for (const artwork of artworksWithMaterial) {
            if (artwork.materials) {
              const updatedMaterials = artwork.materials.map(mat => 
                mat._ref === duplicate._id ? { _ref: keeper._id } : mat
              );
              await sanityClient.patch(artwork._id).set({
                materials: updatedMaterials
              }).commit();
              console.log(`     ✅ Updated artwork: ${artwork.title?.en || 'Untitled'}`);
            }
          }
          
          // Delete the duplicate
          try {
            await sanityClient.delete(duplicate._id);
            console.log(`     🗑️  Deleted: ${duplicate.name.en}`);
          } catch (error) {
            console.log(`     ❌ Could not delete ${duplicate.name.en}: ${error.message}`);
          }
        }
      } else {
        // Single item - just update to title case
        const titleCaseName = toTitleCase(docs[0].name.en);
        if (docs[0].name.en !== titleCaseName) {
          await sanityClient.patch(docs[0]._id).set({
            'name.en': titleCaseName
          }).commit();
          console.log(`🎯 Updated: ${docs[0].name.en} → ${titleCaseName}`);
        }
      }
    }
    
    // Step 2: Handle Mediums
    console.log('\n🎨 CLEANING MEDIUMS...');
    const mediums = await sanityClient.fetch('*[_type == "medium"] | order(name.en asc)');
    
    const mediumGroups = {};
    mediums.forEach(m => {
      const normalizedName = m.name.en.toLowerCase();
      if (!mediumGroups[normalizedName]) mediumGroups[normalizedName] = [];
      mediumGroups[normalizedName].push(m);
    });
    
    for (const [groupName, docs] of Object.entries(mediumGroups)) {
      if (docs.length > 1) {
        docs.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        const keeper = docs[0];
        const duplicates = docs.slice(1);
        
        const titleCaseName = toTitleCase(groupName);
        console.log(`\n🔥 Processing "${titleCaseName}" group (${docs.length} duplicates)`);
        console.log(`   ✅ Keeping: ${keeper.name.en} (${keeper.usageCount || 0} usages)`);
        
        // Update keeper to title case
        await sanityClient.patch(keeper._id).set({
          'name.en': titleCaseName
        }).commit();
        
        // Process each duplicate
        for (const duplicate of duplicates) {
          console.log(`   🔄 Merging: ${duplicate.name.en} (${duplicate.usageCount || 0} usages)`);
          
          // Find all artwork references to this medium
          const artworksWithMedium = await sanityClient.fetch(`
            *[_type == "artwork" && references($mediumId)]
          `, { mediumId: duplicate._id });
          
          // Update each artwork to use the keeper instead
          for (const artwork of artworksWithMedium) {
            if (artwork.medium) {
              const updatedMedium = artwork.medium.map(med => 
                med._ref === duplicate._id ? { _ref: keeper._id } : med
              );
              await sanityClient.patch(artwork._id).set({
                medium: updatedMedium
              }).commit();
              console.log(`     ✅ Updated artwork: ${artwork.title?.en || 'Untitled'}`);
            }
          }
          
          // Delete the duplicate
          try {
            await sanityClient.delete(duplicate._id);
            console.log(`     🗑️  Deleted: ${duplicate.name.en}`);
          } catch (error) {
            console.log(`     ❌ Could not delete ${duplicate.name.en}: ${error.message}`);
          }
        }
      } else {
        // Single item - just update to title case
        const titleCaseName = toTitleCase(docs[0].name.en);
        if (docs[0].name.en !== titleCaseName) {
          await sanityClient.patch(docs[0]._id).set({
            'name.en': titleCaseName
          }).commit();
          console.log(`🎯 Updated: ${docs[0].name.en} → ${titleCaseName}`);
        }
      }
    }
    
    // Step 3: Handle Finishes (title case only, no duplicates found)
    console.log('\n🔧 CLEANING FINISHES...');
    const finishes = await sanityClient.fetch('*[_type == "finish"]');
    for (const finish of finishes) {
      const titleCaseName = toTitleCase(finish.name.en);
      if (finish.name.en !== titleCaseName) {
        await sanityClient.patch(finish._id).set({
          'name.en': titleCaseName
        }).commit();
        console.log(`🎯 Updated: ${finish.name.en} → ${titleCaseName}`);
      }
    }
    
    // Final verification
    console.log('\n🔍 FINAL VERIFICATION...');
    const finalMaterials = await sanityClient.fetch('*[_type == "material"]');
    const finalMediums = await sanityClient.fetch('*[_type == "medium"]');
    const finalFinishes = await sanityClient.fetch('*[_type == "finish"]');
    
    console.log('\n🎉 AGGRESSIVE CLEANUP COMPLETE!');
    console.log('📊 Final counts:');
    console.log(`   Materials: ${finalMaterials.length}`);
    console.log(`   Mediums: ${finalMediums.length}`);
    console.log(`   Finishes: ${finalFinishes.length}`);
    
    // Check for remaining duplicates
    const materialNames = finalMaterials.map(m => m.name.en.toLowerCase());
    const mediumNames = finalMediums.map(m => m.name.en.toLowerCase());
    
    const materialDuplicates = materialNames.filter((name, index) => materialNames.indexOf(name) !== index);
    const mediumDuplicates = mediumNames.filter((name, index) => mediumNames.indexOf(name) !== index);
    
    if (materialDuplicates.length === 0 && mediumDuplicates.length === 0) {
      console.log('✅ NO DUPLICATES REMAINING!');
    } else {
      console.log('❌ Still some duplicates found:', {materialDuplicates, mediumDuplicates});
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

aggressiveDuplicateCleanup(); 