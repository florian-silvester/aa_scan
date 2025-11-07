const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

async function main() {
  const collectionId = process.argv[2] || process.env.WEBFLOW_ARTWORK_COLLECTION_ID || '68c6785963cdfa79c3a138d1'

  const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items?limit=5`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })

  const text = await response.text()
  console.log(text)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})





