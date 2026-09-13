import { getEmbeddingDimensions } from '../embedding-service';
import { EMBEDDING_MODEL, LOCAL_EMBEDDING_MODEL } from '../model-registry';

/** Only attach to embeddings generated under the current provider configuration. */
export function embeddingSignature(): string {
  const model = process.env.RAG_PROVIDER === 'gemini'
    ? EMBEDDING_MODEL : LOCAL_EMBEDDING_MODEL;
  return `${model}:${getEmbeddingDimensions()}:v1`;
}
