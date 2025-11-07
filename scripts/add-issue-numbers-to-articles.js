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

const STORIES_DIR = '/Users/florian.ludwig/Documents/aa_scan/Content/WEBSITE_STORIES';

// Extract issue number from folder name
// Example: "2020_AA39_FULLE_KARL" -> "AA39"
function extractIssueFromFolder(folderName) {
  const parts = folderName.split('_');
  if (parts.length >= 2 && parts[1].match(/^AA\d+$/)) {
    return parts[1];
  }
  return null;
}

// Get all folders and their issue numbers
function getFolderIssueMap() {
  const folders = fs.readdirSync(STORIES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  const map = {};
  folders.forEach(folder => {
    const issue = extractIssueFromFolder(folder);
    if (issue) {
      map[folder] = issue;
      
      // Also create mappings for creator name variations
      // Example: "2020_AA39_FULLE_KARL" -> ["FULLE", "KARL", "FULLE KARL"]
      const parts = folder.split('_').slice(2); // Skip year and issue
      const creatorName = parts.join(' ');
      const lastName = parts[0];
      
      map[creatorName.toLowerCase()] = issue;
      map[lastName.toLowerCase()] = issue;
    }
  });
  
  return map;
}

// Match article to folder/issue
function findIssueForArticle(article, folderMap) {
  // Try slug first
  if (article.slug?.current) {
    const slugParts = article.slug.current.split('-');
    for (const [key, issue] of Object.entries(folderMap)) {
      const keyParts = key.toLowerCase().split(/[_\s-]+/);
      const matches = slugParts.filter(part => keyParts.includes(part));
      if (matches.length >= 2) {
        return issue;
      }
    }
  }
  
  // Try creator name
  if (article.creatorName) {
    const nameKey = article.creatorName.toLowerCase();
    if (folderMap[nameKey]) {
      return folderMap[nameKey];
    }
    
    // Try last name only
    const nameParts = article.creatorName.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1].toLowerCase();
    if (folderMap[lastName]) {
      return folderMap[lastName];
    }
  }
  
  return null;
}

async function updateArticleIssues(dryRun = false) {
  console.log('🔍 Fetching all articles from Sanity...\n');
  
  const articles = await client.fetch(
    `*[_type == "article"] | order(_createdAt desc) {
      _id,
      creatorName,
      "titleEn": title.en,
      "titleDe": title.de,
      slug,
      issue,
      _createdAt
    }`
  );
  
  console.log(`📊 Found ${articles.length} articles\n`);
  
  // Get folder-to-issue mapping
  const folderMap = getFolderIssueMap();
  console.log(`📁 Found ${Object.keys(folderMap).length} folder mappings\n`);
  
  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (const article of articles) {
    const displayName = article.creatorName || article.titleEn || article.titleDe || article._id;
    
    // Skip if already has issue
    if (article.issue) {
      console.log(`⏭️  ${displayName} - Already has issue: ${article.issue}`);
      skipped++;
      continue;
    }
    
    // Try to find issue
    const issue = findIssueForArticle(article, folderMap);
    
    if (issue) {
      console.log(`✅ ${displayName} -> ${issue}`);
      
      if (!dryRun) {
        await client
          .patch(article._id)
          .set({ issue: issue })
          .commit();
      }
      
      updated++;
    } else {
      console.log(`❌ ${displayName} - Could not find issue (slug: ${article.slug?.current || 'none'})`);
      notFound++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped (already has issue): ${skipped}`);
  console.log(`   ❌ Not found: ${notFound}`);
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('Run without --dry-run to apply changes');
  }
}

// Main
const dryRun = process.argv.includes('--dry-run');
updateArticleIssues(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });

