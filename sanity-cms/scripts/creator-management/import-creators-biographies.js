import { sanityClient } from './sanity-client.js';
import fs from 'fs';
import path from 'path';

// Helper function to convert plain text to Sanity blocks (rich text format)
function textToBlocks(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Split by newlines and create paragraphs
  const paragraphs = text.split('\n').filter(para => para.trim().length > 0);
  
  return paragraphs.map(paragraph => ({
    _type: 'block',
    _key: `block_${Math.random().toString(36).substr(2, 9)}`,
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `span_${Math.random().toString(36).substr(2, 9)}`,
        text: paragraph.trim(),
        marks: []
      }
    ]
  }));
}

// Helper function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

async function importCreators() {
  console.log('🚀 Starting creator import with biographical data...');
  
  try {
    // Read the biographical data
    const biographyFile = path.join(process.cwd(), '..', 'profile-biographies-2025-07-10.json');
    const biographyData = JSON.parse(fs.readFileSync(biographyFile, 'utf8'));
    
    console.log(`📚 Found biographical data for ${biographyData.length} creators`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < biographyData.length; i++) {
      const creator = biographyData[i];
      
      try {
        console.log(`[${i + 1}/${biographyData.length}] Creating: ${creator.name}`);
        
        // Create the creator document
        const creatorDoc = {
          _type: 'creator',
          name: creator.name,
          
          // Convert text biography to rich text blocks
          biography: {
            en: textToBlocks(creator.biography?.en || ''),
            de: textToBlocks(creator.biography?.de || '')
          },
          
          // Convert text portrait to rich text blocks  
          portrait: {
            en: textToBlocks(creator.portrait?.en || ''),
            de: textToBlocks(creator.portrait?.de || '')
          },
          
          // Create slug from name
          slug: {
            _type: 'slug',
            current: createSlug(creator.name)
          },
          
          // Set default tier
          tier: 'free',
          
          // Store source URLs for reference
          _sourceUrls: creator.sourceUrls,
          _scrapedAt: creator.scrapedAt
        };
        
        // Create the document in Sanity
        const result = await sanityClient.create(creatorDoc);
        console.log(`   ✅ Created creator: ${result.name} (ID: ${result._id})`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error creating ${creator.name}:`, error.message);
        errorCount++;
        errors.push({
          name: creator.name,
          error: error.message
        });
      }
    }
    
    console.log('\n🎉 Creator import completed!');
    console.log(`✅ Successfully created: ${successCount} creators`);
    console.log(`❌ Errors: ${errorCount} creators`);
    
    if (errors.length > 0) {
      console.log('\n📝 Error details:');
      errors.forEach(err => {
        console.log(`   • ${err.name}: ${err.error}`);
      });
    }
    
    // Summary stats
    console.log('\n📊 Import Summary:');
    console.log(`   • Total processed: ${biographyData.length}`);
    console.log(`   • Success rate: ${((successCount / biographyData.length) * 100).toFixed(1)}%`);
    console.log(`   • Creators with biography: ${biographyData.filter(c => c.biography?.en || c.biography?.de).length}`);
    console.log(`   • Creators with portrait: ${biographyData.filter(c => c.portrait?.en || c.portrait?.de).length}`);
    
  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import
importCreators(); 