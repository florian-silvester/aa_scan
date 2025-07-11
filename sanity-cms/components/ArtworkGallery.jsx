import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Flex, 
  Text, 
  Stack, 
  Box, 
  Button, 
  Spinner,
  Grid,
  Badge,
  Select,
  TextInput
} from '@sanity/ui'
import { useClient } from 'sanity'
import { SearchIcon, AddIcon, EditIcon } from '@sanity/icons'
import styled from 'styled-components'

const GalleryContainer = styled(Card)`
  margin: 16px;
  padding: 16px;
`

const ArtworkCard = styled(Card)`
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }
`

const ArtworkImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 4px 4px 0 0;
`

const ImagePlaceholder = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px 4px 0 0;
  color: #999;
  font-size: 16px;
  border: 2px dashed #ccc;
`

const FilterBar = styled(Card)`
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid var(--card-border-color);
`

export default function ArtworkGallery() {
  const [artworks, setArtworks] = useState([])
  const [filteredArtworks, setFilteredArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedMaker, setSelectedMaker] = useState('')
  
  const client = useClient()

  // Fetch all artworks with optimized image URLs
  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setLoading(true)
        // Filter out duplicates by only showing artworks that have images
        const query = `*[_type == "artwork" && defined(images[0])] | order(_createdAt desc) {
          _id,
          workTitle,
          maker->{name},
          year,
          category->{title, titleDe},
          materialEn,
          materialDe,
          imageId,
          "imageUrl": images[0].asset->url,
          "thumbnailUrl": images[0].asset->url + "?w=400&h=300&fit=crop&fm=webp",
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
    // Use Sanity's intent system for navigation
    window.location.href = `/intent/edit/id=${artwork._id};type=artwork`
  }

  const createNewArtwork = () => {
    // Use Sanity's intent system for creation
    window.location.href = '/intent/create/template=artwork;type=artwork'
  }

  if (loading) {
    return (
      <GalleryContainer>
        <Flex justify="center" align="center" height="400px">
          <Stack space={3} align="center">
            <Spinner />
            <Text>Loading artwork gallery...</Text>
          </Stack>
        </Flex>
      </GalleryContainer>
    )
  }

  return (
    <GalleryContainer>
      <Stack space={4}>
        {/* HEADER */}
        <Flex justify="space-between" align="center">
          <Stack space={1}>
            <Text size={3} weight="bold">Artwork Gallery</Text>
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
        <FilterBar>
          <Grid columns={3} gap={3}>
            <TextInput
              icon={SearchIcon}
              placeholder="Search artworks..."
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
            />
            
            <Select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.currentTarget.value)}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>

            <Select
              value={selectedMaker}
              onChange={(event) => setSelectedMaker(event.currentTarget.value)}
            >
              <option value="">All Makers</option>
              {uniqueMakers.map(maker => (
                <option key={maker} value={maker}>{maker}</option>
              ))}
            </Select>
          </Grid>

          {/* ACTIVE FILTERS */}
          {(searchText || selectedCategory || selectedMaker) && (
            <Flex gap={2} marginTop={3}>
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
        </FilterBar>

        {/* ARTWORK GRID */}
        {filteredArtworks.length > 0 ? (
          <Grid columns={[2, 3, 4]} gap={4}>
            {filteredArtworks.map(artwork => (
              <ArtworkCard 
                key={artwork._id} 
                padding={0}
                onClick={() => openArtwork(artwork)}
              >
                {artwork.thumbnailUrl ? (
                  <ArtworkImage 
                    src={artwork.thumbnailUrl}
                    alt={artwork.workTitle || 'Artwork'}
                    loading="lazy"
                  />
                ) : (
                  <ImagePlaceholder>
                    No Image
                  </ImagePlaceholder>
                )}
                
                <Box padding={3}>
                  <Stack space={2}>
                    <Text size={2} weight="medium" style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {artwork.workTitle || 'Untitled'}
                    </Text>
                    
                    <Stack space={1}>
                      <Text size={1} muted>
                        {artwork.maker?.name || 'Unknown maker'}
                      </Text>
                      
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
                      </Flex>
                    </Stack>
                    
                    <Flex justify="space-between" align="center">
                      <Text size={0} muted>
                        {artwork.imageId && `ID: ${artwork.imageId}`}
                      </Text>
                      <EditIcon />
                    </Flex>
                  </Stack>
                </Box>
              </ArtworkCard>
            ))}
          </Grid>
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
    </GalleryContainer>
  )
} 