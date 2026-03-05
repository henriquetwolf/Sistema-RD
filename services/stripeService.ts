import { createClient } from '@supabase/supabase-js';
import type {
  StripeConfig,
  StripeCreateSessionPayload,
  StripeCreateSessionResponse,
} from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY || '';
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY }
    : { apikey: SUPABASE_KEY };
}

async function edgeFetch(fn: string, path: string, options: RequestInit = {}): Promise<any> {
  const headers = await getAuthHeader();
  const url = `${EDGE_BASE}/${fn}/${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
    });

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Resposta inesperada (${res.status}): ${text.substring(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(json.error || `Edge function error: ${res.status}`);
    }
    return json;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Tempo limite da requisição excedido (60s).');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const stripeService = {
  async getConfig(): Promise<{ configured: boolean; publishable_key: string | null; is_active: boolean }> {
    return edgeFetch('stripe-checkout', 'config');
  },

  async getFullConfig(): Promise<any> {
    const { data, error } = await supabase
      .from('stripe_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveConfig(config: { publishable_key: string; secret_key: string; webhook_secret?: string; is_active: boolean }): Promise<void> {
    const { data: existing } = await supabase
      .from('stripe_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    const payload = {
      publishable_key: config.publishable_key,
      secret_key: config.secret_key,
      webhook_secret: config.webhook_secret || '',
      is_active: config.is_active,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('stripe_config')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('stripe_config')
        .insert(payload);
      if (error) throw error;
    }
  },

  async createCheckoutSession(payload: StripeCreateSessionPayload): Promise<StripeCreateSessionResponse> {
    return edgeFetch('stripe-checkout', 'create-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async checkStatus(referenceId: string): Promise<any> {
    return edgeFetch('stripe-checkout', 'check-status', {
      method: 'POST',
      body: JSON.stringify({ reference_id: referenceId }),
    });
  },
};
