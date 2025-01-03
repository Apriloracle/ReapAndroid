import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import { useSubdocument } from '../contexts/SubdocumentContext';
import { getSubdocumentGUID } from '../utils/subdocumentUtils';
import { createStore } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';
import { IndexeddbPersistence } from 'y-indexeddb';
import { connectWebSocket, WEBSOCKET_URLS } from '../utils/websocketUtils';

interface UserNetProps {
  onConnectionStatus?: (status: boolean) => void;
}

const UserNet: React.FC<UserNetProps> = ({ onConnectionStatus }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [peerDID, setPeerDID] = useState<string | null>(null);
  const macroDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const userDocRef = useRef<Y.Doc | null>(null);
  const { subdocumentGUID } = useSubdocument();
  const [indexeddbProvider, setIndexeddbProvider] = useState<IndexeddbPersistence | null>(null);
  const [isWebSocketReady, setIsWebSocketReady] = useState<boolean>(false);

  const setupUserDataListener = (userDoc: Y.Doc) => {
    const userDataMap = userDoc.getMap('userData');
    
    userDataMap.observe(async (event) => {
      if (event.keysChanged.has('peerDID')) {
        const newPeerDID = userDataMap.get('peerDID') as string;
        if (newPeerDID) {
          const peerDIDStore = createStore();
          const peerDIDPersister = createLocalPersister(peerDIDStore, 'peer-did');
          
          await peerDIDPersister.load();
          peerDIDStore.setTable('peerDID', { 'current': { did: newPeerDID } });
          await peerDIDPersister.save();
          
          setPeerDID(newPeerDID);
          console.log('Updated Peer:DID in store:', newPeerDID);

          // Emit custom event when peer:DID is received from WebSocket
          window.dispatchEvent(new CustomEvent('peerDIDReceived', { detail: newPeerDID }));
        }
      }
    });
  };

  const checkAndAddUserData = async (userDoc: Y.Doc) => {
    const userDataMap = userDoc.getMap('userData');
    const existingPeerDID = userDataMap.get('peerDID') as string | undefined;

    if (existingPeerDID) {
      console.log('Received Peer:DID from WebSocket:', existingPeerDID);
      
      // Create store and persister for peer:DID
      const peerDIDStore = createStore();
      const peerDIDPersister = createLocalPersister(peerDIDStore, 'peer-did');
      
      // Load any existing data
      await peerDIDPersister.load();
      
      // Store the received peer:DID
      peerDIDStore.setTable('peerDID', { 'current': { did: existingPeerDID } });
      
      // Save to persistent storage
      await peerDIDPersister.save();
      
      setPeerDID(existingPeerDID);
    } else {
      await addUserDataToSubdocument(userDoc);
    }
  };

  const addUserDataToSubdocument = async (userDoc: Y.Doc) => {
    const userDataMap = userDoc.getMap('userData');

    // Get the peer:did from TinyBase store
    const peerDIDStore = createStore();
    const peerDIDPersister = createLocalPersister(peerDIDStore, 'peer-did');
    await peerDIDPersister.load();
    const peerDID = peerDIDStore.getCell('peerDID', 'current', 'did') as string | null;

    if (peerDID) {
      userDataMap.set('peerDID', peerDID);
      setPeerDID(peerDID);
      console.log('New Peer:DID added to user subdocument:', peerDID);
    } else {
      console.log('No Peer:DID found in TinyBase store');
    }

    // Add more user-specific data here as needed
    // For example:
    // userDataMap.set('username', username);
    // userDataMap.set('email', email);
  };

  const createOrGetUserSubDocument = useCallback((guid: string) => {
    if (!macroDocRef.current) return;

    const userMap = macroDocRef.current.getMap('users');
    let userDoc = userMap.get(guid) as Y.Doc | undefined;

    if (!userDoc) {
      userDoc = new Y.Doc();
      userMap.set(guid, userDoc);
    }

    userDocRef.current = userDoc;
    setupUserDataListener(userDoc);

    const roomName = guid.slice(-7);

    if (!providerRef.current) {
      providerRef.current = connectWebSocket(
        providerRef.current,
        userDoc,
        roomName,
        (connected: boolean) => {
          setIsConnected(connected);
          setIsWebSocketReady(connected);
          if (onConnectionStatus) {
            onConnectionStatus(connected);
          }
        }
      );
      awarenessRef.current = providerRef.current.awareness;
    }

    const subdocIndexeddbProvider = new IndexeddbPersistence(`user-subdoc-${guid}`, userDoc);
    subdocIndexeddbProvider.on('synced', () => {
      console.log(`User subdocument ${guid} content loaded from IndexedDB`);
    });

    if (awarenessRef.current) {
      awarenessRef.current.setLocalState({
        // You can add user-specific awareness state here
        // For example: user: { name: username, status: 'online' }
      });
    }

    checkAndAddUserData(userDoc);
  }, [onConnectionStatus]);

  useEffect(() => {
    const initializeUserNet = async () => {
      const guid = subdocumentGUID || getSubdocumentGUID();
      if (!guid) {
        console.error('No subdocument GUID available');
        return;
      }

      if (!macroDocRef.current) {
        macroDocRef.current = new Y.Doc();
      }

      if (!indexeddbProvider) {
        const newIndexeddbProvider = new IndexeddbPersistence('user-macro-doc', macroDocRef.current);
        setIndexeddbProvider(newIndexeddbProvider);

        newIndexeddbProvider.on('synced', () => {
          console.log('Macro document content loaded from IndexedDB');
        });
      }

      createOrGetUserSubDocument(guid);
    };

    initializeUserNet();

    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (macroDocRef.current) {
        macroDocRef.current.destroy();
        macroDocRef.current = null;
      }
      if (userDocRef.current) {
        userDocRef.current.destroy();
        userDocRef.current = null;
      }
      if (indexeddbProvider) {
        indexeddbProvider.destroy();
      }
    };
  }, [subdocumentGUID, onConnectionStatus, createOrGetUserSubDocument]);

  const updateUserData = (key: string, value: any) => {
    if (userDocRef.current) {
      const userDataMap = userDocRef.current.getMap('userData');
      userDataMap.set(key, value);
    }
  };

  const getUserData = (key: string): any => {
    if (userDocRef.current) {
      const userDataMap = userDocRef.current.getMap('userData');
      return userDataMap.get(key);
    }
    return null;
  };

  return (
    <div>
    </div>
  );
};

export default UserNet;
