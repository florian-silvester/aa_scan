# Webflow API v2 - Publish Endpoint Research

## Documentation Check

### Official Endpoint
`POST /v2/collections/{collection_id}/items/publish`

### What to verify:
1. **Accepted body formats:**
   - [ ] `{ itemIds: string[] }` - Array of item IDs only
   - [ ] `{ items: { id: string, cmsLocaleIds: string[] }[] }` - Array with locale specification
   - [ ] Both formats accepted?
   - [ ] Which is preferred/recommended?

2. **Locale behavior:**
   - [ ] When using `itemIds` only, does it publish ALL locales?
   - [ ] When using `cmsLocaleIds`, does it only publish specified locales?
   - [ ] Can you mix both in same request?

3. **Rate limits:**
   - [ ] Max items per request?
   - [ ] Requests per minute/hour?
   - [ ] Special limits for SSE/streaming?

4. **Response format:**
   - [ ] Does it return `publishedItemIds` for old format?
   - [ ] What does it return for new format?
   - [ ] Error handling differences?

5. **Best practices:**
   - [ ] Batch size recommendations?
   - [ ] Retry strategy?
   - [ ] Timeout settings?

## Research Sources

### Primary:
- Webflow v2 API Docs: https://developers.webflow.com/data/reference
- Publish endpoint: https://developers.webflow.com/data/reference/cms/collection-items/staged-items/publish-items

### Secondary:
- Webflow Community Forums
- GitHub issues/discussions
- Changelog: https://developers.webflow.com/data/changelog

## Test Results (to fill in after running test-publish-api-formats.js)

### Format Support:
- Old format: [ ] Works / [ ] Fails
- New format: [ ] Works / [ ] Fails
- Performance: ___ ms (old) vs ___ ms (new)

### Locale Publishing:
- Old format publishes: [ ] Primary only / [ ] All locales / [ ] Unknown
- New format with cmsLocaleIds: [ ] Only specified / [ ] All locales

### Observed Behavior:
- 

### Recommendation:
- 

## Action Items

After testing:
1. [ ] Run `test-publish-api-formats.js`
2. [ ] Document actual API behavior
3. [ ] Check Webflow API changelog for recent updates
4. [ ] Decide on single format to use everywhere
5. [ ] Update implementation accordingly

