import { createClient } from '@sanity/client';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN,
});

function normalizeForMatch(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[äöüß]/g, m => ({ ä: 'a', ö: 'o', ü: 'u', ß: 'ss' }[m] || m))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreMatch(artwork, image) {
  const creatorName = normalizeForMatch(artwork.creator);
  const artworkTitle = normalizeForMatch(artwork.title);
  const filename = normalizeForMatch(image.originalFilename);
  
  let score = 0;
  let reasons = [];
  
  // Split names into words for partial matching
  const creatorWords = creatorName.split(' ').filter(w => w.length > 2);
  const titleWords = artworkTitle.split(' ').filter(w => w.length > 2);
  
  // Score: Creator name matches
  if (creatorName && filename.includes(creatorName)) {
    score += 50;
    reasons.push('Full creator name match');
  } else {
    // Partial creator name match
    const matchedWords = creatorWords.filter(word => filename.includes(word));
    if (matchedWords.length > 0) {
      const partial = (matchedWords.length / creatorWords.length) * 30;
      score += partial;
      reasons.push(`${matchedWords.length}/${creatorWords.length} creator words`);
    }
  }
  
  // Score: Artwork title matches
  if (artworkTitle && filename.includes(artworkTitle)) {
    score += 40;
    reasons.push('Full title match');
  } else {
    // Partial title match
    const matchedTitleWords = titleWords.filter(word => filename.includes(word));
    if (matchedTitleWords.length > 0) {
      const partial = (matchedTitleWords.length / titleWords.length) * 25;
      score += partial;
      reasons.push(`${matchedTitleWords.length}/${titleWords.length} title words`);
    }
  }
  
  // Bonus: Year match
  if (artwork.year) {
    const yearStr = String(artwork.year);
    if (filename.includes(yearStr)) {
      score += 10;
      reasons.push(`Year ${yearStr}`);
    }
  }
  
  // Penalty: Filename suggests it's not an artwork image
  if (filename.match(/\b(portrait|profil|atelier|studio|ausstellung|exhibition|messe|gallery|galerie)\b/)) {
    score -= 20;
    reasons.push('Likely not artwork (profile/gallery)');
  }
  
  return {
    score: Math.round(score),
    reasons: reasons.join('; ')
  };
}

async function matchOrphanedImagesToArtworks() {
  console.log('🔍 Matching orphaned images to artworks missing media...\n');
  
  // Get artworks missing media
  console.log('📥 Fetching artworks missing media...');
  const artworks = await sanityClient.fetch(`
    *[_type == "artwork" && !defined(images) && !defined(mainImage.asset._ref)] {
      _id,
      "title": workTitle.en,
      "creator": creator->name,
      year,
      slug
    } | order(creator asc, title asc)
  `);
  
  console.log(`Found ${artworks.length} artworks missing media\n`);
  
  // Get orphaned images
  console.log('📥 Fetching orphaned images...');
  const usedImages = await sanityClient.fetch(`
    array::unique(*[_type == "artwork"]{
      "imageRefs": [
        ...select(defined(images) => images[].asset._ref, []),
        ...select(defined(mainImage.asset._ref) => [mainImage.asset._ref], [])
      ]
    }.imageRefs[])
  `);
  
  const usedSet = new Set(usedImages);
  
  const allImages = await sanityClient.fetch(`
    *[_type == "sanity.imageAsset"] {
      _id,
      originalFilename,
      url,
      size
    }
  `);
  
  const orphanedImages = allImages.filter(img => !usedSet.has(img._id));
  console.log(`Found ${orphanedImages.length} orphaned images\n`);
  
  // Match each artwork to candidate images
  console.log('🔗 Matching artworks to images...\n');
  
  const matches = [];
  let processedCount = 0;
  
  for (const artwork of artworks) {
    processedCount++;
    
    if (processedCount % 20 === 0) {
      console.log(`  Processed ${processedCount}/${artworks.length} artworks...`);
    }
    
    const candidates = [];
    
    for (const image of orphanedImages) {
      const { score, reasons } = scoreMatch(artwork, image);
      
      if (score > 10) { // Only keep matches with some confidence
        candidates.push({
          imageId: image._id,
          filename: image.originalFilename,
          url: image.url,
          score,
          reasons
        });
      }
    }
    
    // Sort by score
    candidates.sort((a, b) => b.score - a.score);
    
    // Keep top 5 candidates
    const topCandidates = candidates.slice(0, 5);
    
    if (topCandidates.length > 0) {
      matches.push({
        artworkId: artwork._id,
        artworkTitle: artwork.title,
        creator: artwork.creator,
        year: artwork.year,
        slug: artwork.slug,
        candidates: topCandidates,
        topScore: topCandidates[0].score,
        topFilename: topCandidates[0].filename
      });
    } else {
      matches.push({
        artworkId: artwork._id,
        artworkTitle: artwork.title,
        creator: artwork.creator,
        year: artwork.year,
        slug: artwork.slug,
        candidates: [],
        topScore: 0,
        topFilename: 'NO MATCH FOUND'
      });
    }
  }
  
  console.log(`\n✅ Matching complete!\n`);
  
  // Statistics
  const withMatches = matches.filter(m => m.candidates.length > 0);
  const highConfidence = matches.filter(m => m.topScore >= 60);
  const mediumConfidence = matches.filter(m => m.topScore >= 30 && m.topScore < 60);
  const lowConfidence = matches.filter(m => m.topScore > 0 && m.topScore < 30);
  const noMatches = matches.filter(m => m.candidates.length === 0);
  
  console.log('📊 MATCHING STATISTICS:');
  console.log('─'.repeat(70));
  console.log(`Total artworks: ${artworks.length}`);
  console.log(`With candidate matches: ${withMatches.length} (${((withMatches.length / artworks.length) * 100).toFixed(1)}%)`);
  console.log(`  High confidence (≥60): ${highConfidence.length}`);
  console.log(`  Medium confidence (30-59): ${mediumConfidence.length}`);
  console.log(`  Low confidence (<30): ${lowConfidence.length}`);
  console.log(`No matches found: ${noMatches.length}`);
  
  // Generate CSV report
  console.log('\n📝 Generating CSV report...');
  
  const csvRows = [
    ['Confidence', 'Score', 'Artwork ID', 'Creator', 'Artwork Title', 'Year', 'Top Match Filename', 'Match Reasons', 'Image ID', 'Image URL', 'Alt Candidate 1', 'Alt Candidate 2']
  ];
  
  // Sort by confidence
  matches.sort((a, b) => b.topScore - a.topScore);
  
  for (const match of matches) {
    const confidence = match.topScore >= 60 ? 'HIGH' : 
                      match.topScore >= 30 ? 'MEDIUM' : 
                      match.topScore > 0 ? 'LOW' : 'NONE';
    
    const top = match.candidates[0] || {};
    const alt1 = match.candidates[1] || {};
    const alt2 = match.candidates[2] || {};
    
    csvRows.push([
      confidence,
      match.topScore || 0,
      match.artworkId,
      match.creator || '',
      match.artworkTitle || '',
      match.year || '',
      top.filename || 'NO MATCH',
      top.reasons || '',
      top.imageId || '',
      top.url || '',
      alt1.filename || '',
      alt2.filename || ''
    ]);
  }
  
  const csvContent = csvRows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const reportPath = join(process.cwd(), 'reports', 'artwork-image-matches.csv');
  writeFileSync(reportPath, csvContent);
  
  console.log(`✅ Report saved to: ${reportPath}\n`);
  
  // Show sample high confidence matches
  console.log('✅ HIGH CONFIDENCE MATCHES (sample):');
  console.log('─'.repeat(70));
  highConfidence.slice(0, 10).forEach(m => {
    console.log(`\n${m.creator} - ${m.artworkTitle}`);
    console.log(`  Score: ${m.topScore} | ${m.topFilename}`);
    console.log(`  Reasons: ${m.candidates[0].reasons}`);
  });
  
  if (noMatches.length > 0) {
    console.log('\n\n❌ NO MATCHES FOUND (sample):');
    console.log('─'.repeat(70));
    noMatches.slice(0, 5).forEach(m => {
      console.log(`• ${m.creator} - ${m.artworkTitle}`);
    });
  }
  
  console.log('\n\n💡 NEXT STEPS:');
  console.log('─'.repeat(70));
  console.log('1. Review reports/artwork-image-matches.csv');
  console.log('2. Verify high confidence matches (score ≥60)');
  console.log('3. Manually review medium confidence matches');
  console.log('4. Run link script to apply approved matches');
}

matchOrphanedImagesToArtworks().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

