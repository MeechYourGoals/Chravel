export interface PercentCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CoverCropMathInput {
  crop: PercentCrop;
  naturalWidth: number;
  naturalHeight: number;
  scale: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * ReactCrop percent coordinates are computed in unscaled image space,
 * while the UI zoom uses CSS transform with transform-origin center.
 * We must account for this center-origin offset when converting to source pixels.
 */
export function toScaledSourceCropRect({
  crop,
  naturalWidth,
  naturalHeight,
  scale,
}: CoverCropMathInput): SourceCropRect {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  const pixelX = (crop.x / 100) * naturalWidth;
  const pixelY = (crop.y / 100) * naturalHeight;
  const pixelWidth = (crop.width / 100) * naturalWidth;
  const pixelHeight = (crop.height / 100) * naturalHeight;

  const centerOffsetX = ((safeScale - 1) * naturalWidth) / 2;
  const centerOffsetY = ((safeScale - 1) * naturalHeight) / 2;

  const sourceX = (pixelX + centerOffsetX) / safeScale;
  const sourceY = (pixelY + centerOffsetY) / safeScale;
  const sourceWidth = pixelWidth / safeScale;
  const sourceHeight = pixelHeight / safeScale;

  const clampedX = clamp(sourceX, 0, naturalWidth);
  const clampedY = clamp(sourceY, 0, naturalHeight);
  const clampedWidth = clamp(sourceWidth, 1, naturalWidth - clampedX);
  const clampedHeight = clamp(sourceHeight, 1, naturalHeight - clampedY);

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
  };
}
