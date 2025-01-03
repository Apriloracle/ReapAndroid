import React, { useState, useEffect } from 'react';
import NTC from './NTC';
import ESN from './ESN';
import { createStore, Store } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';
import { Persister } from 'tinybase/persisters';
import { NTCProvider } from '../contexts/NTCContext';
import SimpleVectorize from './SimpleVectorize';

interface BrainInitializerProps {
  children: React.ReactNode;
}

interface BrainState {
  ntc: {
    state: any; // Replace with a more specific type if possible
    weights: any;
    inputWeights: any;
    timeScales: any;
  };
  esn: {
    reservoirState: any;
    reservoirWeights: any;
    inputWeights: any;
  };
}

const BrainInitializer: React.FC<BrainInitializerProps> = ({ children }) => {
  const [ntc, setNtc] = useState<NTC | null>(null);
  const [esn, setEsn] = useState<ESN | null>(null);
  const [vectorInput, setVectorInput] = useState<number[][] | null>(null);

  const store = createStore();
  const persister = createLocalPersister(store, 'brain_state');

  useEffect(() => {
    const initialize = async () => {
      try {
        await persister.load();
        const persistedState = store.getRow('brain_state', 'row1') as any as BrainState | undefined;
        console.log('persistedState after load:', persistedState);

        let newNtc: NTC;
        let newEsn: ESN;

        const ntcStateChangeCallback = async () => {
          console.log('ntcStateChangeCallback called');
          if (ntc && esn) {
            const ntcState = ntc.getState();
            console.log('NTC State:', ntcState);
            // Log the state being passed to ESN
            console.log('Passing state to ESN:', ntcState);
            // Pass NTC state to ESN input function
            esn.input(ntcState);
            await updateTinybaseState();
          }
        };

        const esnStateChangeCallback = () => {
          console.log('esnStateChangeCallback called');
          updateTinybaseState();
        };

        if (persistedState?.ntc && persistedState?.esn) {
          newNtc = new NTC(100, 0.3, 0.8, ntcStateChangeCallback);
          newNtc.state = persistedState.ntc.state;
          newNtc.weights = persistedState.ntc.weights;
          newNtc.inputWeights = persistedState.ntc.inputWeights;
          newNtc.timeScales = persistedState.ntc.timeScales;

          newEsn = new ESN(esnStateChangeCallback, 100, 100, 0.8, 0.3, 0.3, 0.8);
          newEsn.reservoirState = persistedState.esn.reservoirState;
          newEsn.reservoirWeights = persistedState.esn.reservoirWeights;
          newEsn.inputWeights = persistedState.esn.inputWeights;
        } else {
          newNtc = new NTC(100, 0.3, 0.8, ntcStateChangeCallback);
          newEsn = new ESN(esnStateChangeCallback, 100, 100, 0.8, 0.3, 0.3, 0.8);

          store.setRow('brain_state', 'row1', {
            'ntc.state': newNtc.state,
            'ntc.weights': newNtc.weights,
            'ntc.inputWeights': newNtc.inputWeights,
            'ntc.timeScales': newNtc.timeScales,
            'esn.reservoirState': newEsn.reservoirState,
            'esn.reservoirWeights': newEsn.reservoirWeights,
            'esn.inputWeights': newEsn.inputWeights,
          });
          await persister.save();
        }

        setNtc(newNtc);
        setEsn(newEsn);
      } catch (error) {
        console.error('Error loading or saving state:', error);
      }
    };

    initialize();
  }, []);

  const updateTinybaseState = async () => {
    if (ntc && esn) {
      console.log('updateTinybaseState called');
      try {
        store.setRow('brain_state', 'row1', {
          'ntc.state': ntc.state,
          'ntc.weights': ntc.weights,
          'ntc.inputWeights': ntc.inputWeights,
          'ntc.timeScales': ntc.timeScales,
          'esn.reservoirState': esn.reservoirState,
          'esn.reservoirWeights': esn.reservoirWeights,
          'esn.inputWeights': esn.inputWeights,
        });
        await persister.save();
      } catch (error) {
        console.error('Error saving state:', error);
      }
    }
  };

  const handleVectorizedData = (vectors: number[][]) => {
    console.log('Received vectorized data in BrainInitializer:', vectors);
    setVectorInput(vectors);
  };

  useEffect(() => {
    if (ntc && vectorInput) {
      console.log('Updating NTC with vector input:', vectorInput);
      // Assuming you want to use the first vector as input for now
      if (vectorInput.length > 0) {
        ntc.update(vectorInput[0]);
      }
    }
  }, [ntc, vectorInput]);


  if (!ntc || !esn) {
    return <div>Initializing...</div>;
  }

  return (
    <NTCProvider value={{ ntc }}>
      <SimpleVectorize onVectorizedData={handleVectorizedData} />
      {children}
    </NTCProvider>
  );
};

export default BrainInitializer;
