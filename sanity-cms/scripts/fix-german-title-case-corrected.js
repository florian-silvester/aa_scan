import client from '../sanity-client.js';

// Convert to Title Case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

async function fixGermanTitleCase() {
  console.log('🔧 Converting German names to Title Case (corrected)...');
  
  const types = [
    { type: 'material', field: 'name' },
    { type: 'medium', field: 'name' }, 
    { type: 'finish', field: 'name' }
  ];
  
  for (const { type, field } of types) {
    console.log(`\n📋 Processing ${type}s...`);
    
    // Get all documents of this type
    const documents = await client.fetch(`*[_type == "${type}"] {
      _id,
      _rev,
      ${field}
    }`);
    
    console.log(`Found ${documents.length} ${type}s`);
    
    for (const doc of documents) {
      const fieldData = doc[field];
      if (fieldData?.de) {
        const originalGerman = fieldData.de;
        const titleCaseGerman = toTitleCase(originalGerman);
        
        if (originalGerman !== titleCaseGerman) {
          console.log(`🔄 Updating ${type}: "${originalGerman}" → "${titleCaseGerman}"`);
          
          try {
            await client
              .patch(doc._id)
              .set({
                [`${field}.de`]: titleCaseGerman
              })
              .commit();
            
            console.log(`✅ Updated ${type}: ${titleCaseGerman}`);
          } catch (error) {
            console.error(`❌ Error updating ${type} ${doc._id}:`, error.message);
          }
        }
      }
    }
  }
  
  console.log('\n🎉 German Title Case conversion complete!');
}

fixGermanTitleCase().catch(console.error); 