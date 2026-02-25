export const getOptimizedImageUrl = (url: string, width: number, quality: number = 80): string => {
  // For Unsplash images, use their optimization API
  if (url.includes('unsplash.com')) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('w', String(width));
      urlObj.searchParams.set('q', String(quality));
      urlObj.searchParams.set('fm', 'webp');
      urlObj.searchParams.set('auto', 'format');
      return urlObj.toString();
    } catch {
      // Fallback for invalid URLs
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}w=${width}&q=${quality}&fm=webp&auto=format`;
    }
  }

  // For other images, return as-is (would integrate with image CDN in production)
  return url;
};

export const generateBlurDataUrl = (width: number = 10, height: number = 10): string => {
  // Generate a tiny base64 placeholder for blur effect
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, width, height);
  }

  return canvas.toDataURL();
};

export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

export const getResponsiveSizes = () => ({
  thumbnail: 300,
  small: 640,
  medium: 1024,
  large: 1920,
});
