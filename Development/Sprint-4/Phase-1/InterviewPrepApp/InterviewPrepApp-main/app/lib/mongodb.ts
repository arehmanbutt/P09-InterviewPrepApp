import mongoose from "mongoose";

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  _mongooseConnection?: CachedConnection;
};

const cached: CachedConnection = globalWithMongoose._mongooseConnection ?? {
  conn: null,
  promise: null,
};

if (!globalWithMongoose._mongooseConnection) {
  globalWithMongoose._mongooseConnection = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const url = process.env.MONGO_URL;
    if (!url) {
      throw new Error("MONGO_URL environment variable is not defined");
    }
    cached.promise = mongoose.connect(url, {
      maxPoolSize: 1,
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
