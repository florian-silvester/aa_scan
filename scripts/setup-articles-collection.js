const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID;

if (!WEBFLOW_API_TOKEN || !WEBFLOW_SITE_ID) {
  console.error('❌ Missing WEBFLOW_API_TOKEN or WEBFLOW_SITE_ID in .env');
  process.exit(1);
}

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2';
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

async function setupArticlesCollection() {
  console.log('🎨 Setting up Articles Collection for Webflow\n');
  console.log('='.repeat(60));

  try {
    // Check if Articles collection already exists
    const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`);
    let articlesCollection = collections.collections?.find(c => 
      c.slug === 'articles' || c.slug === 'article' || c.displayName?.toLowerCase().includes('article')
    );

    if (articlesCollection) {
      console.log(`✅ Found existing Articles collection: ${articlesCollection.displayName}`);
      console.log(`   Collection ID: ${articlesCollection.id}\n`);
      
      // Get detailed collection info to check fields
      const details = await webflowRequest(`/collections/${articlesCollection.id}`);
      console.log('📋 Existing fields:');
      details.fields?.forEach(field => {
        console.log(`   - ${field.slug} (${field.type})`);
      });
      console.log('');
      
      return articlesCollection.id;
    }

    // Create new Articles collection
    console.log('📝 Creating new Articles collection...\n');
    
    const newCollection = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`, {
      method: 'POST',
      body: JSON.stringify({
        displayName: 'Articles',
        singularName: 'Article',
        slug: 'articles',
        fields: [
          // Top fields
          {
            displayName: 'Hero Headline',
            slug: 'hero-headline',
            type: 'RichText',
            isRequired: true,
            helpText: 'Main headline for the article (supports rich text formatting)'
          },
          {
            displayName: 'Hero Creator',
            slug: 'hero-creator',
            type: 'PlainText',
            isRequired: false,
            helpText: 'Creator/author name'
          },
          {
            displayName: 'Hero Image',
            slug: 'hero-image',
            type: 'Image',
            isRequired: false,
            helpText: 'Main hero image for the article'
          },
          {
            displayName: 'Hero Layout',
            slug: 'hero-layout',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'sticky', name: 'Sticky' },
                { id: 'standard', name: 'Standard' }
              ]
            },
            helpText: 'Choose between sticky or standard hero layout'
          },
          {
            displayName: 'Hero Caption',
            slug: 'hero-caption',
            type: 'PlainText',
            isRequired: false,
            helpText: 'Optional caption for hero image'
          },
          
          // Section 1
          {
            displayName: 'Section 1 Text',
            slug: 'section-1-text',
            type: 'RichText',
            isRequired: false,
            helpText: 'Rich text content for section 1'
          },
          {
            displayName: 'Section 1 Images',
            slug: 'section-1-images',
            type: 'ImageList',
            isRequired: false,
            helpText: 'Multiple images for section 1'
          },
          {
            displayName: 'Section 1 Layout',
            slug: 'section-1-layout',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'solo', name: 'Solo' },
                { id: 'twin', name: 'Twin' },
                { id: 'sticky', name: 'Sticky' }
              ]
            },
            helpText: 'Layout style for section 1'
          },
          {
            displayName: 'Section 1 Size',
            slug: 'section-1-size',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'small', name: 'Small' },
                { id: 'mid', name: 'Mid' },
                { id: 'full', name: 'Full' }
              ]
            },
            helpText: 'Size setting for section 1'
          },
          {
            displayName: 'Section 1 Caption',
            slug: 'section-1-caption',
            type: 'PlainText',
            isRequired: false,
            helpText: 'Caption for section 1'
          },
          
          // Section 2
          {
            displayName: 'Section 2 Text',
            slug: 'section-2-text',
            type: 'RichText',
            isRequired: false
          },
          {
            displayName: 'Section 2 Images',
            slug: 'section-2-images',
            type: 'ImageList',
            isRequired: false
          },
          {
            displayName: 'Section 2 Layout',
            slug: 'section-2-layout',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'solo', name: 'Solo' },
                { id: 'twin', name: 'Twin' },
                { id: 'sticky', name: 'Sticky' }
              ]
            }
          },
          {
            displayName: 'Section 2 Size',
            slug: 'section-2-size',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'small', name: 'Small' },
                { id: 'mid', name: 'Mid' },
                { id: 'full', name: 'Full' }
              ]
            }
          },
          {
            displayName: 'Section 2 Caption',
            slug: 'section-2-caption',
            type: 'PlainText',
            isRequired: false
          },
          
          // Section 3
          {
            displayName: 'Section 3 Text',
            slug: 'section-3-text',
            type: 'RichText',
            isRequired: false
          },
          {
            displayName: 'Section 3 Images',
            slug: 'section-3-images',
            type: 'ImageList',
            isRequired: false
          },
          {
            displayName: 'Section 3 Layout',
            slug: 'section-3-layout',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'solo', name: 'Solo' },
                { id: 'twin', name: 'Twin' },
                { id: 'sticky', name: 'Sticky' }
              ]
            }
          },
          {
            displayName: 'Section 3 Size',
            slug: 'section-3-size',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'small', name: 'Small' },
                { id: 'mid', name: 'Mid' },
                { id: 'full', name: 'Full' }
              ]
            }
          },
          {
            displayName: 'Section 3 Caption',
            slug: 'section-3-caption',
            type: 'PlainText',
            isRequired: false
          },
          
          // Section 4
          {
            displayName: 'Section 4 Text',
            slug: 'section-4-text',
            type: 'RichText',
            isRequired: false
          },
          {
            displayName: 'Section 4 Images',
            slug: 'section-4-images',
            type: 'ImageList',
            isRequired: false
          },
          {
            displayName: 'Section 4 Layout',
            slug: 'section-4-layout',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'solo', name: 'Solo' },
                { id: 'twin', name: 'Twin' },
                { id: 'sticky', name: 'Sticky' }
              ]
            }
          },
          {
            displayName: 'Section 4 Size',
            slug: 'section-4-size',
            type: 'Option',
            isRequired: false,
            validations: {
              options: [
                { id: 'small', name: 'Small' },
                { id: 'mid', name: 'Mid' },
                { id: 'full', name: 'Full' }
              ]
            }
          },
          {
            displayName: 'Section 4 Caption',
            slug: 'section-4-caption',
            type: 'PlainText',
            isRequired: false
          }
        ]
      })
    });

    console.log('✅ Articles collection created successfully!');
    console.log(`   Collection ID: ${newCollection.id}`);
    console.log(`   Display Name: ${newCollection.displayName}`);
    console.log(`   Slug: ${newCollection.slug}\n`);
    
    console.log('📋 Created fields:');
    newCollection.fields?.forEach(field => {
      console.log(`   - ${field.slug} (${field.type})`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Use manage-webflow-articles.js to create/update articles');
    console.log('   2. Articles are standalone in Webflow (not synced from Sanity)');
    console.log('');

    return newCollection.id;

  } catch (error) {
    console.error('❌ Error setting up Articles collection:', error.message);
    throw error;
  }
}

setupArticlesCollection().catch(console.error);

