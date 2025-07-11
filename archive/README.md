# Archive Directory

This directory contains temporary data files and scripts that were generated during the WordPress to Sanity migration process.

## migration-data/
Contains JSON data files, intermediate reports, and temporary data generated during the migration:

- `artwork-*.json` - Artwork data extracted from WordPress
- `profile-*.json` - Profile and biography data
- `media-*.json` - Media analysis and import reports  
- `carousel-*.json` - Carousel/gallery data
- `*.cjs` - CommonJS utility scripts for data processing

These files are kept for reference but are not needed for the running application.

## Purpose
These files were moved here during cleanup to:
1. Keep the root directory clean and organized
2. Preserve important migration data for reference
3. Maintain historical records of the import process

## Note
Most of these files can be safely deleted after confirming the migration was successful and all data is properly imported into Sanity. 