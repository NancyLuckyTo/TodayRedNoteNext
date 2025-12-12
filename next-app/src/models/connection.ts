import mongoose from 'mongoose'

export default async function connectDB(
  uri = process.env.MONGODB_URI as string
) {
  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable')
  }

  try {
    await mongoose.connect(uri)
    console.log('MongoDB Connected!')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    throw err
  }
}
