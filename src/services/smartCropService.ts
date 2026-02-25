/**
 * Smart Crop Service
 * Handles orientation detection and optimal crop calculation for cover photos
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CropSettings {
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  scale: number;
}

export type ImageOrientation = 'landscape' | 'portrait' | 'square';

export const smartCropService = {
  /**
   * Detect image orientation from dimensions
   */
  detectOrientation(width: number, height: number): ImageOrientation {
    const ratio = width / height;
    if (ratio > 1.1) return 'landscape';
    if (ratio < 0.9) return 'portrait';
    return 'square';
  },

  /**
   * Calculate optimal initial crop based on image orientation
   * and target display aspect ratio (e.g., 3:1 for desktop banner)
   */
  calculateSmartCrop(imageWidth: number, imageHeight: number, targetAspect: number): CropSettings {
    const imageAspect = imageWidth / imageHeight;
    const orientation = this.detectOrientation(imageWidth, imageHeight);

    // Landscape photo into landscape banner: fit entire width
    if (orientation === 'landscape') {
      // Calculate how much height we need at full width
      const neededHeight = imageWidth / targetAspect;

      if (neededHeight <= imageHeight) {
        // Image is taller than needed - center vertically, use full width
        const cropHeightPercent = (neededHeight / imageHeight) * 100;
        const yOffset = (100 - cropHeightPercent) / 2;
        return { x: 0, y: yOffset, width: 100, height: cropHeightPercent, scale: 1 };
      } else {
        // Image is shorter than needed - use full height, center horizontally
        const cropWidthPercent = ((imageHeight * targetAspect) / imageWidth) * 100;
        const xOffset = (100 - cropWidthPercent) / 2;
        return { x: xOffset, y: 0, width: cropWidthPercent, height: 100, scale: 1 };
      }
    }

    // Portrait photo into landscape banner: center vertically, show maximum
    if (orientation === 'portrait') {
      // Use full width of portrait, calculate centered vertical slice
      const neededHeight = imageWidth / targetAspect;
      const cropHeightPercent = Math.min((neededHeight / imageHeight) * 100, 100);
      const yOffset = (100 - cropHeightPercent) / 2; // Center vertically
      return { x: 0, y: yOffset, width: 100, height: cropHeightPercent, scale: 1 };
    }

    // Square: center crop
    const cropHeightPercent = Math.min((imageWidth / targetAspect / imageHeight) * 100, 100);
    const yOffset = (100 - cropHeightPercent) / 2;
    return { x: 0, y: yOffset, width: 100, height: cropHeightPercent, scale: 1 };
  },

  /**
   * Check if the image aspect ratio differs significantly from target
   * Used to determine if "Adjust Position" should be shown
   */
  needsAdjustment(imageWidth: number, imageHeight: number, targetAspect: number): boolean {
    const imageAspect = imageWidth / imageHeight;
    // Show adjust option if aspect ratio differs by more than 20%
    return Math.abs(imageAspect - targetAspect) / targetAspect > 0.2;
  },

  /**
   * Calculate zoom bounds based on image vs target aspect
   */
  calculateZoomBounds(
    imageWidth: number,
    imageHeight: number,
    targetAspect: number,
  ): { min: number; max: number; default: number } {
    // Min zoom: 1 (no additional zoom beyond fit)
    // Max zoom: 3x or until quality degrades
    // Default: 1x (natural size)
    return { min: 1, max: 3, default: 1 };
  },
};
