
import { Buffer } from 'buffer';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Inicializa Supabase no lado do servidor
const supabaseUrl = process.env.VITE_APP_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const CONFIG_KEY = 'conta_azul_config';

async function getStoredConfig() {
    const { data } = await supabase.from('crm_settings').select('value').eq('key', CONFIG_KEY).maybeSingle();
    return data?.value ? JSON.parse(data.value) : null;
}

async function saveConfig(newConfig: any) {
    await supabase.from('crm_settings').upsert({ key: CONFIG_KEY, value: JSON.stringify(newConfig) }, { onConflict: 'key' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const path = query.path as string;

  // 1. Tenta carregar as chaves do banco de dados
  let config = await getStoredConfig();
  
  // Fallback para variáveis de ambiente se não houver no banco (ou para configuração inicial)
  const clientId = config?.clientId || process.env.CONTA_AZUL_CLIENT_ID;
  const clientSecret = config?.clientSecret || process.env.CONTA_AZUL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: "Configuração incompleta. Configure Client ID e Secret no ERP primeiro." });
  }

  const credentials = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');

  try {
    // CASO A: Troca de Código por Token (OAuth Initial Swap)
    if (path === 'oauth/token' && body.grant_type === 'authorization_code') {
      const response = await fetch('https://auth.contaazul.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(body).toString()
      });

      const data = await response.json();
      if (response.ok) {
          // Salva os novos tokens no banco preservando as chaves
          const updatedConfig = { ...config, ...body, accessToken: data.access_token, refreshToken: data.refresh_token, isConnected: true, lastSync: new Date().toISOString() };
          // Removemos dados temporários do OAuth para não poluir o banco
          delete updatedConfig.code; 
          delete updatedConfig.grant_type;
          await saveConfig(updatedConfig);
      }
      return res.status(response.status).json(data);
    }

    // CASO B: Chamada de API normal (Injeção de Token e Refresh Automático)
    if (!config?.accessToken) {
        return res.status(401).json({ error: "not_connected", message: "Conta Azul não está conectado." });
    }

    const callUpstream = async (token: string) => {
        const targetUrl = `https://api.contaazul.com/${path}`;
        const options: any = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        if (method !== 'GET') options.body = JSON.stringify(body);
        return fetch(targetUrl, options);
    };

    let upstreamResponse = await callUpstream(config.accessToken);

    // Se o token expirou (401), tentamos o refresh automaticamente
    if (upstreamResponse.status === 401 && config.refreshToken) {
        console.log("Token expirado, tentando refresh...");
        const refreshResp = await fetch('https://auth.contaazul.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: config.refreshToken
            }).toString()
        });

        if (refreshResp.ok) {
            const refreshData = await refreshResp.json();
            config.accessToken = refreshData.access_token;
            config.refreshToken = refreshData.refresh_token || config.refreshToken;
            await saveConfig(config);
            
            // Repete a chamada original com o novo token
            upstreamResponse = await callUpstream(config.accessToken);
        }
    }

    const responseText = await upstreamResponse.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { message: responseText || "Erro na resposta do servidor" };
    }

    return res.status(upstreamResponse.status).json(responseData);

  } catch (error: any) {
    console.error("Erro no Proxy Inteligente:", error);
    return res.status(500).json({ error: error.message });
  }
}
