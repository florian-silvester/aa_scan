export const PERSON_ROLES = [
  {title: 'Maker / Artist', value: 'maker'},
  {title: 'Author', value: 'author'},
  {title: 'Photographer', value: 'photographer'},
  {title: 'Curator', value: 'curator'},
  {title: 'Gallerist', value: 'gallerist'},
  {title: 'Collector', value: 'collector'},
  {title: 'Other', value: 'other'}
]

export default {
  name: 'magazinePerson',
  title: 'Magazine Person',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Full name as most often printed',
      validation: Rule => Rule.required()
    },
    {
      name: 'lastName',
      title: 'Last Name',
      type: 'string'
    },
    {
      name: 'aliases',
      title: 'Name Variants',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Other spellings found in the magazine, e.g. "W. Jo Brunner" and "Jo Brunner"'
    },
    {
      name: 'years',
      title: 'Years',
      type: 'string',
      description: 'Life dates as printed, e.g. "1901–1983" or "b. 1942"'
    },
    {
      name: 'roles',
      title: 'Roles',
      type: 'array',
      of: [{type: 'string'}],
      options: {list: PERSON_ROLES}
    },
    {
      name: 'mentionCount',
      title: 'Mention Count',
      type: 'number',
      readOnly: true,
      description: 'Number of magazine articles that feature, mention or picture this person. Updated by the import.'
    }
  ],
  orderings: [
    {
      title: 'Most Mentioned',
      name: 'mentionCountDesc',
      by: [{field: 'mentionCount', direction: 'desc'}]
    },
    {
      title: 'Last Name',
      name: 'lastNameAsc',
      by: [{field: 'lastName', direction: 'asc'}]
    }
  ],
  preview: {
    select: {
      name: 'name',
      roles: 'roles',
      mentionCount: 'mentionCount'
    },
    prepare(selection) {
      const { name, roles, mentionCount } = selection
      const roleTitles = (roles || [])
        .map(role => PERSON_ROLES.find(r => r.value === role)?.title)
        .filter(Boolean)
      return {
        title: name || 'Unnamed',
        subtitle: [
          roleTitles.join(', '),
          mentionCount && `${mentionCount} articles`
        ].filter(Boolean).join(' · ')
      }
    }
  }
}
