import { createClient } from '@sanity/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.bak') });

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'b8bczekj',
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false
});

async function setAllSectionsToMain() {
  console.log('🔍 Fetching all articles...\n');

  const articles = await client.fetch(`
    *[_type == "article" && !(_id in path("drafts.**"))] {
      _id,
      "title": title.en,
      section1Layout,
      section2Layout,
      section3Layout,
      section4Layout
    }
  `);

  console.log(`📋 Found ${articles.length} articles\n`);

  let updatedCount = 0;

  for (const article of articles) {
    const updates = {};
    let needsUpdate = false;

    // Check each section and set to "Main" if not already
    for (let i = 1; i <= 4; i++) {
      const currentLayout = article[`section${i}Layout`];
      if (currentLayout !== 'Main') {
        updates[`section${i}Layout`] = 'Main';
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      console.log(`✅ ${article.title || article._id}`);
      console.log(`   Setting sections to Main: ${Object.keys(updates).join(', ')}`);
      
      await client
        .patch(article._id)
        .set(updates)
        .commit();
      
      updatedCount++;
    }
  }

  console.log(`\n✅ Updated ${updatedCount} articles to "Main" layout`);
  console.log(`✅ ${articles.length - updatedCount} articles already had "Main" layout`);
}

setAllSectionsToMain().catch(console.error);

