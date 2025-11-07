#!/bin/bash

# Deploy Sync Script to Vercel
# This script copies the updated sync script to the Vercel deployment repo and pushes it

set -e  # Exit on error

echo "🚀 Deploying Sync Script to Vercel"
echo "=================================="
echo ""

# Define paths
SOURCE_FILE="/Users/florian.ludwig/Documents/aa_scan/api/sync-to-webflow.js"
DEPLOY_REPO="/Users/florian.ludwig/Documents/art-aurea-api"
DEST_FILE="$DEPLOY_REPO/api/sync-to-webflow.js"

# Check if source file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Source file not found: $SOURCE_FILE"
    exit 1
fi

# Check if deployment repo exists
if [ ! -d "$DEPLOY_REPO" ]; then
    echo "❌ Deployment repo not found: $DEPLOY_REPO"
    echo "💡 Clone it with: git clone <your-art-aurea-api-repo-url> $DEPLOY_REPO"
    exit 1
fi

# Copy file
echo "📦 Copying sync script..."
cp "$SOURCE_FILE" "$DEST_FILE"
echo "✅ Copied to: $DEST_FILE"
echo ""

# Navigate to deployment repo
cd "$DEPLOY_REPO"

# Check if there are changes
if git diff --quiet api/sync-to-webflow.js; then
    echo "ℹ️  No changes detected. Sync script is already up to date."
    exit 0
fi

# Show diff
echo "📝 Changes detected:"
git diff --stat api/sync-to-webflow.js
echo ""

# Prompt for commit message
read -p "📝 Enter commit message (default: 'Update sync script'): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"Update sync script"}

# Add, commit, and push
echo ""
echo "🔄 Committing changes..."
git add api/sync-to-webflow.js
git commit -m "$COMMIT_MSG"

echo ""
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Check deployment status:"
echo "   https://vercel.com/dashboard"
echo ""
echo "🌐 Production API:"
echo "   https://art-aurea-api.vercel.app"
echo ""
echo "💡 Vercel will auto-deploy in ~30 seconds"

