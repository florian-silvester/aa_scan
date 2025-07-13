import sanityClient from '../sanity-client.js';

// Function to convert to title case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

async function scanAndFixDuplicates() {
  console.log('🔍 Scanning for duplicates and fixing title case...\n');
  
  try {
    // Check materials
    const materials = await sanityClient.fetch('*[_type == "material"] | order(name.en asc)');
    console.log('📦 MATERIALS:');
    const materialGroups = {};
    
    materials.forEach(m => {
      const name = m.name.en;
      const lowerName = name.toLowerCase();
      if (!materialGroups[lowerName]) materialGroups[lowerName] = [];
      materialGroups[lowerName].push({name, id: m._id, doc: m});
    });
    
    const materialDuplicates = [];
    Object.keys(materialGroups).forEach(key => {
      if (materialGroups[key].length > 1) {
        console.log('🔴 DUPLICATE:', materialGroups[key].map(m => m.name).join(' + '));
        materialDuplicates.push(materialGroups[key]);
      }
    });
    
    // Check mediums
    const mediums = await sanityClient.fetch('*[_type == "medium"] | order(name.en asc)');
    console.log('\n🎨 MEDIUMS:');
    const mediumGroups = {};
    
    mediums.forEach(m => {
      const name = m.name.en;
      const lowerName = name.toLowerCase();
      if (!mediumGroups[lowerName]) mediumGroups[lowerName] = [];
      mediumGroups[lowerName].push({name, id: m._id, doc: m});
    });
    
    const mediumDuplicates = [];
    Object.keys(mediumGroups).forEach(key => {
      if (mediumGroups[key].length > 1) {
        console.log('🔴 DUPLICATE:', mediumGroups[key].map(m => m.name).join(' + '));
        mediumDuplicates.push(mediumGroups[key]);
      }
    });
    
    // Check finishes
    const finishes = await sanityClient.fetch('*[_type == "finish"] | order(name.en asc)');
    console.log('\n🔧 FINISHES:');
    const finishGroups = {};
    
    finishes.forEach(f => {
      const name = f.name.en;
      const lowerName = name.toLowerCase();
      if (!finishGroups[lowerName]) finishGroups[lowerName] = [];
      finishGroups[lowerName].push({name, id: f._id, doc: f});
    });
    
    const finishDuplicates = [];
    Object.keys(finishGroups).forEach(key => {
      if (finishGroups[key].length > 1) {
        console.log('🔴 DUPLICATE:', finishGroups[key].map(f => f.name).join(' + '));
        finishDuplicates.push(finishGroups[key]);
      }
    });
    
    console.log('\n📊 SUMMARY:');
    console.log('Materials:', materials.length, '(', materialDuplicates.length, 'duplicate groups)');
    console.log('Mediums:', mediums.length, '(', mediumDuplicates.length, 'duplicate groups)');
    console.log('Finishes:', finishes.length, '(', finishDuplicates.length, 'duplicate groups)');
    
    // Fix duplicates and title case
    console.log('\n🔧 FIXING DUPLICATES...');
    
    // Fix material duplicates
    for (const group of materialDuplicates) {
      const keepDoc = group.find(item => item.doc.usageCount) || group[0]; // Keep the one with usage count or first one
      const titleCaseName = toTitleCase(keepDoc.name);
      
      console.log(`✅ Keeping "${titleCaseName}" (${keepDoc.doc.usageCount || 0} usages)`);
      
      // Update the kept document with title case
      await sanityClient.patch(keepDoc.id).set({
        'name.en': titleCaseName
      }).commit();
      
      // Delete the duplicates
      for (const item of group) {
        if (item.id !== keepDoc.id) {
          await sanityClient.delete(item.id);
          console.log(`🗑️  Deleted duplicate: ${item.name}`);
        }
      }
    }
    
    // Fix medium duplicates
    for (const group of mediumDuplicates) {
      const keepDoc = group.find(item => item.doc.usageCount) || group[0];
      const titleCaseName = toTitleCase(keepDoc.name);
      
      console.log(`✅ Keeping "${titleCaseName}" (${keepDoc.doc.usageCount || 0} usages)`);
      
      await sanityClient.patch(keepDoc.id).set({
        'name.en': titleCaseName
      }).commit();
      
      for (const item of group) {
        if (item.id !== keepDoc.id) {
          await sanityClient.delete(item.id);
          console.log(`🗑️  Deleted duplicate: ${item.name}`);
        }
      }
    }
    
    // Fix finish duplicates
    for (const group of finishDuplicates) {
      const keepDoc = group.find(item => item.doc.usageCount) || group[0];
      const titleCaseName = toTitleCase(keepDoc.name);
      
      console.log(`✅ Keeping "${titleCaseName}" (${keepDoc.doc.usageCount || 0} usages)`);
      
      await sanityClient.patch(keepDoc.id).set({
        'name.en': titleCaseName
      }).commit();
      
      for (const item of group) {
        if (item.id !== keepDoc.id) {
          await sanityClient.delete(item.id);
          console.log(`🗑️  Deleted duplicate: ${item.name}`);
        }
      }
    }
    
    // Convert all remaining items to title case
    console.log('\n🎯 CONVERTING ALL TO TITLE CASE...');
    
    // Update all materials to title case
    const remainingMaterials = await sanityClient.fetch('*[_type == "material"]');
    for (const material of remainingMaterials) {
      const titleCaseName = toTitleCase(material.name.en);
      if (material.name.en !== titleCaseName) {
        await sanityClient.patch(material._id).set({
          'name.en': titleCaseName
        }).commit();
        console.log(`🎯 Updated material: ${material.name.en} → ${titleCaseName}`);
      }
    }
    
    // Update all mediums to title case
    const remainingMediums = await sanityClient.fetch('*[_type == "medium"]');
    for (const medium of remainingMediums) {
      const titleCaseName = toTitleCase(medium.name.en);
      if (medium.name.en !== titleCaseName) {
        await sanityClient.patch(medium._id).set({
          'name.en': titleCaseName
        }).commit();
        console.log(`🎯 Updated medium: ${medium.name.en} → ${titleCaseName}`);
      }
    }
    
    // Update all finishes to title case
    const remainingFinishes = await sanityClient.fetch('*[_type == "finish"]');
    for (const finish of remainingFinishes) {
      const titleCaseName = toTitleCase(finish.name.en);
      if (finish.name.en !== titleCaseName) {
        await sanityClient.patch(finish._id).set({
          'name.en': titleCaseName
        }).commit();
        console.log(`🎯 Updated finish: ${finish.name.en} → ${titleCaseName}`);
      }
    }
    
    console.log('\n🎉 All duplicates removed and title case applied!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the scan and fix
scanAndFixDuplicates(); 