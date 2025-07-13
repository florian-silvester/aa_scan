import sanityClient from '../sanity-client.js';

// Function to convert to title case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

async function safeDuplicateCleanup() {
  console.log('🔍 Safe duplicate cleanup with reference updates...\n');
  
  try {
    // 1. First, let's just convert everything to title case without deleting
    console.log('🎯 STEP 1: Converting all to title case...');
    
    // Update all materials to title case
    const materials = await sanityClient.fetch('*[_type == "material"]');
    for (const material of materials) {
      const titleCaseName = toTitleCase(material.name.en);
      if (material.name.en !== titleCaseName) {
        await sanityClient.patch(material._id).set({
          'name.en': titleCaseName
        }).commit();
        console.log(`🎯 Updated material: ${material.name.en} → ${titleCaseName}`);
      }
    }
    
    // Update all mediums to title case
    const mediums = await sanityClient.fetch('*[_type == "medium"]');
    for (const medium of mediums) {
      const titleCaseName = toTitleCase(medium.name.en);
      if (medium.name.en !== titleCaseName) {
        await sanityClient.patch(medium._id).set({
          'name.en': titleCaseName
        }).commit();
        console.log(`🎯 Updated medium: ${medium.name.en} → ${titleCaseName}`);
      }
    }
    
    // Update all finishes to title case
    const finishes = await sanityClient.fetch('*[_type == "finish"]');
    for (const finish of finishes) {
      const titleCaseName = toTitleCase(finish.name.en);
      if (finish.name.en !== titleCaseName) {
        await sanityClient.patch(finish._id).set({
          'name.en': titleCaseName
        }).commit();
        console.log(`🎯 Updated finish: ${finish.name.en} → ${titleCaseName}`);
      }
    }
    
    console.log('\n🔍 STEP 2: Analyzing duplicates after title case...');
    
    // Re-fetch after title case update
    const updatedMaterials = await sanityClient.fetch('*[_type == "material"] | order(name.en asc)');
    const materialGroups = {};
    
    updatedMaterials.forEach(m => {
      const name = m.name.en;
      const lowerName = name.toLowerCase();
      if (!materialGroups[lowerName]) materialGroups[lowerName] = [];
      materialGroups[lowerName].push({name, id: m._id, doc: m});
    });
    
    const materialDuplicates = [];
    Object.keys(materialGroups).forEach(key => {
      if (materialGroups[key].length > 1) {
        console.log('🔴 MATERIAL DUPLICATE:', materialGroups[key].map(m => `${m.name} (${m.doc.usageCount || 0})`).join(' + '));
        materialDuplicates.push(materialGroups[key]);
      }
    });
    
    // Check mediums for duplicates
    const updatedMediums = await sanityClient.fetch('*[_type == "medium"] | order(name.en asc)');
    const mediumGroups = {};
    
    updatedMediums.forEach(m => {
      const name = m.name.en;
      const lowerName = name.toLowerCase();
      if (!mediumGroups[lowerName]) mediumGroups[lowerName] = [];
      mediumGroups[lowerName].push({name, id: m._id, doc: m});
    });
    
    const mediumDuplicates = [];
    Object.keys(mediumGroups).forEach(key => {
      if (mediumGroups[key].length > 1) {
        console.log('🔴 MEDIUM DUPLICATE:', mediumGroups[key].map(m => `${m.name} (${m.doc.usageCount || 0})`).join(' + '));
        mediumDuplicates.push(mediumGroups[key]);
      }
    });
    
    console.log('\n🔧 STEP 3: Safely merging duplicates...');
    
    // Function to merge duplicates by updating references
    async function mergeDuplicates(duplicates, type) {
      for (const group of duplicates) {
        // Sort by usage count (highest first), then by creation date
        const sortedGroup = group.sort((a, b) => {
          const aUsage = a.doc.usageCount || 0;
          const bUsage = b.doc.usageCount || 0;
          if (aUsage !== bUsage) return bUsage - aUsage; // Higher usage first
          return a.doc._createdAt > b.doc._createdAt ? 1 : -1; // Older first
        });
        
        const keepDoc = sortedGroup[0];
        const duplicatesToMerge = sortedGroup.slice(1);
        
        console.log(`\n✅ Keeping "${keepDoc.name}" (${keepDoc.doc.usageCount || 0} usages)`);
        
        // For each duplicate, find and update references
        for (const duplicate of duplicatesToMerge) {
          console.log(`🔄 Processing duplicate: ${duplicate.name}`);
          
          // Find all references to this duplicate
          let referencingDocs = [];
          if (type === 'material') {
            referencingDocs = await sanityClient.fetch(`*[references($duplicateId)]`, {
              duplicateId: duplicate.id
            });
          } else if (type === 'medium') {
            referencingDocs = await sanityClient.fetch(`*[references($duplicateId)]`, {
              duplicateId: duplicate.id
            });
          }
          
          console.log(`   Found ${referencingDocs.length} references`);
          
          // Update each referencing document
          for (const refDoc of referencingDocs) {
            if (refDoc._type === 'artwork') {
              // Update artwork references
              if (type === 'material' && refDoc.materials) {
                const updatedMaterials = refDoc.materials.map(mat => 
                  mat._ref === duplicate.id ? { _ref: keepDoc.id } : mat
                );
                await sanityClient.patch(refDoc._id).set({
                  materials: updatedMaterials
                }).commit();
              }
              
              if (type === 'medium' && refDoc.medium) {
                const updatedMedium = refDoc.medium.map(med => 
                  med._ref === duplicate.id ? { _ref: keepDoc.id } : med
                );
                await sanityClient.patch(refDoc._id).set({
                  medium: updatedMedium
                }).commit();
              }
              
              console.log(`   ✅ Updated artwork: ${refDoc.title?.en || 'Untitled'}`);
            }
            
            if (refDoc._type === 'material' && refDoc.materialType && refDoc.materialType._ref === duplicate.id) {
              await sanityClient.patch(refDoc._id).set({
                'materialType._ref': keepDoc.id
              }).commit();
              console.log(`   ✅ Updated material type reference`);
            }
          }
          
          // Now safe to delete the duplicate
          try {
            await sanityClient.delete(duplicate.id);
            console.log(`   🗑️  Deleted duplicate: ${duplicate.name}`);
          } catch (error) {
            console.log(`   ⚠️  Could not delete ${duplicate.name}:`, error.message);
          }
        }
      }
    }
    
    // Merge material duplicates
    if (materialDuplicates.length > 0) {
      console.log('\n📦 Merging material duplicates...');
      await mergeDuplicates(materialDuplicates, 'material');
    }
    
    // Merge medium duplicates
    if (mediumDuplicates.length > 0) {
      console.log('\n🎨 Merging medium duplicates...');
      await mergeDuplicates(mediumDuplicates, 'medium');
    }
    
    // Final count
    const finalMaterials = await sanityClient.fetch('*[_type == "material"]');
    const finalMediums = await sanityClient.fetch('*[_type == "medium"]');
    const finalFinishes = await sanityClient.fetch('*[_type == "finish"]');
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('📊 Final counts:');
    console.log(`   Materials: ${finalMaterials.length}`);
    console.log(`   Mediums: ${finalMediums.length}`);
    console.log(`   Finishes: ${finalFinishes.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the safe cleanup
safeDuplicateCleanup(); 