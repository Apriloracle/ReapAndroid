import React, { useEffect, useState, useMemo } from "react";
import { createStore, Table } from "tinybase";
import { createLocalPersister } from "tinybase/persisters/persister-browser";
import { useNTC } from "../contexts/NTCContext";
import { Corpus } from "tiny-tfidf"; // Import Corpus

interface Deal {
  cashback: number;
  cashbackType: string;
  codes: string;
  countries: string;
  dealId: string;
  domains: string;
  endDate: string;
  logo: string;
  merchantName: string;
  startDate: string;
}

interface SimpleVectorizeProps {
  onVectorizedData: (vectors: number[][]) => void;
}

const SimpleVectorize: React.FC<SimpleVectorizeProps> = ({
  onVectorizedData,
}) => {
  const [vectorizedData, setVectorizedData] = useState<number[][]>([]);
  const { ntc } = useNTC();
  const [hasVectorized, setHasVectorized] = useState(false);

  // Initialize dealsStore using useMemo
  const dealsStore = useMemo(() => createStore(), []);
  const dealsPersister = useMemo(
    () => createLocalPersister(dealsStore, "kindred-deals"),
    [dealsStore],
  );

  useEffect(() => {
    let isMounted = true;

    const vectorizeDeals = async () => {
      if (!ntc || !ntc.isInitialized || !isMounted) {
        console.log(
          "NTC not initialized or component unmounted, skipping vectorization"
        );
        return;
      }
      console.log("NTC is initialized, proceeding with vectorization");

      // Load deals data from TinyBase
      try {
        await dealsPersister.load();
      } catch (error) {
        console.error("Error loading deals from persister:", error);
        return;
      }
      const dealsTable = dealsStore.getTable("deals") as Table;

      // 1. Prepare document names and texts for tiny-tfidf
      const documentNames = Object.keys(dealsTable); // Use row IDs as document names
      const documentTexts = Object.values(dealsTable).map((row) => {
        const deal = row as unknown as Deal;
        return `${deal.merchantName} ${deal.cashbackType} ${deal.cashback} ${deal.codes} ${deal.countries} ${deal.domains} ${deal.endDate} ${deal.startDate} ${deal.logo}`;
      });

      // 2. Create a Corpus instance
      const corpus = new Corpus(documentNames, documentTexts);

      // Filter the vocabulary based on term frequency
      const minFrequency = 1; // Example: Only include terms that appear in at least 2 documents
      const maxFrequency = 0.9 * documentNames.length; // Example: Exclude terms that appear in more than 80% of documents

      const filteredVocabulary = corpus.getTerms().filter((term: string) => {
        const freq = corpus.getCollectionFrequency(term as string);
        return freq >= minFrequency && freq <= maxFrequency;
      });

      // Create a term-to-index mapping from the filtered vocabulary
      const termToIndex: { [key: string]: number } = {};
      filteredVocabulary.forEach((term: string, index: number) => {
        termToIndex[term] = index;
      });

      // 3. Vectorize each deal using the filtered vocabulary
      const vectors = documentNames.map((name) => {
        const docVectorMap = corpus.getDocumentVector(name);
        const vector = new Array(filteredVocabulary.length).fill(0); // Fixed-size array based on filtered vocabulary

        docVectorMap.forEach((weight: number, term: string) => {
          const index = termToIndex[term as string];
          if (index !== undefined) {
            vector[index] = weight;
          }
        });

        return vector;
      });

      if (isMounted) {
        setVectorizedData(vectors);
        onVectorizedData(vectors);
        setHasVectorized(true);
      }
    };

    const listenerId = dealsStore.addTablesListener(() => {
      if (isMounted) {
        console.log("Deals store updated, resetting hasVectorized");
        setHasVectorized(false);
      }
    });

    if (!hasVectorized) {
      vectorizeDeals();
    }

    return () => {
      isMounted = false;
      dealsStore.delListener(listenerId);
    };
  }, [dealsPersister, ntc, onVectorizedData, hasVectorized]);

  return null; // Return null since we are not rendering anything
};

export default SimpleVectorize;