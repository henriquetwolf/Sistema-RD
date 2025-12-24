
import { appBackend } from './appBackend';
import { TwilioConfig } from '../types';

export const twilioService = {
    /**
     * Envia uma mensagem via Twilio WhatsApp
     * Implementa suporte a Proxy para evitar bloqueio de CORS no navegador.
     */
    sendMessage: async (params: { to: string, text?: string, contentSid?: string, contentVariables?: string }) => {
        const config = await appBackend.getTwilioConfig();
        
        if (!config || !config.accountSid || !config.authToken || !config.fromNumber) {
            throw new Error("Credenciais do Twilio não configuradas. Vá na aba 'Configuração' do Twilio WhatsApp.");
        }

        const sid = config.accountSid.trim();
        const token = config.authToken.trim();
        const from = config.fromNumber.trim();
        const proxy = config.proxyUrl?.trim() || "";
        
        // Garante que o destino tenha o prefixo correto
        const rawTo = params.to.replace(/\D/g, '');
        const formattedTo = `whatsapp:+${rawTo}`;
        
        let url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
        
        // Se houver um proxy configurado, prefixamos a URL
        if (proxy) {
            url = `${proxy}${url}`;
        }

        const auth = btoa(`${sid}:${token}`);

        const body = new URLSearchParams();
        body.append('To', formattedTo);
        body.append('From', from);

        if (params.contentSid) {
            body.append('ContentSid', params.contentSid.trim());
            if (params.contentVariables) {
                body.append('ContentVariables', params.contentVariables);
            }
        } else if (params.text) {
            body.append('Body', params.text);
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString()
            });

            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Resposta inválida do servidor (CORS ou erro de Proxy): ${responseText.substring(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(data.message || `Erro Twilio: ${response.status}`);
            }

            return data;
        } catch (error: any) {
            console.error("Twilio API Error:", error);
            
            // Se falhou sem mensagem clara, provavelmente foi CORS
            if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                throw new Error("BLOQUEIO DE SEGURANÇA (CORS): O navegador impediu a requisição direta ao Twilio. Configure um Proxy na aba de Configuração ou use uma Edge Function.");
            }
            
            throw error;
        }
    }
};
