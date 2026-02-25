import { useState } from 'react';
import html2canvas from 'html2canvas';

export const useTripPoster = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePoster = async (): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const posterElement = document.getElementById('trip-poster');
      if (!posterElement) {
        throw new Error('Poster element not found');
      }

      const canvas = await html2canvas(posterElement, {
        width: 1080,
        height: 1350,
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setPosterUrl(dataUrl);
      return dataUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate poster';
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPoster = (tripTitle: string) => {
    if (!posterUrl) return;

    const link = document.createElement('a');
    link.download = `${tripTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_trip_poster.png`;
    link.href = posterUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sharePoster = async (tripTitle: string) => {
    if (!posterUrl) return;

    if (navigator.share && navigator.canShare) {
      try {
        // Convert data URL to blob for sharing
        const response = await fetch(posterUrl);
        const blob = await response.blob();
        const file = new File([blob], `${tripTitle}_trip_poster.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${tripTitle} - Trip Details`,
            text: `Check out this amazing trip: ${tripTitle}`,
            files: [file],
          });
        } else {
          // Fallback to text sharing
          await navigator.share({
            title: `${tripTitle} - Trip Details`,
            text: `Check out this amazing trip: ${tripTitle}`,
            url: window.location.href,
          });
        }
      } catch (err) {
        // If native sharing fails, fall back to download
        downloadPoster(tripTitle);
      }
    } else {
      // Fallback for browsers without Web Share API
      downloadPoster(tripTitle);
    }
  };

  const resetPoster = () => {
    setPosterUrl(null);
    setError(null);
  };

  return {
    isGenerating,
    posterUrl,
    error,
    generatePoster,
    downloadPoster,
    sharePoster,
    resetPoster,
  };
};
