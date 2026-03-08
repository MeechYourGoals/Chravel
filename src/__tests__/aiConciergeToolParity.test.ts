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

/**
 * Extract individual tool declaration blocks from a declaration array string.
 * Returns a map of toolName -> raw block text for each `{ name: '...', ... }` entry.
 */
function extractToolBlocks(declarationBlock: string): Map<string, string> {
  const tools = new Map<string, string>();
  // Match each top-level object in the array by finding `name: 'toolName'`
  // then capturing the balanced braces around it.
  const namePattern = /name:\s*'([^']+)'/g;
  let nameMatch: RegExpExecArray | null;

  while ((nameMatch = namePattern.exec(declarationBlock)) !== null) {
    const toolName = nameMatch[1];
    // Walk backwards to find the opening `{` for this tool object
    let openBrace = nameMatch.index;
    while (openBrace > 0 && declarationBlock[openBrace] !== '{') {
      openBrace--;
    }
    // Walk forward with brace balancing to find the closing `}`
    let depth = 0;
    let end = openBrace;
    for (let i = openBrace; i < declarationBlock.length; i++) {
      if (declarationBlock[i] === '{') depth++;
      if (declarationBlock[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    tools.set(toolName, declarationBlock.slice(openBrace, end + 1));
  }

  return tools;
}

interface ToolSchema {
  params: string[];
  required: string[];
}

/**
 * Parse a single tool block to extract parameter property names and required fields.
 * Looks for the `properties: { ... }` block and `required: [...]` array within
 * the top-level parameters object (not nested items).
 */
function parseToolSchema(toolBlock: string): ToolSchema {
  // Find the top-level `parameters:` section
  const paramsIdx = toolBlock.indexOf('parameters:');
  if (paramsIdx === -1) return { params: [], required: [] };

  // Find the `properties:` block inside parameters
  const propsIdx = toolBlock.indexOf('properties:', paramsIdx);
  if (propsIdx === -1) return { params: [], required: [] };

  // Find the opening `{` after `properties:`
  const propsOpen = toolBlock.indexOf('{', propsIdx + 'properties:'.length);
  if (propsOpen === -1) return { params: [], required: [] };

  // Balance braces to find closing `}` of properties
  let depth = 0;
  let propsEnd = propsOpen;
  for (let i = propsOpen; i < toolBlock.length; i++) {
    if (toolBlock[i] === '{') depth++;
    if (toolBlock[i] === '}') {
      depth--;
      if (depth === 0) {
        propsEnd = i;
        break;
      }
    }
  }

  const propsBlock = toolBlock.slice(propsOpen, propsEnd + 1);

  // Extract top-level property names: keys followed by `:` at depth 1
  // We re-scan at depth=1 inside the properties block
  const paramNames: string[] = [];
  depth = 0;
  let i = 0;
  while (i < propsBlock.length) {
    const ch = propsBlock[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;

    // At depth 1, look for `identifier:` or `'identifier':` patterns
    if (depth === 1) {
      // Match word characters followed by optional whitespace and `:`
      const remaining = propsBlock.slice(i);
      const keyMatch = remaining.match(/^(\w+)\s*:/);
      if (keyMatch) {
        paramNames.push(keyMatch[1]);
        i += keyMatch[0].length;
        continue;
      }
    }
    i++;
  }

  // Extract required array from the parameters section (not from nested items)
  // Find `required:` at the same nesting level as `properties:`
  const requiredFields: string[] = [];
  // Search for `required:` after the parameters opening but within the parameters block
  const parametersOpen = toolBlock.indexOf('{', paramsIdx + 'parameters:'.length);
  if (parametersOpen !== -1) {
    // Find the closing brace for the parameters object
    depth = 0;
    let parametersEnd = parametersOpen;
    for (let j = parametersOpen; j < toolBlock.length; j++) {
      if (toolBlock[j] === '{') depth++;
      if (toolBlock[j] === '}') {
        depth--;
        if (depth === 0) {
          parametersEnd = j;
          break;
        }
      }
    }
    const parametersBlock = toolBlock.slice(parametersOpen, parametersEnd + 1);

    // Find top-level `required:` inside the parameters block (depth 1)
    // We need to find `required: [...]` at the right nesting level
    const reqPattern = /required:\s*\[([^\]]*)\]/g;
    depth = 0;
    let searchIdx = 0;
    while (searchIdx < parametersBlock.length) {
      const ch = parametersBlock[searchIdx];
      if (ch === '{') depth++;
      if (ch === '}') depth--;

      // Only match `required:` at depth 1 (direct child of parameters object)
      if (depth === 1) {
        const slice = parametersBlock.slice(searchIdx);
        const reqMatch = slice.match(/^required:\s*\[([^\]]*)\]/);
        if (reqMatch) {
          const items = reqMatch[1];
          for (const m of items.matchAll(/'([^']+)'/g)) {
            requiredFields.push(m[1]);
          }
          break;
        }
      }
      searchIdx++;
    }
  }

  return { params: paramNames, required: requiredFields };
}

/**
 * Build a map of { toolName: ToolSchema } from a full declaration block string.
 */
function parseAllToolSchemas(declarationBlock: string): Map<string, ToolSchema> {
  const blocks = extractToolBlocks(declarationBlock);
  const schemas = new Map<string, ToolSchema>();
  for (const [name, block] of blocks) {
    schemas.set(name, parseToolSchema(block));
  }
  return schemas;
}

// Mutation tools that must have idempotency_key in both voice and text declarations
const MUTATION_TOOLS = [
  'addToCalendar',
  'createTask',
  'createPoll',
  'savePlace',
  'setBasecamp',
  'addToAgenda',
  'createBroadcast',
  'createNotification',
  'updateCalendarEvent',
  'deleteCalendarEvent',
  'updateTask',
  'deleteTask',
  'settleExpense',
  'generateTripImage',
  'setTripHeaderImage',
  'emitSmartImportPreview',
  'emitReservationDraft',
];

describe('AI concierge tool parity', () => {
  const textSource = readRepoFile('supabase/functions/lovable-concierge/index.ts');
  const voiceSource = readRepoFile('supabase/functions/gemini-voice-session/index.ts');

  const textDeclarationBlock = extractBlock(textSource, /const\s+functionDeclarations\s*=\s*\[/);
  const voiceDeclarationBlock = extractBlock(
    voiceSource,
    /const\s+VOICE_FUNCTION_DECLARATIONS\s*=\s*\[/,
  );

  it('keeps voice declarations aligned with text declarations', () => {
    const textTools = parseQuotedNames(textDeclarationBlock, /name:\s*'([^']+)'/g);
    const voiceTools = parseQuotedNames(voiceDeclarationBlock, /name:\s*'([^']+)'/g);

    expect(voiceTools).toEqual(textTools);
  });

  it('keeps shared executor coverage aligned with text declarations', () => {
    const executorSource = readRepoFile('supabase/functions/_shared/functionExecutor.ts');

    const textTools = parseQuotedNames(textDeclarationBlock, /name:\s*'([^']+)'/g);
    const executorTools = parseQuotedNames(executorSource, /case\s+'([^']+)'/g);

    expect(executorTools).toEqual(textTools);
  });

  it('parameter names match between voice and text declarations (excluding idempotency_key)', () => {
    const textSchemas = parseAllToolSchemas(textDeclarationBlock);
    const voiceSchemas = parseAllToolSchemas(voiceDeclarationBlock);

    const mismatches: string[] = [];

    for (const [toolName, textSchema] of textSchemas) {
      const voiceSchema = voiceSchemas.get(toolName);
      if (!voiceSchema) continue; // tool name parity is covered by the first test

      const textParams = new Set(textSchema.params.filter(p => p !== 'idempotency_key'));
      const voiceParams = new Set(voiceSchema.params.filter(p => p !== 'idempotency_key'));

      const onlyInText = [...textParams].filter(p => !voiceParams.has(p));
      const onlyInVoice = [...voiceParams].filter(p => !textParams.has(p));

      if (onlyInText.length > 0 || onlyInVoice.length > 0) {
        const parts: string[] = [`${toolName}:`];
        if (onlyInText.length > 0) parts.push(`only in text=[${onlyInText.join(', ')}]`);
        if (onlyInVoice.length > 0) parts.push(`only in voice=[${onlyInVoice.join(', ')}]`);
        mismatches.push(parts.join(' '));
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('required fields match between voice and text declarations (excluding idempotency_key)', () => {
    const textSchemas = parseAllToolSchemas(textDeclarationBlock);
    const voiceSchemas = parseAllToolSchemas(voiceDeclarationBlock);

    const mismatches: string[] = [];

    for (const [toolName, textSchema] of textSchemas) {
      const voiceSchema = voiceSchemas.get(toolName);
      if (!voiceSchema) continue;

      const textRequired = new Set(textSchema.required.filter(r => r !== 'idempotency_key'));
      const voiceRequired = new Set(voiceSchema.required.filter(r => r !== 'idempotency_key'));

      const onlyInText = [...textRequired].filter(r => !voiceRequired.has(r));
      const onlyInVoice = [...voiceRequired].filter(r => !textRequired.has(r));

      if (onlyInText.length > 0 || onlyInVoice.length > 0) {
        const parts: string[] = [`${toolName}:`];
        if (onlyInText.length > 0) parts.push(`only in text=[${onlyInText.join(', ')}]`);
        if (onlyInVoice.length > 0) parts.push(`only in voice=[${onlyInVoice.join(', ')}]`);
        mismatches.push(parts.join(' '));
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('mutation tools have idempotency_key in both voice and text declarations', () => {
    const textSchemas = parseAllToolSchemas(textDeclarationBlock);
    const voiceSchemas = parseAllToolSchemas(voiceDeclarationBlock);

    const missing: string[] = [];

    for (const toolName of MUTATION_TOOLS) {
      const textSchema = textSchemas.get(toolName);
      const voiceSchema = voiceSchemas.get(toolName);

      if (textSchema && !textSchema.params.includes('idempotency_key')) {
        missing.push(`${toolName}: missing idempotency_key in text`);
      }
      if (voiceSchema && !voiceSchema.params.includes('idempotency_key')) {
        missing.push(`${toolName}: missing idempotency_key in voice`);
      }
    }

    expect(missing).toEqual([]);
  });
});
