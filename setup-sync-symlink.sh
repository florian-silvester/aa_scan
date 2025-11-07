#!/bin/bash

# Setup Symlink for Sync Script
# This ensures BOTH repos use the SAME sync script file

set -e

echo "🔗 Setting up symlink for sync script"
echo "======================================"
echo ""

# Define paths
SOURCE_FILE="/Users/florian.ludwig/Documents/aa_scan/api/sync-to-webflow.js"
DEPLOY_REPO="/Users/florian.ludwig/Documents/art-aurea-api"
TARGET_FILE="$DEPLOY_REPO/api/sync-to-webflow.js"

# Check if source exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Source file not found: $SOURCE_FILE"
    exit 1
fi

# Check if deploy repo exists
if [ ! -d "$DEPLOY_REPO" ]; then
    echo "❌ Deploy repo not found: $DEPLOY_REPO"
    exit 1
fi

# Backup existing file if it exists and is not already a symlink
if [ -f "$TARGET_FILE" ] && [ ! -L "$TARGET_FILE" ]; then
    BACKUP="$TARGET_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Backing up existing file to: $BACKUP"
    mv "$TARGET_FILE" "$BACKUP"
fi

# Remove if symlink already exists
if [ -L "$TARGET_FILE" ]; then
    echo "🗑️  Removing old symlink"
    rm "$TARGET_FILE"
fi

# Create symlink
echo "🔗 Creating symlink..."
ln -s "$SOURCE_FILE" "$TARGET_FILE"

# Verify
if [ -L "$TARGET_FILE" ]; then
    echo "✅ Symlink created successfully!"
    echo ""
    echo "📍 Source: $SOURCE_FILE"
    echo "🔗 Link:   $TARGET_FILE"
    echo ""
    ls -lh "$TARGET_FILE"
    echo ""
    echo "✨ Now both repos use the SAME file!"
    echo "   Any changes in aa_scan will automatically appear in art-aurea-api"
else
    echo "❌ Symlink creation failed"
    exit 1
fi

