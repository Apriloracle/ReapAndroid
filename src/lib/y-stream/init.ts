import { open } from './index';
import { YSTREAM_CONFIG } from './config';

export const initYstream = async (dbName: string, customConfig = {}) => {
  const config = {
    ...YSTREAM_CONFIG,
    ...customConfig
  };

  try {
    const ystream = await open(dbName, config);
    return ystream;
  } catch (error) {
    console.error('Failed to initialize y-stream:', error);
    throw error;
  }
}; 
