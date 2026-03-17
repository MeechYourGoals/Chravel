import type { CSSProperties } from 'react';

function asCssUrl(value: string): string {
  return `url("${value.replace(/"/g, '%22')}")`;
}

export function buildCoverBackgroundImage(
  primaryUrl?: string,
  fallbackUrl?: string,
): CSSProperties | undefined {
  const primary = primaryUrl?.trim();
  const fallback = fallbackUrl?.trim();

  if (!primary && !fallback) return undefined;
  if (!primary) return { backgroundImage: asCssUrl(fallback as string) };
  if (!fallback || primary === fallback) return { backgroundImage: asCssUrl(primary) };

  return {
    backgroundImage: `${asCssUrl(primary)}, ${asCssUrl(fallback)}`,
  };
}
