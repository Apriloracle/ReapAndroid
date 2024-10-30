import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSubdocumentGUID } from '../utils/subdocumentUtils';

interface SubdocumentContextType {
  subdocumentGUID: string | null;
  setSubdocumentGUID: (guid: string) => void;
}

const SubdocumentContext = createContext<SubdocumentContextType | undefined>(undefined);

export const SubdocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subdocumentGUID, setSubdocumentGUID] = useState<string | null>(null);

  useEffect(() => {
    const storedGUID = getSubdocumentGUID();
    if (storedGUID) {
      setSubdocumentGUID(storedGUID);
    }
  }, []);

  return (
    <SubdocumentContext.Provider value={{ subdocumentGUID, setSubdocumentGUID }}>
      {children}
    </SubdocumentContext.Provider>
  );
};

export const useSubdocument = () => {
  const context = useContext(SubdocumentContext);
  if (context === undefined) {
    throw new Error('useSubdocument must be used within a SubdocumentProvider');
  }
  return context;
};
