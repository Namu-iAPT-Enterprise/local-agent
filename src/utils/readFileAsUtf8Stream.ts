/**
 * Decode a {@link File} / {@link Blob} as UTF-8 using the Streams API: bytes are read in chunks
 * from the blob’s default stream and decoded incrementally ({@link TextDecoderStream}).
 * Prefer this over {@link Blob#text} when you want explicit stream semantics (Electron + large files).
 */
export async function readFileAsUtf8Stream(blob: Blob): Promise<string> {
  if (typeof blob.stream !== 'function') {
    return blob.text();
  }
  const stream = blob.stream().pipeThrough(new TextDecoderStream('utf-8', { fatal: false }));
  const reader = stream.getReader();
  let out = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value !== undefined) out += value;
    }
  } finally {
    reader.releaseLock();
  }
  return out;
}
