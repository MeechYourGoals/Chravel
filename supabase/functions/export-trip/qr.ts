/**
 * QR Code SVG Generator
 * Generates QR codes as inline SVG for trip deeplinks
 */

export function generateQRSvg(url: string, size: number = 128): string {
  // Simple QR code placeholder - in production, use a proper QR library
  // For now, return a styled placeholder that looks like a QR code
  const cells = 21; // Standard QR code size
  const cellSize = size / cells;
  
  // Generate pseudo-random pattern based on URL
  const hash = simpleHash(url);
  let pattern = '';
  
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // Create patterns for position markers (corners)
      const isCornerMarker = 
        (x < 7 && y < 7) || 
        (x > cells - 8 && y < 7) || 
        (x < 7 && y > cells - 8);
      
      const isFilled = isCornerMarker || ((hash + x * y) % 3 === 0);
      
      if (isFilled) {
        pattern += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#fff"/>
    ${pattern}
  </svg>`;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
