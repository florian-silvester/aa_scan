const fs = require('fs');
const path = require('path');

const STORIES_DIR = '/Users/florian.ludwig/Documents/aa_scan/Content/WEBSITE_STORIES';

// Find all images in folder (including subdirectories)
function findImages(folderPath) {
  const images = [];
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        scanDir(fullPath);
      } else if (/\.(jpg|jpeg|png|tif|tiff)$/i.test(file)) {
        images.push(fullPath);
      }
    });
  }
  
  scanDir(folderPath);
  return images;
}

// Check if filename already starts with folder name
function alreadyRenamed(filename, folderName) {
  return filename.toLowerCase().startsWith(folderName.toLowerCase());
}

// Rename images in a folder
function renameImagesInFolder(folderName, folderPath, dryRun = true) {
  console.log(`\n📁 Processing: ${folderName}`);
  
  const imagePaths = findImages(folderPath);
  console.log(`   Found ${imagePaths.length} images`);
  
  let renamed = 0;
  let skipped = 0;
  
  for (const imagePath of imagePaths) {
    const dir = path.dirname(imagePath);
    const filename = path.basename(imagePath);
    
    // Skip if already renamed
    if (alreadyRenamed(filename, folderName)) {
      skipped++;
      continue;
    }
    
    // New filename: FOLDERNAME_originalname.jpg
    const newFilename = `${folderName}_${filename}`;
    const newPath = path.join(dir, newFilename);
    
    // Check if target already exists
    if (fs.existsSync(newPath)) {
      console.log(`   ⚠️  SKIP (exists): ${filename} -> ${newFilename}`);
      skipped++;
      continue;
    }
    
    if (dryRun) {
      console.log(`   📝 WOULD RENAME: ${filename}`);
      console.log(`                 -> ${newFilename}`);
    } else {
      try {
        fs.renameSync(imagePath, newPath);
        console.log(`   ✅ RENAMED: ${filename}`);
        console.log(`            -> ${newFilename}`);
        renamed++;
      } catch (error) {
        console.error(`   ❌ FAILED: ${filename} - ${error.message}`);
      }
    }
  }
  
  return { renamed, skipped };
}

// Main function
async function main() {
  const dryRun = !process.argv.includes('--execute');
  const testMode = process.argv.includes('--test');
  const limit = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  
  console.log('🏷️  Renaming Article Images');
  if (dryRun) console.log('   [DRY RUN MODE - no changes will be made]');
  if (testMode) console.log('   [TEST MODE: First folder only]');
  if (limit) console.log(`   [LIMIT: ${limit} folders]`);
  console.log('='.repeat(60));
  
  let folders = fs.readdirSync(STORIES_DIR)
    .filter(f => {
      const fullPath = path.join(STORIES_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort();
  
  if (testMode) {
    folders = folders.slice(0, 1);
  } else if (limit) {
    folders = folders.slice(0, parseInt(limit));
  }
  
  console.log(`\n📁 Processing ${folders.length} folder(s)\n`);
  
  let totalRenamed = 0;
  let totalSkipped = 0;
  
  for (const folder of folders) {
    const folderPath = path.join(STORIES_DIR, folder);
    const { renamed, skipped } = renameImagesInFolder(folder, folderPath, dryRun);
    totalRenamed += renamed;
    totalSkipped += skipped;
  }
  
  console.log('\n' + '='.repeat(60));
  if (dryRun) {
    console.log(`📊 DRY RUN Summary:`);
    console.log(`   Would rename: ${totalRenamed}`);
    console.log(`   Would skip: ${totalSkipped}`);
    console.log('\n💡 Run with --execute to actually rename files');
    console.log('   Example: node scripts/rename-article-images.js --execute');
  } else {
    console.log(`✅ Rename complete!`);
    console.log(`   Renamed: ${totalRenamed}`);
    console.log(`   Skipped: ${totalSkipped}`);
  }
}

// Run
main().catch(console.error);

