import { SyncIcon } from '@sanity/icons'

export default function SyncDocumentAction(props) {
  const { id, schemaType, draft, published } = props

  const syncableTypes = ['creator', 'artwork', 'article', 'author', 'photographer', 'category', 'medium', 'material', 'materialType', 'finish', 'location']
  const sanityType = schemaType?.name

  // Only show for supported types
  if (!syncableTypes.includes(sanityType)) return null

  // Prefer published id, then draft, then fallback id
  const documentId = published?._id || draft?._id || id

  return {
    label: 'Sync to Webflow',
    icon: SyncIcon,
    onHandle: async () => {
      try {
        const response = await fetch('https://art-aurea-api.vercel.app/api/sync-to-webflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            documentType: sanityType,
            syncType: 'single-item',
            autoPublish: true
          })
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(`HTTP ${response.status}: ${text || response.statusText}`)
        }

        alert('✅ Synced and published to Webflow')
      } catch (error) {
        alert(`❌ Sync failed: ${error.message}`)
      }
    }
  }
}

