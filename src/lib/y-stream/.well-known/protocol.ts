export const PROTOCOL_VERSION = '1';

export const MESSAGE_TYPES = {
  SYNC: 0,
  SYNC_REPLY: 1,
  UPDATE: 2,
  AUTH: 3,
  AUTH_REPLY: 4,
  ERROR: 5
};

export const ERROR_CODES = {
  UNAUTHORIZED: 'unauthorized',
  INVALID_MESSAGE: 'invalid_message',
  SYNC_FAILED: 'sync_failed',
  AUTH_FAILED: 'auth_failed'
}; 