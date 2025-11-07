import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.bak
const envPath = path.join(__dirname, '..', '.env.bak');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Sanity client
const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

// Generate a unique key for Sanity blocks
function generateKey() {
  return Math.random().toString(36).substring(2, 11);
}

// Create placeholder text blocks with image markers
function createPlaceholderText(creatorName, imageSections, language = 'en') {
  const isGerman = language === 'de';
  
  // Placeholder paragraphs
  const paragraphs = isGerman ? [
    `Dies ist ein Platzhaltertext für den Artikel über ${creatorName}. Der eigentliche Artikeltext wird hier eingefügt, sobald er verfügbar ist. Dieser Text dient nur dazu, die Struktur und das Layout des Artikels zu demonstrieren.`,
    `${creatorName} ist ein bemerkenswerter Künstler, dessen Werk die Grenzen des zeitgenössischen Schmucks und der angewandten Kunst erweitert. Die präzise Handwerkskunst und innovative Verwendung von Materialien zeichnen die Arbeiten aus.`,
    `Die hier gezeigten Werke repräsentieren einen wichtigen Abschnitt der künstlerischen Entwicklung. Jedes Stück erzählt seine eigene Geschichte und zeigt die außergewöhnlichen Fähigkeiten und die kreative Vision des Künstlers.`,
    `Durch die Kombination traditioneller Techniken mit modernen Ansätzen entsteht eine einzigartige ästhetische Sprache. Die Arbeiten laden den Betrachter ein, über die Beziehung zwischen Form, Funktion und künstlerischem Ausdruck nachzudenken.`,
    `Dieser Artikel wird in Zukunft mit ausführlichen Informationen, Hintergründen und Einblicken in die Arbeit von ${creatorName} aktualisiert. Bis dahin dient dieser Platzhaltertext der Strukturierung des Layouts.`
  ] : [
    `This is placeholder text for the article about ${creatorName}. The actual article content will be added here once it becomes available. This text serves only to demonstrate the structure and layout of the article.`,
    `${creatorName} is a remarkable artist whose work pushes the boundaries of contemporary jewelry and applied arts. The precise craftsmanship and innovative use of materials distinguish these creations.`,
    `The works shown here represent an important chapter in the artistic development. Each piece tells its own story and demonstrates the exceptional skills and creative vision of the artist.`,
    `By combining traditional techniques with modern approaches, a unique aesthetic language emerges. The works invite viewers to reflect on the relationship between form, function, and artistic expression.`,
    `This article will be updated in the future with comprehensive information, background, and insights into ${creatorName}'s work. Until then, this placeholder text serves to structure the layout.`
  ];
  
  const blocks = [];
  let paragraphIndex = 0;
  
  // Distribute paragraphs with image markers
  for (let i = 0; i < imageSections.length + 1; i++) {
    // Add paragraph(s)
    const numParagraphs = i === 0 ? 1 : 1; // One paragraph per section
    for (let j = 0; j < numParagraphs && paragraphIndex < paragraphs.length; j++) {
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        children: [
          {
            _key: generateKey(),
            _type: 'span',
            text: paragraphs[paragraphIndex],
            marks: []
          }
        ],
        markDefs: [],
        style: 'normal'
      });
      paragraphIndex++;
    }
    
    // Add image marker (except after last section)
    if (i < imageSections.length) {
      blocks.push({
        _key: generateKey(),
        _type: 'imageMarker',
        reference: `images${imageSections[i]}`
      });
    }
  }
  
  return blocks;
}

async function addPlaceholderText(dryRun = false) {
  console.log('🔍 Fetching articles without text...\n');
  
  const articles = await client.fetch(
    `*[_type == "article"] | order(creatorName asc) {
      _id,
      creatorName,
      "titleEn": title.en,
      "fullTextEN": fullText.en,
      "fullTextDE": fullText.de,
      section1Images,
      section2Images,
      section3Images,
      section4Images
    }`
  );
  
  let updated = 0;
  let skipped = 0;
  
  for (const article of articles) {
    const displayName = article.creatorName || article.titleEn || article._id;
    
    const hasEnText = article.fullTextEN && article.fullTextEN.length > 0;
    const hasDeText = article.fullTextDE && article.fullTextDE.length > 0;
    
    if (hasEnText && hasDeText) {
      skipped++;
      continue;
    }
    
    // Get image sections
    const imageSections = [];
    for (let i = 1; i <= 4; i++) {
      const images = article[`section${i}Images`];
      if (images && images.length > 0) {
        imageSections.push(i);
      }
    }
    
    const updates = {};
    
    if (!hasEnText) {
      updates['fullText.en'] = createPlaceholderText(displayName, imageSections, 'en');
      console.log(`  📝 ${displayName} - Adding English placeholder text`);
    }
    
    if (!hasDeText) {
      updates['fullText.de'] = createPlaceholderText(displayName, imageSections, 'de');
      console.log(`  📝 ${displayName} - Adding German placeholder text`);
    }
    
    if (Object.keys(updates).length > 0) {
      if (!dryRun) {
        await client
          .patch(article._id)
          .set(updates)
          .commit();
      }
      updated++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped (already has text): ${skipped}`);
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('Run without --dry-run to apply changes');
  }
}

const dryRun = process.argv.includes('--dry-run');
addPlaceholderText(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

