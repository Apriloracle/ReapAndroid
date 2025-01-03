import type { YstreamConf } from './types';

export const YSTREAM_CONFIG: YstreamConf = {
  comms: [], // Will be populated at runtime
  acceptNewUsers: true,
  syncsEverything: false,
  gc: true,
  gcTimeout: 50000
}; 