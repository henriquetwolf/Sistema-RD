
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const path = query.path as string; // Ex: v1/financeiro/...

  const clientId = process.env.CONTA_AZUL_CLIENT_ID;
  const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;
  // Using btoa for base64 encoding to avoid Buffer issues in non-Node type-defined environments.
  const credentials = btoa(`${clientId}:${clientSecret}`);

  try {
    // 1. Rota para trocar código por Token ou dar Refresh
    if (path === 'oauth/token') {
      const response = await fetch('https://auth.contaazul.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // 2. Rota genérica para chamadas de API (GET/POST)
    const token = req.headers.authorization; // Repassa o Bearer token do front
    const targetUrl = `https://api.contaazul.com/${path}`;
    
    const apiResponse = await fetch(targetUrl, {
      method: method,
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json'
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    });

    const data = await apiResponse.json();
    return res.status(apiResponse.status).json(data);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
