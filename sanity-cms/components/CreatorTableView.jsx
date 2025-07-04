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
import { SearchIcon, AddIcon, EditIcon } from '@sanity/icons'
import TableHeader from './TableHeader'
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table'

const columnHelper = createColumnHelper()

export default function CreatorTableView() {
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  
  const client = useClient()

  // Fetch creators
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setLoading(true)
        const query = `*[_type == "creator"] | order(name asc) {
          _id,
          name,
          "imageUrl": image.asset->url,
          biographyEn,
          biographyDe,
          portraitEn,
          portraitDe,
          website,
          email,
          birthYear,
          nationality,
          specialties,
          awards,
          exhibitions,
          category->{title, titleDe},
          locations[]->{name, type, location, country},
          artworks[]->{_id, workTitle, "thumbnailUrl": images[0].asset->url},
          slug,
          _createdAt,
          _updatedAt
        }`
        
        const results = await client.fetch(query)
        setCreators(results || [])
      } catch (error) {
        console.error('Error fetching creators:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCreators()
  }, [client])

  // Get unique categories for filter
  const uniqueCategories = [...new Set(creators.flatMap(creator => 
    [creator.category?.title, creator.category?.titleDe].filter(Boolean)
  ))].sort()

  // Get current category filter value
  const categoryFilter = columnFilters.find(filter => filter.id === 'category')?.value || ''

  // Define columns
  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => (
        <Text size={1} weight="medium">
          {info.getValue() || 'Unknown'}
        </Text>
      )
    }),
    columnHelper.accessor(row => row.category?.title || row.category?.titleDe || '', {
      id: 'category',
      header: 'Category',
      cell: info => {
        const category = info.row.original.category
        return (
          <Badge mode="outline" tone="primary">
            {category?.title || category?.titleDe || 'No category'}
          </Badge>
        )
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true
        const category = row.original.category
        const categoryText = category?.title || category?.titleDe || ''
        return categoryText === filterValue
      }
    }),
    columnHelper.accessor('nationality', {
      header: 'Nationality',
      cell: info => (
        <Text size={1}>
          {info.getValue() || 'Unknown'}
        </Text>
      )
    }),
    columnHelper.accessor('birthYear', {
      header: 'Birth Year',
      cell: info => (
        <Text size={1} muted>
          {info.getValue() || 'Unknown'}
        </Text>
      )
    }),
    columnHelper.accessor('website', {
      header: 'Website',
      cell: info => {
        const website = info.getValue()
        return website ? (
          <Text size={1}>
            <a href={website} target="_blank" rel="noopener noreferrer">
              Link
            </a>
          </Text>
        ) : (
          <Text size={1} muted>No website</Text>
        )
      }
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => {
        const email = info.getValue()
        return email ? (
          <Text size={1}>
            <a href={`mailto:${email}`}>
              {email}
            </a>
          </Text>
        ) : (
          <Text size={1} muted>No email</Text>
        )
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <Button
          mode="ghost"
          icon={EditIcon}
          onClick={() => openCreator(info.row.original)}
          title="Edit Creator"
        />
      )
    })
  ]

  const table = useReactTable({
    data: creators,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const openCreator = (creator) => {
    window.location.href = `/intent/edit/id=${creator._id};type=creator`
  }

  const createNewCreator = () => {
    window.location.href = '/intent/create/template=creator;type=creator'
  }

  // Handle category filter change
  const handleCategoryFilterChange = (value) => {
    setColumnFilters(prev => {
      const otherFilters = prev.filter(filter => filter.id !== 'category')
      if (value) {
        return [...otherFilters, { id: 'category', value }]
      }
      return otherFilters
    })
  }

  if (loading) {
    return (
      <Card padding={4}>
        <Flex justify="center" align="center" height="400px">
          <Stack space={3} align="center">
            <Spinner />
            <Text>Loading creators...</Text>
          </Stack>
        </Flex>
      </Card>
    )
  }

  return (
    <Card padding={4}>
      <Stack space={4}>
        {/* Header */}
        <TableHeader
          title="Creator Management"
          count={table.getFilteredRowModel().rows.length}
          totalCount={creators.length}
          itemName="creators"
          onAddNew={createNewCreator}
          addButtonText="Add New Creator"
        />

        {/* Filters */}
        <Flex gap={3}>
          <Box flex={1}>
            <TextInput
              icon={SearchIcon}
              placeholder="Search creators..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.currentTarget.value)}
            />
          </Box>
          <Box style={{ minWidth: '200px' }}>
            <Select
              value={categoryFilter}
              onChange={(event) => handleCategoryFilterChange(event.currentTarget.value)}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </Box>
        </Flex>

        {/* Active Filters */}
        {(globalFilter || categoryFilter) && (
          <Flex gap={2} align="center">
            <Text size={1} muted>Active filters:</Text>
            {globalFilter && <Badge tone="primary" text={`"${globalFilter}"`} />}
            {categoryFilter && <Badge tone="primary" text={categoryFilter} />}
            <Button 
              text="Clear" 
              mode="ghost" 
              onClick={() => {
                setGlobalFilter('')
                setColumnFilters([])
              }}
            />
          </Flex>
        )}

        {/* Table */}
        <Card border padding={0}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          borderBottom: '1px solid var(--card-border-color)',
                          backgroundColor: 'var(--card-bg-color)',
                          cursor: header.column.getCanSort() ? 'pointer' : 'default'
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <Text size={1} weight="medium">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() && (
                            <span style={{ marginLeft: '4px' }}>
                              {header.column.getIsSorted() === 'desc' ? ' ↓' : ' ↑'}
                            </span>
                          )}
                        </Text>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid var(--card-border-color)'
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* No results */}
        {table.getFilteredRowModel().rows.length === 0 && (
          <Card padding={6}>
            <Stack space={3} align="center">
              <Text size={2} muted>No creators found</Text>
              <Text size={1} muted>
                {creators.length === 0 
                  ? "Start by adding your first creator"
                  : "Try adjusting your filters"
                }
              </Text>
              {creators.length === 0 && (
                <Button 
                  text="Add First Creator" 
                  tone="primary"
                  onClick={createNewCreator}
                />
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
} 