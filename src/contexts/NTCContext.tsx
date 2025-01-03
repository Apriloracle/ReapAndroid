import React, { createContext, useContext } from 'react';
import NTC from '../components/NTC';

interface NTCContextType {
  ntc: NTC | null;
}

const NTCContext = createContext<NTCContextType>({ ntc: null });

export const NTCProvider = NTCContext.Provider;

export const useNTC = () => {
  return useContext(NTCContext);
};
