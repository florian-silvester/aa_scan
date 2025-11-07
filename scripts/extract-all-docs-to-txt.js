const textract = require('textract');
const fs = require('fs');
const path = require('path');

const baseDir = '/Users/florian.ludwig/Documents/aa_scan/Content/WEBSITE_STORIES';
const folders = fs.readdirSync(baseDir);

console.log(`Found ${folders.length} folders\n`);

let processed = 0;
let failed = 0;
let total = 0;

async function processFile(folderPath, docFile, folder) {
  return new Promise((resolve) => {
    const docPath = path.join(folderPath, docFile);
    const txtPath = path.join(folderPath, docFile.replace(/\.(doc|docx|odt)$/, '.txt'));
    
    textract.fromFileWithPath(docPath, (error, text) => {
      if (error) {
        console.error(`❌ ${folder}/${docFile}: ${error.message}`);
        failed++;
        resolve();
        return;
      }
      
      fs.writeFileSync(txtPath, text, 'utf8');
      console.log(`✅ ${folder}/${docFile} → ${path.basename(txtPath)}`);
      processed++;
      resolve();
    });
  });
}

async function processAll() {
  for (const folder of folders) {
    const folderPath = path.join(baseDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const files = fs.readdirSync(folderPath);
    const docFiles = files.filter(f => f.endsWith('.doc') || f.endsWith('.docx') || f.endsWith('.odt'));
    
    total += docFiles.length;
    
    for (const docFile of docFiles) {
      await processFile(folderPath, docFile, folder);
    }
  }
  
  console.log(`\n📊 Summary: ${processed} converted, ${failed} failed, ${total} total`);
}

processAll().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

