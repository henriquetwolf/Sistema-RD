
import { Buffer } from 'buffer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const path = query.path as string;

  // Tenta pegar do ambiente (Vercel)
  let clientId = process.env.CONTA_AZUL_CLIENT_ID || '';
  let clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET || '';

  // Se o frontend enviou as chaves no corpo (OAuth), usamos elas
  if (path === 'oauth/token' && body.client_id && body.client_secret) {
      clientId = body.client_id;
      clientSecret = body.client_secret;
      
      // Removemos do body para não enviar duplicado no form-data da Conta Azul
      delete body.client_id;
      delete body.client_secret;
  }

  if (!clientId || !clientSecret) {
      // Se chegamos aqui sem chaves, retornamos erro explicativo
      return res.status(400).json({ 
          error: "Credenciais ausentes", 
          message: "Configure o Client ID e Secret no painel ou nas variáveis de ambiente do Vercel." 
      });
  }

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
