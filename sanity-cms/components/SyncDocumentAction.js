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

    try {
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
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
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
      toast.push({
        status: 'error',
        title: '❌ Sync failed',
        description: error.message,
        duration: 8000,
      })
    } finally {
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

