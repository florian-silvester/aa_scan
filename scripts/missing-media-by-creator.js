import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

dotenv.config();

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN,
});

async function analyzeByCreator() {
  console.log('🔍 Analyzing missing media by creator...\n');

  const results = await sanityClient.fetch(`
    *[_type == "creator"] {
      _id,
      name,
      "totalArtworks": count(*[_type == "artwork" && references(^._id)]),
      "artworksWithMedia": count(*[_type == "artwork" && references(^._id) && (defined(images) || defined(mainImage.asset._ref))]),
      "artworksMissingMedia": count(*[_type == "artwork" && references(^._id) && !defined(images) && !defined(mainImage.asset._ref)])
    } | order(artworksMissingMedia desc)
  `);

  const creatorsWithMissing = results.filter(c => c.artworksMissingMedia > 0);

  console.log(`📊 Creators with missing media: ${creatorsWithMissing.length}`);
  console.log('─'.repeat(70));

  creatorsWithMissing.forEach((creator, i) => {
    const percentage = ((creator.artworksMissingMedia / creator.totalArtworks) * 100).toFixed(0);
    console.log(`${i + 1}. ${creator.name}`);
    console.log(`   Total: ${creator.totalArtworks} | Missing: ${creator.artworksMissingMedia} (${percentage}%)`);
  });

  // Check import dates
  console.log('\n\n📅 Import dates of artworks missing media:');
  console.log('─'.repeat(70));

  const dates = await sanityClient.fetch(`
    *[_type == "artwork" && !defined(images) && !defined(mainImage.asset._ref)] {
      _createdAt
    } | order(_createdAt desc)
  `);

  const dateGroups = {};
  dates.forEach(d => {
    const date = d._createdAt.split('T')[0];
    dateGroups[date] = (dateGroups[date] || 0) + 1;
  });

  Object.entries(dateGroups)
    .sort((a, b) => b[1] - a[1])
    .forEach(([date, count]) => {
      console.log(`${date}: ${count} artworks`);
    });
}

analyzeByCreator().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

