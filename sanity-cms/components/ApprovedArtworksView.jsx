// sanity-cms/components/ApprovedArtworksView.jsx
import React, {useState, useEffect} from 'react'
import {useClient} from 'sanity'
import {Box, Card, Spinner, Text} from '@sanity/ui'

export function ApprovedArtworksView(props) {
  // The document ID is available on the `displayed` object within the `document` prop
  const documentId = props.document?.displayed?._id
  const client = useClient({apiVersion: '2024-07-16'})

  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (documentId) {
      setLoading(true)
      const query = `*[_type == "sanity.imageAsset" && references($id)]`
      const params = {id: documentId}

      client
        .fetch(query, params)
        .then((data) => {
          setArtworks(data)
        })
        .catch((err) => {
          setError(err)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
      setArtworks([])
    }
  }, [client, documentId])

  if (loading) {
    return (
      <Box padding={4}>
        <Spinner />
      </Box>
    )
  }

  if (error) {
    return (
      <Box padding={4}>
        <Card tone="critical" padding={3}>
          <Text>Error: {error.message}</Text>
        </Card>
      </Box>
    )
  }

  if (artworks.length === 0) {
    return (
      <Box padding={4}>
        <Text>No media found for this creator.</Text>
      </Box>
    )
  }

  return (
    <Box padding={4}>
      {artworks.map((artwork) => (
        <Card key={artwork._id} padding={3} shadow={1} style={{marginBottom: '10px'}}>
          <Text>{artwork.title || artwork.originalFilename || 'Untitled Media'}</Text>
        </Card>
      ))}
    </Box>
  )
} 