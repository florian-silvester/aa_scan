import client from '../sanity-client.js';

// Convert to Title Case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

async function fixGermanTitleCase() {
  console.log('🔧 Converting German names to Title Case...');
  
  const types = ['material', 'medium', 'finish'];
  
  for (const type of types) {
    console.log(`\n📋 Processing ${type}s...`);
    
    // Get all documents of this type
    const documents = await client.fetch(`*[_type == "${type}"] {
      _id,
      _rev,
      title
    }`);
    
    console.log(`Found ${documents.length} ${type}s`);
    
    for (const doc of documents) {
      if (doc.title?.de) {
        const originalGerman = doc.title.de;
        const titleCaseGerman = toTitleCase(originalGerman);
        
        if (originalGerman !== titleCaseGerman) {
          console.log(`🔄 Updating ${type}: "${originalGerman}" → "${titleCaseGerman}"`);
          
          try {
            await client
              .patch(doc._id)
              .set({
                'title.de': titleCaseGerman
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