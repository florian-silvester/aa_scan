const { createClient } = require('@sanity/client');
const { execSync } = require('child_process');
require('dotenv').config();

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

async function syncAllArticles() {
  console.log('📋 Fetching all articles from Sanity...\n');
  
  const articles = await client.fetch(`
    *[_type == "article" && !(_id in path("drafts.**"))] | order(date desc) {
      _id,
      creatorName,
      title
    }
  `);
  
  console.log(`Found ${articles.length} articles to sync\n`);
  console.log('='.repeat(60));
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const title = article.title?.en || article.title?.de || article.creatorName || 'Untitled';
    const startTime = Date.now();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${i + 1}/${articles.length}] 🔄 Syncing: ${title}`);
    console.log(`ID: ${article._id}`);
    console.log(`Time: ${new Date().toLocaleTimeString()}`);
    console.log('-'.repeat(60));
    
    try {
      execSync(
        `cd ${__dirname}/../api && node sync-to-webflow.js ${article._id} article --force 2>&1 | grep -E "(✅|❌|Updated|Created|Failed|Error)" || true`,
        { 
          encoding: 'utf8',
          stdio: 'inherit',
          env: { ...process.env }
        }
      );
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      successCount++;
      console.log(`✅ [${i + 1}/${articles.length}] Success: ${title} (${duration}s)`);
      console.log(`   Progress: ${successCount} succeeded, ${failCount} failed\n`);
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      failCount++;
      console.error(`❌ [${i + 1}/${articles.length}] Failed: ${title} (${duration}s)`);
      console.error(`   Error: ${error.message}`);
      console.log(`   Progress: ${successCount} succeeded, ${failCount} failed\n`);
      // Continue with next article
    }
    
    // Small delay between articles
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 FINAL SUMMARY:`);
  console.log(`   ✅ Succeeded: ${successCount}/${articles.length}`);
  console.log(`   ❌ Failed: ${failCount}/${articles.length}`);
  console.log('='.repeat(60));
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Completed syncing ${articles.length} articles`);
}

syncAllArticles().catch(console.error);

