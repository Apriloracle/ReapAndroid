import { useContext, createContext, useCallback } from 'react';
import type { Collection } from '../lib/y-stream/types';

interface RecommendationContext {
  shareInteraction: (interaction: {
    dealId: string;
    type: 'view' | 'click';
  }) => Promise<void>;
  getRecommendations: (userId: string, limit?: number) => Promise<any[]>;
}

const recommendationContext = createContext<RecommendationContext | null>(null);

export const useRecommendations = () => {
  const context = useContext(recommendationContext);
  if (!context) {
    throw new Error('useRecommendations must be used within a RecommendationProvider');
  }
  return context;
};

function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
  const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

  // Handle zero magnitudes to avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

function extractRecommendations(
  similarClusters: Array<any>,
  userInteractions: Set<string>
): any[] {
  // Collect all unique deals from similar clusters
  const recommendations = similarClusters
    .flatMap(cluster => cluster.interactions || [])
    // Filter out deals the user has already interacted with
    .filter(dealId => !userInteractions.has(dealId))
    // Remove duplicates
    .filter((dealId, index, self) => self.indexOf(dealId) === index);

  return recommendations;
}

export const createRecommendationHook = (clusterCollection: Collection) => {
  const getRecommendations = async (userId: string, limit = 10) => {
    try {
      const userCluster = await clusterCollection.get(userId);
      if (!userCluster) return [];

      // Get all clusters
      const allClusters = await clusterCollection.getAll();
      
      // Find similar clusters based on centroid similarity
      const similarClusters = Object.values(allClusters)
        .filter(cluster => cluster.userId !== userId)
        .map(cluster => ({
          ...cluster,
          similarity: calculateCosineSimilarity(
            userCluster.clusterMetadata.centroid,
            cluster.clusterMetadata.centroid
          )
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      // Extract recommendations from similar clusters
      return extractRecommendations(similarClusters, userCluster.interactions);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  };

  return { getRecommendations };
}; 
