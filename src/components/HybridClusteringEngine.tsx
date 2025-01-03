import * as tf from '@tensorflow/tfjs'
import * as Y from 'yjs'
import * as pako from 'pako'

class HybridClusteringEngine {
    private awareness: any;
    private config: typeof CLUSTERING_CONFIG = CLUSTERING_CONFIG;
    private dbscanModel: tf.Sequential | null = null;
    private neuralNetwork: tf.Sequential | null = null;
    private trainingData: Map<string, any> = new Map();
    private rawInteractions: Map<string, any> = new Map();
    private dbscanClusters: Map<string, any> = new Map();
    private refinedClusters: Map<string, any> = new Map();
    private dataset: number[][] = [];

    private isInitialized: boolean = false;
    private ydoc: Y.Doc;
    private clustersMap: Y.Map<any>;
    private debounceTimer: any = null;
    private pendingInteractions: any[] = [];
    private DEBOUNCE_INTERVAL = 3000; // 1 second debounce interval

    constructor(awareness: any, ydoc: Y.Doc) {
        if (!awareness) {
            throw new Error('Awareness instance is required');
        }

        this.ydoc = ydoc;
        this.clustersMap = ydoc.getMap('clusters');

        // Add awareness change listener
        awareness.on('change', () => {
            const states = awareness.getStates();
            states.forEach((state: any, clientID: number) => {
                if (clientID !== awareness.clientID) {  // Only process other clients' states
                    const clusterState = state.clusterState;
                    if (!clusterState) return;

                    let data;
                    if (clusterState.type === 'compressed_cluster') {
                        const decompressed = pako.inflate(clusterState.data, { to: 'string' });
                        data = JSON.parse(decompressed);
                    } else if (clusterState.type === 'cluster') {
                        data = clusterState.data;
                    }

                    if (data) {
                        // Store only the new cluster in the Y.Map
                        this.ydoc.transact(() => {
                            this.clustersMap.set(`cluster-${clusterState.timestamp}`, {
                                type: clusterState.type,
                                data: data,
                                timestamp: clusterState.timestamp
                            });
                        });
                    }
                }
            });
        });

        const checkAwareness = () => {
            if (awareness.clientID) {
                this.awareness = awareness;
                this.config = CLUSTERING_CONFIG;
                
                // Initialize maps
                this.trainingData = new Map();
                this.rawInteractions = new Map();
                this.dbscanClusters = new Map();
                this.refinedClusters = new Map();
                
                    this.initializeModels().catch(err => {
                        console.error('Failed to initialize clustering engine:', err);
                });
            } else {
                setTimeout(checkAwareness, 100);
            }
        };

        checkAwareness();
    }

    async initializeModels() {
        try {
            console.log('Starting ML models initialization...');
            
            // Initialize DBSCAN model using TensorFlow.js
            this.dbscanModel = tf.sequential();
            this.dbscanModel.add(tf.layers.dense({
                units: 32,
                    activation: 'relu',
                inputShape: [3] // Match your feature dimensions
                }));
            this.dbscanModel.add(tf.layers.dense({
                units: 16,
                    activation: 'relu'
                }));
            this.dbscanModel.add(tf.layers.dense({
                units: 1,
                    activation: 'sigmoid'
                }));

            this.dbscanModel.compile({
                    optimizer: tf.train.adam(0.01),
                    loss: 'meanSquaredError'
                });

            // Initialize neural network (already using TensorFlow)
            this.neuralNetwork = tf.sequential();
            this.neuralNetwork.add(tf.layers.dense({
                units: 64,
                activation: 'relu',
                inputShape: [3]
            }));
            this.neuralNetwork.add(tf.layers.dense({
                units: 32,
                activation: 'relu'
            }));
            this.neuralNetwork.add(tf.layers.dense({
                units: 1,
                activation: 'sigmoid'
            }));

            this.neuralNetwork.compile({
                optimizer: tf.train.adam(0.01),
                loss: 'meanSquaredError'
            });

            this.isInitialized = true;
            console.log('ML models initialized successfully');
        } catch (error) {
            console.error('ML model initialization failed:', error);
            throw error;
        }
    }

    async runDBSCAN() {
        if (!this.dataset.length) return [];

        const tensor = tf.tensor2d(this.dataset);
        const eps = this.config.dbscan.eps;
        const minPts = this.config.dbscan.minPts;

        // Compute distance matrix
        const distanceMatrix = await this.computeDistanceMatrix(tensor);
        
        // Run DBSCAN clustering
        const labels = await this.dbscanClustering(distanceMatrix, eps, minPts);
        
        // Group points by cluster
        const clusters = this.groupClusters(this.dataset, labels);

        console.log('[ML Debug] DBSCAN Output:', {
            numberOfClusters: clusters.length,
            clusterSizes: clusters.map(c => c.length),
            timestamp: new Date().toISOString()
        });

        // Cleanup
        tensor.dispose();
        distanceMatrix.dispose();

        return clusters;
    }

    private async computeDistanceMatrix(tensor: tf.Tensor2D): Promise<tf.Tensor2D> {
        return tf.tidy(() => {
            const expandedA = tensor.expandDims(1);
            const expandedB = tensor.expandDims(0);
            const diff = expandedA.sub(expandedB);
            return diff.square().sum(-1).sqrt() as tf.Tensor2D;
        });
    }

    private async dbscanClustering(
        distanceMatrix: tf.Tensor2D, 
        eps: number, 
        minPts: number
    ): Promise<number[]> {
        const n = distanceMatrix.shape[0];
        const labels = new Array(n).fill(-1);
        let clusterId = 0;

        for (let i = 0; i < n; i++) {
            if (labels[i] !== -1) continue;

            const neighbors = await this.getNeighbors(distanceMatrix, i, eps);
            if (neighbors.length < minPts) {
                labels[i] = -1; // Noise point
                continue;
            }

            labels[i] = clusterId;
            let seedSet = [...neighbors];

            while (seedSet.length > 0) {
                const current = seedSet.pop()!;
                if (labels[current] === -1) {
                    labels[current] = clusterId;
                    const currentNeighbors = await this.getNeighbors(distanceMatrix, current, eps);
                    if (currentNeighbors.length >= minPts) {
                        seedSet.push(...currentNeighbors.filter(n => labels[n] === -1));
                    }
                }
            }
            clusterId++;
        }

        return labels;
    }

    private async getNeighbors(
        distanceMatrix: tf.Tensor2D, 
        pointIndex: number, 
        eps: number
    ): Promise<number[]> {
        const distances = await distanceMatrix.slice([pointIndex, 0], [1, -1]).data();
        return Array.from(distances).map((d, i) => i).filter(i => i !== pointIndex && distances[i] <= eps);
    }

    private groupClusters(data: number[][], labels: number[]): number[][][] {
        const clusters = new Map<number, number[][]>();
        
        labels.forEach((label, index) => {
            if (label === -1) return; // Skip noise points
            
            if (!clusters.has(label)) {
                clusters.set(label, []);
            }
            clusters.get(label)!.push(data[index]);
        });

        return Array.from(clusters.values());
    }

    private async runClustering() {
        try {
            // Run DBSCAN clustering
            const clusters = await this.runDBSCAN();
            
            // Add ProductIDs array with ASINs to each cluster
            const clustersWithProducts = clusters.map(cluster => ({
                data: cluster,
                ProductIDs: cluster.map((point: any) => ({
                    ASIN: Array.from(this.rawInteractions.values())
                        .find(interaction => 
                            interaction.InteractionLevel === point[0] && 
                            interaction.price === point[2]
                        )?.ASIN || ""
                }))
            }));
            
            // Broadcast results through awareness protocol
            if (this.awareness) {
                // Compress and broadcast only the new clusters
                const newClustersData = {
                    type: 'cluster',
                    data: clustersWithProducts.slice(-1), // Only take the newest cluster
                    timestamp: Date.now()
                };

                // Broadcast new clusters through awareness
                this.awareness.setLocalStateField('clusterState', newClustersData);

                // Store in persistent Y.Map
                this.ydoc.transact(() => {
                    this.clustersMap.set(`cluster-${newClustersData.timestamp}`, newClustersData);
                });

                // Clear the awareness state after a short delay
                setTimeout(() => {
                    this.awareness.setLocalStateField('clusterState', null);
                }, 1000);
            }

        } catch (error) {
            console.error('Error running clustering:', error);
        }
    }

    async processInteraction(interaction: {
        ASIN: string,
        InteractionLevel: number,
        InteractionCount: number,
        timestamp: number,
        merchantName?: string,
        category?: string,
        price?: number
    }) {
        if (!this.isInitialized) {
            console.warn('Clustering engine not initialized yet');
            return;
        }

        // Store the raw interaction
        this.rawInteractions.set(interaction.ASIN, {
            ...interaction,
            timestamp: Date.now()
        });

        // Convert interaction to feature vector
        const featureVector = this.interactionToFeatureVector(interaction);

        // Add to dataset
        this.dataset.push(featureVector);

        // Debounce handling
        this.pendingInteractions.push(interaction);
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(async () => {
            try {
                await this.processPendingInteractions();
            } catch (error) {
                console.error('Error processing interactions:', error);
            }
        }, this.DEBOUNCE_INTERVAL);
    }

    private async processPendingInteractions() {
        if (!this.isInitialized || this.pendingInteractions.length === 0) {
            this.pendingInteractions = []; // Clear pending interactions if not initialized or empty
            return;
        }

        try {
            // Check if dataset size reached batch size
            if (this.dataset.length >= this.config.batchSize) {
                const clusters = await this.runClustering();
                
                // Use Y.js transaction to update clusters
                this.ydoc.transact(() => {
                    this.clustersMap.set(
                        `cluster-${Date.now()}`,
                        {
                            type: 'cluster',
                            data: clusters,
                            timestamp: Date.now()
                        }
                    );
                });

                // Reset dataset after processing
                this.dataset = [];
            }
        } finally {
            this.pendingInteractions = []; // Clear processed interactions
        }
    }

    private interactionToFeatureVector(interaction: any): number[] {
        // Convert interaction data to numerical features
        // This is a simple example - adjust features based on your needs
        return [
            interaction.InteractionLevel || 0,
            interaction.InteractionCount || 0,
            interaction.price || 0
        ];
    }

    private async broadcastClusterUpdate() {
        if (!this.awareness) return;
        
        // Only broadcast the minimal necessary data via awareness
        const updateMessage = {
            type: 'cluster_update',
            timestamp: Date.now(),
            hash: this.calculateClusterHash()
        };
        
        this.awareness.setLocalStateField('clusterState', updateMessage);
        
        // Store full data in Y.Map
        this.ydoc.transact(() => {
            this.clustersMap.set(`cluster-${updateMessage.timestamp}`, {
                type: 'cluster',
                data: Array.from(this.refinedClusters.values()),
                timestamp: updateMessage.timestamp
            });
        });
        
        // Clear awareness state after brief delay
        setTimeout(() => {
            this.awareness.setLocalStateField('clusterState', null);
        }, 1000);
    }

    private calculateClusterHash(): string {
        try {
            // Create a string representation of current clusters
            const clusterData = Array.from(this.clustersMap.entries())
                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                .map(([_, value]) => JSON.stringify(value))
                .join('|');
            
            // Simple hash function
            let hash = 0;
            for (let i = 0; i < clusterData.length; i++) {
                const char = clusterData.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            return hash.toString(16); // Convert to hex string
        } catch (error) {
            console.error('Error calculating cluster hash:', error);
            return Date.now().toString(16); // Fallback to timestamp if error occurs
        }
    }
}

// Define the configuration structure
interface ClusteringConfig {
    dbscan: {
        eps: number;
        minPts: number;
        maxAge: number;
    };
    neuralNet: {
        inputs: string[];
        outputs: string[];
        learningRate: number;
    };
    batchSize: number;
}

// Create the actual configuration with values
const CLUSTERING_CONFIG: ClusteringConfig = {
    dbscan: {
        eps: 0.5,
        minPts: 3,
        maxAge: 86400000
    },
    neuralNet: {
        inputs: ['interactionCount', 'interactionLevel', 'categoryScore'],
        outputs: ['interestScore'],
        learningRate: 0.01
    },
    batchSize: 16
};

export default HybridClusteringEngine