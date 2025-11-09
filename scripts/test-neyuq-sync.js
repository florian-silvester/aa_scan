require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.bak') })

// Set up single item filter before loading sync script
global.SINGLE_ITEM_FILTER = '&& _id == "hEWOpVV05Nk2Wkv6vItQRB"'

const syncScript = require('../api/sync-to-webflow.js')

console.log('🧪 Testing sync for neyuQ ceramics only...\n')

