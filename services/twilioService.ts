
import { appBackend } from './appBackend';
import { TwilioConfig } from '../types';

export const twilioService = {
  sendMessage: async (to: string, body: string) => {
    const config = await appBackend.getTwilioConfig();
    
    if (!config || !config.accountSid || !config.authToken || !config.fromNumber) {
      throw new Error("Configurações do Twilio incompletas. Vá na aba Twilio > Configurações.");
    }

    const { accountSid, authToken, fromNumber } = config;
    
    // Formata o número de destino para o padrão Twilio whatsapp:+55...
    const cleanTo = to.replace(/\D/g, '');
    const formattedTo = `whatsapp:+${cleanTo}`;
    
    // Formata o número de origem
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
