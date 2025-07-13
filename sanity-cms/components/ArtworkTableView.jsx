import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Flex, 
  Text, 
  Stack, 
  Button, 
  Spinner,
  TextInput,
  Badge,
  Avatar,
  Box,
  Grid,
  Select,
  Inline
} from '@sanity/ui'
import { useClient } from 'sanity'
import { EditIcon, ImageIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from '@sanity/icons'

export default function ArtworkTableView() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('_createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMaker, setFilterMaker] = useState('')
  const client = useClient()

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setLoading(true)
        const query = `*[_type == "artwork" && defined(images[0])] | order(${sortBy} ${sortOrder}) {
          _id,
          workTitle,
          maker->{name},
          year,
          category->{title, titleDe},
          materialEn,
          materialDe,
          imageId,
          "imageUrl": images[0].asset->url,
          "thumbnailUrl": images[0].asset->url + "?w=80&h=80&fit=crop&fm=webp",
          _createdAt,
          _updatedAt
        }`

        const results = await client.fetch(query)
        setArtworks(results || [])
      } catch (error) {
        console.error('Error fetching artworks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArtworks()
  }, [client, sortBy, sortOrder])

  const uniqueCategories = [...new Set(artworks.flatMap(artwork => 
    [artwork.category?.title, artwork.category?.titleDe].filter(Boolean)
  ))].sort()

  const uniqueMakers = [...new Set(artworks.map(artwork => 
    artwork.maker?.name).filter(Boolean)
  )].sort()

  const filteredArtworks = artworks.filter(artwork => {
    const matchesSearch = !searchTerm || 
      (artwork.workTitle && artwork.workTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (artwork.maker?.name && artwork.maker.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (artwork.category?.title && artwork.category.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (artwork.category?.titleDe && artwork.category.titleDe.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !filterCategory || 
      artwork.category?.title === filterCategory || 
      artwork.category?.titleDe === filterCategory
    
    const matchesMaker = !filterMaker || artwork.maker?.name === filterMaker
    
    return matchesSearch && matchesCategory && matchesMaker
  })

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const openArtwork = (artwork) => {
    window.location.href = `/intent/edit/id=${artwork._id};type=artwork`
  }

  if (loading) {
    return (
      <Card display="flex" height="fill">
        <Flex align="center" justify="center" flex={1}>
          <Stack space={2} align="center">
            <Spinner />
            <Text size={1}>Loading artworks...</Text>
          </Stack>
        </Flex>
      </Card>
    )
  }

  return (
    <Card display="flex" height="fill">
      <Flex direction="column" flex={1}>
        {/* Controls */}
        <Box
          paddingX={4}
          paddingY={2}
          style={{
            borderBottom: '1px solid var(--card-border-color)',
            zIndex: 2
          }}
        >
          {/* Search + Sort + Filters Row */}
          <Box marginBottom={2}>
            <Flex align="center" justify="space-between" gap={3}>
              <Box style={{minWidth: '200px'}}>
                <TextInput
                  icon={SearchIcon}
                  placeholder="Search artworks..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                />
              </Box>
              
              <Flex gap={2}>
                <Select
                  value={filterCategory}
                  onChange={(event) => setFilterCategory(event.currentTarget.value)}
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Select>
                
                <Select
                  value={filterMaker}
                  onChange={(event) => setFilterMaker(event.currentTarget.value)}
                >
                  <option value="">All Makers</option>
                  {uniqueMakers.map(maker => (
                    <option key={maker} value={maker}>{maker}</option>
                  ))}
                </Select>
              </Flex>
              
              <Flex gap={2}>
                <Inline space={2}>
                  <Button
                    fontSize={1}
                    mode={sortBy === 'workTitle' ? 'default' : 'ghost'}
                    text="Title"
                    onClick={() => toggleSort('workTitle')}
                    icon={sortBy === 'workTitle' ? (sortOrder === 'asc' ? ArrowUpIcon : ArrowDownIcon) : null}
                  />
                  <Button
                    fontSize={1}
                    mode={sortBy === 'maker' ? 'default' : 'ghost'}
                    text="Maker"
                    onClick={() => toggleSort('maker')}
                    icon={sortBy === 'maker' ? (sortOrder === 'asc' ? ArrowUpIcon : ArrowDownIcon) : null}
                  />
                  <Button
                    fontSize={1}
                    mode={sortBy === 'year' ? 'default' : 'ghost'}
                    text="Year"
                    onClick={() => toggleSort('year')}
                    icon={sortBy === 'year' ? (sortOrder === 'asc' ? ArrowUpIcon : ArrowDownIcon) : null}
                  />
                </Inline>
                
                <Text size={1} muted>
                  {filteredArtworks.length} of {artworks.length} artworks
                </Text>
              </Flex>
            </Flex>
          </Box>
        </Box>
              
        {/* Items */}
        <Box flex={1} style={{width: '100%'}}>
          {filteredArtworks.length === 0 ? (
            <Box paddingX={4} paddingY={4}>
              <Text size={1} weight="semibold">
                No results for the current query
                </Text>
            </Box>
          ) : (
            <Stack space={0} paddingX={4}>
              {filteredArtworks.map(artwork => (
                <Card
                  key={artwork._id}
                  paddingX={2}
                  paddingY={2}
                  style={{
                    borderBottom: '1px solid var(--card-border-color)',
                    cursor: 'pointer'
                  }}
                  onClick={() => openArtwork(artwork)}
                >
                  <Flex align="center" gap={3}>
                    <Avatar
                      size={1}
                      src={artwork.thumbnailUrl}
                      fallback={<ImageIcon />}
                    />
                    
                    <Box flex={1}>
                      <Grid columns={4} gap={2}>
                        <Text size={1} weight="medium">
                          {artwork.workTitle || 'Untitled'}
                        </Text>
                        <Text size={1} muted>
                          {artwork.maker?.name || 'Unknown maker'}
                        </Text>
                        <Text size={1} muted>
                          {artwork.year || '—'}
                        </Text>
                        <Text size={1} muted>
                          {artwork.category?.title || artwork.category?.titleDe || '—'}
                </Text>
                      </Grid>
                    </Box>
                    
                    <EditIcon />
                  </Flex>
                </Card>
              ))}
      </Stack>
          )}
        </Box>
      </Flex>
    </Card>
  )
} 