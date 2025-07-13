import React, {useEffect, useState} from 'react'
import {Card, Stack, Text, Flex, Grid, Box} from '@sanity/ui'
import {useClient, useFormValue} from 'sanity'

export function CreatorArtworksView() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const client = useClient({apiVersion: '2023-01-01'})
  
  // Get the current document's ID from the form
  const documentId = useFormValue(['_id'])

  useEffect(() => {
    if (!documentId) return

    const fetchArtworks = async () => {
      try {
        setLoading(true)
        const query = `*[_type == "artwork" && creator._ref == $creatorId] {
          _id,
          workTitle,
          "imageUrl": images[0].asset->url,
          material,
          year,
          category->title
        }`
        
        const result = await client.fetch(query, {
          creatorId: documentId
        })
        
        setArtworks(result || [])
      } catch (error) {
        console.error('Error fetching artworks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArtworks()
  }, [documentId, client])

  if (loading) {
    return (
      <Card padding={4} tone="transparent">
        <Text>Loading artworks...</Text>
      </Card>
    )
  }

  if (artworks.length === 0) {
    return (
      <Card padding={4} tone="transparent" style={{border: '1px dashed #ccc'}}>
        <Stack space={3}>
          <Text weight="semibold">No artworks found</Text>
          <Text muted size={1}>
            Create artworks and assign this creator to see them here automatically.
          </Text>
        </Stack>
      </Card>
    )
  }

  return (
    <Card padding={4} tone="transparent" style={{border: '1px solid #e1e3e6'}}>
      <Stack space={4}>
        <Text weight="semibold" size={2}>
          {artworks.length} artwork{artworks.length !== 1 ? 's' : ''} by this creator
        </Text>
        
        <Grid columns={[1, 2, 3]} gap={3}>
          {artworks.map((artwork) => (
            <Card
              key={artwork._id}
              padding={3}
              radius={2}
              shadow={1}
              tone="transparent"
              style={{cursor: 'pointer'}}
              onClick={() => {
                // Open artwork in new tab/window
                window.open(`/intent/edit/id=${artwork._id};type=artwork`, '_blank')
              }}
            >
              <Stack space={3}>
                {artwork.imageUrl && (
                  <Box>
                    <img
                      src={`${artwork.imageUrl}?w=300&h=200&fit=crop`}
                      alt={artwork.workTitle || 'Artwork'}
                      style={{
                        width: '100%',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                )}
                
                <Stack space={2}>
                  <Text weight="semibold" size={1}>
                    {artwork.workTitle || 'Untitled'}
                  </Text>
                  
                  <Stack space={1}>
                    {artwork.category && (
                      <Text size={0} muted>
                        {artwork.category}
                      </Text>
                    )}
                    
                    <Flex gap={2}>
                      {artwork.material && (
                        <Text size={0} muted>
                          {artwork.material}
                        </Text>
                      )}
                      {artwork.year && (
                        <Text size={0} muted>
                          ({artwork.year})
                        </Text>
                      )}
                    </Flex>
                  </Stack>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Stack>
    </Card>
  )
} 