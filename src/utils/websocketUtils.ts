import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

// List of WebSocket servers
export const WEBSOCKET_URLS = [
  'wss://ws1.apriloracle.com:1234',
  'wss://ws2.apriloracle.com:1234',
  'wss://ws3.apriloracle.com:1234'
];

// Function to get a random WebSocket URL from the list
export const getRandomWebSocketURL = (): string => {
  const randomIndex = Math.floor(Math.random() * WEBSOCKET_URLS.length);
  return WEBSOCKET_URLS[randomIndex];
};

// Function to connect to WebSocket
export const connectWebSocket = (
  provider: WebsocketProvider | null,
  doc: Y.Doc,
  roomName: string,
  onStatusChange: (connected: boolean) => void
): WebsocketProvider => {
  if (provider) {
    provider.destroy();
  }

  const wsProvider = new WebsocketProvider(
    getRandomWebSocketURL(),
    roomName,
    doc,
    { connect: true }
  );

  wsProvider.on('status', ({ status }: { status: string }) => {
    onStatusChange(status === 'connected');
  });

  return wsProvider;
}; 
