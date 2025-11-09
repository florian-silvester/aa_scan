# Creator Aggregates Setup

## What Was Added

### Sanity Schema Changes
Added 3 new fields to `creator.js`:
- `creatorMaterials` - All unique materials from creator's artworks
- `creatorFinishes` - All unique finishes from creator's artworks  
- `creatorMediumTypes` - All unique medium types from creator's artworks

These fields are **read-only** in Sanity (auto-populated by script).

### Sync Script Updates
Updated `api/sync-to-webflow.js`:
- Added fields to creator query (lines 1936-1938)
- Added field mapping in `mapCreatorFields()` (lines 640-648)
- Maps to Webflow fields: `creator-materials`, `creator-finishes`, `creator-medium-types`

### Population Script
Created `scripts/populate-creator-aggregates.js`:
- Queries all artworks per creator
- Collects unique material/finish/medium IDs
- Updates creator documents in Sanity

---

## Setup Steps

### 1. Add Fields to Webflow (Manual)
In Webflow Designer → Creators Collection, add these fields:

**Field 1:**
- Field Type: **Multi-Reference**
- Display Name: `Creator Materials`
- Field ID: `creator-materials`
- Reference Collection: **Materials**

**Field 2:**
- Field Type: **Multi-Reference**
- Display Name: `Creator Finishes`
- Field ID: `creator-finishes`
- Reference Collection: **Finishes**

**Field 3:**
- Field Type: **Multi-Reference**
- Display Name: `Creator Medium Types`
- Field ID: `creator-medium-types`
- Reference Collection: **Type** (or Medium, depending on your setup)

### 2. Populate Sanity Data (One-Time)
```bash
cd /Users/florian.ludwig/Documents/aa_scan
node scripts/populate-creator-aggregates.js
```

This will:
- Query all creators
- Aggregate their artwork materials/finishes/mediums
- Update each creator document

### 3. Sync to Webflow
```bash
# Full sync
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow

# Or sync single creator
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow \
  -H "Content-Type: application/json" \
  -d '{
    "syncType": "single-item",
    "documentId": "CREATOR_ID_HERE",
    "documentType": "creator",
    "autoPublish": true
  }'
```

---

## Usage in Webflow

On a creator page (e.g., Sophia Epp), you can now:

1. **Display as tags/badges:**
   - Add Collection List bound to `Creator Materials`
   - Style as clickable tags
   - Link each tag to materials overview page

2. **Filter links:**
   - Link to `/materials/silver` (individual material page)
   - Link to `/artworks?material=silver` (filtered artworks)
   - Link to `/creators?material=silver` (filtered creators)

3. **No nesting issues:**
   - These are direct references (not nested collection lists)
   - Doesn't count toward Webflow's 2-level nesting limit
   - All 3 collections can appear on same page

---

## Future Updates

### When New Artworks Are Published
Option 1: **Manual re-run**
```bash
node scripts/populate-creator-aggregates.js
```

Option 2: **Document action** (future enhancement)
- Add button to Sanity creator documents: "Update Aggregates"
- Triggers single-creator update
- Can be called after artwork changes

Option 3: **Webhook** (future enhancement)
- Trigger on artwork publish/update
- Auto-update related creator
- Fully automated

---

## Troubleshooting

**Creator fields not showing in Sanity?**
- Restart Sanity Studio: `cd sanity-cms && npm run dev`
- Hard refresh browser (Cmd+Shift+R)

**Fields empty after running script?**
- Check that artworks actually have materials/finishes/mediums assigned
- Verify script ran without errors
- Check Sanity Studio to confirm data was saved

**Fields not syncing to Webflow?**
- Verify field IDs in Webflow match: `creator-materials`, `creator-finishes`, `creator-medium-types`
- Check sync script logs for mapping errors
- Ensure Materials/Finishes/Type collections synced first (so idMappings exist)

**Before deploying sync changes:**
```bash
cd /Users/florian.ludwig/Documents/art-aurea-api
npm run sync-script  # Copy latest from aa_scan
git add api/sync-to-webflow.js
git commit -m "Add creator aggregate fields"
git push
```

