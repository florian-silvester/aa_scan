const { execSync } = require('child_process');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.bak') });

console.log('🔍 Running full sync to clean up unpublished articles and update images...\n');
console.log('This will:');
console.log('  1. Sync only published articles (exclude drafts)');
console.log('  2. Delete orphaned articles from Webflow (unpublished/deleted in Sanity)');
console.log('  3. Force update all articles to refresh images\n');

try {
  // Run full article sync (not one-by-one, so orphan detection works)
  // FORCE_UPDATE=true forces all articles to update (bypasses hash check)
  // --only=article syncs only articles
  execSync(
    `cd ${__dirname}/../api && FORCE_UPDATE=true node sync-to-webflow.js --only=article`,
    { 
      encoding: 'utf8',
      stdio: 'inherit',
      env: { ...process.env, FORCE_UPDATE: 'true' }
    }
  );
  
  console.log('\n✅ Full sync completed!');
  console.log('   - Unpublished articles should now be removed from Webflow');
  console.log('   - All articles were synced (images should be updated)');
} catch (error) {
  console.error('\n❌ Sync failed:', error.message);
  process.exit(1);
}

