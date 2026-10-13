export default {
  name: 'magazineIssue',
  title: 'Magazine Issue',
  type: 'document',
  fields: [
    {
      name: 'number',
      title: 'Issue Number',
      type: 'number',
      description: 'Running number of the issue, e.g. 47 for AA47',
      validation: Rule => Rule.required().integer().positive()
    },
    {
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: Rule => Rule.required().integer()
    },
    {
      name: 'issueOfYear',
      title: 'Issue of Year',
      type: 'number',
      description: '1–4',
      validation: Rule => Rule.integer().min(1).max(4)
    },
    {
      name: 'theme',
      title: 'Theme',
      type: 'object',
      description: 'Headline of the editorial',
      fields: [
        {name: 'en', title: 'English', type: 'string'},
        {name: 'de', title: 'German', type: 'string'}
      ]
    },
    {
      name: 'cover',
      title: 'Cover',
      type: 'image'
    },
    {
      name: 'sourcePdf',
      title: 'Source PDF',
      type: 'string',
      description: 'Dropbox path of the issue PDF'
    }
  ],
  orderings: [
    {
      title: 'Issue Number, Newest First',
      name: 'numberDesc',
      by: [{field: 'number', direction: 'desc'}]
    }
  ],
  preview: {
    select: {
      number: 'number',
      year: 'year',
      issueOfYear: 'issueOfYear',
      themeEn: 'theme.en',
      themeDe: 'theme.de',
      media: 'cover'
    },
    prepare(selection) {
      const { number, year, issueOfYear, themeEn, themeDe, media } = selection
      const edition = [issueOfYear, year].filter(Boolean).join('/')
      return {
        title: number ? `AA ${number}` : 'Untitled Issue',
        subtitle: [edition, themeEn || themeDe].filter(Boolean).join(' · '),
        media
      }
    }
  }
}
