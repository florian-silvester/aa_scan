import React, { useState, useRef, useEffect } from 'react'
import { 
  Button, 
  Card, 
  Stack, 
  Text, 
  Spinner, 
  Flex, 
  Box, 
  Badge, 
  Grid,
  Heading
} from '@sanity/ui'
import { 
  CheckmarkIcon, 
  WarningOutlineIcon, 
  RefreshIcon, 
  PlayIcon, 
  SyncIcon,
  DocumentIcon,
  ImagesIcon,
  UserIcon,
  TagIcon
} from '@sanity/icons'

export default function SyncToWebflowAction() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)
  const [syncPhases, setSyncPhases] = useState([])
  const eventSourceRef = useRef(null)

  // Load last sync from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('webflow-sync-last')
    if (stored) {
      try {
        setLastSync(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse stored sync data:', e)
      }
    }
  }, [])

  // Save last sync to localStorage
  useEffect(() => {
    if (lastSync) {
      localStorage.setItem('webflow-sync-last', JSON.stringify(lastSync))
    }
  }, [lastSync])

  const handleSync = async () => {
    setIsLoading(true)
    setError(null)
    setProgress(null)
    setSyncPhases([])

    try {
      // Try streaming first
      const response = await fetch('https://art-aurea-api.vercel.app/api/sync-to-webflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ streaming: true }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.progress) {
                  setProgress(data.progress)
                }
                if (data.phase) {
                  setSyncPhases(prev => [...prev, data.phase])
                }
                if (data.complete) {
                  setLastSync({
                    timestamp: new Date().toISOString(),
                    duration: data.duration,
                    totalItems: data.totalItems,
                    success: true
                  })
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e)
              }
            }
          }
        }
      } else {
        // Handle regular JSON response
        const data = await response.json()
        if (data.success) {
          setLastSync({
            timestamp: new Date().toISOString(),
            duration: data.duration,
            totalItems: data.totalItems,
            success: true
          })
        }
      }
    } catch (err) {
      console.error('Sync error:', err)
      setError(err.message)
      setLastSync({
        timestamp: new Date().toISOString(),
        error: err.message,
        success: false
      })
    } finally {
      setIsLoading(false)
      setProgress(null)
      setSyncPhases([])
    }
  }

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'Foundation Data': return <TagIcon />
      case 'Reference Data': return <DocumentIcon />
      case 'Complex Data': return <ImagesIcon />
      default: return <SyncIcon />
    }
  }

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack space={4}>
        <Heading size={1}>Webflow Sync</Heading>
        
        {/* Last Sync Status */}
        {lastSync && (
          <Card padding={3} radius={2} tone={lastSync.success ? 'positive' : 'critical'}>
            <Flex align="center" gap={2}>
              {lastSync.success ? (
                <CheckmarkIcon style={{ color: 'var(--card-positive-fg-color)' }} />
              ) : (
                <WarningOutlineIcon style={{ color: 'var(--card-critical-fg-color)' }} />
              )}
              <Text size={1}>
                {lastSync.success ? (
                  <>
                    Last sync: {lastSync.totalItems} items in {formatDuration(lastSync.duration)}
                  </>
                ) : (
                  <>
                    Last sync failed: {lastSync.error}
                  </>
                )}
              </Text>
              <Text size={0} muted>
                {new Date(lastSync.timestamp).toLocaleString()}
              </Text>
            </Flex>
          </Card>
        )}

        {/* Progress Display */}
        {progress && (
          <Card padding={3} radius={2} tone="primary">
            <Stack space={2}>
              <Flex align="center" gap={2}>
                <Spinner size={1} />
                <Text size={1} weight="medium">
                  {progress.phase || 'Processing...'}
                </Text>
                <Badge tone="primary" fontSize={0}>
                  {progress.current}/{progress.total}
                </Badge>
              </Flex>
              
              {/* Simple progress bar using Box */}
              <Box>
                <Box
                  style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: 'var(--card-border-color)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                      height: '100%',
                      backgroundColor: 'var(--card-primary-fg-color)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </Box>
              </Box>
              
              <Text size={0} muted>
                {progress.message || 'Syncing data...'}
              </Text>
            </Stack>
          </Card>
        )}

        {/* Phase History */}
        {syncPhases.length > 0 && (
          <Card padding={3} radius={2}>
            <Stack space={2}>
              <Text size={1} weight="medium">Sync Phases</Text>
              <Grid columns={3} gap={2}>
                {syncPhases.map((phase, index) => (
                  <Card key={index} padding={2} radius={2} tone="positive">
                    <Flex align="center" gap={2}>
                      {getPhaseIcon(phase)}
                      <Text size={0}>{phase}</Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </Stack>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card padding={3} radius={2} tone="critical">
            <Flex align="center" gap={2}>
              <WarningOutlineIcon />
              <Text size={1}>
                Sync failed: {error}
              </Text>
            </Flex>
          </Card>
        )}

        {/* Sync Button */}
        <Button
          tone="primary"
          icon={isLoading ? <Spinner /> : <PlayIcon />}
          disabled={isLoading}
          onClick={handleSync}
          text={isLoading ? 'Syncing...' : 'Sync to Webflow'}
          style={{ alignSelf: 'flex-start' }}
        />
      </Stack>
    </Card>
  )
} 