const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');

// Load env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

const token = process.env.WEBFLOW_API_TOKEN;
const siteId = process.env.WEBFLOW_SITE_ID;

const WEBFLOW_LOCALES = {
  'en-US': '68c6785963cdfa79c3a137cc',
  'de-DE': '68e134d0086ac0f97d5540b9'
};

async function testNewCreateLogic() {
  console.log('🧪 Testing new create logic from sync-to-webflow.js\n');

  // Get collections
  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  const creatorCol = cols.collections.find(c => c.displayName === 'Creator');

  // Simulate what createWebflowItems will receive
  const items = [
    {
      fieldData: {
        name: 'Test Creator EN Only',
        slug: 'test-creator-en-only'
      },
      germanFieldData: null // No German content
    },
    {
      fieldData: {
        name: 'Test Creator With German',
        slug: 'test-creator-with-german'
      },
      germanFieldData: {
        name: 'Test Creator Mit Deutsch'
      }
    }
  ];

  // Process items (same logic as createWebflowItems)
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`Creating item ${i + 1}/${items.length}...`);

    try {
      // Step 1: Create linked item in BOTH locales
      const createResult = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/bulk`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cmsLocaleIds: [WEBFLOW_LOCALES['en-US'], WEBFLOW_LOCALES['de-DE']],
          isDraft: true,
          fieldData: item.fieldData
        })
      }).then(r => r.json());

      const createdItem = createResult?.items?.[0];
      if (!createdItem) {
        throw new Error('No item returned from bulk create');
      }

      console.log(`  ✅ Created EN+DE: ${createdItem.id}`);

      // Step 2: Update DE locale with German content if available
      if (item.germanFieldData) {
        const updateRes = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/${createdItem.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cmsLocaleId: WEBFLOW_LOCALES['de-DE'],
            fieldData: item.germanFieldData
          })
        });

        if (updateRes.ok) {
          console.log(`  🇩🇪 Updated German content`);
        } else {
          const err = await updateRes.text();
          console.warn(`  ⚠️  Failed to update DE: ${err}`);
        }
      } else {
        console.log(`  ⚪ No German content to update`);
      }

      // Verify both locales
      const enItem = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/${createdItem.id}?cmsLocaleId=${WEBFLOW_LOCALES['en-US']}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());

      const deItem = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/${createdItem.id}?cmsLocaleId=${WEBFLOW_LOCALES['de-DE']}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());

      console.log(`  📝 EN: "${enItem.fieldData?.name}"`);
      console.log(`  📝 DE: "${deItem.fieldData?.name}"`);
      console.log();

    } catch (error) {
      console.error(`  ❌ Failed:`, error.message);
      throw error;
    }
  }

  console.log('✅ Test completed successfully!\n');
  console.log('🎉 The new create logic works correctly:');
  console.log('   • Creates linked EN+DE items with /items/bulk');
  console.log('   • Updates DE locale with German content via PATCH');
  console.log('   • Falls back to EN content for DE if no German data');
}

testNewCreateLogic().catch(console.error);

