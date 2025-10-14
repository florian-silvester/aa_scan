# Art Aurea Project Structure

## 🗂️ Repository Setup

This project uses **TWO SEPARATE GIT REPOSITORIES**:

### 1. `florian-silvester/aa_scan` (THIS REPO)
**Location:** `/Users/florian.ludwig/Documents/aa_scan`  
**Purpose:** Main development repository containing:
- `/sanity-cms/` - Sanity Studio (CMS interface)
- `/scripts/` - Local utility scripts for data management
- `/api/` - **LOCAL COPY ONLY** (for reference/backup)
- `/webflow/` - Webflow static files

**Deploy:** Sanity Studio can be deployed separately if needed

---

### 2. `florian-silvester/art-aurea-api` (VERCEL API REPO)
**Location:** `/Users/florian.ludwig/Documents/art-aurea-api`  
**Purpose:** Production API deployed to Vercel
- `/api/sync-to-webflow.js` - **THIS IS THE LIVE API ENDPOINT**
- Vercel watches this repo and auto-deploys on push
- URL: `https://art-aurea-api.vercel.app/api/sync-to-webflow`

**Deploy:** Auto-deploys to Vercel on `git push`

---

## 🚨 CRITICAL: When Making API Changes

### ❌ WRONG:
```bash
# DO NOT edit only here:
/Users/florian.ludwig/Documents/aa_scan/api/sync-to-webflow.js
# This will NOT deploy to Vercel!
```

### ✅ CORRECT:
```bash
# 1. Edit in BOTH repos:
/Users/florian.ludwig/Documents/aa_scan/api/sync-to-webflow.js (for backup)
/Users/florian.ludwig/Documents/art-aurea-api/api/sync-to-webflow.js (for deployment)

# 2. Push to art-aurea-api repo to deploy:
cd /Users/florian.ludwig/Documents/art-aurea-api
git add api/sync-to-webflow.js
git commit -m "Update sync API"
git push origin main

# 3. Vercel will auto-deploy in ~30-60 seconds
```

---

## 📋 Deployment Checklist

When updating the sync API:

- [ ] Edit `/aa_scan/api/sync-to-webflow.js` (local backup)
- [ ] Copy to `/art-aurea-api/api/sync-to-webflow.js`
- [ ] Commit and push to `art-aurea-api` repo
- [ ] Verify deployment at https://vercel.com/dashboard
- [ ] Test endpoint: `curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow`

---

## 🔗 Quick Commands

### Copy updated API to deployment repo:
```bash
cp /Users/florian.ludwig/Documents/aa_scan/api/sync-to-webflow.js \
   /Users/florian.ludwig/Documents/art-aurea-api/api/sync-to-webflow.js
```

### Deploy to Vercel:
```bash
cd /Users/florian.ludwig/Documents/art-aurea-api
git add api/sync-to-webflow.js
git commit -m "Update sync logic"
git push origin main
```

### Test deployment:
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow
```

---

## 🌍 Environment Variables

### Required on Vercel (art-aurea-api project):
- `SANITY_API_TOKEN` - Sanity read/write token
- `WEBFLOW_API_TOKEN` - Webflow v2 API token
- `WEBFLOW_SITE_ID` - Webflow site ID

### Local (.env files):
- `aa_scan/.env` - For local scripts
- `art-aurea-api/.env` - For local API testing (not deployed)

---

## 🎯 Why Two Repos?

1. **Separation of concerns:** Studio/scripts vs. production API
2. **Independent deployment:** Sanity Studio and API deploy separately
3. **Security:** API repo can have restricted access
4. **Vercel:** Each Vercel project watches one repo

---

## ⚠️ Common Mistakes to Avoid

1. ❌ Editing only `aa_scan/api/` and expecting Vercel to deploy
2. ❌ Forgetting to push to `art-aurea-api` after making changes
3. ❌ Pushing to wrong repo and wondering why deployment didn't happen
4. ❌ Not checking Vercel dashboard to confirm deployment succeeded

---

## 📞 Quick Reference

| What | Where |
|------|-------|
| Sanity Studio | `/aa_scan/sanity-cms/` |
| Local scripts | `/aa_scan/scripts/` |
| **LIVE API (Vercel)** | `/art-aurea-api/api/` |
| API backup | `/aa_scan/api/` |
| Vercel dashboard | https://vercel.com/dashboard |
| Production API | https://art-aurea-api.vercel.app |

---

## 🎯 API Usage

### Full Sync (All Collections):
```bash
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow
```

### Single Item Sync:
```bash
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow \
  -H "Content-Type: application/json" \
  -d '{
    "syncType": "single-item",
    "documentId": "creator-id-123",
    "documentType": "creator",
    "autoPublish": true
  }'
```

**Supported document types:**
- `creator`
- `artwork`  
- `category`
- `medium`
- `material`
- `materialType`
- `finish`
- `location`

---

**Last Updated:** October 13, 2025

