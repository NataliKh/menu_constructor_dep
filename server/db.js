import mongoose from 'mongoose';

let enabled = false;

export async function connectDB(uri) {
  if (!uri) return false;
  try {
    await mongoose.connect(uri);
    enabled = true;
    console.log('[mongo] connected');
    return true;
  } catch (e) {
    console.error('[mongo] connection failed:', e.message);
    enabled = false;
    return false;
  }
}

export function isMongoEnabled() {
  return enabled;
}

export { mongoose };

