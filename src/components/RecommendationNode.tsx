import { Doc } from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class RecommendationNode {
  private doc: Doc;
  private provider: WebsocketProvider;

  constructor(doc: Doc, provider: WebsocketProvider) {
    this.doc = doc;
    this.provider = provider;
  }

  broadcastInteraction(dealId: string, interactionLevel: number) {
    try {
      const awareness = this.provider.awareness;
      if (!awareness) {
        console.error('Awareness not available');
        return;
      }

      const interaction = {
        dealId,
        interactionLevel,
        timestamp: Date.now()
      };

      // Broadcast the interaction through awareness
      const currentState = awareness.getLocalState() || {};
      awareness.setLocalState({
        ...currentState,
        lastInteraction: interaction
      });

    } catch (error) {
      console.error('Error broadcasting interaction:', error);
    }
  }

  // Add any other methods you need for recommendation functionality
}

export default RecommendationNode;
