# 🌐 Webflow Integration Guide

This guide helps you connect your Webflow project with Sanity Art Aurea using MCP (Model Context Protocol) servers.

## 🏗️ Architecture Overview

```
Art Jewelry Documents → AI Processing → Sanity CMS → Webflow Website
```

Your setup uses **two MCP servers**:
1. **Sanity MCP Server**: Manages art jewelry content in Sanity CMS
2. **Webflow MCP Server**: Syncs content to your Webflow site

## ✅ Current MCP Configuration

Your `~/.cursor/mcp.json` is already configured with:

```json
{
  "mcpServers": {
    "sanity": {
      "command": "npx",
      "args": ["-y", "@sanity/mcp-server@latest"],
      "env": {
        "SANITY_PROJECT_ID": "b8bczekj",
        "SANITY_DATASET": "production",
        "SANITY_API_TOKEN": "[your-token]",
        "MCP_USER_ROLE": "editor"
      }
    },
    "webflow": {
      "command": "npx mcp-remote https://mcp.webflow.com/sse"
    }
  }
}
```

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create a `.env` file in your project root:

```env
# Sanity Configuration
SANITY_PROJECT_ID=b8bczekj
SANITY_DATASET=production
SANITY_API_TOKEN=your_sanity_api_token_here

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_api_key_here

# Webflow Configuration
WEBFLOW_API_TOKEN=your_webflow_api_token_here
WEBFLOW_SITE_ID=your_webflow_site_id_here

# Server Configuration
PORT=3001
```

### 3. Start the MCP Server
```bash
npm start
```

The server will start on `http://localhost:3001` with:
- ✅ Document processing interface
- ✅ Sanity CMS integration  
- ✅ Webflow sync endpoints
- ✅ MCP status monitoring

## 🔧 MCP Server Endpoints

### Health Check
```
GET /health
```
Returns MCP server status and configuration.

### MCP Status
```
GET /mcp/status
```
Shows Sanity and Webflow MCP integration status.

### Webflow Sites
```
GET /webflow/sites
```
Lists available Webflow sites (uses MCP tools).

### Sync Content
```
POST /sync/sanity-to-webflow
```
Syncs art jewelry content from Sanity to Webflow.

## 🎨 Content Sync Workflow

### 1. Art Jewelry Content Structure

**Articles** (Exhibition catalogs, artist profiles):
- Title EN/DE
- Author & Maker
- Introduction & Full Text (bilingual)
- Linked artworks
- Publication date

**Artworks** (Individual pieces):
- Work title & Image ID
- Category (brooch, necklace, etc.)
- Maker & Year
- Materials & Measurements (bilingual)
- High-resolution images
- Detailed descriptions (bilingual)

### 2. Webflow Collection Setup

Create these collections in your Webflow site:

**Articles Collection:**
```
- title-en (Plain Text)
- title-de (Plain Text)  
- author (Plain Text)
- maker (Plain Text)
- date (Date)
- introduction-en (Rich Text)
- introduction-de (Rich Text)
- full-text-en (Rich Text)
- full-text-de (Rich Text)
- slug (Slug)
- featured-image (Image)
```

**Artworks Collection:**
```
- work-title (Plain Text)
- image-id (Plain Text)
- category-en (Plain Text)
- category-de (Plain Text)
- maker (Plain Text)
- year (Plain Text)
- material-en (Rich Text)
- material-de (Rich Text)
- measurements (Plain Text)
- comments-en (Rich Text)
- comments-de (Rich Text)
- images (Image)
- slug (Slug)
```

### 3. Using MCP Tools for Sync

With Cursor's MCP integration, you can:

```javascript
// Query Sanity content
const articles = await mcp_sanity_query_documents({
  query: '*[_type == "article"][0...10]{title, _id, titleEn, titleDe}',
  limit: 10
});

// Create Webflow items
await webflow_create_collection_item({
  siteId: 'your-site-id',
  collectionId: 'articles-collection-id',
  fields: {
    'title-en': article.titleEn,
    'title-de': article.titleDe,
    // ... more fields
  }
});
```

## 🔄 Automated Sync Process

### Option 1: Manual Sync via Interface
1. Process Word documents → Sanity CMS
2. Use web interface at `http://localhost:3001`
3. Click "Sync to Webflow" for specific content

### Option 2: Programmatic Sync
```javascript
// Sync all articles
const response = await fetch('/sync/sanity-to-webflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contentType: 'articles',
    records: articleData
  })
});
```

## 🌍 Bilingual Website Setup

### Language Switching
Your Webflow site can display content in both English and German:

```html
<!-- Language toggle -->
<div class="language-toggle">
  <button onclick="setLanguage('en')">English</button>
  <button onclick="setLanguage('de')">Deutsch</button>
</div>

<!-- Dynamic content -->
<h1 id="article-title"></h1>
<div id="article-content"></div>

<script>
function setLanguage(lang) {
  document.getElementById('article-title').textContent = 
    lang === 'en' ? article.titleEn : article.titleDe;
  document.getElementById('article-content').innerHTML = 
    lang === 'en' ? article.fullTextEn : article.fullTextDe;
}
</script>
```

## 🔍 Testing & Debugging

### 1. Check MCP Status
```bash
curl http://localhost:3001/mcp/status
```

### 2. Test Webflow Connection
```bash
curl http://localhost:3001/webflow/sites
```

### 3. Monitor Sync Process
```bash
curl -X POST http://localhost:3001/sync/sanity-to-webflow \
  -H "Content-Type: application/json" \
  -d '{"contentType": "test", "records": []}'
```

## 🚨 Troubleshooting

### Common Issues

1. **"Webflow MCP not responding"**
   - Check internet connection
   - Verify Webflow API token is valid
   - Restart MCP server

2. **"Sanity sync failed"**
   - Verify SANITY_API_TOKEN in `.env`
   - Check project permissions
   - Ensure schema is deployed

3. **"Content not appearing in Webflow"**
   - Verify collection field names match
   - Check Webflow site publishing status
   - Review API rate limits

### Debug Mode
```bash
NODE_ENV=development npm start
```

## 🎯 Next Steps

1. **Deploy to Production**: Set up production environment variables
2. **Automate Syncing**: Create webhooks for real-time updates
3. **Custom Fields**: Add project-specific Webflow collections
4. **Image Optimization**: Set up automatic image processing
5. **SEO Enhancement**: Add meta fields and structured data

## 📞 Support

- **Sanity MCP**: [Sanity MCP Documentation](https://www.sanity.io/docs)
- **Webflow MCP**: [Webflow MCP Server](https://mcp.webflow.com)
- **Art Aurea Issues**: Check server logs and MCP status

---

**✨ Your art jewelry documentation is now connected to the web! 🎨🌐** 