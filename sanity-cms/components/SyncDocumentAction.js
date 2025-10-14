import {useCallback, useState} from 'react'
import {useToast} from '@sanity/ui'

export function SyncDocumentAction(props) {
  const {id, type, draft, published} = props
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSync = useCallback(async () => {
    setIsLoading(true)
    
    // Use the base ID (without 'drafts.' prefix)
    const documentId = id.replace('drafts.', '')
    
    toast.push({
      status: 'info',
      title: '🔄 Syncing to Webflow...',
      description: `Starting sync for ${type}`,
    })

    // Add a timeout so the UI never gets stuck
    const controller = new AbortController()
    const timeoutMs = 45000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    // Inform user if it takes unusually long
    const slowNoticeId = setTimeout(() => {
      toast.push({
        status: 'warning',
        title: '⏳ Still syncing...'
      })
    }, 15000)

    try {
      console.log('[SyncDocumentAction] POST single-item', { documentId, type })
      const response = await fetch('https://art-aurea-api.vercel.app/api/sync-to-webflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncType: 'single-item',
          documentId,
          documentType: type,
          autoPublish: true
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      toast.push({
        status: 'success',
        title: '✅ Synced to Webflow!',
        description: `Successfully synced ${type}`,
        duration: 5000,
      })
      
      console.log('Sync result:', result)
      
    } catch (error) {
      console.error('Sync error:', error)
      const isAbort = error?.name === 'AbortError'
      toast.push({
        status: 'error',
        title: isAbort ? '❌ Sync timed out' : '❌ Sync failed',
        description: isAbort ? `No response after ${Math.round(timeoutMs/1000)}s` : (error.message || 'Unknown error'),
        duration: 8000,
      })
    } finally {
      clearTimeout(timeoutId)
      clearTimeout(slowNoticeId)
      setIsLoading(false)
    }
  }, [id, type, toast])

  return {
    label: isLoading ? 'Syncing...' : 'Sync to Webflow',
    icon: () => '🔄',
    disabled: isLoading,
    onHandle: handleSync,
  }
}

