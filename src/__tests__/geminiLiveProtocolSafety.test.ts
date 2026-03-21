import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Gemini Live protocol safety invariants', () => {
  const liveHook = readRepoFile('src/hooks/useGeminiLive.ts');

  it('does not apply SILENT scheduling globally to all tool responses', () => {
    // The default toolResponse.send path must NOT include SILENT —
    // only the conditional branch for privacy-sensitive tools should.
    const lines = liveHook.split('\n');
    const toolResponseSendLines = lines.filter(
      l => l.includes('toolResponse') && l.includes('JSON.stringify'),
    );
    // No line should hardcode SILENT directly in a JSON.stringify call
    for (const line of toolResponseSendLines) {
      expect(line).not.toContain("scheduling: 'SILENT'");
    }
  });

  it('applies SILENT scheduling selectively for searchTripArtifacts', () => {
    // SILENT_TOOLS set must exist and contain searchTripArtifacts
    expect(liveHook).toContain('SILENT_TOOLS');
    expect(liveHook).toContain("'searchTripArtifacts'");
    // The conditional SILENT scheduling must be gated on SILENT_TOOLS
    expect(liveHook).toContain('SILENT_TOOLS.has(');
    expect(liveHook).toContain("scheduling = 'SILENT'");
  });

  it('includes sessionResumption only when a token exists', () => {
    const sessionFn = readRepoFile('supabase/functions/gemini-voice-session/index.ts');
    expect(sessionFn).toContain('if (resumptionToken) {');
    expect(sessionFn).not.toContain('setupConfig.sessionResumption = {};');
  });

  it('handles setup timeout regardless of WebSocket readyState', () => {
    // The setup timeout must NOT be gated on ws.readyState === WebSocket.OPEN
    // to ensure it fires even when the WS never connects.
    expect(liveHook).not.toMatch(
      /setupTimeoutId\s*=\s*setTimeout\(\s*\(\)\s*=>\s*\{\s*\n?\s*if\s*\(\s*ws\.readyState\s*===\s*WebSocket\.OPEN\s*\)/,
    );
  });
});
