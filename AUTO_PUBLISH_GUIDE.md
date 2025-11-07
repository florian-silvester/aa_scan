# 🚀 Auto-Publish Configuration Guide

## Overview

The sync script (`api/sync-to-webflow.js`) can now automatically publish items to Webflow using either:
1. **Command-line flag**: `--publish`
2. **Environment variable**: `AUTO_PUBLISH=true`

## 🎯 Quick Setup

### Option 1: Local Testing (Add to .env)

Add to your `.env` file:
```env
# Auto-publish to Webflow after sync
AUTO_PUBLISH=true
```

Then run sync normally:
```bash
node api/sync-to-webflow.js --only=creator
```

### Option 2: Vercel Production (Add to Vercel Dashboard)

1. Go to: https://vercel.com/dashboard
2. Select project: `art-aurea-api`
3. Go to: Settings → Environment Variables
4. Add new variable:
   - **Name**: `AUTO_PUBLISH`
   - **Value**: `true`
   - **Environment**: Production (or all)
5. Save and redeploy

## 📦 Deploying Changes to Vercel

### Important: TWO REPOSITORIES!

```
/aa_scan/              ← Development/Local scripts
/art-aurea-api/        ← Production API (Vercel watches this)
```

### Step-by-Step Deployment:

```bash
# 1. Copy updated sync script to deployment repo
cp /Users/florian.ludwig/Documents/aa_scan/api/sync-to-webflow.js \
   /Users/florian.ludwig/Documents/art-aurea-api/api/sync-to-webflow.js

# 2. Navigate to deployment repo
cd /Users/florian.ludwig/Documents/art-aurea-api

# 3. Commit and push
git add api/sync-to-webflow.js
git commit -m "Add AUTO_PUBLISH environment variable support"
git push origin main

# 4. Vercel auto-deploys (check dashboard)
```

## 🔧 How It Works

### Before (Manual Publishing):
```bash
# CLI
node api/sync-to-webflow.js --only=creator --publish

# API
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow \
  -H "Content-Type: application/json" \
  -d '{"autoPublish": true}'
```

### After (Auto-Publishing):
```bash
# CLI (if AUTO_PUBLISH=true in .env)
node api/sync-to-webflow.js --only=creator

# API (if AUTO_PUBLISH=true on Vercel)
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow
```

## 🎯 Behavior Summary

| Method | Publishes? |
|--------|-----------|
| `--publish` flag | ✅ Yes |
| `AUTO_PUBLISH=true` | ✅ Yes |
| Both set | ✅ Yes |
| Neither set | ❌ No (items stay as drafts) |

## 📊 Testing Auto-Publish

### Test Locally:
```bash
# Set environment variable temporarily
AUTO_PUBLISH=true node api/sync-to-webflow.js --only=creator

# Or add to .env permanently
echo "AUTO_PUBLISH=true" >> .env
node api/sync-to-webflow.js --only=creator
```

### Test on Vercel (after deployment):
```bash
# Trigger sync via API
curl -X POST https://art-aurea-api.vercel.app/api/sync-to-webflow

# Check Vercel logs for "🚀 Publishing" messages
```

## ⚠️ Important Notes

1. **Draft vs Live**: Without auto-publish, items are created as drafts in Webflow
2. **Sanity Plugin**: If using Sanity webhook/plugin, set `AUTO_PUBLISH=true` on Vercel
3. **Manual Override**: Even with `AUTO_PUBLISH=true`, you can skip publishing with `--no-publish` flag (not implemented yet)
4. **Two Repos**: Always deploy to `/art-aurea-api/` repo for Vercel changes

## 🐛 Troubleshooting

### Items not publishing?

1. Check Vercel environment variables:
   ```bash
   vercel env ls
   ```

2. Check Vercel logs:
   - Go to: https://vercel.com/dashboard
   - Select: `art-aurea-api`
   - View: Deployments → Latest → Logs

3. Look for publish messages:
   - `🚀 Publishing batch X/Y` - Publishing in progress
   - `✅ Complete sync finished` - Check if items are live

### Still having issues?

Check the sync output for these messages:
- `isDraft: false` - Auto-publish is ON
- `isDraft: true` - Auto-publish is OFF

## 📝 Environment Variables Reference

All required variables for Vercel deployment:

```env
# Required
SANITY_API_TOKEN=sk...
WEBFLOW_API_TOKEN=...
WEBFLOW_SITE_ID=...

# Optional
AUTO_PUBLISH=true              # Auto-publish items after sync
LIMIT_PER_COLLECTION=100       # Limit items per collection (for testing)
```

## 🔗 Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Production API**: https://art-aurea-api.vercel.app
- **Sanity Studio**: https://b8bczekj.sanity.studio

## 💡 Pro Tips

1. **Test locally first** with `AUTO_PUBLISH=true` before deploying to Vercel
2. **Use git commits** to track when you changed publish behavior
3. **Check Webflow** to verify items are actually published (not just drafted)
4. **Monitor Vercel logs** for the first few syncs after enabling auto-publish

