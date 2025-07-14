const handler = require('./sync-to-webflow.js')

// Mock request and response objects
const mockReq = {
  method: 'POST',
  body: {}
}

const mockRes = {
  headers: {},
  statusCode: 200,
  setHeader: function(name, value) {
    this.headers[name] = value
  },
  status: function(code) {
    this.statusCode = code
    return this
  },
  json: function(data) {
    console.log('Response:', JSON.stringify(data, null, 2))
    return this
  },
  end: function() {
    console.log('Response ended')
  }
}

console.log('🧪 Testing Fixed Sync System...')
console.log('=' .repeat(50))

// Test the sync
handler(mockReq, mockRes)
  .then(() => {
    console.log('✅ Test completed successfully!')
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message)
  }) 