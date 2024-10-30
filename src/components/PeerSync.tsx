import React, { useState, useEffect, useRef } from 'react';
import { createStore } from 'tinybase';
import { Doc } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { createYjsPersister } from 'tinybase/persisters/persister-yjs';

interface PeerSyncProps {
  onConnectionStatus?: (status: boolean) => void;
  onReady?: () => void;
}

// Create a single instance of Doc outside the component
const ydoc = new Doc();
const roomName = "ws";

const PeerSync: React.FC<PeerSyncProps> = ({ onConnectionStatus, onReady }) => {
  const [store] = useState(() => createStore());
  const websocketProviderRef = useRef<WebsocketProvider | null>(null);
  const yjsPersisterRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const initializeSync = async () => {
      try {
        if (!websocketProviderRef.current) {
          console.log('Initializing Y-WebSocket provider for userSubnet...');
          websocketProviderRef.current = new WebsocketProvider(
            'wss://demos.yjs.',
            roomName,
            ydoc
          );

          console.log('Creating YjsPersister...');
          yjsPersisterRef.current = createYjsPersister(store, ydoc, roomName);

          websocketProviderRef.current.on('status', ({ status }: { status: 'connected' | 'disconnected' }) => {
            console.log('Y-WebSocket provider status changed:', status);
            const connected = status === 'connected';
            setIsConnected(connected);
            if (onConnectionStatus) onConnectionStatus(connected);
            if (connected && onReady) onReady();
          });

          console.log('Saving YjsPersister...');
          await yjsPersisterRef.current.save();

          console.log('Y-WebSocket provider initialized for userSubnet');
          setIsInitialized(true);
        } else {
          console.log('Using existing Y-WebSocket provider');
          setIsInitialized(true);
          setIsConnected(websocketProviderRef.current.shouldConnect);
          if (onReady) onReady();
        }
      } catch (error) {
        console.error('Failed to initialize Y-WebSocket for userSubnet:', error);
        setIsInitialized(false);
        setIsConnected(false);
        if (onConnectionStatus) onConnectionStatus(false);
      }
    };

    initializeSync();

    return () => {
      console.log('PeerSync component unmounting...');
      // We're not disconnecting the provider here to allow it to persist
    };
  }, [store, onConnectionStatus, onReady]);

  return null;
};

export default PeerSync;
