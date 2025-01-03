import React, { useState, useEffect, useRef } from 'react';
import { createStore } from 'tinybase';
import { createYjsPersister } from 'tinybase/persisters/persister-yjs';
import { useWebSocket } from '../contexts/WebSocketContext';

interface PeerSyncProps {
  onConnectionStatus?: (status: boolean) => void;
  onReady?: () => void;
}

interface StatusEvent {
  status: 'connecting' | 'connected' | 'disconnected';
}

const PeerSync: React.FC<PeerSyncProps> = ({ onConnectionStatus, onReady }) => {
  const { provider, ydoc } = useWebSocket();
  const [store] = useState(() => createStore());
  const yjsPersisterRef = useRef<any>(null);

  useEffect(() => {
    if (provider && ydoc) {
      try {
        yjsPersisterRef.current = createYjsPersister(store, ydoc, 'userSubnet');
        
        provider.on('status', ({ status }: StatusEvent) => {
          const connected = status === 'connected';
          if (onConnectionStatus) onConnectionStatus(connected);
          if (connected && onReady) onReady();
        });
      } catch (error) {
        console.error('Error creating YJS persister:', error);
      }
    }
  }, [provider, ydoc, onConnectionStatus, onReady]);

  return null;
};

export default PeerSync;
