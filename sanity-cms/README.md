# 🎨 Art Jewelry CMS - Sanity Schemas

This directory contains Sanity schemas that **exactly match** your current Airtable structure with full bilingual support.

## 📋 **Schema Structure**

### **Articles** (`article.js`)
- ✅ Title EN/DE
- ✅ Author  
- ✅ Maker
- ✅ Date
- ✅ Introduction EN/DE
- ✅ Full Text EN/DE
- ✅ Images (references to artworks)
- ✅ Slug for URLs

### **Artworks** (`artwork.js`)
- ✅ Image ID (first_initial_lastname/number format)
- ✅ Work Title
- ✅ Category EN/DE (Brooch/Brosche, etc.)
- ✅ Maker
- ✅ Year
- ✅ Material EN/DE
- ✅ Measurements
- ✅ Comments EN/DE
- ✅ Photo Credit
- ✅ Images (actual image files)
- ✅ Articles (references back to articles)

## 🚀 **Setup Instructions**

### **1. Install Dependencies**
```bash
cd sanity-cms
npm install
```

### **2. Set up Environment Variables**
Create a `.env` file in the sanity-cms directory:
```bash
SANITY_API_TOKEN=your_sanity_api_token_here
```

To get your Sanity API token:
1. Go to https://www.sanity.io/manage/personal/tokens
2. Create a new token with "Editor" permissions
3. Copy the token to your .env file

### **3. Deploy Schemas to Your Sanity Project**
```bash
npm run dev
```

This will:
- Start the Sanity Studio locally
- Deploy your schemas to project `b8bczekj`
- Open the studio at http://localhost:3333

### **4. Verify Setup**
1. Open Sanity Studio
2. You should see "Articles" and "Artworks" in the sidebar
3. Try creating a test article and artwork
4. Verify all bilingual fields work correctly

## 🔗 **Integration with Word Processor**

The `sanity-client.js` file provides helper functions to:
- ✅ Create articles and artworks
- ✅ Update existing content
- ✅ Find content by title/imageId
- ✅ Batch create artworks with article references
- ✅ Handle bilingual content properly

## 🌍 **Bilingual Field Mapping**

| Airtable Field | Sanity Field |
|----------------|--------------|
| Title EN | titleEn |
| Title DE | titleDe |
| Introduction EN | introductionEn |
| Introduction DE | introductionDe |
| Full Text EN | fullTextEn |
| Full Text DE | fullTextDe |
| Material EN | materialEn |
| Material DE | materialDe |
| Category EN | categoryEn |
| Category DE | categoryDe |
| Comments EN | commentsEn |
| Comments DE | commentsDe |

## 🎯 **Next Steps**

1. **Deploy schemas** to your Sanity project
2. **Test the studio** interface
3. **Modify your Word processor** to use Sanity instead of Airtable
4. **Set up Webflow integration** for the frontend

Perfect migration from Airtable → Sanity → Webflow! 🎉 