import type { ParsedArgs } from '../types/index.js';

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // skip node + script path
  const command = args[0] ?? 'help';
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg !== undefined && !nextArg.startsWith('--')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

export function getFlag(args: ParsedArgs, name: string, defaultValue: string): string {
  const val = args.flags[name];
  if (typeof val === 'string') return val;
  return defaultValue;
}

export function hasFlag(args: ParsedArgs, name: string): boolean {
  return name in args.flags;
}
