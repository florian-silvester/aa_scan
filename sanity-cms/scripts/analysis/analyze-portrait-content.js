import { promises as fs } from 'fs';

async function analyzePortraitContent() {
  const data = JSON.parse(await fs.readFile('profile-biographies-2025-07-10.json', 'utf8'));
  
  console.log('🔍 Analyzing portrait content quality...\n');
  
  // Count profiles with any portrait content
  const withPortraits = data.filter(p => p.portrait.en || p.portrait.de);
  console.log(`📊 Total profiles: ${data.length}`);
  console.log(`📝 With portrait content: ${withPortraits.length}`);
  console.log(`❌ Without portrait content: ${data.length - withPortraits.length}\n`);
  
  // Analyze content types
  const galleryContent = withPortraits.filter(p => 
    (p.portrait.en && p.portrait.en.includes('Gallery/Shop')) ||
    (p.portrait.de && p.portrait.de.includes('Gallery/Shop'))
  );
  
  const biographicalContent = withPortraits.filter(p => 
    (p.portrait.en && !p.portrait.en.includes('Gallery/Shop') && p.portrait.en.length > 100) ||
    (p.portrait.de && !p.portrait.de.includes('Gallery/Shop') && p.portrait.de.length > 100)
  );
  
  console.log(`🏪 Gallery/Shop listings: ${galleryContent.length}`);
  console.log(`📖 Potential biographical content: ${biographicalContent.length}\n`);
  
  if (biographicalContent.length > 0) {
    console.log('=== BIOGRAPHICAL PORTRAIT CONTENT ===\n');
    biographicalContent.forEach(p => {
      console.log(`📝 ${p.name}:`);
      if (p.portrait.en && !p.portrait.en.includes('Gallery/Shop')) {
        console.log(`   EN: ${p.portrait.en.substring(0, 300)}${p.portrait.en.length > 300 ? '...' : ''}`);
      }
      if (p.portrait.de && !p.portrait.de.includes('Gallery/Shop')) {
        console.log(`   DE: ${p.portrait.de.substring(0, 300)}${p.portrait.de.length > 300 ? '...' : ''}`);
      }
      console.log('');
    });
  }
  
  // Check biography quality
  const withBiography = data.filter(p => p.biography.en || p.biography.de);
  console.log(`\n=== BIOGRAPHY QUALITY ===`);
  console.log(`📋 Profiles with biography: ${withBiography.length}/${data.length}`);
  
  // Sample good biography
  const goodBio = withBiography.find(p => p.biography.en && p.biography.en.length > 100);
  if (goodBio) {
    console.log(`\n✅ Sample biography (${goodBio.name}):`);
    console.log(`   EN: ${goodBio.biography.en.substring(0, 200)}...`);
    if (goodBio.biography.de) {
      console.log(`   DE: ${goodBio.biography.de.substring(0, 200)}...`);
    }
  }
}

analyzePortraitContent().catch(console.error); 