export interface DiffLine {
  type: 'same' | 'add' | 'remove';
  lineNumber: number;
  content: string;
}

export function generateDiff(original: string, modified: string): string {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');

  const hunks: string[] = [];
  hunks.push('--- original');
  hunks.push('+++ modified');

  const maxLen = Math.max(origLines.length, modLines.length);
  let contextStart = -1;
  const pending: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const origLine = i < origLines.length ? origLines[i] : undefined;
    const modLine = i < modLines.length ? modLines[i] : undefined;

    if (origLine === modLine) {
      if (pending.length > 0) {
        pending.push(` ${origLine ?? ''}`);
      }
    } else {
      if (pending.length === 0) {
        contextStart = Math.max(0, i - 2);
        for (let c = contextStart; c < i; c++) {
          if (c < origLines.length) {
            pending.push(` ${origLines[c]}`);
          }
        }
        pending.push(`@@ -${contextStart + 1} +${contextStart + 1} @@`);
      }
      if (origLine !== undefined && modLine !== undefined) {
        pending.push(`-${origLine}`);
        pending.push(`+${modLine}`);
      } else if (origLine !== undefined) {
        pending.push(`-${origLine}`);
      } else if (modLine !== undefined) {
        pending.push(`+${modLine}`);
      }
    }
  }

  if (pending.length > 0) {
    hunks.push(...pending);
  }

  return hunks.join('\n');
}

export function countChanges(
  original: string,
  modified: string,
): { additions: number; deletions: number; modifications: number } {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');

  let additions = 0;
  let deletions = 0;
  let modifications = 0;
  const maxLen = Math.max(origLines.length, modLines.length);

  for (let i = 0; i < maxLen; i++) {
    const origLine = i < origLines.length ? origLines[i] : undefined;
    const modLine = i < modLines.length ? modLines[i] : undefined;

    if (origLine === modLine) continue;
    if (origLine !== undefined && modLine !== undefined) modifications++;
    else if (origLine === undefined) additions++;
    else deletions++;
  }

  return { additions, deletions, modifications };
}
