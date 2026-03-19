/**
 * Shared SSRF-safe external URL checks that do not depend on zod or remote imports.
 * Keep this module runtime-agnostic so Vitest can import it directly.
 */

/**
 * Validates that a URL is HTTPS and external (not internal/private network).
 */
export function validateExternalHttpsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    if (urlObj.protocol !== 'https:') {
      return false;
    }

    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      return false;
    }

    const ipPatterns = [
      /^0\./,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
      /^::ffff:(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/i,
    ];

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) {
      for (const pattern of ipPatterns) {
        if (pattern.test(hostname)) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Async SSRF protection with DNS pre-resolution.
 * Fails closed on lookup failures or private resolved addresses.
 */
export async function validateExternalUrlBeforeFetch(url: string): Promise<boolean> {
  if (!validateExternalHttpsUrl(url)) return false;

  try {
    const hostname = new URL(url).hostname;

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) return true;

    const [ipv4Addrs, ipv6Addrs] = await Promise.all([
      // @ts-ignore Deno.resolveDns is only available in edge runtime
      Deno.resolveDns(hostname, 'A').catch(() => [] as string[]),
      // @ts-ignore Deno.resolveDns is only available in edge runtime
      Deno.resolveDns(hostname, 'AAAA').catch(() => [] as string[]),
    ]);

    const allAddrs = [...ipv4Addrs, ...ipv6Addrs];
    if (allAddrs.length === 0) {
      return false;
    }

    for (const ip of allAddrs) {
      if (!validateExternalHttpsUrl(`https://${ip.includes(':') ? `[${ip}]` : ip}/`)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
