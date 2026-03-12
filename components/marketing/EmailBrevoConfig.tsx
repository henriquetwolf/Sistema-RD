import React, { useState, useEffect } from 'react';
import { Mail, Save, Loader2, Send, Info, Check } from 'lucide-react';
import { EmailConfig } from '../../types';
import { appBackend } from '../../services/appBackend';

interface EmailBrevoConfigProps {
  onBack?: () => void;
}

export const EmailBrevoConfig: React.FC<EmailBrevoConfigProps> = ({ onBack }) => {
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    apiKey: '',
    senderEmail: '',
    senderName: 'VOLL Pilates',
    provider: 'brevo',
  });
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    appBackend.getEmailConfig().then((c) => {
      if (c) setEmailConfig({ ...c, provider: c.provider || 'brevo' });
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      await appBackend.saveEmailConfig({ ...emailConfig, provider: 'brevo' });
      alert('Configurações Brevo salvas com sucesso!');
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmailRecipient?.includes('@')) {
      alert('Digite um e-mail válido para o teste.');
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      await appBackend.saveEmailConfig({ ...emailConfig, provider: 'brevo' });
      const result = await appBackend.sendTestEmail(testEmailRecipient);
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ success: false, error: e?.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium">
          ← Voltar
        </button>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <Mail className="text-purple-600" size={24} />
          <div>
            <h3 className="text-lg font-black text-slate-800">Configuração de E-mail (Brevo)</h3>
            <p className="text-xs text-slate-500">Usada para campanhas de Email Marketing, automações e notificações</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-xs text-blue-800">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Provedor: Brevo (brevo.com)</p>
              <p>Configure a chave de API e o remetente verificados na sua conta Brevo. O mesmo remetente será usado para enviar campanhas de email.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chave API Brevo (api-key)</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                value={emailConfig.apiKey}
                onChange={(e) => setEmailConfig({ ...emailConfig, apiKey: e.target.value })}
                placeholder="xkeysib-xxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail do Remetente (verificado no Brevo)</label>
              <input
                type="email"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                value={emailConfig.senderEmail}
                onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                placeholder="noreply@seudominio.com.br"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Remetente</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                value={emailConfig.senderName}
                onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                placeholder="VOLL Pilates"
              />
            </div>
          </div>
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Envio de teste</h4>
            <div className="flex gap-2">
              <input
                type="email"
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-300 outline-none"
                value={testEmailRecipient}
                onChange={(e) => { setTestEmailRecipient(e.target.value); setTestResult(null); }}
                placeholder="seuemail@teste.com"
              />
              <button
                onClick={handleSendTest}
                disabled={isSendingTest || !emailConfig.apiKey || !emailConfig.senderEmail}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar teste
              </button>
            </div>
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${testResult.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {testResult.success ? <Check size={14} /> : <Info size={14} />}
                {testResult.success ? 'E-mail de teste enviado. Verifique sua caixa de entrada.' : `Erro: ${testResult.error}`}
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar configurações
          </button>
        </div>
      </div>
    </div>
  );
};
