import { validateExternalHttpsUrl } from './validation.ts';

type ChatRole = 'system' | 'user' | 'assistant';

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImageUrlPart {
  type: 'image_url';
  image_url: { url: string };
}

export type ContentPart = TextPart | ImageUrlPart;

export interface ChatMessage {
  role: ChatRole;
  content: string | ContentPart[];
}

/** Wider input type so consumer functions can pass loosely-typed messages */
export type ChatMessageInput = {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

export interface ChatModelRequest {
  messages: ChatMessageInput[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
  tools?: unknown[];
  toolConfig?: unknown;
  timeoutMs?: number;
}

export interface ChatModelResponse {
  provider: 'gemini' | 'lovable';
  model: string;
  raw: any;
}

export interface EmbeddingModelRequest {
  input: string | string[];
  model?: string;
  timeoutMs?: number;
}

export interface EmbeddingModelResponse {
  provider: 'gemini' | 'lovable';
  model: string;
  embeddings: number[][];
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_PROVIDER = (Deno.env.get('AI_PROVIDER') || 'gemini').toLowerCase();
const ENABLE_LOVABLE_FALLBACK =
  (Deno.env.get('GEMINI_ENABLE_LOVABLE_FALLBACK') || 'true').toLowerCase() !== 'false';

const DEFAULT_FLASH_MODEL = 'gemini-3-flash-preview';
const DEFAULT_PRO_MODEL = 'gemini-3-pro-preview';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';
const DEFAULT_CHAT_TIMEOUT_MS = 45_000;
const DEFAULT_EMBED_TIMEOUT_MS = 30_000;

const CHAT_MODEL_ALIASES: Record<string, string> = {
  'gemini-2.5-flash': DEFAULT_FLASH_MODEL,
  'google/gemini-2.5-flash': DEFAULT_FLASH_MODEL,
  'gemini-2.5-pro': DEFAULT_PRO_MODEL,
  'google/gemini-2.5-pro': DEFAULT_PRO_MODEL,
  'gemini-1.5-pro': DEFAULT_PRO_MODEL,
  'google/gemini-1.5-pro': DEFAULT_PRO_MODEL,
};

function normalizeChatModel(model?: string): string {
  if (!model) return DEFAULT_FLASH_MODEL;
  const trimmed = model.trim();
  if (!trimmed) return DEFAULT_FLASH_MODEL;

  const stripped = trimmed.replace(/^models\//, '').replace(/^google\//, '');
  const alias = CHAT_MODEL_ALIASES[trimmed] || CHAT_MODEL_ALIASES[stripped];
  const normalized = alias || stripped;

  if (!normalized.startsWith('gemini-')) {
    return normalized.includes('pro') ? DEFAULT_PRO_MODEL : DEFAULT_FLASH_MODEL;
  }

  return normalized;
}

function normalizeLovableChatModel(model?: string): string {
  const geminiModel = normalizeChatModel(model);
  return geminiModel.startsWith('google/') ? geminiModel : `google/${geminiModel}`;
}

function normalizeEmbeddingModel(model?: string): string {
  if (!model) return DEFAULT_EMBEDDING_MODEL;
  const stripped = model
    .trim()
    .replace(/^models\//, '')
    .replace(/^google\//, '');
  if (!stripped) return DEFAULT_EMBEDDING_MODEL;
  return stripped;
}

function normalizeLovableEmbeddingModel(model?: string): string {
  const normalized = normalizeEmbeddingModel(model);
  return normalized.startsWith('google/') ? normalized : `google/${normalized}`;
}

function flattenContentToText(content: string | ContentPart[] | Array<{ type: string; text?: string; image_url?: { url: string } }>): string {
  if (typeof content === 'string') return content;

  return content
    .map(part => {
      if (part.type === 'text') return part.text;
      if (part.type === 'image_url') return `[Image: ${part.image_url?.url || 'unknown'}]`;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

async function fetchUrlAsInlineData(
  url: string,
  timeoutMs: number,
): Promise<{ mimeType: string; data: string } | null> {
  try {
    if (!validateExternalHttpsUrl(url)) {
      return null;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': 'Chravel-AI/1.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = (response.headers.get('content-type') || 'application/octet-stream')
      .split(';')[0]
      .trim();
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Keep payloads small enough for request limits.
    if (bytes.byteLength > 6_000_000) {
      return null;
    }

    return {
      mimeType: contentType,
      data: bytesToBase64(bytes),
    };
  } catch (_error) {
    return null;
  }
}

async function toGeminiParts(
  content: string | ContentPart[] | Array<{ type: string; text?: string; image_url?: { url: string } }>,
  timeoutMs: number,
): Promise<any[]> {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  const parts: any[] = [];

  for (const part of content) {
    if (part.type === 'text') {
      parts.push({ text: part.text });
      continue;
    }

    if (part.type === 'image_url') {
      const url = part.image_url?.url;
      if (!url) continue;

      const inlineFromDataUrl = parseDataUrl(url);
      if (inlineFromDataUrl) {
        parts.push({ inlineData: inlineFromDataUrl });
        continue;
      }

      if (/^https?:\/\//i.test(url)) {
        if (!validateExternalHttpsUrl(url)) {
          parts.push({ text: `Blocked non-external image URL: ${url}` });
          continue;
        }
        const inlineFromRemote = await fetchUrlAsInlineData(url, timeoutMs);
        if (inlineFromRemote) {
          parts.push({ inlineData: inlineFromRemote });
        } else {
          parts.push({ text: `Image reference URL: ${url}` });
        }
      }
    }
  }

  if (parts.length === 0) {
    return [{ text: '' }];
  }

  return parts;
}

async function callGeminiChat(request: ChatModelRequest): Promise<ChatModelResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const timeoutMs = request.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;
  const model = normalizeChatModel(request.model);

  const systemMessages = request.messages.filter(m => m.role === 'system');
  const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

  const contents = await Promise.all(
    nonSystemMessages.map(async message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: await toGeminiParts(message.content, timeoutMs),
    })),
  );

  const generationConfig: Record<string, unknown> = {
    temperature: request.temperature ?? 0.1,
    maxOutputTokens: request.maxTokens ?? 2048,
  };

  if (request.responseFormat?.type === 'json_object') {
    generationConfig.responseMimeType = 'application/json';
  }

  const payload: Record<string, unknown> = {
    contents,
    generationConfig,
  };

  if (systemMessages.length > 0) {
    payload.systemInstruction = {
      parts: [
        { text: systemMessages.map(m => flattenContentToText(m.content)).join('\n\n') },
      ],
    };
  }

  if (request.tools && Array.isArray(request.tools) && request.tools.length > 0) {
    payload.tools = request.tools;
  }

  if (request.toolConfig) {
    payload.toolConfig = request.toolConfig;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText.substring(0, 800)}`);
  }

  const raw = await response.json();
  return {
    provider: 'gemini',
    model,
    raw,
  };
}

async function callLovableChat(request: ChatModelRequest): Promise<ChatModelResponse> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const timeoutMs = request.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;
  const model = normalizeLovableChatModel(request.model);

  const payload: Record<string, unknown> = {
    model,
    messages: request.messages,
    temperature: request.temperature ?? 0.1,
    max_tokens: request.maxTokens ?? 2048,
  };

  if (request.responseFormat) {
    payload.response_format = request.responseFormat;
  }
  if (request.tools) {
    payload.tools = request.tools;
  }
  if (request.toolConfig) {
    payload.toolConfig = request.toolConfig;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable API error ${response.status}: ${errorText.substring(0, 800)}`);
  }

  const raw = await response.json();
  return {
    provider: 'lovable',
    model,
    raw,
  };
}

export async function invokeChatModel(request: ChatModelRequest): Promise<ChatModelResponse> {
  const provider = AI_PROVIDER === 'lovable' ? 'lovable' : 'gemini';

  if (provider === 'lovable') {
    return callLovableChat(request);
  }

  if (!GEMINI_API_KEY) {
    if (ENABLE_LOVABLE_FALLBACK && LOVABLE_API_KEY) {
      console.warn('[Gemini] GEMINI_API_KEY missing, routing to Lovable fallback');
      return callLovableChat(request);
    }
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    return await callGeminiChat(request);
  } catch (error) {
    if (ENABLE_LOVABLE_FALLBACK && LOVABLE_API_KEY) {
      console.warn('[Gemini] Direct call failed, routing to Lovable fallback:', error);
      return callLovableChat(request);
    }
    throw error;
  }
}

export function extractTextFromChatResponse(raw: any, provider: 'gemini' | 'lovable'): string {
  if (provider === 'gemini') {
    const candidate = raw?.candidates?.[0];
    const parts: Array<{ text?: string }> = candidate?.content?.parts || [];
    return parts
      .filter(part => typeof part.text === 'string')
      .map(part => part.text as string)
      .join('');
  }

  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(part => (typeof part?.text === 'string' ? part.text : '')).join('');
  }
  return '';
}

function extractEmbeddingsFromLovable(raw: any): number[][] {
  const rows: any[] = raw?.data || [];
  return rows.map(row => row?.embedding).filter((embedding: unknown) => Array.isArray(embedding));
}

async function embedWithGemini(
  input: string[],
  model: string,
  timeoutMs: number,
): Promise<number[][]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${GEMINI_API_KEY}`;
  const concurrency = 8;
  const embeddings: number[][] = new Array(input.length);

  for (let i = 0; i < input.length; i += concurrency) {
    const slice = input.slice(i, i + concurrency);
    const chunkEmbeddings = await Promise.all(
      slice.map(async text => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: {
              parts: [{ text }],
            },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Gemini embeddings error ${response.status}: ${errorText.substring(0, 500)}`,
          );
        }

        const data = await response.json();
        const values = data?.embedding?.values;
        if (!Array.isArray(values)) {
          throw new Error('Gemini embeddings response missing embedding values');
        }
        return values as number[];
      }),
    );

    chunkEmbeddings.forEach((values, chunkIndex) => {
      embeddings[i + chunkIndex] = values;
    });
  }

  return embeddings;
}

async function embedWithLovable(
  input: string[],
  model: string,
  timeoutMs: number,
): Promise<number[][]> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable embeddings error ${response.status}: ${errorText.substring(0, 500)}`);
  }

  const raw = await response.json();
  return extractEmbeddingsFromLovable(raw);
}

export async function invokeEmbeddingModel(
  request: EmbeddingModelRequest,
): Promise<EmbeddingModelResponse> {
  const input = Array.isArray(request.input) ? request.input : [request.input];
  const timeoutMs = request.timeoutMs ?? DEFAULT_EMBED_TIMEOUT_MS;
  const geminiModel = normalizeEmbeddingModel(request.model);
  const lovableModel = normalizeLovableEmbeddingModel(request.model);
  const provider = AI_PROVIDER === 'lovable' ? 'lovable' : 'gemini';

  if (provider === 'lovable') {
    const embeddings = await embedWithLovable(input, lovableModel, timeoutMs);
    return {
      provider: 'lovable',
      model: lovableModel,
      embeddings,
    };
  }

  if (!GEMINI_API_KEY) {
    if (ENABLE_LOVABLE_FALLBACK && LOVABLE_API_KEY) {
      const embeddings = await embedWithLovable(input, lovableModel, timeoutMs);
      return {
        provider: 'lovable',
        model: lovableModel,
        embeddings,
      };
    }
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const embeddings = await embedWithGemini(input, geminiModel, timeoutMs);
    return {
      provider: 'gemini',
      model: geminiModel,
      embeddings,
    };
  } catch (error) {
    if (ENABLE_LOVABLE_FALLBACK && LOVABLE_API_KEY) {
      console.warn('[Gemini] Embeddings failed, routing to Lovable fallback:', error);
      const embeddings = await embedWithLovable(input, lovableModel, timeoutMs);
      return {
        provider: 'lovable',
        model: lovableModel,
        embeddings,
      };
    }
    throw error;
  }
}
