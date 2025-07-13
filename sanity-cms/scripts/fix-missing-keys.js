import client from '../sanity-client.js';

async function fixMissingKeys() {
  console.log('🔧 Fixing missing keys in artwork arrays...');
  
  try {
    // Get all artworks
    const artworks = await client.fetch(`
      *[_type == "artwork"] {
        _id,
        _rev,
        title,
        materials,
        mediums,
        finishes
      }
    `);
    
    console.log(`Found ${artworks.length} artworks to process`);
    
    let updatedCount = 0;
    
    for (const artwork of artworks) {
      let needsUpdate = false;
      const updates = {};
      
      // Check materials array
      if (artwork.materials && Array.isArray(artwork.materials)) {
        const fixedMaterials = artwork.materials.map(item => {
          if (item && typeof item === 'object' && !item._key) {
            needsUpdate = true;
            return {
              ...item,
              _key: `material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
          }
          return item;
        });
        if (needsUpdate) {
          updates.materials = fixedMaterials;
        }
      }
      
      // Check mediums array
      if (artwork.mediums && Array.isArray(artwork.mediums)) {
        const fixedMediums = artwork.mediums.map(item => {
          if (item && typeof item === 'object' && !item._key) {
            needsUpdate = true;
            return {
              ...item,
              _key: `medium-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
          }
          return item;
        });
        if (needsUpdate) {
          updates.mediums = fixedMediums;
        }
      }
      
      // Check finishes array
      if (artwork.finishes && Array.isArray(artwork.finishes)) {
        const fixedFinishes = artwork.finishes.map(item => {
          if (item && typeof item === 'object' && !item._key) {
            needsUpdate = true;
            return {
              ...item,
              _key: `finish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
          }
          return item;
        });
        if (needsUpdate) {
          updates.finishes = fixedFinishes;
        }
      }
      
      // Update if needed
      if (needsUpdate) {
        try {
          await client
            .patch(artwork._id)
            .set(updates)
            .commit();
          
          updatedCount++;
          console.log(`✅ Fixed keys for: ${artwork.title || 'Untitled'}`);
        } catch (error) {
          console.error(`❌ Error updating ${artwork.title || 'Untitled'}:`, error.message);
        }
      }
    }
    
    console.log(`\n🎉 Key fixing complete!`);
    console.log(`✅ Updated ${updatedCount} artworks`);
    console.log(`✅ ${artworks.length - updatedCount} artworks already had proper keys`);
    
  } catch (error) {
    console.error('❌ Error fixing keys:', error);
  }
}

fixMissingKeys(); 