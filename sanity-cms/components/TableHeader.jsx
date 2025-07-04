import React from 'react'
import { Flex, Stack, Text, Button } from '@sanity/ui'
import { AddIcon } from '@sanity/icons'

export default function TableHeader({ 
  title, 
  count, 
  totalCount, 
  itemName, 
  onAddNew, 
  addButtonText 
}) {
  return (
    <Flex justify="space-between" align="center">
      <Stack space={6}>
        <Text size={3} weight="bold">{title}</Text>
        <Text size={1} muted>
          {count} of {totalCount} {itemName}
        </Text>
      </Stack>
      <Button 
        text={addButtonText} 
        tone="primary"
        icon={AddIcon}
        onClick={onAddNew}
      />
    </Flex>
  )
} 