import { CommConfiguration } from './comm';

export type YstreamConf = {
  comms?: CommConfiguration[];
  acceptNewUsers?: boolean;
  syncsEverything?: boolean;
  gc?: boolean;
  gcTimeout?: number;
}

export interface Collection {
  get: (id: string) => Promise<any>;
  getAll: () => Promise<Record<string, any>>;
}