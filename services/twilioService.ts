
import { appBackend } from './appBackend';
import { TwilioConfig } from '../types';

export const twilioService = {
  sendMessage: async (to: string, body: string) => {
    const config: TwilioConfig | null = await appBackend.getTwilioConfig();
    
    if (!config || !config.accountSid || !config.authToken || !config.fromNumber) {
      throw new Error("Configurações do Twilio incompletas. Verifique a aba de configurações.");
    }

    const { accountSid, authToken, fromNumber } = config;
    
    // Formata o número de destino se não tiver o prefixo whatsapp:
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/\s+/g, '')}`;
    const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', formattedTo);
    formData.append('From', formattedFrom);
    formData.append('Body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro ao enviar mensagem via Twilio.");
    }

    return data;
  }
};
