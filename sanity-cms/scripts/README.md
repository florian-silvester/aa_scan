# Scripts Directory Organization

This directory contains all utility scripts for the Sanity Art Aurea CMS, organized by functionality.

## 📁 Directory Structure

### 🎨 **artwork-import/**
Scripts for importing and processing artwork data from various sources.

### 📊 **analysis/**
Scripts for analyzing data patterns and generating reports.

### 🧹 **cleanup/**
Scripts for cleaning up data, removing duplicates, and fixing inconsistencies.

### 👤 **creator-management/**
Scripts for managing creator profiles, biographies, and categories.

### ✅ **data-validation/**
Scripts for validating data integrity and checking for issues.

### 📍 **location-management/**
Scripts for managing gallery locations and venue data.

### 🔧 **materials-management/**
Scripts for managing materials, material types, and material-related operations.
- `check-materials.js` - Validate material data
- `discover-extract-materials.js` - Extract materials from artwork descriptions  
- `populate-materials.js` - Populate material database
- `debug-materials.js/.cjs` - Debug material-related issues

### 🖼️ **media-management/**
Scripts for handling media files, uploads, and linking to artworks.

### 🔗 **media-linking/**
Scripts specifically for linking media files to artwork records.

### 🕷️ **scraping/**
Scripts for scraping data from external sources.

### 📄 **wordpress-parsing/**
Scripts for parsing and migrating data from WordPress exports.

## 🚀 Usage

Run scripts from the project root using:
```bash
npm run dev  # Start development server
node sanity-cms/scripts/[category]/[script-name].js
```

## 📝 Notes

- All scripts use the centralized `sanity-client.js` for database connections
- Material-related scripts now use `materialType` field (not `category`)
- Scripts are organized by primary function for easy maintenance 