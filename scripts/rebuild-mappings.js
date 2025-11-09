// Force rebuild ID mappings from Webflow
import('../api/sync-to-webflow.js').then(async (module) => {
  console.log('Module loaded, running rebuild...');
  // The sync script will run rebuild automatically on import if needed
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

