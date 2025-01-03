// Import math.js
// if available otherwise include from cdn
import * as math from 'mathjs';

// --- ESN Code ---
class ESN {
  reservoirSize: number;
  inputSize: number;
  spectralRadius: number;
  sparsity: number;
  leakRate: number;
  eRatioESN: number;
  reservoirWeights: any;
  inputWeights: any;
  reservoirState: any;
  onStateChange: () => void;
  isInitialized: boolean;

  constructor(onStateChange: () => void, reservoirSize: number = 100, inputSize: number = 100, spectralRadius: number = 0.8, sparsity: number = 0.3, leakRate: number = 0.3, eRatioESN: number = 0.8) {
    this.reservoirSize = reservoirSize;
    this.inputSize = inputSize;
    this.spectralRadius = spectralRadius;
    this.sparsity = sparsity;
    this.leakRate = leakRate;
    this.eRatioESN = eRatioESN;
    this.reservoirWeights = this.initializeReservoirWeights();
    this.inputWeights = this.initializeInputWeights();
    this.reservoirState = math.zeros([this.reservoirSize]);
    this.onStateChange = onStateChange;
    this.isInitialized = false; // Initialize the flag to false
    console.log('ESN constructor called, initial reservoirState:', this.reservoirState, 'initial reservoirWeights:', this.reservoirWeights, 'initial inputWeights:', this.inputWeights);
    this.isInitialized = true; // Set the flag to true after initialization
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  initializeReservoirWeights() {
    const reservoirWeights = math.sparse();
    for (let i = 0; i < this.reservoirSize; i++) {
      for (let j = 0; j < this.reservoirSize; j++) {
        if (Math.random() < this.sparsity) {
          if (Math.random() < this.eRatioESN) {
            reservoirWeights.set([i, j], Math.random()); // Excitatory
          } else {
            reservoirWeights.set([i, j], -Math.random()); // Inhibitory
          }
        }
      }
    }

    // Scale reservoir weights to achieve desired spectral radius
    // let eigenvalues = math.eigs(reservoirWeights).values;
    // let maxEigenvalue = math.max(math.abs(eigenvalues)) as number;
    // return math.multiply(
    //   reservoirWeights,
    //   this.spectralRadius / maxEigenvalue
    // );
    return math.multiply(reservoirWeights, 0.1);
  }

  initializeInputWeights() {
    return math.random([this.reservoirSize, this.inputSize], -1, 1);
  }

  activate(inputVector: number[]): number[] {
    // Update the reservoir state
    const nextReservoirState = math.add(
      math.multiply(math.transpose(this.inputWeights), inputVector),
      math.multiply(this.reservoirWeights, this.reservoirState)
    );

    // Apply activation function (tanh) element-wise and leak rate
    const activatedState = math.map(nextReservoirState.valueOf() as number[], (value: number, index: number) => {
      const activation = math.tanh(value);
      return (1 - this.leakRate) * (this.reservoirState.valueOf() as number[])[index] + this.leakRate * activation;
    });

    this.reservoirState = math.matrix(activatedState);
    console.log('ESN activate called, state:', this.reservoirState);
    this.onStateChange();
    return this.reservoirState.toArray() as number[];
  }

  // Add input method to handle NTC output
  input(inputVector: number[]): void {
    console.log('ESN received input from BrainInitializer via NTC');
    console.log('ESN received input from NTC:', inputVector);
    this.activate(inputVector);
  }
}

export default ESN;
