import { describe, expect, it } from 'vitest';
import { buildCoverBackgroundImage } from '../coverImageStyle';

describe('buildCoverBackgroundImage', () => {
  it('returns undefined when both urls are missing', () => {
    expect(buildCoverBackgroundImage(undefined, undefined)).toBeUndefined();
  });

  it('returns primary url when only primary exists', () => {
    expect(buildCoverBackgroundImage('https://a.example/one.jpg')).toEqual({
      backgroundImage: 'url("https://a.example/one.jpg")',
    });
  });

  it('returns fallback url when primary is missing', () => {
    expect(buildCoverBackgroundImage(undefined, 'https://b.example/two.jpg')).toEqual({
      backgroundImage: 'url("https://b.example/two.jpg")',
    });
  });

  it('returns layered urls when both primary and fallback exist', () => {
    expect(
      buildCoverBackgroundImage('https://a.example/one.jpg', 'https://b.example/two.jpg'),
    ).toEqual({
      backgroundImage: 'url("https://a.example/one.jpg"), url("https://b.example/two.jpg")',
    });
  });
});
