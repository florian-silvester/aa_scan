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

export default function ArticleTableView() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  
  const client = useClient()

  // Fetch articles
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true)
        const query = `*[_type == "article"] | order(_createdAt desc) {
          _id,
          titleEn,
          titleDe,
          author,
          maker->{name, category->{title}},
          date,
          introductionEn,
          introductionDe,
          fullTextEn,
          fullTextDe,
          images[]->{_id, workTitle, "thumbnailUrl": images[0].asset->url},
          slug,
          _createdAt,
          _updatedAt
        }`
        
        const results = await client.fetch(query)
        setArticles(results || [])
      } catch (error) {
        console.error('Error fetching articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [client])

  // Define columns
  const columns = [
    columnHelper.accessor('titleEn', {
      header: 'Title',
      cell: info => (
        <Text size={1} weight="medium">
          {info.getValue() || info.row.original.titleDe || 'Untitled'}
        </Text>
      )
    }),
    columnHelper.accessor('author', {
      header: 'Author',
      cell: info => (
        <Text size={1}>
          {info.getValue() || 'Unknown'}
        </Text>
      )
    }),
    columnHelper.accessor('maker', {
      header: 'Featured Creator',
      cell: info => {
        const maker = info.getValue()
        return maker ? (
          <Text size={1}>
            {maker.name}
            {maker.category?.title && (
              <Text size={0} muted style={{ display: 'block' }}>
                {maker.category.title}
              </Text>
            )}
          </Text>
        ) : (
          <Text size={1} muted>No creator</Text>
        )
      }
    }),
    columnHelper.accessor('date', {
      header: 'Date',
      cell: info => {
        const date = info.getValue()
        return (
          <Text size={1} muted>
            {date ? new Date(date).toLocaleDateString() : 'No date'}
          </Text>
        )
      }
    }),
    columnHelper.accessor('_createdAt', {
      header: 'Created',
      cell: info => (
        <Text size={1} muted>
          {new Date(info.getValue()).toLocaleDateString()}
        </Text>
      )
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <Button
          mode="ghost"
          icon={EditIcon}
          onClick={() => openArticle(info.row.original)}
          title="Edit Article"
        />
      )
    })
  ]

  const table = useReactTable({
    data: articles,
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

  const openArticle = (article) => {
    window.location.href = `/intent/edit/id=${article._id};type=article`
  }

  const createNewArticle = () => {
    window.location.href = '/intent/create/template=article;type=article'
  }

  if (loading) {
    return (
      <Card padding={4}>
        <Flex justify="center" align="center" height="400px">
          <Stack space={3} align="center">
            <Spinner />
            <Text>Loading articles...</Text>
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
          title="Article Management"
          count={table.getFilteredRowModel().rows.length}
          totalCount={articles.length}
          itemName="articles"
          onAddNew={createNewArticle}
          addButtonText="Add New Article"
        />

        {/* Search */}
        <Grid columns={1} gap={3}>
          <TextInput
            icon={SearchIcon}
            placeholder="Search articles..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.currentTarget.value)}
          />
        </Grid>

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
              <Text size={2} muted>No articles found</Text>
              <Text size={1} muted>
                {articles.length === 0 
                  ? "Start by adding your first article"
                  : "Try adjusting your search"
                }
              </Text>
              {articles.length === 0 && (
                <Button 
                  text="Add First Article" 
                  tone="primary"
                  onClick={createNewArticle}
                />
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
} 