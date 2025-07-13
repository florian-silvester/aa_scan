# Art Aurea API

API endpoints for syncing content from Sanity to Webflow.

## Environment Variables

Copy `.env.example` to `.env` and fill in your tokens:

- `SANITY_API_TOKEN` - Sanity API token with read access
- `WEBFLOW_API_TOKEN` - Webflow API token with collection access

## Endpoints

- `POST /api/sync-to-webflow` - Sync all content from Sanity to Webflow

## Deployment

```bash
vercel --prod
```

## Local Development

```bash
npm run dev
```

