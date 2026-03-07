import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function parseQuotedNames(source: string, pattern: RegExp): Set<string> {
  const names = new Set<string>();
  for (const match of source.matchAll(pattern)) {
    const name = match[1];
    if (name) names.add(name);
  }
  return names;
}

function extractBlock(source: string, startPattern: RegExp): string {
  const start = source.search(startPattern);
  if (start === -1) return '';

  const openBracket = source.indexOf('[', start);
  if (openBracket === -1) return '';

  let depth = 0;
  for (let i = openBracket; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(openBracket, i + 1);
    }
  }
  return '';
}

describe('AI concierge tool parity', () => {
  it('keeps voice declarations aligned with text declarations', () => {
    const textSource = readRepoFile('supabase/functions/lovable-concierge/index.ts');
    const voiceSource = readRepoFile('supabase/functions/gemini-voice-session/index.ts');

    const textDeclarationBlock = extractBlock(textSource, /const\s+functionDeclarations\s*=\s*\[/);
    const voiceDeclarationBlock = extractBlock(
      voiceSource,
      /const\s+VOICE_FUNCTION_DECLARATIONS\s*=\s*\[/,
    );

    const textTools = parseQuotedNames(textDeclarationBlock, /name:\s*'([^']+)'/g);
    const voiceTools = parseQuotedNames(voiceDeclarationBlock, /name:\s*'([^']+)'/g);

    expect(voiceTools).toEqual(textTools);
  });

  it('keeps shared executor coverage aligned with text declarations', () => {
    const textSource = readRepoFile('supabase/functions/lovable-concierge/index.ts');
    const executorSource = readRepoFile('supabase/functions/_shared/functionExecutor.ts');

    const textDeclarationBlock = extractBlock(textSource, /const\s+functionDeclarations\s*=\s*\[/);

    const textTools = parseQuotedNames(textDeclarationBlock, /name:\s*'([^']+)'/g);
    const executorTools = parseQuotedNames(executorSource, /case\s+'([^']+)'/g);

    expect(executorTools).toEqual(textTools);
  });
});
