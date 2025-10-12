const fs = require('fs');
const path = require('path');

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

/**
 * Test Webflow Publish API - which formats does it accept?
 * 
 * Testing:
 * 1. Old format: { itemIds: ['id1', 'id2'] }
 * 2. New format: { items: [{id: 'id1', cmsLocaleIds: [...]}] }
 * 3. Performance comparison
 */
async function testPublishFormats() {
  console.log('🧪 Testing Webflow Publish API Formats\n');

  // Get collections
  const cols = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  const creatorCol = cols.collections.find(c => c.displayName === 'Creator');

  // Create 2 test items for publishing
  console.log('📝 Step 1: Creating 2 test items...\n');
  
  const testItems = [];
  for (let i = 1; i <= 2; i++) {
    const createRes = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cmsLocaleIds: [WEBFLOW_LOCALES['en-US'], WEBFLOW_LOCALES['de-DE']],
        isDraft: true,
        fieldData: {
          name: `Publish Test ${i}`,
          slug: `publish-test-${i}-${Date.now()}`
        }
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error(`❌ Failed to create test item ${i}:`, err);
      return;
    }

    const result = await createRes.json();
    testItems.push(result.items[0].id);
    console.log(`  ✅ Created item ${i}: ${result.items[0].id}`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // TEST 1: Old format with itemIds
  console.log('TEST 1: Old format { itemIds: [...] }\n');
  
  const startOld = Date.now();
  const oldFormatRes = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      itemIds: [testItems[0]]
    })
  });
  const timeOld = Date.now() - startOld;

  console.log(`  Status: ${oldFormatRes.status} ${oldFormatRes.statusText}`);
  console.log(`  Time: ${timeOld}ms`);
  
  if (oldFormatRes.ok) {
    const result = await oldFormatRes.json();
    console.log(`  ✅ SUCCESS - Published ${result.publishedItemIds?.length || 0} item(s)`);
    console.log(`  Response:`, JSON.stringify(result, null, 2));
  } else {
    const err = await oldFormatRes.text();
    console.log(`  ❌ FAILED:`, err);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // TEST 2: New format with items array and cmsLocaleIds
  console.log('TEST 2: New format { items: [{id, cmsLocaleIds}] }\n');
  
  const startNew = Date.now();
  const newFormatRes = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: [{
        id: testItems[1],
        cmsLocaleIds: [WEBFLOW_LOCALES['en-US'], WEBFLOW_LOCALES['de-DE']]
      }]
    })
  });
  const timeNew = Date.now() - startNew;

  console.log(`  Status: ${newFormatRes.status} ${newFormatRes.statusText}`);
  console.log(`  Time: ${timeNew}ms`);
  
  if (newFormatRes.ok) {
    const result = await newFormatRes.json();
    console.log(`  ✅ SUCCESS - Published item(s)`);
    console.log(`  Response:`, JSON.stringify(result, null, 2));
  } else {
    const err = await newFormatRes.text();
    console.log(`  ❌ FAILED:`, err);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // TEST 3: Verify published status
  console.log('TEST 3: Verify items are published in both locales\n');
  
  for (let i = 0; i < testItems.length; i++) {
    const itemId = testItems[i];
    
    // Check EN locale
    const enItem = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/${itemId}?cmsLocaleId=${WEBFLOW_LOCALES['en-US']}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    
    // Check DE locale
    const deItem = await fetch(`https://api.webflow.com/v2/collections/${creatorCol.id}/items/${itemId}?cmsLocaleId=${WEBFLOW_LOCALES['de-DE']}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    
    console.log(`  Item ${i + 1} (${itemId}):`);
    console.log(`    EN: isDraft = ${enItem.isDraft} (${enItem.isDraft ? '❌ NOT published' : '✅ Published'})`);
    console.log(`    DE: isDraft = ${deItem.isDraft} (${deItem.isDraft ? '❌ NOT published' : '✅ Published'})`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // SUMMARY
  console.log('📊 SUMMARY:\n');
  console.log(`  Old format { itemIds }: ${oldFormatRes.ok ? '✅ WORKS' : '❌ FAILS'} (${timeOld}ms)`);
  console.log(`  New format { items + locales }: ${newFormatRes.ok ? '✅ WORKS' : '❌ FAILS'} (${timeNew}ms)`);
  
  if (oldFormatRes.ok && newFormatRes.ok) {
    console.log(`\n  ⚡ Performance: ${timeOld < timeNew ? 'Old' : 'New'} format is ${Math.abs(timeOld - timeNew)}ms faster`);
  }

  console.log('\n💡 RECOMMENDATION:');
  if (!oldFormatRes.ok && newFormatRes.ok) {
    console.log('   Use NEW format only - old format no longer supported');
  } else if (oldFormatRes.ok && !newFormatRes.ok) {
    console.log('   Use OLD format only - new format not supported');
  } else if (oldFormatRes.ok && newFormatRes.ok) {
    console.log('   Both formats work! Use NEW format for explicit locale control');
  } else {
    console.log('   ⚠️  Neither format worked - check API or permissions');
  }

  console.log('\n✅ Test complete!\n');
}

testPublishFormats().catch(console.error);

