# Art Aurea Project Setup

## Architecture Overview

This project has THREE separate deployments:

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Sanity Studio (Vercel)  ←──  Editors work here             │
│  https://aa-scan.vercel.app (or similar)                     │
│         │                                                     │
│         │ HTTP POST                                           │
│         ↓                                                     │
│  Sync API (Vercel)                                           │
│  https://art-aurea-api.vercel.app/api/sync-to-webflow       │
│         │                                                     │
│         │ Webflow API calls                                   │
│         ↓                                                     │
│  Webflow CMS                                                 │
│  (EN + DE locales)                                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Repositories

### Main Repo: `aa_scan`
- **Location**: `/Users/florian.ludwig/Documents/aa_scan`
- **GitHub**: `florian-silvester/aa_scan`
- **Contains**:
  - `sanity-cms/` - Sanity Studio source code
  - `api/` - Sync API source code (source of truth)
  - `scripts/` - Local utility scripts
  - `webflow/` - Webflow site exports

### API Repo: `art-aurea-api`
- **Location**: `/Users/florian.ludwig/Documents/art-aurea-api`
- **GitHub**: `florian-silvester/art-aurea-api`
- **Contains**:
  - `api/sync-to-webflow.js` - **Symlinked from `aa_scan`** (local dev) or **copied** (Vercel deployment)
  - `sync-script-from-aa-scan.sh` - Script to sync sync script from `aa_scan`
- **Note**: This repo exists separately because Vercel needs the actual file (can't follow symlinks during builds)

### Vercel Deployments

1. **Sanity Studio Deployment**
   - **Source**: `sanity-cms/` folder
   - **Build**: `npm run build` → outputs to `sanity-cms/dist/`
   - **Deployed to**: Vercel (project name: likely `aa-scan` or similar)
   - **Used by**: All editors to manage content

2. **API Deployment**
   - **Source**: `api/` folder
   - **Vercel Project**: `art-aurea-api`
   - **Endpoint**: `https://art-aurea-api.vercel.app/api/sync-to-webflow`
   - **Environment Variables Needed**:
     - `WEBFLOW_API_TOKEN`
     - `WEBFLOW_SITE_ID`
     - `SANITY_API_TOKEN`

## How Sync Works

### Full Sync (All Collections)
```bash
# Triggered from Sanity Studio "Webflow Sync" tab
# OR via curl:
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow
```

### Single Item Sync
```bash
# Triggered from any document in Sanity Studio (creator, artwork, etc.)
# Click the "Sync to Webflow" action button
# OR via curl:
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow \
  -H "Content-Type: application/json" \
  -d '{
    "syncType": "single-item",
    "documentId": "creator-id-here",
    "documentType": "creator",
    "autoPublish": true
  }'
```

**Supported document types:**
- `creator`
- `artwork`
- `article`
- `author`
- `photographer`
- `category`
- `medium`
- `material`
- `materialType`
- `finish`
- `location`

## Localization Strategy

### Webflow Locale Setup
- **Primary**: English (en-US)
- **Secondary**: German (de-DE)

### How Items Are Created
1. **POST to `/items/bulk`** with `cmsLocaleIds: [en-US, de-DE]`
   - Creates ONE item with linked EN + DE variants
2. **PATCH the DE locale** with German-specific content
3. **Publish both locales** together

### Content Mapping
- Sanity stores content as: `{ en: "English text", de: "German text" }`
- API maps to Webflow EN locale first, then updates DE locale
- Images and references are shared across locales

## Development Workflow

### For Sanity Studio Changes
```bash
cd /Users/florian.ludwig/Documents/aa_scan/sanity-cms
npm run dev              # Test locally at localhost:3333
npm run build            # Build for production
git add . && git commit -m "..." && git push
# Vercel auto-deploys Sanity Studio
```

### For API Changes

**Single Source of Truth**: The sync script (`api/sync-to-webflow.js`) lives in `aa_scan` and is the single source of truth.

**Local Development**:
```bash
cd /Users/florian.ludwig/Documents/aa_scan
# Edit api/sync-to-webflow.js

# Test locally (optional):
node api/sync-to-webflow.js --only=creator --limit=1

# Commit to aa_scan:
git add api/sync-to-webflow.js
git commit -m "API updates"
git push origin main
```

**Deploying to Vercel (art-aurea-api)**:
Since `art-aurea-api` uses a symlink locally but Vercel can't follow symlinks, you need to copy the file before deploying:

```bash
cd /Users/florian.ludwig/Documents/art-aurea-api

# Copy latest sync script from aa_scan:
npm run sync-script

# Commit and push:
git add api/sync-to-webflow.js
git commit -m "Update sync script from aa_scan"
git push origin main
# Vercel auto-deploys API within 30-60 seconds
```

**Workflow Summary**:
1. **Edit** sync script in `aa_scan` (single source of truth)
2. **Test locally** - symlink in `art-aurea-api` allows instant testing
3. **Commit to `aa_scan`** - push changes to main repo
4. **Sync to `art-aurea-api`** - run `npm run sync-script` to copy file
5. **Deploy** - commit & push to `art-aurea-api` for Vercel deployment

### For Local Scripts (one-off tasks)
```bash
cd /Users/florian.ludwig/Documents/aa_scan/scripts
node your-script.js
# These run locally, NOT on Vercel
```

## Important Files

### Sanity Studio
- `sanity-cms/sanity.config.js` - Studio configuration
- `sanity-cms/schemas/` - Content schemas
- `sanity-cms/components/SyncToWebflowAction.jsx` - Full sync UI
- `sanity-cms/components/SyncDocumentAction.js` - Single-item sync button
- `sanity-cms/plugins/webflowSyncPlugin.js` - Webflow Sync tool

### API
- `api/sync-to-webflow.js` - Main sync logic
- `vercel.json` - Vercel serverless function config

### Environment
- `.env.bak` - Local environment variables (NOT deployed)
- Vercel dashboard - Production environment variables

## Troubleshooting

### "Sync button not appearing on documents"
- Check `sanity-cms/sanity.config.js` → `document.actions`
- Rebuild Sanity Studio: `cd sanity-cms && npm run build`
- Hard refresh browser (Cmd+Shift+R)

### "CORS errors in browser console"
- Check API CORS headers in `api/sync-to-webflow.js`
- Verify API URL in `SyncDocumentAction.js`

### "API timeout (504)"
- Full sync takes 5+ minutes and may timeout
- Use single-item sync instead
- Or run locally: `node api/sync-to-webflow.js`

### "Items not linking across locales"
- Ensure using `/items/bulk` with `cmsLocaleIds` array
- Check that both locales are published together

### "Wrong API being called"
- Check browser network tab for actual URL
- Should be: `https://art-aurea-api.vercel.app/api/sync-to-webflow`
- NOT: `https://aabackend-ten.vercel.app` (old/wrong)

## Article Sync Features

### Draft Exclusion
- Articles automatically exclude drafts: `!(_id in path("drafts.**"))`
- Only **published** articles sync to Webflow
- Unpublishing an article in Sanity removes it from Webflow on next full sync (orphan detection)

### Force Update
- Use `FORCE_UPDATE=true` to bypass hash check and force update all articles
- Useful for refreshing images or forcing complete resync
- Example: `FORCE_UPDATE=true node api/sync-to-webflow.js --only=article`

### Default Layouts
- Missing section layouts default to "Main" layout
- Prevents Webflow validation errors for required layout fields

### Orphan Cleanup
- Full sync (not single-item) automatically detects and deletes orphaned articles
- Orphaned = exists in Webflow but not in published Sanity articles
- Run full sync periodically to clean up unpublished articles

## Key Learnings

1. **Webflow's API doesn't support direct locale linking** via simple POST/PATCH
2. **Must use `/items/bulk` endpoint** with `cmsLocaleIds` array to create linked items
3. **CSV import is one-time only** - not suitable for ongoing sync
4. **Vercel has 5-minute timeout** for serverless functions - single-item sync avoids this
5. **Items must be published in both locales together** using new API format
6. **Drafts never sync** - only published documents appear in Webflow
7. **Orphan cleanup requires full sync** - single-item sync skips orphan detection

## Data Flow

### Creating a New Item
```
Sanity (EN + DE content)
    ↓
API creates item in Webflow
    ↓
POST /items/bulk with cmsLocaleIds: [en-US, de-DE]
    → Returns single itemId with linked variants
    ↓
PATCH /items/{itemId} with cmsLocaleId: de-DE
    → Updates German content
    ↓
POST /items/publish with items: [{id, cmsLocaleIds}]
    → Publishes both locales
```

### Updating an Existing Item
```
Sanity (changed content)
    ↓
API detects existing Webflow itemId
    ↓
PATCH /items/{itemId} (no cmsLocaleId = EN)
    → Updates English content
    ↓
PATCH /items/{itemId} with cmsLocaleId: de-DE
    → Updates German content
    ↓
POST /items/publish with items: [{id, cmsLocaleIds}]
    → Republishes both locales
```

