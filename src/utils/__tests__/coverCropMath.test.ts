import { describe, expect, it } from 'vitest';
import { toScaledSourceCropRect } from '../coverCropMath';

describe('toScaledSourceCropRect', () => {
  it('matches basic percent crop when scale is 1', () => {
    const result = toScaledSourceCropRect({
      crop: { x: 10, y: 20, width: 30, height: 40 },
      naturalWidth: 1000,
      naturalHeight: 500,
      scale: 1,
    });

    expect(result).toEqual({
      x: 100,
      y: 100,
      width: 300,
      height: 200,
    });
  });

  it('applies center-origin zoom offset when scale is greater than 1', () => {
    const result = toScaledSourceCropRect({
      crop: { x: 10, y: 20, width: 30, height: 40 },
      naturalWidth: 1000,
      naturalHeight: 500,
      scale: 2,
    });

    expect(result).toEqual({
      x: 300,
      y: 175,
      width: 150,
      height: 100,
    });
  });

  it('falls back to scale 1 for invalid scale values', () => {
    const result = toScaledSourceCropRect({
      crop: { x: 25, y: 25, width: 50, height: 50 },
      naturalWidth: 800,
      naturalHeight: 400,
      scale: 0,
    });

    expect(result).toEqual({
      x: 200,
      y: 100,
      width: 400,
      height: 200,
    });
  });
});
