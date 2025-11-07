# Field Mapping Mismatches - Sanity → Webflow

## 🔴 CRITICAL ISSUES

### 1. ARTWORK - Wrong Image Format
**Problem:** Sending objects instead of URLs
```javascript
// WRONG ❌
'main-image': { url: '...', alt: '...' }
'artwork-images': [{ url: '...', alt: '...' }]

// CORRECT ✅
'main-image': 'https://cdn.sanity.io/...'
'artwork-images': ['https://cdn.sanity.io/...', 'https://cdn.sanity.io/...']
```

### 2. LOCATION - Missing Fields
**Webflow has:**
- `location-image` (Image) ❌ NOT MAPPED
- `country` (PlainText) ❌ NOT MAPPED  
- `city-location` (PlainText) ❌ NOT MAPPED

**Sanity has:**
- `image` → should map to `location-image`
- `country` (reference to country doc) → need to extract country.name
- `city` (reference to city doc) → need to extract city.name

### 3. MATERIAL - Wrong Description Format
**Webflow expects:** RichText
**We send:** PlainText string
**Fix:** Use `convertSanityBlocksToWebflowRichText()` if description is blocks

### 4. FINISH - Missing sort-order
**Webflow has:** `sort-order` (Number)
**We send:** Only name + slug
**Need:** Add sortOrder field to Sanity finish schema OR default to 0

---

## ✅ CORRECT MAPPINGS

### Creator
- ✅ All fields now correct (after fixes)
- ✅ Images as URL strings
- ✅ Locations mapped

### Material Type
- ✅ Has sort-order
- ✅ All fields present

### Category (Medium in Webflow)
- ✅ All fields present
- ✅ Description as PlainText (correct)

### Medium (Type in Webflow) 
- ✅ Simple name + slug (correct)

---

## 🔧 FIXES NEEDED

1. **Artwork images** - Change to URL arrays
2. **Location** - Add image, country, city fields + fetch from Sanity
3. **Material description** - Check if RichText or PlainText in Sanity
4. **Finish** - Add sortOrder field

