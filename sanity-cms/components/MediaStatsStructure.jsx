import React from 'react'
import { Card, Stack, Text } from '@sanity/ui'
import { ImageIcon } from '@sanity/icons'
import MediaStatsWidget from './MediaStatsWidget'

export default function MediaStatsStructure() {
  return (
    <Card padding={4} height="fill" tone="default">
      <Stack space={4}>
        <Card padding={3} radius={2} tone="primary">
          <Stack space={2}>
            <Text weight="semibold" size={3}>📊 Media Analytics Dashboard</Text>
            <Text size={1} tone="default">
              Comprehensive statistics for your {' '}
              <Text weight="medium">10,262 uploaded media assets</Text>
              {' '} and artwork linkages.
            </Text>
          </Stack>
        </Card>
        
        <MediaStatsWidget />
      </Stack>
    </Card>
  )
} 