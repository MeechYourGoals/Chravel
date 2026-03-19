import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaTile } from '../MediaTile';

const mockUseResolvedTripMediaUrl = vi.fn();

vi.mock('@/hooks/useResolvedTripMediaUrl', () => ({
  useResolvedTripMediaUrl: (...args: unknown[]) => mockUseResolvedTripMediaUrl(...args),
}));

describe('MediaTile signed URL resolution', () => {
  beforeEach(() => {
    mockUseResolvedTripMediaUrl.mockReset();
  });

  it('uses resolved signed URL for image previews', () => {
    const rawStorageUrl =
      'https://supabase.example/storage/v1/object/public/trip-media/trip/photo.jpg';
    const signedUrl =
      'https://supabase.example/storage/v1/object/sign/trip-media/trip/photo.jpg?token=signed';

    mockUseResolvedTripMediaUrl.mockReturnValue(signedUrl);

    render(
      <MediaTile
        id="media-1"
        url={rawStorageUrl}
        mimeType="image/jpeg"
        fileName="photo.jpg"
        metadata={{ upload_path: 'trip/photo.jpg' }}
        onDelete={vi.fn()}
      />,
    );

    expect(mockUseResolvedTripMediaUrl).toHaveBeenCalledWith({
      url: rawStorageUrl,
      metadata: { upload_path: 'trip/photo.jpg' },
    });
    expect(screen.getByAltText('photo.jpg')).toHaveAttribute('src', signedUrl);
  });
});
