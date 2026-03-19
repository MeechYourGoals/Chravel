import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaTile } from '../MediaTile';

vi.mock('@/hooks/useResolvedTripMediaUrl', () => ({
  useResolvedTripMediaUrl: () => 'https://signed.example.com/media.jpg',
}));

describe('MediaTile signed URL rendering', () => {
  it('uses resolved signed URL for image previews', () => {
    render(
      <MediaTile
        id="media-1"
        url="https://public.example.com/media.jpg"
        mimeType="image/jpeg"
        fileName="photo.jpg"
        onDelete={() => {}}
      />,
    );

    const image = screen.getByAltText('photo.jpg');
    expect(image).toHaveAttribute('src', 'https://signed.example.com/media.jpg');
  });

  it('uses resolved signed URL for file links', () => {
    render(
      <MediaTile
        id="media-2"
        url="https://public.example.com/file.pdf"
        mimeType="application/pdf"
        fileName="file.pdf"
        onDelete={() => {}}
      />,
    );

    const openLink = screen.getByRole('link', { name: 'Open' });
    expect(openLink).toHaveAttribute('href', 'https://signed.example.com/media.jpg');
  });
});
