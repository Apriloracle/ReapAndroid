import React, { createContext, useContext, useEffect, useState } from 'react';
import { WebSocketContext } from './WebSocketContext';
import * as Y from 'yjs';

interface ClusterState {
  type: string;
  data: any[];
  timestamp: number;
}

interface ClusterContextType {
  currentClusters: ClusterState | null;
  lastUpdate: number;
}

const ClusterContext = createContext<ClusterContextType>({
  currentClusters: null,
  lastUpdate: 0
});

export const ClusterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('ClusterProvider must be used within a WebSocketProvider');
  }
  const { ydoc } = context;
  
  const [currentClusters, setCurrentClusters] = useState<ClusterState | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  useEffect(() => {
    if (!ydoc) return;

    const clustersMap = ydoc.getMap('clusters');
    
    // Observe changes to clusters
    clustersMap.observe(event => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const clusterState = clustersMap.get(key) as ClusterState;
          setCurrentClusters(clusterState);
          setLastUpdate(Date.now());
        }
      });
    });
  }, [ydoc]);

  return (
    <ClusterContext.Provider value={{ currentClusters, lastUpdate }}>
      {children}
    </ClusterContext.Provider>
  );
};

export const useCluster = () => useContext(ClusterContext); 