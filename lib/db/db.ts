import mongoose from "mongoose";

type ConnectionCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};
const globalWithMongoose = globalThis as typeof globalThis & { mongoose?: ConnectionCache };
const cached = globalWithMongoose.mongoose ??= { conn: null, promise: null };

export async function dbConnect() {
  // Validate only when a request needs the database, never during route imports.
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("Database is not configured. Set MONGODB_URI in .env.local or your hosting environment, then restart or redeploy.");
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://.");
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    // A failed attempt must not poison subsequent requests. Never log the URI.
    cached.promise = null;
    throw error;
  }
}
