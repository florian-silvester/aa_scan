import { createClient } from '@sanity/client';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

dotenv.config();

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN,
});

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function deriveWorkQuery(artworkName, creatorName) {
  if (!artworkName) return encodeURIComponent(creatorName || '');
  let work = artworkName;
  // Remove creator name prefix if present (e.g., "Joo Hyung Park_The moment")
  if (creatorName && artworkName.startsWith(creatorName)) {
    const parts = artworkName.split('_');
    if (parts.length > 1) work = parts.slice(1).join(' ');
  }
  return encodeURIComponent(`${creatorName || ''} ${work}`.trim());
}

async function findProfileUrl(creatorName, workQuery) {
  const queries = [workQuery, encodeURIComponent(creatorName || '')];
  
  for (const q of queries) {
    const url = `https://artaurea.de/profiles/?s=${q}`;
    try {
      const res = await fetch(url, { timeout: 20000 });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);
      
      let href = null;
      $('a[href]').each((_, a) => {
        const h = $(a).attr('href') || '';
        const text = ($(a).text() || '').trim();
        if (h.includes('/profiles/') || h.includes('/profile/') || (h.endsWith('/') && text.length > 1)) {
          href = h;
          return false; // break
        }
      });
      
      if (href) return href;
    } catch (err) {
      console.log(`   ⚠️  Search failed: ${err.message}`);
    }
  }
  return null;
}

function countImagesOnProfile($) {
  let count = 0;
  $('img').each((_, img) => {
    const src = $(img).attr('src') || '';
    if (!src) return;
    if (/(logo|icon|avatar|placeholder)/i.test(src)) return;
    if (!src.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) return;
    count++;
  });
  return count;
}

async function checkImageAvailability() {
  console.log('🔍 Checking image availability on ArtAurea for artworks missing media...\n');
  
  // Get artworks missing media with their creator info
  const artworks = await sanityClient.fetch(`
    *[_type == "artwork" && !defined(images) && !defined(mainImage.asset._ref)] {
      _id,
      "title": workTitle.en,
      "creator": creator->name,
      slug
    } | order(creator asc, title asc)
  `);

  console.log(`Found ${artworks.length} artworks missing media\n`);
  console.log('Checking first 20 as a sample...\n');
  console.log('─'.repeat(80));

  const results = {
    foundWithImages: [],
    foundNoImages: [],
    notFound: [],
    errors: []
  };

  const limit = 20;
  
  for (let i = 0; i < Math.min(limit, artworks.length); i++) {
    const artwork = artworks[i];
    const creatorName = artwork.creator || 'Unknown';
    const title = artwork.title || 'Untitled';
    
    console.log(`\n${i + 1}. ${creatorName} - ${title}`);
    
    try {
      const workQuery = deriveWorkQuery(title, creatorName);
      console.log(`   🔎 Searching: "${decodeURIComponent(workQuery)}"`);
      
      const profileUrl = await findProfileUrl(creatorName, workQuery);
      
      if (!profileUrl) {
        console.log(`   ❌ No profile found`);
        results.notFound.push({ artwork, reason: 'No profile URL found' });
        await delay(1000);
        continue;
      }
      
      console.log(`   🌐 Found: ${profileUrl}`);
      
      // Fetch the profile page
      const res = await fetch(profileUrl, { timeout: 20000 });
      if (!res.ok) {
        console.log(`   ❌ Profile page error: ${res.status}`);
        results.errors.push({ artwork, reason: `HTTP ${res.status}` });
        await delay(1000);
        continue;
      }
      
      const html = await res.text();
      const $ = cheerio.load(html);
      const imageCount = countImagesOnProfile($);
      
      if (imageCount > 0) {
        console.log(`   ✅ Found ${imageCount} images on profile`);
        results.foundWithImages.push({ artwork, profileUrl, imageCount });
      } else {
        console.log(`   ⚠️  Profile found but no images`);
        results.foundNoImages.push({ artwork, profileUrl });
      }
      
      await delay(1500); // Be nice to the server
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      results.errors.push({ artwork, reason: err.message });
    }
  }

  // Summary
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 SUMMARY (sample of 20)');
  console.log('═'.repeat(80));
  console.log(`✅ Found profiles WITH images: ${results.foundWithImages.length}`);
  console.log(`⚠️  Found profiles WITHOUT images: ${results.foundNoImages.length}`);
  console.log(`❌ No profile found: ${results.notFound.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  const successRate = ((results.foundWithImages.length / limit) * 100).toFixed(1);
  console.log(`\n📈 Success rate: ${successRate}% (images available on ArtAurea)`);
  
  if (results.foundWithImages.length > 0) {
    console.log('\n✅ Sample artworks that CAN be imported:');
    results.foundWithImages.slice(0, 5).forEach(r => {
      console.log(`   • ${r.artwork.creator} - ${r.artwork.title} (${r.imageCount} images)`);
    });
  }
  
  if (results.notFound.length > 0) {
    console.log('\n❌ Sample artworks NOT found on ArtAurea:');
    results.notFound.slice(0, 5).forEach(r => {
      console.log(`   • ${r.artwork.creator} - ${r.artwork.title}`);
    });
  }

  console.log('\n💡 RECOMMENDATION:');
  if (successRate > 70) {
    console.log('   High success rate! Proceed with bulk import using fetch-artaurea-images-to-sanity.js');
  } else if (successRate > 30) {
    console.log('   Moderate success rate. Import available images, manual work needed for rest.');
  } else {
    console.log('   Low success rate. Images may not exist on ArtAurea or naming mismatch.');
    console.log('   Consider manual image upload or check source data.');
  }
}

checkImageAvailability().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

