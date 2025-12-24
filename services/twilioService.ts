
import { appBackend } from './appBackend';
import { TwilioConfig } from '../types';

export const twilioService = {
    /**
     * Envia uma mensagem via Twilio WhatsApp
     * Suporta Texto Livre (Body) ou Templates (ContentSid + ContentVariables)
     */
    sendMessage: async (params: { to: string, text?: string, contentSid?: string, contentVariables?: string }) => {
        const config = await appBackend.getTwilioConfig();
        
        if (!config || !config.accountSid || !config.authToken || !config.fromNumber) {
            throw new Error("Configurações do Twilio incompletas. Verifique suas credenciais na aba de configuração.");
        }

        const sid = config.accountSid.trim();
        const token = config.authToken.trim();
        const from = config.fromNumber.trim();
        
        const formattedTo = params.to.startsWith('whatsapp:') ? params.to : `whatsapp:${params.to.replace(/\D/g, '')}`;
        const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
        const auth = btoa(`${sid}:${token}`);

        const body = new URLSearchParams();
        body.append('To', formattedTo);
        body.append('From', from);

        // Lógica condicional: Se houver ContentSid, usamos a Content API (Templates)
        if (params.contentSid) {
            body.append('ContentSid', params.contentSid.trim());
            if (params.contentVariables) {
                body.append('ContentVariables', params.contentVariables);
            }
        } else if (params.text) {
            body.append('Body', params.text);
        } else {
            throw new Error("É necessário fornecer uma mensagem ou um ID de Template.");
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erro na API do Twilio");
            }

            return data;
        } catch (error: any) {
            console.error("Twilio API Error:", error);
            if (error.message?.includes('Failed to fetch')) {
                throw new Error("Erro de conexão/CORS. O navegador bloqueou a requisição direta. Verifique se o proxy está ativo ou use uma Edge Function.");
            }
            throw error;
        }
    }
};
