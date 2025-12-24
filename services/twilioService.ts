
import { appBackend } from './appBackend';
import { TwilioConfig } from '../types';

export const twilioService = {
    /**
     * Envia uma mensagem via Twilio WhatsApp
     * Nota: Em navegadores, isso pode falhar por CORS se não houver um proxy/edge function.
     * Estamos implementando a lógica de interface e request.
     */
    sendTextMessage: async (to: string, text: string) => {
        const config = await appBackend.getTwilioConfig();
        
        if (!config || !config.accountSid || !config.authToken || !config.fromNumber) {
            throw new Error("Configurações do Twilio incompletas. Vá na aba Twilio WhatsApp e preencha as credenciais.");
        }

        const sid = config.accountSid.trim();
        const token = config.authToken.trim();
        const from = config.fromNumber.trim();
        
        // Garante que o número 'to' tenha o prefixo whatsapp:
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/\D/g, '')}`;

        const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
        
        // Auth Header
        const auth = btoa(`${sid}:${token}`);

        const body = new URLSearchParams();
        body.append('To', formattedTo);
        body.append('From', from);
        body.append('Body', text);

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
            throw error;
        }
    }
};
