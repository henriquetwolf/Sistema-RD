/**
 * Brevo (ex-Sendinblue) service for transactional email and SMS.
 * API docs: https://developers.brevo.com/reference
 */

const BREVO_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

export interface BrevoEmailPayload {
  to: string;
  subject: string;
  htmlContent: string;
  toName?: string;
}

export interface BrevoSmsPayload {
  to: string;
  content: string;
  sender?: string;
}

export interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const brevoService = {
  /**
   * Send a transactional email via Brevo SMTP API.
   */
  sendEmail: async (
    apiKey: string,
    senderEmail: string,
    senderName: string,
    payload: BrevoEmailPayload
  ): Promise<BrevoSendResult> => {
    if (!apiKey || !senderEmail) {
      return { success: false, error: 'Brevo não configurado (chave ou sender ausente).' };
    }

    try {
      const response = await fetch(BREVO_EMAIL_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: senderName || 'VOLL Pilates' },
          to: [{ email: payload.to, name: payload.toName || payload.to }],
          subject: payload.subject,
          htmlContent: payload.htmlContent,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[BREVO EMAIL ERROR]', response.status, errBody);
        return { success: false, error: `Brevo API ${response.status}: ${errBody}` };
      }

      const data = await response.json();
      console.log(`[BREVO EMAIL OK] Enviado para: ${payload.to} | messageId: ${data.messageId}`);
      return { success: true, messageId: data.messageId };
    } catch (err: any) {
      console.error('[BREVO EMAIL FETCH ERROR]', err);
      return { success: false, error: err.message || 'Erro de rede ao enviar email.' };
    }
  },

  /**
   * Send a transactional SMS via Brevo.
   * Requires SMS credits on the Brevo account.
   */
  sendSms: async (
    apiKey: string,
    payload: BrevoSmsPayload
  ): Promise<BrevoSendResult> => {
    if (!apiKey) {
      return { success: false, error: 'Brevo não configurado (chave ausente).' };
    }

    try {
      const response = await fetch(BREVO_SMS_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          type: 'transactional',
          unicodeEnabled: true,
          sender: payload.sender || 'VOLL',
          recipient: payload.to,
          content: payload.content,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[BREVO SMS ERROR]', response.status, errBody);
        return { success: false, error: `Brevo SMS API ${response.status}: ${errBody}` };
      }

      const data = await response.json();
      console.log(`[BREVO SMS OK] Enviado para: ${payload.to} | ref: ${data.reference}`);
      return { success: true, messageId: data.reference };
    } catch (err: any) {
      console.error('[BREVO SMS FETCH ERROR]', err);
      return { success: false, error: err.message || 'Erro de rede ao enviar SMS.' };
    }
  },

  /**
   * Send a test email to verify configuration.
   */
  sendTestEmail: async (
    apiKey: string,
    senderEmail: string,
    senderName: string,
    testRecipient: string
  ): Promise<BrevoSendResult> => {
    return brevoService.sendEmail(apiKey, senderEmail, senderName, {
      to: testRecipient,
      subject: '✅ Teste VOLL - Configuração Brevo OK!',
      htmlContent: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); border-radius: 24px; padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 900;">VOLL Pilates</h1>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">Sistema de Notificações</p>
          </div>
          <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 24px; padding: 32px; margin-top: 20px; text-align: center;">
            <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px;">✅</span>
            </div>
            <h2 style="color: #1e293b; font-size: 20px; font-weight: 800; margin: 0 0 8px;">Configuração Validada!</h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
              O envio de e-mails via <strong>Brevo</strong> está funcionando corretamente para o sistema VOLL.
            </p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 16px; text-align: left; font-size: 12px; color: #475569;">
              <p style="margin: 4px 0;"><strong>Remetente:</strong> ${senderName} &lt;${senderEmail}&gt;</p>
              <p style="margin: 4px 0;"><strong>Data do teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <p style="margin: 4px 0;"><strong>Provedor:</strong> Brevo (Transactional SMTP)</p>
            </div>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 20px;">
            Este é um e-mail de teste automático enviado pelo Sistema VOLL.
          </p>
        </div>
      `,
    });
  },
};
