import('dotenv').then(({ default: dotenv }) => {
  dotenv.config({ path: '.env.bak' });
  
  // Import and run single creator sync
  import('./api/sync-to-webflow.js').then(async (module) => {
    console.log('Testing neyuQ sync...');
    
    // Manually trigger single item sync
    process.argv = ['node', 'script', 'creator', 'hEWOpVV05Nk2Wkv6vItQRB'];
    
    // The module auto-runs, just wait
  });
});

