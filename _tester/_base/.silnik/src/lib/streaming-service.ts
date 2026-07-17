// Streaming Service - Handles real-time streaming responses
interface StreamingConfig {
  chunkSize: number;
  delayBetweenChunks: number;
  maxStreamTime: number;
}

interface StreamChunk {
  id: string;
  type: 'text' | 'image' | 'voice' | 'error' | 'complete';
  data: any;
  timestamp: number;
  isPartial: boolean;
}

class StreamingService {
  private activeStreams = new Map<string, ReadableStreamDefaultController<any>>();
  private config: StreamingConfig = {
    chunkSize: 50, // characters per chunk
    delayBetweenChunks: 50, // milliseconds
    maxStreamTime: 30000 // 30 seconds max stream
  };

  // Create a streaming response for text
  createTextStream(text: string, streamId: string): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        this.activeStreams.set(streamId, controller);
        this.streamText(text, controller, streamId);
      },
      cancel: () => {
        this.activeStreams.delete(streamId);
      }
    });
  }

  // Stream text character by character
  private async streamText(
    text: string, 
    controller: ReadableStreamDefaultController<any>,
    streamId: string
  ): Promise<void> {
    const chunks = this.splitTextIntoChunks(text);
    
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (!this.activeStreams.has(streamId)) {
          break; // Stream was cancelled
        }

        const chunk: StreamChunk = {
          id: `${streamId}-${i}`,
          type: 'text',
          data: chunks[i],
          timestamp: Date.now(),
          isPartial: i < chunks.length - 1
        };

        const encoder = new TextEncoder();
        const data = encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
        controller.enqueue(data);

        // Add delay between chunks for smooth streaming effect
        if (i < chunks.length - 1) {
          await this.delay(this.config.delayBetweenChunks);
        }
      }

      // Send completion signal
      const completeChunk: StreamChunk = {
        id: `${streamId}-complete`,
        type: 'complete',
        data: { totalChunks: chunks.length },
        timestamp: Date.now(),
        isPartial: false
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(`data: ${JSON.stringify(completeChunk)}\n\n`);
      controller.enqueue(data);
      
      controller.close();
    } catch (error) {
      const errorChunk: StreamChunk = {
        id: `${streamId}-error`,
        type: 'error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now(),
        isPartial: false
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`);
      controller.enqueue(data);
      controller.close();
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  // Split text into streaming chunks
  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split by sentences first, then by chunk size
    const sentences = text.split(/([.!?]+\s*)/);
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= this.config.chunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          // Sentence is longer than chunk size, split it
          const words = sentence.split(' ');
          for (const word of words) {
            if (currentChunk.length + word.length + 1 <= this.config.chunkSize) {
              currentChunk += (currentChunk ? ' ' : '') + word;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = word;
              } else {
                // Word is longer than chunk size, force split
                chunks.push(word);
              }
            }
          }
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  // Create streaming endpoint for chat
  // Accepts either string (prompt) or array of parts (with file handles)
  async createChatStream(
    promptOrParts: string | any[], 
    model: any,
    streamId: string
  ): Promise<ReadableStream<Uint8Array>> {
    return new ReadableStream({
      async start(controller) {
        try {
          // Start streaming response from Gemini
          const result = await model.generateContentStream(promptOrParts);
          
          let accumulatedText = '';
          
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            accumulatedText += chunkText;
            
            const streamChunk: StreamChunk = {
              id: `${streamId}-${Date.now()}`,
              type: 'text',
              data: chunkText,
              timestamp: Date.now(),
              isPartial: true
            };

            const encoder = new TextEncoder();
            const data = encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`);
            controller.enqueue(data);
          }

          // Send completion
          const completeChunk: StreamChunk = {
            id: `${streamId}-complete`,
            type: 'complete',
            data: { fullText: accumulatedText },
            timestamp: Date.now(),
            isPartial: false
          };

          const encoder = new TextEncoder();
          const data = encoder.encode(`data: ${JSON.stringify(completeChunk)}\n\n`);
          controller.enqueue(data);
          controller.close();
          
        } catch (error) {
          const errorChunk: StreamChunk = {
            id: `${streamId}-error`,
            type: 'error',
            data: { error: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: Date.now(),
            isPartial: false
          };

          const encoder = new TextEncoder();
          const data = encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`);
          controller.enqueue(data);
          controller.close();
        }
      }
    });
  }

  // Cancel active stream
  cancelStream(streamId: string): boolean {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      try {
        controller.close();
      } catch (error) {
        // Controller might already be closed
      }
      this.activeStreams.delete(streamId);
      return true;
    }
    return false;
  }

  // Get active streams count
  getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  // Update configuration
  updateConfig(newConfig: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
export type { StreamingConfig, StreamChunk };
