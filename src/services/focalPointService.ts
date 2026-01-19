/**
 * Focal Point Detection Service
 * 
 * Detects faces or salient points in images for smart cropping.
 * Uses browser's native FaceDetector API with canvas-based fallback.
 */

export interface FocalPoint {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  confidence: 'face' | 'saliency' | 'center';
}

interface DetectionResult {
  focalPoint: FocalPoint;
  faceCount: number;
}

/**
 * Check if FaceDetector API is available (Chrome/Edge)
 */
function isFaceDetectorAvailable(): boolean {
  return typeof window !== 'undefined' && 'FaceDetector' in window;
}

/**
 * Detect faces using browser's FaceDetector API
 */
async function detectFacesNative(image: HTMLImageElement): Promise<FocalPoint | null> {
  if (!isFaceDetectorAvailable()) return null;

  try {
    // @ts-expect-error FaceDetector is experimental and not in TS types
    const faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    const faces = await faceDetector.detect(image);

    if (faces.length === 0) return null;

    // Calculate center of all detected faces
    let totalX = 0;
    let totalY = 0;

    for (const face of faces) {
      const { x, y, width, height } = face.boundingBox;
      totalX += x + width / 2;
      totalY += y + height / 2;
    }

    return {
      x: (totalX / faces.length) / image.naturalWidth,
      y: (totalY / faces.length) / image.naturalHeight,
      confidence: 'face',
    };
  } catch (error) {
    console.warn('[FocalPoint] FaceDetector failed:', error);
    return null;
  }
}

/**
 * Canvas-based saliency detection fallback
 * Analyzes image for high-contrast, bright regions
 */
function detectSaliencyCanvas(image: HTMLImageElement): FocalPoint {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return { x: 0.5, y: 0.33, confidence: 'center' };
  }

  // Use smaller size for performance
  const maxSize = 200;
  const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight);
  canvas.width = Math.floor(image.naturalWidth * scale);
  canvas.height = Math.floor(image.naturalHeight * scale);

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate weighted centroid based on brightness and edge intensity
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      
      // Calculate brightness
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;

      // Calculate local contrast (simple edge detection)
      const leftIdx = (y * canvas.width + (x - 1)) * 4;
      const rightIdx = (y * canvas.width + (x + 1)) * 4;
      const topIdx = ((y - 1) * canvas.width + x) * 4;
      const bottomIdx = ((y + 1) * canvas.width + x) * 4;

      const leftBrightness = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
      const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
      const topBrightness = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
      const bottomBrightness = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;

      const contrast = Math.abs(leftBrightness - rightBrightness) + Math.abs(topBrightness - bottomBrightness);

      // Combine brightness and contrast for saliency weight
      // Bias slightly toward upper third (rule of thirds)
      const verticalBias = 1 - (y / canvas.height) * 0.3;
      const weight = (brightness * 0.3 + contrast * 0.7) * verticalBias;

      totalWeight += weight;
      weightedX += x * weight;
      weightedY += y * weight;
    }
  }

  if (totalWeight === 0) {
    return { x: 0.5, y: 0.33, confidence: 'center' };
  }

  return {
    x: (weightedX / totalWeight) / canvas.width,
    y: (weightedY / totalWeight) / canvas.height,
    confidence: 'saliency',
  };
}

/**
 * Main focal point detection function
 * Tries face detection first, falls back to saliency analysis
 */
export async function detectFocalPoint(image: HTMLImageElement): Promise<DetectionResult> {
  // Try native face detection first
  const faceResult = await detectFacesNative(image);
  
  if (faceResult) {
    // @ts-expect-error FaceDetector is experimental
    const faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    const faces = await faceDetector.detect(image);
    
    return {
      focalPoint: faceResult,
      faceCount: faces.length,
    };
  }

  // Fall back to saliency detection
  const saliencyResult = detectSaliencyCanvas(image);
  
  return {
    focalPoint: saliencyResult,
    faceCount: 0,
  };
}

/**
 * Convert focal point to crop position
 * Returns crop coordinates that center the focal point
 */
export function focalPointToCrop(
  focalPoint: FocalPoint,
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number
): { x: number; y: number; width: number; height: number } {
  // Calculate crop dimensions based on aspect ratio
  let cropWidth: number;
  let cropHeight: number;

  if (imageWidth / imageHeight > aspectRatio) {
    // Image is wider than target aspect ratio
    cropHeight = imageHeight;
    cropWidth = cropHeight * aspectRatio;
  } else {
    // Image is taller than target aspect ratio
    cropWidth = imageWidth;
    cropHeight = cropWidth / aspectRatio;
  }

  // Center crop on focal point
  const focalX = focalPoint.x * imageWidth;
  const focalY = focalPoint.y * imageHeight;

  let cropX = focalX - cropWidth / 2;
  let cropY = focalY - cropHeight / 2;

  // Clamp to image bounds
  cropX = Math.max(0, Math.min(imageWidth - cropWidth, cropX));
  cropY = Math.max(0, Math.min(imageHeight - cropHeight, cropY));

  // Convert to percentages
  return {
    x: (cropX / imageWidth) * 100,
    y: (cropY / imageHeight) * 100,
    width: (cropWidth / imageWidth) * 100,
    height: (cropHeight / imageHeight) * 100,
  };
}
