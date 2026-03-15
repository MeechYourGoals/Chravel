import * as crypto from 'node:crypto';

export function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

export function shortHash(content: string): string {
  return sha256(content).slice(0, 12);
}

export function idFromPath(relativePath: string): string {
  return shortHash(relativePath);
}
