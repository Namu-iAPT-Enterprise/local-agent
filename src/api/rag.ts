import { fetchWithAuth } from './auth';
import { RAG_INGEST_STREAM_URL } from '../config/apiBase';

/**
 * Stream-upload a text file as UTF-8 (avoids loading the whole file into a JSON body).
 * Uses Fetch upload streaming (`duplex: 'half'`); metadata matches `/rag/ingest` JSON bodies.
 */
export function ingestTextStream(
  file: File,
  metadata: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  return fetchWithAuth(RAG_INGEST_STREAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Ingest-Metadata': JSON.stringify(metadata),
    },
    body: file.stream(),
    duplex: 'half',
    signal,
  } as RequestInit & { duplex?: 'half' });
}
