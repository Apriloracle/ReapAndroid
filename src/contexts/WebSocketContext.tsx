'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { getRandomWebSocketURL } from '../utils/websocketUtils';
import { open as openYstream } from '../lib/y-stream';
import { YSTREAM_CONFIG } from '../lib/y-stream/config';
import { WebSocketComm } from '../lib/y-stream/comms/websocket';
import { COLLECTION_CONFIG } from '../config/collection';
import { bindydoc } from '../lib/y-stream/bindydoc';

interface WebSocketContextType {
  provider: WebsocketProvider | null;
  ydoc: Y.Doc | null;
  ystream: any | null;
  clustersMap: Y.Map<any> | null;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [ydoc] = useState(() => new Y.Doc());
  const [ystream, setYstream] = useState<any | null>(null);
  const clustersMap = ydoc.getMap('clusters');

  useEffect(() => {
    // Initialize WebSocket provider
    const wsUrl = getRandomWebSocketURL();
    const wsProvider = new WebsocketProvider(wsUrl, 'u-interaction', ydoc);
    setProvider(wsProvider);

    // Initialize Ystream
    const initYstreamInstance = async () => {
      try {
        const wsComm = new WebSocketComm(wsUrl, {
          owner: COLLECTION_CONFIG.owner,
          name: COLLECTION_CONFIG.name
        });

        const ystreamInstance = await openYstream('recommendations-db', {
          ...YSTREAM_CONFIG,
          comms: [wsComm]
        });

        if (ystreamInstance) {
          await bindydoc(
            ystreamInstance,
            COLLECTION_CONFIG.owner,
            COLLECTION_CONFIG.name,
            'clusters',
            ydoc
          );
          
          setYstream(ystreamInstance);
        }
      } catch (error) {
        console.error('Failed to initialize Ystream:', error);
      }
    };

    initYstreamInstance();

    // Cleanup
    return () => {
      if (provider) {
        provider.destroy();
      }
      if (ystream) {
        ystream.destroy();
      }
    };
  }, [ydoc]);

  return (
    <WebSocketContext.Provider value={{ provider, ydoc, ystream, clustersMap }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}; 