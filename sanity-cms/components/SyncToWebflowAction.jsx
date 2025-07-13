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
  Progress, 
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
    const savedLastSync = localStorage.getItem('webflow-last-sync')
    if (savedLastSync) {
      setLastSync(JSON.parse(savedLastSync))
    }
  }, [])

  const handleSync = async () => {
    setIsLoading(true)
    setError(null)
    setProgress(null)
    setSyncPhases([])
    
    try {
      console.log('🚀 Starting sync to Webflow...')
      
      // Use streaming API
      const response = await fetch('https://art-aurea-api.vercel.app/api/sync-to-webflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ streaming: true })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start sync')
      }
      
      // Set up EventSource for streaming progress
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                
                if (data.type === 'progress') {
                  setProgress(data)
                  setSyncPhases(prev => {
                    const newPhases = [...prev]
                    const existingIndex = newPhases.findIndex(p => p.phase === data.phase)
                    
                    if (existingIndex >= 0) {
                      newPhases[existingIndex] = { ...data, status: 'active' }
                    } else {
                      newPhases.push({ ...data, status: 'active' })
                    }
                    
                    return newPhases
                  })
                } else if (data.type === 'complete') {
                  const result = data.result
                  setLastSync({
                    timestamp: result.timestamp,
                    totalSynced: result.totalSynced,
                    duration: result.duration
                  })
                  
                  // Save to localStorage
                  localStorage.setItem('webflow-last-sync', JSON.stringify({
                    timestamp: result.timestamp,
                    totalSynced: result.totalSynced,
                    duration: result.duration
                  }))
                  
                  setSyncPhases(prev => prev.map(p => ({ ...p, status: 'complete' })))
                  
                  // Show success notification
                  if (window.sanity?.ui?.toast) {
                    window.sanity.ui.toast.push({
                      status: 'success',
                      title: 'Sync Completed!',
                      description: `${result.totalSynced} items synced in ${result.duration}`
                    })
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError)
              }
            }
          }
        }
      }
      
      await processStream()
      
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

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'Phase 1': return <TagIcon />
      case 'Phase 2': return <DocumentIcon />
      case 'Phase 3': return <ImagesIcon />
      case 'Complete': return <CheckmarkIcon />
      default: return <SyncIcon />
    }
  }

  const getPhaseColor = (phase, status) => {
    if (status === 'complete') return 'positive'
    if (status === 'active') return 'primary'
    return 'default'
  }

  return (
    <Card padding={4} radius={2} shadow={1} tone="transparent" border>
      <Stack space={4}>
        <Flex align="center" gap={3}>
          <Box>
            <SyncIcon style={{ fontSize: '1.5rem' }} />
          </Box>
          <Stack space={2}>
            <Heading size={1}>Sync to Webflow</Heading>
            <Text size={1} muted>
              Push all your content changes to the public website. This will sync artworks, creators, materials, and all other content to Webflow.
            </Text>
          </Stack>
        </Flex>
        
        {/* Progress Display */}
        {isLoading && progress && (
          <Card padding={3} radius={2} tone="primary" border>
            <Stack space={3}>
              <Flex align="center" justify="between">
                <Text size={1} weight="medium">
                  {progress.message}
                </Text>
                <Badge tone="primary" fontSize={0}>
                  {progress.totalSynced} synced
                </Badge>
              </Flex>
              
              {progress.currentCount > 0 && progress.totalCount > 0 && (
                <Progress 
                  value={progress.currentCount} 
                  max={progress.totalCount} 
                  radius={1}
                />
              )}
            </Stack>
          </Card>
        )}
        
        {/* Phase Progress */}
        {syncPhases.length > 0 && (
          <Card padding={3} radius={2} tone="transparent" border>
            <Stack space={3}>
              <Text size={1} weight="medium">Sync Progress</Text>
              <Grid columns={[1, 2, 3]} gap={2}>
                {syncPhases.map((phase, index) => (
                  <Card 
                    key={index}
                    padding={2} 
                    radius={1} 
                    tone={getPhaseColor(phase.phase, phase.status)}
                    border
                  >
                    <Flex align="center" gap={2}>
                      {getPhaseIcon(phase.phase)}
                      <Stack space={1}>
                        <Text size={0} weight="medium">
                          {phase.phase}
                        </Text>
                        <Text size={0} muted>
                          {phase.currentCount || 0}/{phase.totalCount || 0}
                        </Text>
                      </Stack>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </Stack>
          </Card>
        )}
        
        {/* Last Sync Status */}
        {lastSync && !isLoading && (
          <Card padding={3} radius={2} tone="positive" border>
            <Flex align="center" gap={2}>
              <CheckmarkIcon />
              <Stack space={1}>
                <Text size={1} weight="medium">
                  Last sync: {new Date(lastSync.timestamp).toLocaleString()}
                </Text>
                <Text size={0} muted>
                  {lastSync.totalSynced} items synced in {lastSync.duration}
                </Text>
              </Stack>
            </Flex>
          </Card>
        )}
        
        {/* Error Display */}
        {error && (
          <Card padding={3} radius={2} tone="critical" border>
            <Flex align="center" gap={2}>
              <WarningOutlineIcon />
              <Stack space={1}>
                <Text size={1} weight="medium">Sync Failed</Text>
                <Text size={0} muted>{error}</Text>
              </Stack>
            </Flex>
          </Card>
        )}
        
        {/* Sync Button */}
        <Button
          mode="default"
          tone="primary"
          fontSize={2}
          padding={3}
          disabled={isLoading}
          onClick={handleSync}
          icon={isLoading ? Spinner : PlayIcon}
          text={isLoading ? 'Syncing to Webflow...' : 'Sync to Webflow'}
        />
        
        {/* Info */}
        <Box padding={2} style={{ backgroundColor: 'var(--card-bg-color)' }}>
          <Text size={1} muted>
            💡 <strong>Tip:</strong> Use this after making changes to ensure the public website is up to date.
          </Text>
        </Box>
      </Stack>
    </Card>
  )
} 