import * as tf from '@tensorflow/tfjs';

export interface Cluster {
  data: number[][];
  ProductIDs: { ASIN: string }[];
}

export interface ProcessedCluster {
  clusterId: string;
  qualityScore: number;
  featureVector: number[];
  products: { ASIN: string }[];
}

export class NeuroNetworkPrep {
  private model: tf.LayersModel | null = null;
  private isProcessing: boolean = false;
  private readonly inputDimension: number;
  private featureScaler: {
    mean: number[];
    variance: number[];
  } | null = null;
  private isInitialized: boolean = false;
  private handleProcessedClusters: (clusters: ProcessedCluster[]) => void;

  constructor(inputDimension: number, handleProcessedClusters?: (clusters: ProcessedCluster[]) => void) {
    this.inputDimension = inputDimension;
    this.handleProcessedClusters = handleProcessedClusters || (() => {});
    this.init().catch(err => console.error('NeuroNetworkPrep initialization failed:', err));
  }

  public async init(): Promise<void> {
    try {
      console.group('🚀 NeuroNetworkPrep Initialization');
      console.log('Starting initialization...');
      
      // Try to load existing model
      this.model = await this.loadExistingModel();
      
      if (!this.model) {
        console.log('🆕 Creating new model...');
        this.model = await this.createNewModel();
      }

      // Initialize or load feature scaler
      this.featureScaler = await this.initializeFeatureScaler();
      console.log('📊 Feature scaler state:', this.featureScaler);
      
      this.isInitialized = true;
      console.log('✅ Initialization complete');
      console.groupEnd();
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  private async loadExistingModel(): Promise<tf.LayersModel | null> {
    try {
      console.group('🔄 Loading Existing Model');
      console.log('Attempting to load model from IndexedDB...');
      
      const model = await tf.loadLayersModel('indexeddb://cluster-quality-model');
      
      if (!model.optimizer) {
        console.log('📝 Compiling loaded model...');
        model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'binaryCrossentropy',
          metrics: ['accuracy']
        });
      }
      
      console.log('📊 Model layers:', model.layers.length);
      console.log('🔍 Model configuration:', model.toJSON());
      
      // Get and log model memory info
      const modelInfo = await tf.memory();
      console.log('💾 Model memory usage:', {
        numTensors: modelInfo.numTensors,
        numBytes: modelInfo.numBytes,
        unreliable: modelInfo.unreliable
      });
      
      console.log('✅ Model loaded successfully');
      console.groupEnd();
      
      return model;
     
    } catch (error) {
      console.group('❌ Model Loading Error');
      console.log('Error details:', error);
      console.log('ℹ️ No existing model found, will create new one');
      console.groupEnd();
      return null;
    }
  }

  private async createNewModel(): Promise<tf.LayersModel> {
    console.group('🆕 Creating New Model');
    console.log('Initializing model architecture...');
    
    const model = tf.sequential();
    
    console.log('Adding layers...');
    
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [this.inputDimension]
    }));
    console.log('✓ Added input layer');
    
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    console.log('✓ Added hidden layer');
    
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    console.log('✓ Added output layer');

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    console.log('✓ Model compiled');

    console.log('Saving model to IndexedDB...');
    await model.save('indexeddb://cluster-quality-model');
    console.log('✅ Model saved successfully');
    
    console.log('📊 Model summary:');
    model.summary();
    
    console.groupEnd();
    return model;
  }

  private async initializeFeatureScaler(): Promise<{ mean: number[]; variance: number[]; }> {
    try {
      const stored = localStorage.getItem('feature-scaler');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.log('No existing feature scaler found');
    }

    return {
      mean: new Array(this.inputDimension).fill(0),
      variance: new Array(this.inputDimension).fill(1)
    };
  }

  private scaleFeatures(features: number[][]): tf.Tensor2D {
    return tf.tidy(() => {
      // Create tensor with explicit shape specification
      const featureTensor = tf.tensor2d(features, [features.length, this.inputDimension]);
      
      if (!this.featureScaler) {
        // Calculate mean and variance if not already available
        const moments = tf.moments(featureTensor, 0);
        this.featureScaler = {
          mean: Array.from(moments.mean.dataSync()),
          variance: Array.from(moments.variance.dataSync())
        };
        this.saveScaler(this.featureScaler.mean, this.featureScaler.variance);
        moments.mean.dispose();
        moments.variance.dispose();
      }

      // Scale features
      const meanTensor = tf.tensor1d(this.featureScaler.mean);
      const stdTensor = tf.tensor1d(this.featureScaler.variance.map(v => Math.sqrt(v + 1e-8)));
      
      return featureTensor.sub(meanTensor).div(stdTensor);
    });
  }

  private calculateKNNDensity(clusterData: number[][], k: number = 3): number {
    let totalDistance = 0;
    
    for (const point of clusterData) {
      const neighbors = this.kNearestNeighbors(point, clusterData, k);
      const averageDistance = neighbors.reduce(
        (sum, neighbor) => sum + Math.sqrt(this.euclideanDistanceSquared(point, neighbor)), 
        0
      ) / k;
      totalDistance += averageDistance;
    }
    
    return 1 / (totalDistance / clusterData.length + 1e-10);
  }

  private kNearestNeighbors(point: number[], data: number[][], k: number): number[][] {
    const distances = data.map((neighbor, index) => ({
      index,
      distance: this.euclideanDistanceSquared(point, neighbor)
    }));

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(1, k + 1).map(neighbor => data[neighbor.index]);
  }

  private euclideanDistanceSquared(point1: number[], point2: number[]): number {
    return point1.reduce((sum, val, i) => 
      sum + Math.pow(val - point2[i], 2), 
      0
    );
  }

  public async trainOnData(trainingData: {
    clusters: Cluster[],
    labels: number[]
  }) {
    if (!this.model || this.isProcessing) {
      throw new Error('Neural network not ready for training');
    }

    this.isProcessing = true;

    try {
      // Extract features using improved density calculation
      const features = trainingData.clusters.map(cluster => [
        this.calculateAveragePosition(cluster),
        this.calculateKNNDensity(cluster.data),
        cluster.data.length / 100
      ]);

      // Scale features
      const scaledFeatures = this.scaleFeatures(features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      // Train with early stopping - Fixed callback implementation
      await this.model.fit(scaledFeatures, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: [
          {
            onEpochEnd: (epoch: number, logs?: tf.Logs) => {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
            }
          },
          tf.callbacks.earlyStopping({
            monitor: 'val_loss',
            patience: 5,
            minDelta: 1e-4
          })
        ]
      });

      // Save updated model
      await this.model.save('indexeddb://cluster-quality-model');

      scaledFeatures.dispose();
      ys.dispose();

    } catch (error) {
      console.error('Error during training:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  public async processClusters(clusters: Cluster[]): Promise<ProcessedCluster[]> {
    if (!this.model) {
        throw new Error('Neural network model not available');
    }

    // Validate input clusters
    if (!Array.isArray(clusters) || clusters.length === 0) {
        console.warn('Empty or invalid clusters array provided');
        return [];
    }

    // Validate each cluster
    const validClusters = clusters.filter(cluster => 
        cluster &&
        Array.isArray(cluster.data) && 
        cluster.data.length > 0 &&
        Array.isArray(cluster.ProductIDs) &&
        cluster.ProductIDs.length > 0
    );

    if (validClusters.length === 0) {
        console.warn('No valid clusters to process');
        return [];
    }

    return tf.tidy(() => {
        try {
            const features = validClusters.map(cluster => [
                this.calculateAveragePosition(cluster),
                this.calculateKNNDensity(cluster.data),
                cluster.data.length / 100
            ]);

            // Validate features array
            if (features.length === 0 || features.some(f => !Array.isArray(f) || f.length !== 3)) {
                console.warn('Invalid features generated');
                return [];
            }

            const scaledFeatures = this.scaleFeatures(features);
            const predictions = this.model!.predict(scaledFeatures) as tf.Tensor;

            const processedClusters = validClusters.map((cluster, index) => ({
                clusterId: `cluster_${index}`,
                qualityScore: predictions.dataSync()[index],
                featureVector: features[index],
                products: cluster.ProductIDs
            }));

            // Call the callback with processed clusters
            this.handleProcessedClusters(processedClusters);
            
            return processedClusters;
        } catch (error) {
            console.error('Error processing clusters:', error);
            return [];
        }
    });
  }

  private async saveScaler(mean: number[], variance: number[]) {
    localStorage.setItem('feature-scaler', JSON.stringify({ mean, variance }));
  }

  public isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }

  public async predict(input: number[]): Promise<tf.Tensor> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not initialized');
    }

    console.group('🔮 Making Prediction');
    console.log('Input data:', input);

    try {
      // Apply feature scaling if available
      let processedInput = input;
      if (this.featureScaler) {
        processedInput = input.map((value, index) => {
          const scaled = (value - this.featureScaler!.mean[index]) / 
            Math.sqrt(this.featureScaler!.variance[index]);
          console.log(`Scaling input ${index}: ${value} → ${scaled}`);
          return scaled;
        });
        console.log('Scaled input:', processedInput);
      }

      const inputTensor = tf.tensor2d([processedInput], [1, this.inputDimension]);
      console.log('Input tensor shape:', inputTensor.shape);

      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const predictionData = await prediction.data();
      console.log('📊 Prediction result:', Array.from(predictionData));

      inputTensor.dispose();
      console.log('✅ Prediction complete');
      console.groupEnd();
      return prediction;
    } catch (error) {
      console.error('❌ Prediction failed:', error);
      console.groupEnd();
      throw error;
    }
  }

  public async evaluateCluster(clusterMetrics: {
    density: number;
    separation: number;
    cohesion: number;
  }): Promise<number> {
    console.group('📊 Cluster Evaluation');
    console.log('Evaluating cluster with metrics:', clusterMetrics);

    try {
      const input = [
        clusterMetrics.density,
        clusterMetrics.separation,
        clusterMetrics.cohesion
      ];
      
      const prediction = await this.predict(input);
      const quality = (await prediction.data())[0];
      console.log('🎯 Cluster quality score:', quality);
      prediction.dispose();
      
      console.log('✅ Evaluation complete');
      console.groupEnd();
      return quality;
    } catch (error) {
      console.error('❌ Evaluation failed:', error);
      console.groupEnd();
      throw error;
    }
  }

  private calculateAveragePosition(cluster: Cluster) {
    if (cluster.data.length === 0) {
        return 0;
    }
    return cluster.data.reduce((sum, point) => sum + point[0], 0) / cluster.data.length;
  }
} 
