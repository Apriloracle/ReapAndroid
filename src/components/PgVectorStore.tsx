import React, { useState, useEffect, useMemo } from 'react';
import { createStore } from 'tinybase';
import { createPglitePersister, PglitePersister } from 'tinybase/persisters/persister-pglite';
import { PGlite } from '@electric-sql/pglite';

interface PgVectorStoreProps {
  vectors: number[][];
  dealsTable: any;
}

const PgVectorStore: React.FC<PgVectorStoreProps> = ({
  vectors,
  dealsTable,
}) => {
  const [pgliteInstance, setPgliteInstance] = useState<PGlite | null>(null);
  const [persister, setPersister] = useState<PglitePersister | null>(null);
  const store = useMemo(() => createStore(), []);

  useEffect(() => {
    const init = async () => {
      const pgliteInstance = await PGlite.create();
      await pgliteInstance.query('CREATE EXTENSION IF NOT EXISTS vector');
      await pgliteInstance.query(
        'CREATE TABLE IF NOT EXISTS vectors (id TEXT PRIMARY KEY, embedding vector(1536))'
      );
      await pgliteInstance.query(
        'CREATE TABLE IF NOT EXISTS deals (id TEXT PRIMARY KEY, content TEXT)'
      );
      setPgliteInstance(pgliteInstance);
      console.log('Pglite connected, pgvector enabled');

      // Correctly await the creation of the persister
      const newPersister = await createPglitePersister(store, pgliteInstance, {
        mode: 'tabular',
        tables: {
          save: { vectors: 'vectors', deals: 'deals' },
          load: { vectors: 'vectors', deals: 'deals' },
        },
      });

      // Load data after persister is created
      await newPersister.load();
      setPersister(newPersister);

      console.log(
        'Data loaded:',
        (await pgliteInstance?.query('SELECT * FROM vectors')).rows
      );
    };

    init();

    return () => {
      persister?.destroy();
      pgliteInstance?.close();
    };
  }, []);

  useEffect(() => {
    const saveVectors = async () => {
      if (persister && vectors.length > 0 && dealsTable && pgliteInstance) { // Add check for pgliteInstance
        console.log('Saving vectors and deals to PGlite');

        // Insert vectors directly
        for (let i = 0; i < vectors.length; i++) {
          const vector = vectors[i];
          await pgliteInstance.query( // No need for optional chaining here
            `INSERT INTO vectors (id, embedding) VALUES ($1, $2)`,
            [i.toString(), `[${vector.join(',')}]`]
          );
        }

        // Assuming dealsTable is an object
        for (const id in dealsTable) {
          if (dealsTable.hasOwnProperty(id)) {
            await pgliteInstance.query( // No need for optional chaining here
              `INSERT INTO deals (id, content) VALUES ($1, $2)`,
              [id, JSON.stringify(dealsTable[id])]
            );
          }
        }

        console.log(
          'Vectors and deals saved:',
          (await pgliteInstance.query('SELECT * FROM vectors')).rows // No need for optional chaining here
        );

        // Save the store data
        await persister.save();
        console.log('Store data saved to PGlite');
      }
    };

    saveVectors();
  }, [persister, vectors, dealsTable, pgliteInstance]);

  return null;
};

export default PgVectorStore;