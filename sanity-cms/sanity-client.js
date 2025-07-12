import {createClient} from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Sanity client configuration
export const sanityClient = createClient({
  projectId: 'b8bczekj', // Your project ID
  dataset: 'production',
  useCdn: false, // Set to false for real-time updates
  apiVersion: '2023-12-01', // Use current date
  token: process.env.SANITY_API_TOKEN, // Use environment variable for security
})

export default sanityClient 