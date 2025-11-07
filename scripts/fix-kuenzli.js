const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const textract = require('textract');

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

function generateKey() {
  return crypto.randomBytes(8).toString('hex');
}

function textToBlocks(text) {
  return [{
    _key: generateKey(),
    _type: 'block',
    children: [{_key: generateKey(), _type: 'span', text: text}],
    markDefs: [],
    style: 'normal'
  }];
}

async function fix() {
  const fullText = await new Promise((resolve, reject) => {
    textract.fromFileWithPath('Content/WEBSITE_STORIES/2016_AA25_HUBER_KUENZLI_JAPAN/Beindruckt von Künzlis Ironie.odt', (e,t) => {
      if (e) reject(e);
      else resolve(t);
    });
  });
  
  const splitPoint = fullText.indexOf("Struck by Künzli's Wit");
  const deText = fullText.substring(0, splitPoint).trim();
  const enText = fullText.substring(splitPoint).trim();
  
  console.log('DE:', deText.length, 'chars');
  console.log('EN:', enText.length, 'chars');
  
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*kuenzli*' || slug.current match '*künzli*'][0]{_id}`);
  
  await client.patch(article._id).set({
    heroHeadline: {
      de: textToBlocks('Otto Künzli in Japan'),
      en: textToBlocks("Struck by Künzli's Wit")
    },
    intro: {
      de: textToBlocks('Minimalistisch, hintersinnig, manchmal ironisch und immer handwerklich bestechend. Die Werke des 1948 in Zürich geborenen Schmuckkünstlers waren jüngst in Tokio ausgestellt. Die japanische Kunstkritikerin Noriko Kawakami war tief beeindruckt.'),
      en: textToBlocks('Standing in front of a round table, a young girl was about to set down a bright red bead she had brought along, with her mother. Visitors laid out separate, unthreaded beads in the form of a large pearl necklace.')
    },
    section1Text: {
      de: textToBlocks(deText),
      en: textToBlocks(enText)
    }
  }).commit();
  
  console.log('✅ Fixed!');
}

fix().catch(console.error);

