declare module 'ml5' {
    interface NeuralNetworkOptions {
        inputs: string[];
        outputs: string[];
        task: 'regression' | 'classification';
        debug?: boolean;
        learningRate?: number;
    }

    interface NeuralNetwork {
        addData(inputs: any, outputs: any): Promise<void>;
        train(options?: any): Promise<void>;
        predict(inputs: any): Promise<any>;
        model: {
            getWeights(): number[][];
            setWeights(weights: number[][]): void;
        };
    }
} 