const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

function generateKey() { return crypto.randomBytes(8).toString('hex'); }

const articlesToFix = [
  {slug: '*heger*', name: 'Emil Heger', folder: '2014_AA19_HEGER_EMIL'},
  {slug: '*rothman*', name: 'Gerd Rothman', folder: '2016_AA25_ROTHMAN_GERD'},
  {slug: '*lintzen*', name: 'Sabine Lintzen', folder: '2025_AA61_CC_LINTZEN_SABINE'},
  {slug: '*schloss*', name: 'Juliane Schloss', folder: '2022_AA48_SCHLOSS_JULIANE'}
];

function findImageDirs(folderPath) {
  const subdirs = fs.readdirSync(folderPath).filter(f => {
    try {
      return fs.statSync(path.join(folderPath, f)).isDirectory();
    } catch(e) { return false; }
  });
  
  const imageDirs = [];
  for (const subdir of subdirs) {
    const subdirPath = path.join(folderPath, subdir);
    try {
      const files = fs.readdirSync(subdirPath);
      const images = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
      if (images.length > 0) {
        imageDirs.push({dir: subdirPath, images});
      }
    } catch(e) {}
  }
  
  return imageDirs;
}

async function uploadAndDistribute(article) {
  console.log(`\n=== ${article.name} ===`);
  
  const folderPath = path.join('Content/WEBSITE_STORIES', article.folder);
  const imageDirs = findImageDirs(folderPath);
  
  if (imageDirs.length === 0) {
    console.log('No images found in folder');
    return;
  }
  
  const allImages = [];
  for (const imgDir of imageDirs) {
    allImages.push(...imgDir.images.map(img => path.join(imgDir.dir, img)));
  }
  
  console.log(`Uploading ${allImages.length} images...`);
  
  const assetIds = [];
  for (const imgPath of allImages) {
    try {
      const buffer = fs.readFileSync(imgPath);
      const asset = await client.assets.upload('image', buffer, {
        filename: path.basename(imgPath),
        contentType: 'image/jpeg'
      });
      assetIds.push(asset._id);
      console.log('✅', path.basename(imgPath));
    } catch (err) {
      console.log('❌', path.basename(imgPath), err.message);
    }
  }
  
  console.log(`\nDistributing ${assetIds.length} images...`);
  
  const heroId = assetIds[0];
  const finalId = assetIds[assetIds.length - 1];
  const middleIds = assetIds.slice(1, -1);
  
  const perSection = Math.ceil(middleIds.length / 4);
  const section1Ids = middleIds.slice(0, perSection);
  const section2Ids = middleIds.slice(perSection, perSection * 2);
  const section3Ids = middleIds.slice(perSection * 2, perSection * 3);
  const section4Ids = middleIds.slice(perSection * 3);
  
  function createImageObj(id) {
    return {
      _key: generateKey(),
      _type: 'image',
      asset: { _type: 'reference', _ref: id },
      alt: { en: article.name, de: article.name }
    };
  }
  
  function getLayout(count) {
    if (count === 1) return 'Small';
    if (count === 2) return 'Main';
    return 'Full';
  }
  
  const art = await client.fetch(`*[_type=='article'&&slug.current match ${JSON.stringify(article.slug)}][0]{_id}`);
  
  await client.patch(art._id).set({
    heroImage: createImageObj(heroId),
    section1Images: section1Ids.map(createImageObj),
    section1Layout: getLayout(section1Ids.length),
    section2Images: section2Ids.length ? section2Ids.map(createImageObj) : undefined,
    section2Layout: section2Ids.length ? getLayout(section2Ids.length) : undefined,
    section3Images: section3Ids.length ? section3Ids.map(createImageObj) : undefined,
    section3Layout: section3Ids.length ? getLayout(section3Ids.length) : undefined,
    section4Images: section4Ids.length ? section4Ids.map(createImageObj) : undefined,
    section4Layout: section4Ids.length ? getLayout(section4Ids.length) : undefined,
    sectionFinalImage1: createImageObj(finalId)
  }).commit();
  
  console.log(`✅ ${article.name} updated with all ${assetIds.length} images!`);
}

async function run() {
  for (const article of articlesToFix) {
    try {
      await uploadAndDistribute(article);
    } catch (err) {
      console.log(`❌ ${article.name}: ${err.message}`);
    }
  }
  
  console.log('\n🎉 ALL MISSING IMAGES UPLOADED!');
}

run().catch(console.error);

