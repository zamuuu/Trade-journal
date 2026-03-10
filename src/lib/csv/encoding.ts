/**
 * Detect file encoding and decode to UTF-8 string.
 * Supports UTF-16 LE (common in Windows/Sterling exports) and UTF-8.
 */
export function decodeFileContent(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // Check for UTF-16 LE BOM: 0xFF 0xFE
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const decoder = new TextDecoder("utf-16le");
    return decoder.decode(buffer);
  }

  // Check for UTF-16 BE BOM: 0xFE 0xFF
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const decoder = new TextDecoder("utf-16be");
    return decoder.decode(buffer);
  }

  // Check for UTF-16 LE without BOM by looking for null bytes pattern
  // In UTF-16 LE, ASCII chars are followed by 0x00
  if (bytes.length >= 4 && bytes[1] === 0x00 && bytes[3] === 0x00) {
    const decoder = new TextDecoder("utf-16le");
    return decoder.decode(buffer);
  }

  // Default to UTF-8
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}
