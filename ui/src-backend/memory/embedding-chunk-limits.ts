import { estimateUtf8Bytes, splitTextToUtf8ByteLimit } from './embedding-input-limits';
import { resolveEmbeddingMaxInputTokens } from './embedding-model-limits';
import type { EmbeddingProvider } from './embeddings';
import { hashText, type MemoryChunk } from './internal';

export function enforceEmbeddingMaxInputTokens(
  provider: EmbeddingProvider,
  chunks: MemoryChunk[],
): MemoryChunk[] {
  const maxInputTokens = resolveEmbeddingMaxInputTokens(provider);
  const out: MemoryChunk[] = [];

  for (const chunk of chunks) {
    if (estimateUtf8Bytes(chunk.text) <= maxInputTokens) {
      out.push(chunk);
      continue;
    }

    for (const text of splitTextToUtf8ByteLimit(chunk.text, maxInputTokens)) {
      out.push({
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        text,
        hash: hashText(text),
      });
    }
  }

  return out;
}
