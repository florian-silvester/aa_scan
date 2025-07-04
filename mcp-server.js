#!/usr/bin/env node

/**
 * AI-Powered Word/Dropbox to Airtable Processor
 * Extracts Word content + Dropbox images → Uses OpenAI to analyze → Sorts into Airtable
 */

// Load environment variables from .env file
require('dotenv').config();

const http = require('http');
const https = require('https');
const url = require('url');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const mammoth = require('mammoth');
const { Dropbox } = require('dropbox');

const PORT = process.env.PORT || 3001;
const upload = multer({ dest: 'uploads/' });

// Environment variables for credentials (use .env file or set in environment)
const DEFAULT_CREDENTIALS = {
    airtable_token: process.env.AIRTABLE_TOKEN,
    base_id: process.env.BASE_ID,
    openai_api_key: process.env.OPENAI_API_KEY
};

// Validate required environment variables
function validateEnvironmentVariables() {
    const required = ['AIRTABLE_TOKEN', 'BASE_ID', 'OPENAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        console.error('Please set these in your .env file or environment');
        process.exit(1);
    }
}

// Validate environment variables on startup
validateEnvironmentVariables();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Make request to Airtable API
 */
function makeAirtableRequest(token, baseId, endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const airtableUrl = `https://api.airtable.com/v0/${baseId}/${endpoint}`;
        const urlParts = new URL(airtableUrl);
        
        const requestOptions = {
            hostname: urlParts.hostname,
            port: 443,
            path: urlParts.pathname + urlParts.search,
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Word-Dropbox-Airtable-AI/1.0.0',
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(jsonData);
                    } else {
                        reject(new Error(`Airtable API Error: ${res.statusCode} - ${jsonData.error?.message || 'Unknown error'}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
        });

        req.on('error', reject);
        if (options.body) req.write(JSON.stringify(options.body));
        req.end();
    });
}

/**
 * Get Airtable base metadata
 */
async function getBaseMetadata(token, baseId) {
        const metadataUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
        const urlParts = new URL(metadataUrl);
        
        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: urlParts.hostname,
                port: 443,
                path: urlParts.pathname,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                'User-Agent': 'Word-Dropbox-Airtable-AI/1.0.0'
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        if (res.statusCode === 200) {
                            resolve(jsonData);
                        } else {
                            reject(new Error(`Metadata API Error: ${res.statusCode}`));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
        });
}

/**
 * Extract text from Word document
 */
async function extractWordContent(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return {
            text: result.value || 'No text found in document',
            messages: result.messages || []
        };
    } catch (error) {
        console.error('Word parsing error:', error);
        return {
            text: 'Error extracting text from Word document: ' + error.message,
            messages: [error.message]
        };
    }
}

/**
 * Get images from Dropbox folder
 */
async function getDropboxImages(accessToken, folderPath = '') {
    try {
        const dbx = new Dropbox({ accessToken });
        
        // List files in the folder
        const response = await dbx.filesListFolder({
            path: folderPath,
            recursive: true
        });
        
        const imageFiles = response.result.entries.filter(entry => 
            entry['.tag'] === 'file' && 
            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(entry.name)
        );
        
        const images = [];
        for (const file of imageFiles.slice(0, 10)) { // Limit to 10 images
            try {
                const downloadResponse = await dbx.filesDownload({ path: file.path_lower });
                const imageData = {
                    name: file.name,
                    path: file.path_lower,
                    size: file.size,
                    modified: file.client_modified,
                    // Convert to base64 for storage
                    data: Buffer.from(downloadResponse.result.fileBinary).toString('base64')
                };
                images.push(imageData);
            } catch (downloadError) {
                console.warn(`Failed to download ${file.name}:`, downloadError.message);
            }
        }
        
        return images;
    } catch (error) {
        console.error('Dropbox error:', error);
        return [];
    }
}

/**
 * Extract image captions manually from text as fallback
 */
function extractImageCaptionsFromText(text) {
    const captions = [];
    
    // Look for patterns that indicate image captions
    const captionPatterns = [
        // Pattern: Artist name, artwork title, year. Materials, dimensions
        /([A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+(?:[ ,].*?)?),\s*([^,]+),\s*(\d{4})\.\s*([^.]+)(?:,\s*([\d\s×xcmminμ.,\-]+))?/gi,
        // Pattern: Artwork by Artist, description
        /(?:Brooch|Necklace|Ring|Bracelet|Jewelry|Piece)(?:es)?\s+by\s+([A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+),\s*([^,]+(?:,\s*\d{4})?)\.\s*([^.]+)/gi,
        // Pattern: Artist's artwork description
        /([A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+)\s*[\–\-]?\s*([^,\n]+(?:brooch|necklace|ring|jewelry)[^.\n]*)\.\s*([A-Z][^.\n]+)(?:\.\s*([\d\s×xcmminμ.,\-]+))?/gi,
    ];
    
    // Additional specific patterns for this document
    const specificPatterns = [
        // Exact patterns from the text
        /Ruudt Peters, Dabad brooch from the Nebula series, 2020\. Silver, glass, gold, 7 x 7 x 5\.5 cm/gi,
        /Brooches by Beppe Kessler, Challenge 2 and Challenge 1, 2025\. Gold, aluminum, acrylic paint, wood/gi,
        /Brooch by Andrew Lamb, exhibited by Christian Hoedl/gi,
        /Necklace Assassination by Hansel Tai/gi,
        /Rings by Karl Fritsch/gi,
        /Value Added \(30 Hours\) necklace/gi,
        /Sebas series, here the Antonella brooch/gi
    ];
    
    // Search for specific patterns first
    specificPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const caption = parseImageCaption(match.trim());
                if (caption) {
                    captions.push(caption);
                }
            });
        }
    });
    
    // Search for general patterns
    captionPatterns.forEach(pattern => {
        let match;
        pattern.lastIndex = 0; // Reset regex
        while ((match = pattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const caption = parseImageCaption(fullMatch);
            if (caption && !captions.some(c => c.Comments === caption.Comments)) {
                captions.push(caption);
            }
        }
    });
    
    // Look for standalone artwork descriptions in the text
    const artworkLines = text.split('\n').filter(line => {
        line = line.trim();
        return line.length > 20 && 
               (line.includes('brooch') || line.includes('necklace') || line.includes('ring') || 
                line.includes('jewelry') || line.includes('cm') || line.includes('gold') || 
                line.includes('silver') || line.includes('2020') || line.includes('2025')) &&
               /[A-Z][a-z]+ [A-Z][a-z]+/.test(line); // Contains what looks like names
    });
    
    artworkLines.forEach(line => {
        const caption = parseImageCaption(line.trim());
        if (caption && !captions.some(c => c.Comments === caption.Comments)) {
            captions.push(caption);
        }
    });
    
    return captions;
}

// Global counter for image IDs by artist
const artistCounters = new Map();

/**
 * Generate consistent Image ID in first_initial_last_name/number format
 */
function generateImageId(maker) {
    if (!maker || maker.trim() === '') {
        return 'unknown/001';
    }
    
    const nameParts = maker.trim().split(/\s+/);
    
    // Extract first initial and last name
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || '';
    
    const firstInitial = firstName.charAt(0).toLowerCase().replace(/[^a-z]/g, '');
    const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
    
    // Create artist key: first_initial_lastname
    const artistKey = `${firstInitial}_${cleanLastName}`;
    
    // Get or initialize counter for this specific artist
    if (!artistCounters.has(artistKey)) {
        artistCounters.set(artistKey, 1);
    } else {
        artistCounters.set(artistKey, artistCounters.get(artistKey) + 1);
    }
    
    const counter = artistCounters.get(artistKey);
    return `${artistKey}/${counter.toString().padStart(3, '0')}`;
}

/**
 * Parse a single image caption into structured data
 */
function parseImageCaption(captionText) {
    if (!captionText || captionText.length < 10) return null;
    
    // Extract maker (usually first name in the caption)
    const nameMatch = captionText.match(/([A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+)/);
    const maker = nameMatch ? nameMatch[1] : '';
    
    // Extract year
    const yearMatch = captionText.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : '';
    
    // Extract materials (look for common jewelry materials)
    const materialWords = ['gold', 'silver', 'aluminum', 'acrylic', 'paint', 'wood', 'glass', 'garnet', 'plastic'];
    const materials = [];
    materialWords.forEach(material => {
        if (captionText.toLowerCase().includes(material)) {
            materials.push(material);
        }
    });
    
    // Extract dimensions (look for measurements)
    const dimensionMatch = captionText.match(/([\d\s×xcmminμ.,\-]+\s*cm)/i);
    const measurements = dimensionMatch ? dimensionMatch[1] : '';
    
    // Extract work title (look for quoted text or text after name but before year)
    let workTitle = '';
    const titlePatterns = [
        /[""](.*?)[""]/,  // Quoted titles
        /,\s*([^,]+(?:brooch|necklace|ring|series))/i,  // After comma, before materials
        /(?:from the|series)\s+([^,\n.]+)/i  // Series names
    ];
    
    for (const pattern of titlePatterns) {
        const titleMatch = captionText.match(pattern);
        if (titleMatch) {
            workTitle = titleMatch[1].trim();
            break;
        }
    }
    
    // If no specific title found, extract the main artwork description
    if (!workTitle && captionText.includes('brooch')) {
        const broochMatch = captionText.match(/([^,]*brooch[^,]*)/i);
        if (broochMatch) workTitle = broochMatch[1].trim();
    } else if (!workTitle && captionText.includes('necklace')) {
        const necklaceMatch = captionText.match(/([^,]*necklace[^,]*)/i);
        if (necklaceMatch) workTitle = necklaceMatch[1].trim();
    }
    
    // Generate unique ID using the helper function
    const imageId = generateImageId(maker);
    
    // Clean comments: remove redundant information already captured in other fields
    let cleanComments = captionText;
    if (maker && cleanComments.includes(maker)) {
        cleanComments = cleanComments.replace(new RegExp(maker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }
    if (workTitle && cleanComments.includes(workTitle)) {
        cleanComments = cleanComments.replace(new RegExp(workTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }
    if (year && cleanComments.includes(year)) {
        cleanComments = cleanComments.replace(new RegExp(year, 'g'), '').trim();
    }
    if (measurements && cleanComments.includes(measurements)) {
        cleanComments = cleanComments.replace(new RegExp(measurements.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }
    
    // Clean up extra commas and spaces
    cleanComments = cleanComments.replace(/^[,\s]+|[,\s]+$/g, '').replace(/\s*,\s*,\s*/g, ', ').trim();
    
    // If comments are too cleaned, fall back to original but shorter version
    if (cleanComments.length < 10) {
        cleanComments = captionText.length > 100 ? captionText.substring(0, 100) + '...' : captionText;
    }
    
    return {
        'Image ID': imageId,
        'Work Title': workTitle,
        'Maker': maker,
        'Year': year,
        'Material': materials.join(', '),
        'Measurements': measurements,
        'Comments': cleanComments
    };
}

/**
 * Use OpenAI to analyze and structure content for Airtable
 */
async function analyzeContentWithAI(content, images, tableStructure, openaiApiKey) {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Clean the text without limiting length
    let cleanText = content.text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n')  // Remove empty lines
        .trim();
    
    console.log(`📝 Full text length: ${cleanText.length} characters`);
    
    // NEVER TRUNCATE - Always process the complete document
    console.log(`📝 Processing COMPLETE document: ${cleanText.length} characters (NO TRUNCATION)`);
    console.log(`🔒 Text preservation: Using full original text without any length limits`);

    // Get actual field names from table structure
    const articlesTable = tableStructure.find(t => t.name === 'Articles');
    const imagesTable = tableStructure.find(t => t.name === 'Images');
    
    const articlesFields = articlesTable ? articlesTable.fields : [];
    const imagesFields = imagesTable ? imagesTable.fields : [];
    
    // Debug logging
    console.log('🔍 AI Analysis - Table Fields:');
    console.log('  Articles fields:', articlesFields.map(f => `${f.name} (${f.type})`));
    console.log('  Images fields:', imagesFields.map(f => `${f.name} (${f.type})`));

    const imageInfo = images.length > 0 ? 
        `\n\nAVAILABLE IMAGES FROM DROPBOX (${images.length} files):\n${images.map(img => `- ${img.name} (${Math.round(img.size/1024)}KB)`).join('\n')}` : 
        '\n\nNo images found in Dropbox folder.';

    const prompt = `
You are an art-jewelry curator and Airtable architect.

────────────────────────────────
🔹 SOURCE DOCUMENT
────────────────────────────────
${cleanText}

${images.length
  ? `DROPBOX IMAGES (${images.length} files):\n${images
      .map(i => `- ${i.name} (${Math.round(i.size/1024)} KB)`)
      .join('\n')}`
  : 'NO DROPBOX IMAGES PROVIDED'}

────────────────────────────────
🔹 TASKS
────────────────────────────────
1️⃣  **Long-text record**  
    • Build ONE object for the full article with the fields:  
      ─ Title EN (English title)
      ─ Title DE (German title, same as EN if not bilingual)
      ─ Author (article author/writer, else empty)
      ─ Maker (for individual artworks, else empty)
      ─ Date  (YYYY-MM-DD if stated, else empty)  
      ─ Introduction EN (3-4 sentence summary in English)
      ─ Introduction DE (3-4 sentence summary in German, same as EN if not available)
      ─ Full Text EN (English portion of document - extract ONLY English text)
      ─ Full Text DE copy (German portion of document - extract ONLY German text, leave empty if no German)

2️⃣  **Caption records**  
    • Scan for every standalone caption or descriptive sentence that clearly accompanies an image / artwork.  
      Examples from the text:
      - "Ruudt Peters, Dabad brooch from the Nebula series, 2020. Silver, glass, gold, 7 x 7 x 5.5 cm"
      - "Brooches by Beppe Kessler, Challenge 2 and Challenge 1, 2025. Gold, aluminum, acrylic paint, wood"
      - "Brooch by Andrew Lamb, exhibited by Christian Hoedl at the Versus Gallery"
      - "Necklace Assassination by Hansel Tai, presented by the Belgian gallery Beyond 2025"
      - "Rings by Karl Fritsch, with which he has been counteracting traditional notions of jewelry"
    • For *each* caption create an object with:  
        "Image ID"     – format: "first_initial_last_name/number" (e.g. "r_peters/001", "b_kessler/002")
        "Work Title"   – piece / series name if present, else ""  
        "Category EN"  – artwork category/type in English (e.g. "Brooch", "Necklace", "Ring"), else ""
        "Category DE"  – artwork category/type in German (e.g. "Brosche", "Halskette", "Ring"), else ""
        "Maker"        – artist / designer if named, else ""  
        "Year"         – year if mentioned, else ""  
        "Material EN"  – materials in English, else ""
        "Material DE"  – materials in German (same as EN if not available), else ""
        "Measurements" – dimensions if present, else ""
        "Comments EN"  – additional context in English NOT already captured in other fields
        "Comments DE"  – additional context in German (same as EN if not available), else ""

3️⃣  **Output** valid minified JSON in **this exact shape**  
    (no markdown fences, no trailing commas):

{
  "articles": [
    { "Title EN": "...", "Title DE": "...", "Author": "...", "Maker": "...", "Date": "...", "Introduction EN": "...", "Introduction DE": "...", "Full Text EN": "...", "Full Text DE": "..." }
  ],
  "images": [
    { "Image ID": "...", "Work Title": "...", "Category EN": "...", "Category DE": "...", "Maker": "...", "Year": "", "Material EN": "", "Material DE": "", "Measurements": "", "Comments EN": "...", "Comments DE": "..." },
    { … }, …
  ]
}

────────────────────────────────
🔹 RULES
────────────────────────────────
• Do NOT wrap the JSON in back-ticks or \`\`\` fences.  
• Preserve all diacritics (ö, é, …).  
• Leave a field empty ("") if unknown – never invent.  
• Expect 10-20 image objects for a typical Art Aurea article.  
• The "Full Text" field must stay 100% unchanged (preserve ALL languages).  
• For bilingual documents: 
  - Split text by language: German text goes to "Full Text DE copy", English text goes to "Full Text EN"
  - If document has both languages, separate them properly
  - If document is only one language, put it in the appropriate field and leave the other empty
• Author = article writer, Maker = individual artwork creators.
• Be exhaustive and precise.
`;

    try {
        // Calculate prompt length to ensure we stay within context limits
        const promptLength = prompt.length;
        console.log(`📊 Prompt length: ${promptLength} characters`);
        
        // Estimate tokens (rough approximation: 4 chars = 1 token)
        const estimatedTokens = Math.ceil(promptLength / 4);
        console.log(`📊 Estimated input tokens: ${estimatedTokens}`);
        
        // Use gpt-4-turbo which has a 128k context window and can handle large documents
        // If document is too large, we'll get an error and can handle it properly
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",  // Use gpt-4-turbo for large context window (128k tokens ~= 500k chars)
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1, // Lower temperature for more accurate extraction
            max_tokens: 4000  // Output tokens for comprehensive extraction
        });

        // Clean the response and parse JSON
        let responseContent = response.choices[0].message.content.trim();
        
        // More aggressive cleanup for markdown and code blocks
        responseContent = responseContent
            .replace(/^```json\s*/i, '')  // Remove opening ```json
            .replace(/^```\s*/, '')       // Remove opening ```
            .replace(/\s*```$/, '')       // Remove closing ```
            .replace(/^`/, '')            // Remove leading backtick
            .replace(/`$/, '')            // Remove trailing backtick
            .trim();
        
        console.log('🔍 Raw AI response (first 1000 chars):', responseContent.substring(0, 1000));
        console.log('📊 Response length:', responseContent.length, 'characters');
        
        // Robust JSON parsing with better error handling
        let analysis;
        try {
            analysis = JSON.parse(responseContent);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError.message);
            console.log('🔍 Problematic content around error position:', 
                responseContent.substring(Math.max(0, parseError.message.match(/\d+/)?.[0] - 100 || 0), 
                (parseError.message.match(/\d+/)?.[0] || 0) + 100));
            
            // Try to salvage partial JSON by finding complete objects
            const jsonStart = responseContent.indexOf('{');
            const jsonEnd = responseContent.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                try {
                    analysis = JSON.parse(responseContent.substring(jsonStart, jsonEnd + 1));
                    console.log('✅ Recovered partial JSON successfully');
                } catch (recoveryError) {
                    throw new Error(`JSON parsing failed even after recovery attempt: ${recoveryError.message}`);
                }
            } else {
                throw parseError;
            }
        }
        
        // Validate and clean the analysis, ensure full text is preserved
        const computedFieldTypes = ['formula', 'count', 'rollup', 'multipleLookupValues', 'aiText', 'multipleAttachments'];
        
        const validArticleFields = articlesFields.filter(f => !computedFieldTypes.includes(f.type)).map(f => f.name);
        const validImageFields = imagesFields.filter(f => !computedFieldTypes.includes(f.type)).map(f => f.name);
        
        console.log('🔍 Writable field names:', {
            articles: validArticleFields,
            images: validImageFields
        });
        
        if (analysis.articles) {
            analysis.articles = analysis.articles.map(article => {
                const cleanedArticle = {};
                Object.keys(article).forEach(key => {
                    if (validArticleFields.includes(key)) {
                        let value = article[key];
                        
                        // Apply field-specific fallbacks
                        if (key === 'Full Text EN' || key === 'Full Text DE copy') {
                            console.log(`🔄 Always using full original text for ${key} field`);
                            value = cleanText; // Always use full original text, ignore AI version
                        } else if (key === 'Date' && (!value || value === "" || value === null)) {
                            // Skip empty dates entirely rather than sending empty string
                            console.log('⚠️ Skipping empty Date field to avoid Airtable error');
                            return; // Don't add this field at all
                        } else if (key === 'Author' && (!value || value === "")) {
                            value = "Unknown Author"; // Fallback for empty author
                        } else if (key === 'Maker' && (!value || value === "")) {
                            value = ""; // Maker can be empty for articles
                        } else if (key === 'Introduction' && (!value || value === "")) {
                            value = "No description available"; // Fallback for empty introduction
                        }
                        
                        cleanedArticle[key] = value;
                    } else {
                        console.warn(`⚠️ Removing invalid/computed Articles field: "${key}"`);
                    }
                });
                return cleanedArticle;
            });
        }
        
        if (analysis.images) {
            analysis.images = analysis.images.map(image => {
                const cleanedImage = {};
                Object.keys(image).forEach(key => {
                    if (validImageFields.includes(key)) {
                        let value = image[key];
                        
                        // Apply fallbacks for empty image fields
                        if (!value || value === "" || value === null) {
                            if (key === 'Image ID' || key === 'Work Title') {
                                value = "Untitled"; // Fallback for missing titles
                            } else if (key === 'Maker') {
                                value = "Unknown"; // Fallback for missing maker
                            } else if (key === 'Comments') {
                                value = "No description available"; // Fallback for missing comments
                            } else {
                                // For other fields, skip empty values
                                console.log(`⚠️ Skipping empty ${key} field`);
                                return;
                            }
                        }
                        
                        cleanedImage[key] = value;
                    } else {
                        console.warn(`⚠️ Removing invalid/computed Images field: "${key}"`);
                    }
                });
                return cleanedImage;
            });
        }
        
        console.log('✅ Analysis validated and cleaned');
        
        // Add actual Dropbox images to the analysis
        if (images.length > 0) {
            if (!analysis.images) analysis.images = [];
            images.forEach((imageData, index) => {
                const imageRecord = {};
                // Map to actual writable field names (exclude computed fields)
                const computedFieldTypes = ['formula', 'count', 'rollup', 'multipleLookupValues', 'aiText', 'multipleAttachments'];
                const writableImageFields = imagesFields.filter(f => !computedFieldTypes.includes(f.type)).map(f => f.name);
                
                if (writableImageFields.includes('Image ID')) imageRecord['Image ID'] = imageData.name;
                if (writableImageFields.includes('Work Title')) imageRecord['Work Title'] = imageData.name;
                if (writableImageFields.includes('Comments')) imageRecord['Comments'] = `Image from Dropbox: ${imageData.path}. Size: ${Math.round(imageData.size/1024)}KB, Modified: ${imageData.modified}`;
                if (writableImageFields.includes('Maker')) imageRecord['Maker'] = 'Unknown';
                analysis.images.push(imageRecord);
            });
        }

        return analysis;
    } catch (error) {
        console.error('OpenAI analysis failed:', error);
        
        // Check if it's a context length error
        if (error.message && error.message.includes('context length')) {
            console.error('❌ CONTEXT WINDOW ERROR: Document is too large for AI processing');
            console.error(`📊 Document was ${cleanText.length} characters`);
            console.error('🚫 REFUSING to truncate - returning original text as-is');
        }
        
        console.log('🔄 Using fallback analysis with FULL ORIGINAL TEXT preserved');
        
        // Fallback: basic structure using actual field names and preserving ALL text
        const fallbackAnalysis = {
            articles: [],
            images: []
        };
        
        // Create one article with actual field names and fallbacks
        const articleRecord = {};
        const computedFieldTypes = ['formula', 'count', 'rollup', 'multipleLookupValues', 'aiText', 'multipleAttachments'];
        
        if (articlesTable) {
            articlesTable.fields.forEach(field => {
                // Only populate safe text fields, skip computed fields and dates
                if (!computedFieldTypes.includes(field.type) && 
                    field.type !== 'date' && // Skip dates to avoid empty value errors
                    (field.type === 'singleLineText' || field.type === 'multilineText' || field.type === 'richText')) {
                    if (field.name.toLowerCase().includes('name') || field.name.toLowerCase().includes('title') || field.name.toLowerCase().includes('author')) {
                        articleRecord[field.name] = 'Unknown Author';
                    } else if (field.name.toLowerCase().includes('content') || field.name.toLowerCase().includes('text')) {
                        console.log(`🔒 Preserving FULL TEXT (${cleanText.length} chars) in field: ${field.name}`);
                        articleRecord[field.name] = cleanText; // ALWAYS use full original text, NEVER truncated
                    } else if (field.name.toLowerCase().includes('summary') || field.name.toLowerCase().includes('description') || field.name.toLowerCase().includes('introduction')) {
                        articleRecord[field.name] = 'AI analysis failed, but full text is preserved in Text field';
                    }
                }
                // Skip dates, computed fields, and other field types to avoid errors
            });
        }
        
        fallbackAnalysis.articles.push(articleRecord);
        
        // MANUAL CAPTION EXTRACTION - Extract image captions even when AI fails
        console.log('🔍 Extracting image captions manually...');
        const extractedCaptions = extractImageCaptionsFromText(cleanText);
        console.log(`📸 Found ${extractedCaptions.length} image captions manually`);
        
        // Add extracted captions to the analysis
        if (extractedCaptions.length > 0) {
            fallbackAnalysis.images.push(...extractedCaptions);
        }
        
        // Add fallback image records
        images.forEach(imageData => {
            const imageRecord = {};
            if (imagesTable) {
                imagesTable.fields.forEach(field => {
                    // Only populate safe text fields for images, skip computed fields
                    if (!computedFieldTypes.includes(field.type) && 
                        (field.type === 'singleLineText' || field.type === 'multilineText')) {
                        if (field.name.toLowerCase().includes('name') || field.name.toLowerCase().includes('title')) {
                            imageRecord[field.name] = imageData.name;
                        } else if (field.name.toLowerCase().includes('description')) {
                            imageRecord[field.name] = `Image from Dropbox: ${imageData.path}`;
                        }
                    }
                });
            }
            if (Object.keys(imageRecord).length > 0) {
                fallbackAnalysis.images.push(imageRecord);
            }
        });
        
        return fallbackAnalysis;
    }
}

/**
 * Search for existing records in Airtable by Author field
 */
async function findExistingArticles(token, baseId, author) {
    if (!author || author === "Unknown" || author === "") {
        return []; // Skip search for unknown authors
    }
    
    try {
        console.log(`🔍 Searching for existing articles by author: "${author}"`);
        
        // Use Airtable's search API with filterByFormula
        const searchUrl = `https://api.airtable.com/v0/${baseId}/Articles?filterByFormula={Author}="${author}"`;
        
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn(`⚠️ Search failed with status ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        console.log(`📋 Found ${data.records?.length || 0} existing articles for "${author}"`);
        
        return data.records || [];
    } catch (error) {
        console.warn('⚠️ Error searching for existing articles:', error.message);
        return [];
    }
}

/**
 * Sync articles to Airtable with update support
 */
async function syncArticlesToAirtable(token, baseId, articles) {
    const results = { created: [], updated: [] };
    
    for (const article of articles) {
        try {
            // Search for existing records by author
            const existingRecords = await findExistingArticles(token, baseId, article.Author);
            
            if (existingRecords.length > 0) {
                // Update the first matching record
                const recordId = existingRecords[0].id;
                console.log(`🔄 Updating existing article record: ${recordId}`);
                
                const updateResult = await makeAirtableRequest(token, baseId, `Articles/${recordId}`, {
                    method: 'PATCH',
                    body: { fields: article }
                });
                
                results.updated.push({
                    id: recordId,
                    author: article.Author,
                    result: updateResult
                });
                
                console.log(`✅ Updated article for "${article.Author}"`);
            } else {
                // Create new record
                console.log(`➕ Creating new article for "${article.Author}"`);
                
                const createResult = await makeAirtableRequest(token, baseId, 'Articles', {
                    method: 'POST',
                    body: { fields: article }
                });
                
                results.created.push({
                    author: article.Author,
                    result: createResult
                });
                
                console.log(`✅ Created new article for "${article.Author}"`);
            }
        } catch (error) {
            console.error(`❌ Error syncing article for "${article.Author}":`, error);
            throw error; // Re-throw to be handled by caller
        }
    }
    
    return results;
}

/**
 * HTTP Server
 */
const server = http.createServer(async (req, res) => {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Serve plugin files
    if (pathname.startsWith('/plugin/')) {
        const filePath = path.join(__dirname, pathname);
        const ext = path.extname(filePath);
        let contentType = 'text/html';
        
        switch (ext) {
            case '.js': contentType = 'text/javascript'; break;
            case '.css': contentType = 'text/css'; break;
            case '.json': contentType = 'application/json'; break;
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `File not found: ${pathname}` }));
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
        return;
    }

    // Home redirect
    if (pathname === '/' && req.method === 'GET') {
        res.writeHead(302, { 'Location': '/plugin/index.html' });
        res.end();
        return;
    }

    // AI-powered Word processing endpoint
    if (pathname === '/process' && req.method === 'POST') {
        const uploader = upload.single('word');
        uploader(req, res, async (err) => {
            if (err) {
                console.error("Upload Error:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'File upload failed' }));
            }
            if (!req.file) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'No file uploaded.' }));
            }

            try {
                console.log('🔧 Processing Word document with AI...');
                
                // Get form data with defaults
                const airtable_token = req.body.airtable_token || DEFAULT_CREDENTIALS.airtable_token;
                const base_id = req.body.base_id || DEFAULT_CREDENTIALS.base_id;
                const openai_api_key = req.body.openai_api_key || DEFAULT_CREDENTIALS.openai_api_key;
                const dropbox_token = req.body.dropbox_token;
                
                console.log('🔐 Using credentials:', {
                    airtable_token: airtable_token.substring(0, 10) + '...',
                    base_id,
                    openai_api_key: openai_api_key.substring(0, 10) + '...',
                    dropbox_token: dropbox_token ? dropbox_token.substring(0, 10) + '...' : 'Not provided'
                });
                
                if (!airtable_token || !base_id || !openai_api_key) {
                    throw new Error('Missing required credentials');
                }

                // Extract Word content
                console.log('📄 Extracting Word content...');
                const content = await extractWordContent(req.file.path);
                
                // Get Dropbox images if token provided
                let dropboxImages = [];
                if (dropbox_token) {
                    console.log('☁️ Getting Dropbox images...');
                    try {
                        dropboxImages = await getDropboxImages(dropbox_token, '');
                        console.log(`📸 Found ${dropboxImages.length} images in Dropbox`);
                    } catch (dropboxError) {
                        console.warn('Dropbox access failed:', dropboxError.message);
                        // Continue without Dropbox images
                    }
                }
                
                // Get Airtable structure
                console.log('🗂️ Getting Airtable structure...');
                const metadata = await getBaseMetadata(airtable_token, base_id);
                
                // Debug: Show actual field names and types
                console.log('🗂️ Debug: Airtable Field Structure');
                metadata.tables.forEach(table => {
                    console.log(`  📋 Table: ${table.name}`);
                    table.fields.forEach(field => {
                        console.log(`    📝 Field: "${field.name}" (${field.type})`);
                    });
                });
                
                // Analyze with AI
                console.log('🤖 Analyzing with OpenAI...');
                const analysis = await analyzeContentWithAI(content, dropboxImages, metadata.tables, openai_api_key);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                    analysis,
                    extractedContent: content,
                    dropboxImages: dropboxImages.map(img => ({ name: img.name, path: img.path, size: img.size })), // Don't send full base64 data
                    tableStructure: metadata.tables
                    }));
                
                } catch (error) {
                console.error('❌ Processing Error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Processing failed: ${error.message}` }));
            } finally {
                // Clean up uploaded file
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            }
        });
        return;
    }

    // Sync to Airtable endpoint
    if (pathname === '/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const airtable_token = data.airtable_token || DEFAULT_CREDENTIALS.airtable_token;
                const base_id = data.base_id || DEFAULT_CREDENTIALS.base_id;
                const records = data.records;
                
                if (!airtable_token || !base_id || !records) {
                    throw new Error('Missing required data');
                }

                console.log('📤 Syncing to Airtable...');
                const results = {};

                // Sync articles with update support
                if (records.articles && records.articles.length > 0) {
                    results.articles = await syncArticlesToAirtable(airtable_token, base_id, records.articles);
                    
                    // Log summary
                    const { created, updated } = results.articles;
                    console.log(`📊 Article Sync Summary: ${created.length} created, ${updated.length} updated`);
                }

                // Sync images in batches (Airtable limit: 10 records per request)
                if (records.images && records.images.length > 0) {
                    console.log(`📸 Syncing ${records.images.length} image records in batches...`);
                    results.images = { records: [] };
                    
                    // Process in batches of 10
                    const batchSize = 10;
                    for (let i = 0; i < records.images.length; i += batchSize) {
                        const batch = records.images.slice(i, i + batchSize);
                        console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.images.length/batchSize)} (${batch.length} records)`);
                        
                        const imagePayload = {
                            records: batch.map(image => ({ fields: image }))
                        };
                        
                        const batchResult = await makeAirtableRequest(airtable_token, base_id, 'Images', {
                            method: 'POST', 
                            body: imagePayload
                        });
                        
                        // Combine results
                        if (batchResult.records) {
                            results.images.records.push(...batchResult.records);
                        }
                        
                        // Small delay between batches to be nice to Airtable's API
                        if (i + batchSize < records.images.length) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    }
                    
                    console.log(`✅ Successfully synced ${results.images.records.length} image records`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                    success: true, 
                    results,
                    summary: {
                        articlesCreated: results.articles?.created?.length || 0,
                        articlesUpdated: results.articles?.updated?.length || 0,
                        imagesCreated: results.images?.records?.length || 0
                    }
                }));
                
            } catch (error) {
                console.error('❌ Sync Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Sync failed: ${error.message}` }));
            }
        });
        return;
    }

    // Get Airtable tables endpoint
    if (pathname === '/tables' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const airtable_token = data.airtable_token || DEFAULT_CREDENTIALS.airtable_token;
                const base_id = data.base_id || DEFAULT_CREDENTIALS.base_id;
                console.log('🔗 Getting Airtable tables...');
                
                const metadata = await getBaseMetadata(airtable_token, base_id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, tables: metadata.tables }));

    } catch (error) {
                console.error('❌ Tables Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Failed to get tables: ${error.message}` }));
            }
        });
        return;
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 AI Word-to-Airtable Server running on http://localhost:${PORT}`);
    console.log(`📊 Open: http://localhost:${PORT}`);
    console.log(`🤖 Features: Word extraction + OpenAI analysis + Airtable sync`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed. Goodbye!');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed. Goodbye!');
        process.exit(0);
    });
}); 