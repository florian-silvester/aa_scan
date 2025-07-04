import React from 'react'
import { ReferenceInput } from 'sanity'
import { Card, Flex, Text, Stack } from '@sanity/ui'

export function ArtworkReferenceInput(props) {
  return (
    <ReferenceInput
      {...props}
      renderOption={(option) => {
        const artwork = option.hit
        if (!artwork || !artwork.images?.[0]) {
          return (
            <Card padding={3} radius={2} tone="default">
              <Flex align="center" gap={3}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#f1f3f6',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  📷
                </div>
                <Stack space={2}>
                  <Text weight="medium">{artwork.workTitle || 'Untitled'}</Text>
                  <Text size={1} tone="default">{artwork.maker || 'Unknown maker'}</Text>
                </Stack>
              </Flex>
            </Card>
          )
        }

        const imageUrl = artwork.images[0].asset?.url
        
        return (
          <Card padding={3} radius={2} tone="default">
            <Flex align="center" gap={3}>
              {imageUrl && (
                <img
                  src={imageUrl + '?w=60&h=60&fit=crop'}
                  alt={artwork.workTitle || 'Artwork'}
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '4px'
                  }}
                />
              )}
              <Stack space={2}>
                <Text weight="medium">{artwork.workTitle || 'Untitled'}</Text>
                <Text size={1} tone="default">{artwork.maker || 'Unknown maker'}</Text>
              </Stack>
            </Flex>
          </Card>
        )
      }}
    />
  )
} 