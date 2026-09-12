export interface BoundedDiff {
  readonly text: string;
  readonly truncated: boolean;
  readonly originalBytes: number;
  readonly includedBytes: number;
}

/**
 * Keeps a large pull request diff from blowing the token budget. Truncation cuts at the last
 * line boundary at or before maxBytes and appends a marker naming both byte counts, so a partial
 * review is never read as a complete one.
 */
export function boundDiff(diff: string, maxBytes = 96_000): BoundedDiff {
  const originalBytes = Buffer.byteLength(diff, "utf8");
  if (originalBytes <= maxBytes) {
    return { text: diff, truncated: false, originalBytes, includedBytes: originalBytes };
  }

  const truncatedBuffer = Buffer.from(diff, "utf8").subarray(0, maxBytes);
  let cutIndex = truncatedBuffer.lastIndexOf(0x0a); // '\n'
  if (cutIndex < 0) {
    cutIndex = 0;
  }
  const includedText = truncatedBuffer.subarray(0, cutIndex).toString("utf8");
  const includedBytes = Buffer.byteLength(includedText, "utf8");
  const marker = `\n[truncated: showing ${includedBytes} of ${originalBytes} bytes]\n`;

  return {
    text: includedText + marker,
    truncated: true,
    originalBytes,
    includedBytes,
  };
}
