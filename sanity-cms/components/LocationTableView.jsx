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
  Grid
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

export default function LocationTableView() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [typeFilter, setTypeFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  
  const client = useClient()

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true)
        const query = `*[_type == "location"] | order(name asc) {
          _id,
          name,
          type,
          country,
          location,
          address,
          times,
          phone,
          email,
          website,
          description,
          slug,
          _createdAt,
          _updatedAt
        }`
        
        const results = await client.fetch(query)
        setLocations(results || [])
      } catch (error) {
        console.error('Error fetching locations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [client])

  // Get unique values for filters
  const uniqueTypes = [...new Set(locations.map(location => location.type).filter(Boolean))].sort()
  const uniqueCountries = [...new Set(locations.map(location => location.country).filter(Boolean))].sort()

  // Filter locations
  const filteredLocations = locations.filter(location => {
    if (typeFilter && location.type !== typeFilter) return false
    if (countryFilter && location.country !== countryFilter) return false
    return true
  })

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
    columnHelper.accessor('type', {
      header: 'Type',
      cell: info => {
        const type = info.getValue()
        const typeDisplay = {
          'museum': 'Museum',
          'shop-gallery': 'Shop/Gallery',
          'studio': 'Studio'
        }[type] || type
        
        const tone = {
          'museum': 'primary',
          'shop-gallery': 'positive',
          'studio': 'caution'
        }[type] || 'default'
        
        return (
          <Badge mode="outline" tone={tone}>
            {typeDisplay}
          </Badge>
        )
      }
    }),
    columnHelper.accessor('location', {
      header: 'City',
      cell: info => (
        <Text size={1}>
          {info.getValue() || 'Unknown'}
        </Text>
      )
    }),
    columnHelper.accessor('country', {
      header: 'Country',
      cell: info => (
        <Text size={1}>
          {info.getValue() || 'Unknown'}
        </Text>
      )
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      cell: info => {
        const phone = info.getValue()
        return phone ? (
          <Text size={1}>
            <a href={`tel:${phone}`}>
              {phone}
            </a>
          </Text>
        ) : (
          <Text size={1} muted>No phone</Text>
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
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <Button
          mode="ghost"
          icon={EditIcon}
          onClick={() => openLocation(info.row.original)}
          title="Edit Location"
        />
      )
    })
  ]

  const table = useReactTable({
    data: filteredLocations,
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

  const openLocation = (location) => {
    window.location.href = `/intent/edit/id=${location._id};type=location`
  }

  const createNewLocation = () => {
    window.location.href = '/intent/create/template=location;type=location'
  }

  if (loading) {
    return (
      <Card padding={4}>
        <Flex justify="center" align="center" height="400px">
          <Stack space={3} align="center">
            <Spinner />
            <Text>Loading locations...</Text>
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
          title="Location Management"
          count={table.getFilteredRowModel().rows.length}
          totalCount={locations.length}
          itemName="locations"
          onAddNew={createNewLocation}
          addButtonText="Add New Location"
        />

        {/* Filters */}
        <Grid columns={3} gap={3}>
          <TextInput
            icon={SearchIcon}
            placeholder="Search locations..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.currentTarget.value)}
          />
          <Select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.currentTarget.value)}
          >
            <option value="">All Types</option>
            <option value="museum">Museum</option>
            <option value="shop-gallery">Shop/Gallery</option>
            <option value="studio">Studio</option>
          </Select>
          <Select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.currentTarget.value)}
          >
            <option value="">All Countries</option>
            {uniqueCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </Select>
        </Grid>

        {/* Active Filters */}
        {(globalFilter || typeFilter || countryFilter) && (
          <Flex gap={2} align="center">
            <Text size={1} muted>Active filters:</Text>
            {globalFilter && <Badge tone="primary" text={`"${globalFilter}"`} />}
            {typeFilter && <Badge tone="primary" text={typeFilter === 'shop-gallery' ? 'Shop/Gallery' : typeFilter} />}
            {countryFilter && <Badge tone="primary" text={countryFilter} />}
            <Button 
              text="Clear" 
              mode="ghost" 
              onClick={() => {
                setGlobalFilter('')
                setTypeFilter('')
                setCountryFilter('')
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
              <Text size={2} muted>No locations found</Text>
              <Text size={1} muted>
                {locations.length === 0 
                  ? "Start by adding your first location"
                  : "Try adjusting your filters"
                }
              </Text>
              {locations.length === 0 && (
                <Button 
                  text="Add First Location" 
                  tone="primary"
                  onClick={createNewLocation}
                />
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
} 