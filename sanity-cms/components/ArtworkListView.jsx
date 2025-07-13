import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Flex, 
  Text, 
  Stack, 
  Button, 
  Spinner,
  Badge,
  Select,
  TextInput,
  Box
} from '@sanity/ui'
import { useClient } from 'sanity'
import { SearchIcon, AddIcon, EditIcon, ImageIcon } from '@sanity/icons'

export default function ArtworkListView() {
  const [artworks, setArtworks] = useState([])
  const [filteredArtworks, setFilteredArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedMaker, setSelectedMaker] = useState('')
  
  const client = useClient()

  // Fetch artworks
  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setLoading(true)
        const query = `*[_type == "artwork" && defined(images[0])] | order(workTitle asc) {
          _id,
          workTitle,
          maker->{name},
          year,
          category->{title, titleDe},
          materialEn,
          materialDe,
          imageId,
          "imageUrl": images[0].asset->url,
          "thumbnailUrl": images[0].asset->url + "?w=160&h=120&fit=crop&fm=webp",
          _createdAt,
          _updatedAt
        }`
        
        const results = await client.fetch(query)
        setArtworks(results || [])
        setFilteredArtworks(results || [])
      } catch (error) {
        console.error('Error fetching artworks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArtworks()
  }, [client])

  // Get unique values for filters
  const uniqueCategories = [...new Set(artworks.flatMap(artwork => 
    [artwork.category?.title, artwork.category?.titleDe].filter(Boolean)
  ))].sort()

  const uniqueMakers = [...new Set(artworks.map(artwork => 
    artwork.maker?.name).filter(Boolean)
  )].sort()

  // Filter artworks
  useEffect(() => {
    let filtered = artworks

    if (searchText) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(artwork => 
        (artwork.workTitle && artwork.workTitle.toLowerCase().includes(searchLower)) ||
        (artwork.maker?.name && artwork.maker.name.toLowerCase().includes(searchLower)) ||
        (artwork.category?.title && artwork.category.title.toLowerCase().includes(searchLower)) ||
        (artwork.category?.titleDe && artwork.category.titleDe.toLowerCase().includes(searchLower)) ||
        (artwork.imageId && artwork.imageId.toLowerCase().includes(searchLower))
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(artwork => 
        artwork.category?.title === selectedCategory || artwork.category?.titleDe === selectedCategory
      )
    }

    if (selectedMaker) {
      filtered = filtered.filter(artwork => artwork.maker?.name === selectedMaker)
    }

    setFilteredArtworks(filtered)
  }, [artworks, searchText, selectedCategory, selectedMaker])

  const openArtwork = (artwork) => {
    window.location.href = `/intent/edit/id=${artwork._id};type=artwork`
  }

  const createNewArtwork = () => {
    window.location.href = '/intent/create/template=artwork;type=artwork'
  }

  if (loading) {
    return (
      <Card padding={4} margin={4}>
        <Flex justify="center" align="center" height="400px">
          <Stack space={3} align="center">
            <Spinner />
            <Text>Loading artworks...</Text>
          </Stack>
        </Flex>
      </Card>
    )
  }

  return (
    <Card padding={4} margin={4}>
      <Stack space={4}>
        {/* HEADER */}
        <Flex justify="space-between" align="center">
          <Stack space={1}>
            <Text size={3} weight="bold">Artwork List</Text>
            <Text size={1} muted>
              {filteredArtworks.length} of {artworks.length} artworks
            </Text>
          </Stack>
          <Button 
            text="Add New Artwork" 
            tone="primary"
            icon={AddIcon}
            onClick={createNewArtwork}
          />
        </Flex>

        {/* FILTER BAR */}
        <Card padding={4} border>
          <Stack space={3}>
            <Flex gap={3}>
              <Box flex={2}>
                <TextInput
                  icon={SearchIcon}
                  placeholder="Search artworks..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.currentTarget.value)}
                />
              </Box>
              
              <Box flex={1}>
                <Select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.currentTarget.value)}
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Select>
              </Box>

              <Box flex={1}>
                <Select
                  value={selectedMaker}
                  onChange={(event) => setSelectedMaker(event.currentTarget.value)}
                >
                  <option value="">All Makers</option>
                  {uniqueMakers.map(maker => (
                    <option key={maker} value={maker}>{maker}</option>
                  ))}
                </Select>
              </Box>
            </Flex>

            {/* ACTIVE FILTERS */}
            {(searchText || selectedCategory || selectedMaker) && (
              <Flex gap={2}>
                <Text size={1} muted>Active filters:</Text>
                {searchText && <Badge tone="primary" text={`"${searchText}"`} />}
                {selectedCategory && <Badge tone="primary" text={selectedCategory} />}
                {selectedMaker && <Badge tone="primary" text={selectedMaker} />}
                <Button 
                  text="Clear" 
                  mode="ghost" 
                  onClick={() => {
                    setSearchText('')
                    setSelectedCategory('')
                    setSelectedMaker('')
                  }}
                />
              </Flex>
            )}
          </Stack>
        </Card>

        {/* ARTWORK LIST */}
        {filteredArtworks.length > 0 ? (
          <Stack space={2}>
            {filteredArtworks.map(artwork => (
              <Card 
                key={artwork._id} 
                padding={4}
                border
                radius={2}
                tone="transparent"
                shadow={1}
                style={{ cursor: 'pointer' }}
                onClick={() => openArtwork(artwork)}
              >
                <Flex align="center" gap={4}>
                  {/* THUMBNAIL */}
                  {artwork.thumbnailUrl ? (
                    <img 
                      src={artwork.thumbnailUrl}
                      alt={artwork.workTitle || 'Artwork'}
                      loading="lazy"
                      style={{
                        width: '80px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <Box
                      style={{
                        width: '80px',
                        height: '60px',
                        backgroundColor: '#f0f0f0',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <ImageIcon />
                    </Box>
                  )}
                  
                  {/* MAIN INFO */}
                  <Box flex={1}>
                    <Stack space={2}>
                      <Flex justify="space-between" align="flex-start">
                        <Stack space={1}>
                          <Text size={2} weight="medium">
                            {artwork.workTitle || 'Untitled'}
                          </Text>
                          <Text size={1} muted>
                            by {artwork.maker?.name || 'Unknown maker'}
                          </Text>
                        </Stack>
                        <EditIcon />
                      </Flex>
                      
                      <Flex gap={2} wrap="wrap">
                        {artwork.year && (
                          <Badge mode="outline" text={artwork.year} />
                        )}
                        {(artwork.category?.title || artwork.category?.titleDe) && (
                          <Badge 
                            mode="outline" 
                            text={artwork.category?.title || artwork.category?.titleDe} 
                          />
                        )}
                        {(artwork.materialEn || artwork.materialDe) && (
                          <Badge 
                            mode="outline" 
                            text={artwork.materialEn || artwork.materialDe} 
                          />
                        )}
                      </Flex>
                    </Stack>
                  </Box>
                  
                  {/* METADATA */}
                  <Stack space={1} align="flex-end">
                    {artwork.imageId && (
                      <Text size={0} muted>
                        ID: {artwork.imageId}
                      </Text>
                    )}
                    <Text size={0} muted>
                      {new Date(artwork._createdAt).toLocaleDateString()}
                    </Text>
                  </Stack>
                </Flex>
              </Card>
            ))}
          </Stack>
        ) : (
          <Card padding={6}>
            <Stack space={3} align="center">
              <Text size={2} muted>No artworks found</Text>
              <Text size={1} muted>
                {artworks.length === 0 
                  ? "Start by adding your first artwork"
                  : "Try adjusting your filters"
                }
              </Text>
              {artworks.length === 0 && (
                <Button 
                  text="Add First Artwork" 
                  tone="primary"
                  onClick={createNewArtwork}
                />
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
} 