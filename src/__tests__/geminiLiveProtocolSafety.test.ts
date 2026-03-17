import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Gemini Live protocol safety invariants', () => {
  it('does not send global SILENT scheduling in toolResponse frames', () => {
    const liveHook = readRepoFile('src/hooks/useGeminiLive.ts');
    // It should selectively allow SILENT for specific tools, not globally.
    // The codebase uses selective ternary logic `silentTools.has(r.name) ? { scheduling: 'SILENT' } : {}`
    expect(liveHook).toContain("silentTools.has(r.name) ? { scheduling: 'SILENT' } : {}");
  });

  it('includes sessionResumption only when a token exists', () => {
    const sessionFn = readRepoFile('supabase/functions/gemini-voice-session/index.ts');
    expect(sessionFn).toContain('if (resumptionToken) {');
    expect(sessionFn).not.toContain('setupConfig.sessionResumption = {};');
  });
});
