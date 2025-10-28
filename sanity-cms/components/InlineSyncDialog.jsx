import React, { useState } from 'react'
import { Button, Card, Stack, Text } from '@sanity/ui'
import { SyncIcon } from '@sanity/icons'

export default function InlineSyncDialog({ typeName, formProps }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleSync = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s guard
    
    try {
      // Get document ID from formProps
      const documentId = formProps?.document?._id || formProps?.value?._id || ''
      const baseId = typeof documentId === 'string' ? documentId.replace(/^drafts\./, '') : documentId

      const endpoint = 'https://art-aurea-api.vercel.app/api/sync-to-webflow'

      // Actual sync
      const payload = {
        documentId: baseId,
        documentType: typeName,
        syncType: 'single-item',
        autoPublish: true
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
      }
      
      const data = await res.json().catch(() => ({}))
      setResult({ ok: true, data })
      
    } catch (e) {
      const msg = e?.name === 'AbortError' ? 'Request timed out' : (e && e.message ? e.message : 'Unknown error')
      setError(msg)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <Card padding={3} radius={2} shadow={1} tone={result?.ok ? 'positive' : error ? 'critical' : 'primary'}>
      <Stack space={3}>
        <Button
          text={loading ? 'Syncing...' : 'Sync to Webflow'}
          icon={SyncIcon}
          tone="primary"
          onClick={handleSync}
          disabled={loading}
          style={{ width: '100%' }}
        />
        
        {result?.ok && (
          <Text size={1} style={{ color: 'green' }}>
            ✅ Synced and published to Webflow!
          </Text>
        )}
        
        {error && (
          <Text size={1} style={{ color: 'red' }}>
            ❌ {error}
          </Text>
        )}
      </Stack>
    </Card>
  )
}

