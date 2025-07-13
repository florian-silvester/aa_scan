import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Flex, 
  Text, 
  Stack, 
  Spinner,
  Badge,
  Box,
  Grid,
  Button
} from '@sanity/ui'
import { useClient } from 'sanity'
import { ImageIcon, DocumentIcon, RefreshIcon } from '@sanity/icons'

export default function MediaStatsWidget() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const client = useClient()

  const fetchMediaStats = async () => {
    try {
      setLoading(true)
      
      // Get comprehensive media statistics
      const queries = await Promise.all([
        // Total media assets
        client.fetch('count(*[_type == "sanity.imageAsset"])'),
        
        // Media linked to artworks
        client.fetch('count(*[_type == "sanity.imageAsset" && count(*[_type == "artwork" && references(^._id)]) > 0])'),
        
        // Media by file type (simplified)
        client.fetch(`
          *[_type == "sanity.imageAsset"]{
            extension
          }
        `),
        
        // Media size statistics (fixed GROQ)
        client.fetch(`
          *[_type == "sanity.imageAsset"]{
            size
          }
        `),
        
        // Recent uploads (last 30 days)
        client.fetch(`
          count(*[_type == "sanity.imageAsset" && _createdAt > now() - 60*60*24*30])
        `),
        
        // Images with metadata
        client.fetch(`
          count(*[_type == "sanity.imageAsset" && defined(title) && title != ""])
        `),
        
        // Total artworks
        client.fetch('count(*[_type == "artwork"])'),
        
        // Total creators
        client.fetch('count(*[_type == "creator"])'),
        
        // Profile analysis data (load from recent report)
        client.fetch(`
          *[_type == "sanity.imageAsset"]{
            _id,
            originalFilename,
            title
          }
        `),
      ])

      const [
        totalMedia,
        linkedMedia,
        typeStats,
        sizeArray,
        recentUploads,
        withMetadata,
        totalArtworks,
        totalCreators
      ] = queries

      // Calculate size statistics manually
      const sizes = sizeArray.map(item => item.size).filter(size => size > 0)
      const sizeStats = sizes.length > 0 ? {
        totalSize: sizes.reduce((sum, size) => sum + size, 0),
        avgSize: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
        maxSize: Math.max(...sizes),
        minSize: Math.min(...sizes)
      } : {
        totalSize: 0,
        avgSize: 0,
        maxSize: 0,
        minSize: 0
      }

      // Process file type statistics
      const fileTypes = {}
      typeStats.forEach(item => {
        if (item.extension) {
          fileTypes[item.extension] = (fileTypes[item.extension] || 0) + 1
        }
      })
      
      const processedTypeStats = Object.entries(fileTypes)
        .map(([extension, count]) => ({ extension, count }))
        .sort((a, b) => b.count - a.count)

      setStats({
        totalMedia,
        linkedMedia,
        unlinkedMedia: totalMedia - linkedMedia,
        typeStats: processedTypeStats,
        sizeStats,
        recentUploads,
        withMetadata,
        totalArtworks,
        totalCreators
      })
    } catch (error) {
      console.error('Error fetching media stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMediaStats()
  }, [client])

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const linkagePercentage = stats ? Math.round((stats.linkedMedia / stats.totalMedia) * 100) : 0
  const metadataPercentage = stats ? Math.round((stats.withMetadata / stats.totalMedia) * 100) : 0

  if (loading) {
    return (
      <Card padding={4} radius={2} tone="default">
        <Flex align="center" justify="center" gap={3}>
          <Spinner />
          <Text>Loading media statistics...</Text>
        </Flex>
      </Card>
    )
  }

  return (
    <Card padding={4} radius={2} tone="default">
      <Stack space={4}>
        <Flex justify="space-between" align="center">
          <Text weight="semibold" size={2}>📊 Media Statistics</Text>
          <Button
            icon={RefreshIcon}
            mode="ghost"
            onClick={fetchMediaStats}
            text="Refresh"
          />
        </Flex>

        <Grid columns={3} gap={3}>
          {/* Total Media */}
          <Card padding={3} radius={2} tone="primary">
            <Stack space={2}>
              <Flex align="center" gap={2}>
                <ImageIcon />
                <Text weight="medium">Total Media</Text>
              </Flex>
              <Text size={4} weight="bold">{stats?.totalMedia.toLocaleString()}</Text>
            </Stack>
          </Card>

          {/* Linked to Artworks */}
          <Card padding={3} radius={2} tone="positive">
            <Stack space={2}>
              <Flex align="center" gap={2}>
                <DocumentIcon />
                <Text weight="medium">Linked to Artworks</Text>
              </Flex>
              <Text size={4} weight="bold">{stats?.linkedMedia.toLocaleString()}</Text>
              <Badge tone="positive">{linkagePercentage}%</Badge>
            </Stack>
          </Card>

          {/* Unlinked Media */}
          <Card padding={3} radius={2} tone="caution">
            <Stack space={2}>
              <Flex align="center" gap={2}>
                <ImageIcon />
                <Text weight="medium">Unlinked Media</Text>
              </Flex>
              <Text size={4} weight="bold">{stats?.unlinkedMedia.toLocaleString()}</Text>
              <Badge tone="caution">{100 - linkagePercentage}%</Badge>
            </Stack>
          </Card>
        </Grid>

        <Grid columns={2} gap={3}>
          {/* File Types */}
          <Card padding={3} radius={2} tone="default">
            <Stack space={3}>
              <Text weight="medium">File Types</Text>
              <Stack space={2}>
                {stats?.typeStats.slice(0, 5).map((type, index) => (
                  <Flex key={index} justify="space-between" align="center">
                    <Text size={1}>{type.extension?.toUpperCase() || 'Unknown'}</Text>
                    <Badge tone="primary">{type.count}</Badge>
                  </Flex>
                ))}
              </Stack>
            </Stack>
          </Card>

          {/* Storage Stats */}
          <Card padding={3} radius={2} tone="default">
            <Stack space={3}>
              <Text weight="medium">Storage</Text>
              <Stack space={2}>
                <Flex justify="space-between" align="center">
                  <Text size={1}>Total Size</Text>
                  <Text size={1} weight="medium">
                    {formatFileSize(stats?.sizeStats?.totalSize || 0)}
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text size={1}>Average Size</Text>
                  <Text size={1} weight="medium">
                    {formatFileSize(stats?.sizeStats?.avgSize || 0)}
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text size={1}>Largest File</Text>
                  <Text size={1} weight="medium">
                    {formatFileSize(stats?.sizeStats?.maxSize || 0)}
                  </Text>
                </Flex>
              </Stack>
            </Stack>
          </Card>
        </Grid>

        {/* Additional Stats */}
        <Grid columns={4} gap={3}>
          <Card padding={3} radius={2} tone="default">
            <Stack space={2}>
              <Text weight="medium" size={1}>Recent Uploads</Text>
              <Text size={2} weight="bold">{stats?.recentUploads}</Text>
              <Text size={0} tone="default">Last 30 days</Text>
            </Stack>
          </Card>

          <Card padding={3} radius={2} tone="default">
            <Stack space={2}>
              <Text weight="medium" size={1}>With Metadata</Text>
              <Text size={2} weight="bold">{stats?.withMetadata}</Text>
              <Badge tone="positive">{metadataPercentage}%</Badge>
            </Stack>
          </Card>

          <Card padding={3} radius={2} tone="default">
            <Stack space={2}>
              <Text weight="medium" size={1}>Total Artworks</Text>
              <Text size={2} weight="bold">{stats?.totalArtworks}</Text>
            </Stack>
          </Card>

          <Card padding={3} radius={2} tone="default">
            <Stack space={2}>
              <Text weight="medium" size={1}>Total Creators</Text>
              <Text size={2} weight="bold">{stats?.totalCreators}</Text>
            </Stack>
          </Card>
        </Grid>

        {/* Success Message */}
        {stats?.totalMedia > 10000 && (
          <Card padding={3} radius={2} tone="positive">
            <Flex align="center" gap={2}>
              <Text>🎉</Text>
              <Text weight="medium" size={1}>
                Successfully imported {stats.totalMedia.toLocaleString()} media assets with {linkagePercentage}% linkage rate!
              </Text>
            </Flex>
          </Card>
        )}
      </Stack>
    </Card>
  )
} 