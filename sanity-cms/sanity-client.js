import {createClient} from '@sanity/client'

// Sanity client configuration
export const sanityClient = createClient({
  projectId: 'b8bczekj', // Your project ID
  dataset: 'production',
  useCdn: false, // Set to false for real-time updates
  apiVersion: '2023-12-01', // Use current date
  token: 'skPdAnlsUzWniWKV4KK7aywMO3Tb45ZKU1aEEZ4NV7ikUevF5XXbycp8zOQtohAhvwU9MC9OEFlrsB5g2iOxLOseNNFgtPPaUhw41ElWcQ2GU5ZepRsF1K8VPnWApwcO1qExQ8KZTeSzSLJVp4GvcjoWSNxFwtUYtbJK9ksxv7KWwxsb1PJY', // Updated token with proper permissions
})

export default sanityClient 