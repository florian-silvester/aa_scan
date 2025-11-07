# Animation Server Setup Documentation

## Overview

The Art Aurea project uses a **local development server** to inject custom JavaScript animations into Webflow pages. This allows real-time testing of animation code without deploying to production.

## Architecture

### 1. **The Development Server** (`dev-server.js`)

A Node.js/Express server that serves the `animations.js` file with proper CORS headers.

**Location:** `/Users/florian.ludwig/Documents/aa_scan/dev-server.js`

**Key Features:**
- Runs on **port 5500** (HTTPS) and **port 5501** (HTTP)
- Serves files from `aa_animation/cdn/` directory
- Enables CORS and Private Network Access for Webflow
- Supports HTTPS with local SSL certificates (optional)

**CORS Configuration:**
```javascript
Access-Control-Allow-Origin: * (or specific origin)
Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD
Access-Control-Allow-Private-Network: true
```

This is **critical** for loading local scripts into Webflow's hosted pages (cross-origin).

---

### 2. **Animation Files Structure**

There are **TWO copies** of the animations file:

#### Source File (Development)
```
aa_scan/aa_animation/cdn/js/animations.js
```
- **Served by dev-server.js**
- **Edit this file** when making changes
- Accessible at: `http://127.0.0.1:5500/js/animations.js`

#### Reference Copy (Webflow Export)
```
aa_scan/webflow/animations.js
```
- **Static copy** from Webflow export
- Used for reference/backup
- **DO NOT edit directly** - changes won't be served

---

### 3. **How Webflow Pages Load It**

All Webflow HTML pages include this script tag at the bottom:

```html
<script src="http://127.0.0.1:5500/animations.js"></script>
```

**Examples:**
- `webflow/article.html` (line 1550)
- `webflow/index.html` (line 983)
- `webflow/detail_creator.html` (line ~1580)
- All other exported HTML pages

**Script Loading Order:**
1. jQuery
2. Webflow's `webflow.js`
3. GSAP (animation library)
4. ScrollTrigger (GSAP plugin)
5. Barba.js (page transitions)
6. **animations.js** (our custom code) ← Loaded last

---

## Usage

### Starting the Server

```bash
cd /Users/florian.ludwig/Documents/aa_scan
npm run dev
```

**Output:**
```
🚀 HTTPS Server running at https://127.0.0.1:5500/
🔗 HTTPS: https://local.artaurea.dev:5500/js/animations.js
🌐 HTTP Server running at http://127.0.0.1:5501/
🔗 HTTP: http://127.0.0.1:5501/js/animations.js
📁 Serving files from: aa_animation/cdn/
✅ CORS and Private Network Access enabled for Webflow
```

### Testing Animations

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open a Webflow HTML page:**
   - Open `webflow/article.html` in your browser
   - Or use Webflow Designer with "Preview" mode

3. **Edit animations:**
   - Modify `aa_animation/cdn/js/animations.js`
   - Refresh the browser to see changes

4. **Check console:**
   - Open browser DevTools → Console
   - Look for animation logs (e.g., `🖼️ Found X elements`)

---

## What animations.js Does

The script handles dynamic behaviors on article pages:

### 1. **Section Width/Layout Management**

Maps Sanity layout values to CSS classes:

```javascript
const map = {
  'full': 'u-container-full',      // Full width
  'main': 'u-container',            // Main container width
  'small': 'u-container-small'      // Small container width
};
```

**How it works:**
- Reads `data-container` attribute on `.article_img_contain` elements
- Applies corresponding CSS class
- Example: `data-container="main"` → adds `.u-container` class

### 2. **Sticky Image Positioning**

Handles "sticky left" and "sticky right" layouts:

```javascript
// Example:
data-container="sticky left"  → adds .is-left, sticky positioning
data-container="sticky right" → adds .is-right, sticky positioning
```

### 3. **Other Animations**

- GSAP-based scroll animations
- Page transition effects (Barba.js)
- Custom interactive behaviors

---

## Deployment to Production

### Current Setup (Development Only)

The current implementation uses `http://127.0.0.1:5500/` which **only works locally**.

### For Production Deployment

You need to:

1. **Host animations.js on a CDN:**
   - Option A: Webflow's CDN (upload as custom code)
   - Option B: Separate CDN (e.g., Cloudflare, AWS S3)
   - Option C: Include inline in Webflow custom code

2. **Update script reference in Webflow:**
   - Replace `http://127.0.0.1:5500/animations.js`
   - With `https://your-cdn.com/animations.js`

3. **Publish via Webflow Designer:**
   - Add to Site Settings → Custom Code → Footer Code
   - Or use Webflow's hosted files

---

## File Locations Reference

| What | Path |
|------|------|
| **Dev Server** | `aa_scan/dev-server.js` |
| **Source File** (edit this) | `aa_scan/aa_animation/cdn/js/animations.js` |
| **Reference Copy** | `aa_scan/webflow/animations.js` |
| **Webflow HTML** | `aa_scan/webflow/*.html` |
| **Package.json** | `aa_scan/package.json` |

---

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 5500 | HTTPS | Dev server (with SSL) |
| 5501 | HTTP | Dev server (fallback/ngrok) |

---

## Common Issues

### 1. **Script Not Loading (CORS Error)**

**Error:** `Access to script at 'http://127.0.0.1:5500/animations.js' blocked by CORS`

**Fix:** Make sure dev server is running:
```bash
npm run dev
```

### 2. **Port Already in Use**

**Error:** `Error: listen EADDRINUSE: address already in use :::5500`

**Fix:** Kill existing process:
```bash
lsof -ti:5500 | xargs kill -9
lsof -ti:5501 | xargs kill -9
npm run dev
```

### 3. **Changes Not Showing**

**Fix:** Hard refresh browser:
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`

### 4. **SSL Certificate Errors**

The server tries to use SSL certificates (`local.artaurea.dev-key.pem`, `local.artaurea.dev.pem`).

**If missing:** The HTTPS server will fail, but HTTP on port 5501 will still work.

**Fix:** Use HTTP port or generate local SSL certs:
```bash
# Generate local SSL certificates (optional)
mkcert -install
mkcert local.artaurea.dev
```

---

## Development Workflow

### Making Animation Changes

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Edit source file:**
   ```
   aa_scan/aa_animation/cdn/js/animations.js
   ```

3. **Test locally:**
   - Open `webflow/article.html` in browser
   - Or test in Webflow Designer preview

4. **Check console for logs:**
   ```
   🖼️ Found 4 elements
   🖼️ Element 1 : container-full
   🖼️ Element 2 : sticky left + u-container
   ```

5. **Iterate:**
   - Make changes
   - Refresh browser
   - Repeat

6. **Deploy to production** (when ready):
   - Copy to CDN or Webflow
   - Update production script reference

---

## Related Documentation

- `PROJECT_SETUP.md` - Overall project architecture
- `PROJECT_STRUCTURE.md` - Repository structure
- `README.md` - General project info

---

**Last Updated:** November 7, 2025

