
/* Fix: Explicitly importing Buffer from 'buffer' for Node environment in Vercel function */
import { Buffer } from 'buffer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const path = query.path as string;

  const clientId = process.env.CONTA_AZUL_CLIENT_ID;
  const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Variáveis de ambiente CONTA_AZUL_CLIENT_ID ou SECRET não configuradas no Vercel." });
  }

  // No Node.js (Vercel), Buffer é o padrão para Base64
  const credentials = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');

  try {
    let targetUrl = '';
    let options: any = {
      method: method,
      headers: {}
    };

    if (path === 'oauth/token') {
      targetUrl = 'https://auth.contaazul.com/oauth2/token';
      options.headers = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      // O body já vem como objeto, transformamos em string de formulário
      options.body = new URLSearchParams(body).toString();
    } else {
      targetUrl = `https://api.contaazul.com/${path}`;
      options.headers = {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json'
      };
      if (method !== 'GET') {
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(targetUrl, options);
    
    // Lemos como texto primeiro para evitar o erro "Unexpected end of JSON input"
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { message: responseText || "Resposta vazia do servidor" };
    }

    return res.status(response.status).json(responseData);

  } catch (error: any) {
    console.error("Erro no Proxy Conta Azul:", error);
    return res.status(500).json({ error: error.message });
  }
}
