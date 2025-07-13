import React, { useState } from 'react'
import { Button, Card, Stack, Text, Spinner, Flex } from '@sanity/ui'
import { CheckmarkIcon, WarningOutlineIcon, RefreshIcon } from '@sanity/icons'

export default function SyncToWebflowAction() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [error, setError] = useState(null)

  const handleSync = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🚀 Starting sync to Webflow...')
      
      // Call Vercel API endpoint
      const response = await fetch('/api/sync-to-webflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Sync failed')
      }
      
      console.log('✅ Sync completed:', result)
      setLastSync({
        timestamp: result.timestamp,
        totalSynced: result.totalSynced,
        duration: result.duration
      })
      
      // Show success notification (if Sanity Studio notifications are available)
      if (window.sanity?.ui?.toast) {
        window.sanity.ui.toast.push({
          status: 'success',
          title: 'Sync Completed!',
          description: `${result.totalSynced} items synced in ${result.duration}`
        })
      }
      
    } catch (error) {
      console.error('❌ Sync failed:', error)
      setError(error.message)
      
      // Show error notification
      if (window.sanity?.ui?.toast) {
        window.sanity.ui.toast.push({
          status: 'error',
          title: 'Sync Failed',
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card padding={4} radius={2} shadow={1} tone="primary">
      <Stack space={4}>
        <Text size={2} weight="semibold">
          🚀 Sync to Webflow
        </Text>
        
        <Text size={1} muted>
          Push all your content changes to the public website. This will sync artworks, creators, materials, and all other content to Webflow.
        </Text>
        
        {lastSync && (
          <Card padding={3} radius={2} tone="positive">
            <Flex align="center" gap={2}>
              <CheckmarkIcon />
              <Text size={1}>
                Last sync: {new Date(lastSync.timestamp).toLocaleString()} 
                ({lastSync.totalSynced} items in {lastSync.duration})
              </Text>
            </Flex>
          </Card>
        )}
        
        {error && (
          <Card padding={3} radius={2} tone="critical">
            <Flex align="center" gap={2}>
              <WarningOutlineIcon />
              <Text size={1}>
                Error: {error}
              </Text>
            </Flex>
          </Card>
        )}
        
        <Button
          mode="default"
          tone="primary"
          fontSize={2}
          padding={3}
          disabled={isLoading}
          onClick={handleSync}
          icon={isLoading ? Spinner : RefreshIcon}
          text={isLoading ? 'Syncing...' : 'Sync to Webflow'}
        />
        
        <Text size={1} muted>
          💡 Tip: Use this after making changes to ensure the public website is up to date.
        </Text>
      </Stack>
    </Card>
  )
} 