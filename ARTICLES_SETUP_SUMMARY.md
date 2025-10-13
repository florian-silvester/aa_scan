# Articles Collection Setup Summary

## ✅ What's Created Via API

The following fields have been successfully added to your Articles collection:

### Hero Fields
- ✅ `hero-headline` (RichText) - Main headline
- ✅ `hero-creator` (PlainText) - Creator/author name
- ✅ `hero-image` (Image) - Main hero image
- ✅ `hero-layout` (PlainText) - Layout type: "sticky" or "standard"
- ✅ `hero-caption` (PlainText) - Optional caption

### Section 1-4 Fields
Each section (1, 2, 3, 4) has:
- ✅ `section-N-text` (RichText) - Rich text content
- ✅ `section-N-images` (MultiImage) - Multiple images
- ✅ `section-N-layout` (PlainText) - Layout: "solo", "twin", or "sticky"
- ✅ `section-N-size` (PlainText) - Size: "small", "mid", or "full"
- ✅ `section-N-caption` (PlainText) - Caption text

**Total: 29 fields created**

---

## ⚠️ Fields That Need Manual Setup in Webflow Designer

Webflow API v2 **does not support** adding these field types to existing collections via API:

### Reference Fields (Must Add Manually)
1. **Creator Reference** - Single reference to Creators collection
2. **Medium Reference** - Multi-reference to Medium collection  
3. **Materials Reference** - Multi-reference to Materials collection

### Option/Dropdown Fields (Must Add Manually)
The layout and size fields are currently PlainText. To make them proper dropdowns:

1. **Hero Layout** - Options: "sticky", "standard"
2. **Section 1-4 Layout** - Options: "solo", "twin", "sticky"
3. **Section 1-4 Size** - Options: "small", "mid", "full"

---

## 📝 How to Add Missing Fields in Webflow Designer

1. Go to your Webflow project
2. Open **CMS Collections** → **Articles**
3. Click **Add New Field**

### For Reference Fields:
- Field Type: **Reference** (single) or **Multi-Reference** (multiple)
- Display Name: e.g., "Creator"
- Field ID: e.g., `article-creator`
- Reference Collection: Select the target collection (Creators, Medium, Materials)

### For Option/Dropdown Fields:
- Field Type: **Option**
- Display Name: e.g., "Hero Layout"
- Options: Add your values (e.g., "sticky", "standard")
- Optionally delete the existing PlainText versions first

---

## 🚀 Using the Management Script

Once fields are set up, use the management script:

```bash
# List all articles
node scripts/manage-webflow-articles.js list

# Create a sample article
node scripts/manage-webflow-articles.js create-sample

# Create a custom article
node scripts/manage-webflow-articles.js create '{"hero-headline":"My Article", "hero-layout":"sticky"}'

# Update an article
node scripts/manage-webflow-articles.js update ARTICLE_ID '{"hero-headline":"Updated Title"}'

# Publish an article
node scripts/manage-webflow-articles.js publish ARTICLE_ID

# Delete an article
node scripts/manage-webflow-articles.js delete ARTICLE_ID
```

---

## 📄 Articles Are Standalone in Webflow

Unlike other content (Creators, Artworks, etc.), **Articles are NOT synced from Sanity**.  
They live entirely in Webflow CMS and are managed directly via the Webflow API.

---

## 🎯 Next Steps

1. **Add Reference Fields** in Webflow Designer (Creator, Medium, Materials)
2. **Optional**: Convert layout/size PlainText fields to Option fields for better UX
3. Start creating articles with `manage-webflow-articles.js`

---

Created: $(date)

