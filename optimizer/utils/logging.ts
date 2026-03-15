let verboseEnabled = false;

export function setVerbose(enabled: boolean): void {
  verboseEnabled = enabled;
}

export function isVerbose(): boolean {
  return verboseEnabled;
}

export function log(message: string): void {
  process.stdout.write(message + '\n');
}

export function info(message: string): void {
  log(`[info] ${message}`);
}

export function warn(message: string): void {
  log(`[warn] ${message}`);
}

export function error(message: string): void {
  process.stderr.write(`[error] ${message}\n`);
}

export function verbose(message: string): void {
  if (verboseEnabled) {
    log(`[verbose] ${message}`);
  }
}

export function success(message: string): void {
  log(`[ok] ${message}`);
}

export function heading(title: string): void {
  log('');
  log(`=== ${title} ===`);
  log('');
}

export function table(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) => {
    const maxRow = rows.reduce((max, row) => Math.max(max, (row[i] ?? '').length), 0);
    return Math.max(h.length, maxRow);
  });

  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  const separator = widths.map(w => '-'.repeat(w)).join('  ');

  log(headerLine);
  log(separator);
  for (const row of rows) {
    log(row.map((cell, i) => (cell ?? '').padEnd(widths[i])).join('  '));
  }
}
