// Import math.js
// if available otherwise include from cdn
import * as math from 'mathjs';

// --- Contextual Bandit Code ---

class ContextualEpsilonGreedy {
  numActions: number;
  epsilon: number;
  decayRate: number;
  learningRate: number;
  counts: number[];
  values: { [key: string]: number[] };

  constructor(numActions: number, epsilon: number, decayRate: number, learningRate: number) {
    this.numActions = numActions;
    this.epsilon = epsilon;
    this.decayRate = decayRate || 0.99;
    this.learningRate = learningRate || 0.1;
    this.counts = Array(numActions).fill(0);
    this.values = {}; // Context -> Action Values
  }

  select(context: number[]): number {
    const contextStr = this.getContextKey(context);

    if (!this.values[contextStr]) {
      this.values[contextStr] = Array(this.numActions).fill(0);
    }

    if (Math.random() < this.epsilon) {
      // Explore
      const action = Math.floor(Math.random() * this.numActions);
      this.counts[action]++;
      this.epsilon *= this.decayRate;
      return action;
    } else {
      // Exploit
      let bestAction = 0;
      let bestValue = this.values[contextStr][bestAction];
      for (let i = 1; i < this.numActions; i++) {
        if (this.values[contextStr][i] > bestValue) {
          bestAction = i;
          bestValue = this.values[contextStr][i];
        }
      }

      //check for actions with same values and randomize if they are the same.

      let sameQValueActions = [];
      for (let i = 0; i < this.numActions; i++) {
        if (this.values[contextStr][i] === this.values[contextStr][bestAction]) {
          sameQValueActions.push(i);
        }
      }

      if (sameQValueActions.length > 0) {
        //choose random action from the highest value actions.
        bestAction = sameQValueActions[Math.floor(Math.random() * sameQValueActions.length)];
      }

      this.counts[bestAction]++;
      return bestAction;
    }
  }

  update(context: number[], action: number, reward: number) {
    const contextStr = this.getContextKey(context);
    const n = this.counts[action];
    const oldValue = this.values[contextStr][action];
    const newValue = oldValue + this.learningRate * (reward - oldValue);
    this.values[contextStr][action] = newValue;
  }

  getContextKey(context: number[]): string {
    // Assuming context is an array [esnState, ntcState]
    const [esnState, ntcState] = context;

    // Process ESN state:
    // Assuming first portion of ESN neurons are excitatory (tanh), the rest are inhibitory (ReLU)
    const reservoirSize = 100;
    const eRatioESN = 0.8;
    const esnSummary = (Array.isArray(esnState) ? esnState : [0, 0]) as number[];


    // Process NTC state similarly
    const ntcSize = 50;
    const eRatioNTC = 0.8;
    const ntcSummary = (Array.isArray(ntcState) ? ntcState : [0, 0]) as number[];


    // Combine summaries into a context key
    const contextKey = [...esnSummary, ...ntcSummary]
      .map((val) => val.toFixed(3))
      .join(",");
    return contextKey;
  }
}

export default ContextualEpsilonGreedy;

