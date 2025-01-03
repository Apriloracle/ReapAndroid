// Import math.js
// if available otherwise include from cdn
import * as math from 'mathjs';

// --- NTC Code ---

class NTC {
  size: number;
  connectivity: number;
  eRatio: number;
  weights: any;
  state: any;
  damping: number;
  inputWeights: any;
  timeScales: any;
  onStateChange: () => void;
  isInitialized: boolean;
  previousInput: number[] | null = null;

  constructor(size: number, connectivity: number, eRatioNTC: number, onStateChange: () => void) {
    this.size = size;
    this.connectivity = connectivity;
    this.eRatio = eRatioNTC; // Set the E/I ratio for the network
    this.weights = this.initializeWeights();
    this.state = this.initializeState();
    this.damping = 0.1;
    this.inputWeights = this.initializeInputWeights();
    this.timeScales = this.initializeTimeScales(); // Initialize time scales
    this.onStateChange = () => {
      console.log('onStateChange callback called');
      onStateChange();
    };
    this.isInitialized = true; // Set initialization flag to true
    console.log('NTC constructor called, initial state:', this.state, 'initial weights:', this.weights, 'initial inputWeights:', this.inputWeights, 'initial timeScales:', this.timeScales);
    console.log('NTC isInitialized:', this.isInitialized); // Log the isInitialized flag
  }

  initializeWeights() {
    const weights = math.sparse();
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (Math.random() < this.connectivity) {
          if (Math.random() < this.eRatio) {
            weights.set([i, j], Math.random()); // Excitatory weights between 0 and 1
          } else {
            weights.set([i, j], -Math.random()); // Inhibitory weights between -1 and 0
          }
        }
      }
    }
    return weights;
  }

  initializeInputWeights() {
    // Initialize input weights randomly using math.js
    return math.random([this.size], -1, 1); // A 1D array (vector) of random values
  }

  initializeState() {
    // Initialize the state randomly using math.js
    return math.random([this.size], -1, 1); // A 1D array (vector) of random values
  }

  initializeTimeScales() {
    // Initialize time scales randomly using math.js
    return math.random([this.size], 0.05, 0.5); // Example range
  }

  update(input: number[]) {
    if (this.previousInput && math.equal(this.previousInput, input)) {
      console.log('NTC update skipped: input is the same as the previous input');
      return;
    }

    console.log('NTC update triggered with input:', input);
    console.log('NTC received vector:', input); // Added log here
    // const weightedInput = math.multiply(this.weights, this.state) as any;
    // const externalInput = math.multiply(this.inputWeights, input) as any;
    let activation = math.add(0, 0) as any;

    this.previousInput = input;


    // Ensure activation is a MathCollection
    if (typeof activation === 'number') {
      activation = math.matrix([activation]);
    }

    // Apply activation function (mix of tanh and ReLU) to create activatedState
    const activatedState = math.map(activation, (value, index) => {
      const neuronIndex = typeof index === 'number' ? index : index[0];
      if (neuronIndex < this.size * this.eRatio) {
        return math.tanh(value); // Excitatory neurons use tanh
      } else {
        return Math.max(0, value); // Inhibitory neurons use ReLU
      }
    });

    // Apply individual time scales for each neuron
    const timeScaledState = math.dotMultiply(this.timeScales, activatedState);

    const newState = math.add(
      timeScaledState,
      math.multiply(1 - this.damping, this.state)
    );

    this.state = newState;
    console.log('NTC update called, state:', this.state);
    this.onStateChange();
  }

  getState(): number[] {
    // Return the current state (as a dense array for easier use with the bandit)
    return math.matrix(this.state).toArray() as number[];
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

export default NTC;
