import { supabase } from '@/integrations/supabase/client';

export const CONCIERGE_FUNCTION_NAME = 'lovable-concierge';
export const DEMO_CONCIERGE_FUNCTION_NAME = 'demo-concierge';

export interface ConciergeInvokeBody extends Record<string, unknown> {
  message: string;
}

export interface ConciergeInvokeResponse {
  response?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  sources?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    source?: string;
  }>;
  citations?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    source?: string;
  }>;
  googleMapsWidget?: string | null;
  status?: string;
  [key: string]: unknown;
}

export interface ConciergeInvokeOptions {
  demoMode?: boolean;
}

export async function invokeConcierge(
  body: ConciergeInvokeBody,
  options: ConciergeInvokeOptions = {},
): Promise<{ data: ConciergeInvokeResponse | null; error: { message?: string } | null }> {
  const functionName = options.demoMode ? DEMO_CONCIERGE_FUNCTION_NAME : CONCIERGE_FUNCTION_NAME;
  return supabase.functions.invoke<ConciergeInvokeResponse>(functionName, {
    body,
  });
}

export async function pingConcierge() {
  return invokeConcierge({ message: 'ping' });
}
