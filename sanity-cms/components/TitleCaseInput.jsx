import React, { useState, useEffect, useCallback } from 'react'
import { TextInput } from '@sanity/ui'

// Helper function to convert text to title case
function toTitleCase(str) {
  if (!str) return str
  
  // Handle common exceptions that shouldn't be capitalized
  const exceptions = ['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with', 'without']
  
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word and words not in exceptions
      if (index === 0 || !exceptions.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    .join(' ')
}

export function TitleCaseInput(props) {
  const { value, onChange, ...restProps } = props
  const [localValue, setLocalValue] = useState(value || '')

  // Update local value when props.value changes
  useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  const handleChange = useCallback((event) => {
    const inputValue = event.target.value
    setLocalValue(inputValue)
    
    // Don't apply title case while typing, only on blur
    if (onChange) {
      onChange(inputValue)
    }
  }, [onChange])

  const handleBlur = useCallback((event) => {
    const inputValue = event.target.value
    const titleCaseValue = toTitleCase(inputValue)
    
    setLocalValue(titleCaseValue)
    
    // Update Sanity's value with title case
    if (onChange) {
      onChange(titleCaseValue)
    }
  }, [onChange])

  return (
    <TextInput
      {...restProps}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}

export default TitleCaseInput 