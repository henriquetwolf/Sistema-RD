
import React, { useState, useEffect } from 'react';
import { 
    MessageSquare, Send, Settings, Save, Smartphone, 
    ShieldCheck, Loader2, Search, User, Info, AlertTriangle, 
    Database, CheckCircle, Smartphone as PhoneIcon
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { twilioService } from '../services/twilioService';
import { TwilioConfig } from '../types';
import clsx from 'clsx';

export const TwilioInbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'config'>('send');
  const [config, setConfig] = useState<TwilioConfig>({
      accountSid: '',
      authToken: '',
      fromNumber: 'whatsapp:+14155238886' // Exemplo sandbox
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Envio
  const [toPhone, setToPhone] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [savedConfig, crmData] = await Promise.all([
              appBackend.getTwilioConfig(),
              appBackend.client.from('crm_deals').select('contact_name, company_name, phone').limit(50)
          ]);
          if (savedConfig) setConfig(savedConfig);
          if (crmData.data) setContacts(crmData.data);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleSaveConfig = async () => {
      setIsSaving(true);
      try {
          await appBackend.saveTwilioConfig(config);
          alert("Configurações do Twilio salvas com sucesso!");
          setActiveTab('send');
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
      } finally { setIsSaving(false); }
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!toPhone || !message.trim()) return;
      
      setIsSending(true);
      try {
          await twilioService.sendTextMessage(toPhone, message);
          alert("Mensagem enviada com sucesso (verifique seu painel Twilio para status detalhado)!");
          setMessage('');
      } catch (e: any) {
          // Explicação sobre CORS em ambiente de navegador direto
          if (e.message?.includes('Failed to fetch')) {
             alert("Erro de CORS: O Twilio bloqueia chamadas diretas do navegador por segurança. \n\nPara produção, você deve configurar uma Edge Function no Supabase para atuar como ponte (proxy).");
          } else {
             alert(`Erro ao enviar: ${e.message}`);
          }
      } finally { setIsSending(false); }
  };

  const filteredContacts = contacts.filter(c => 
    (c.contact_name || c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm)
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
        {/* Sub Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                    <MessageSquare size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Twilio WhatsApp</h2>
                    <p className="text-xs text-slate-500">Envie mensagens usando sua conta Twilio.</p>
                </div>
            </div>
            <div className="flex bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setActiveTab('send')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", activeTab === 'send' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>Enviar Mensagem</button>
                <button onClick={() => setActiveTab('config')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", activeTab === 'config' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>Configuração</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'config' ? (
                <div className="max-w-2xl mx-auto p-10 space-y-8">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4">
                        <Info className="text-blue-600 shrink-0" size={24} />
                        <div className="text-sm text-blue-800 leading-relaxed">
                            <p className="font-bold mb-1">Instruções de Integração:</p>
                            <p>1. Obtenha seu <b>Account SID</b> e <b>Auth Token</b> no console do Twilio.</p>
                            <p>2. Se estiver usando o Sandbox, use o número fornecido pelo Twilio (ex: <code className="bg-white px-1">whatsapp:+14155238886</code>).</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Twilio Account SID</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono" 
                                placeholder="AC..."
                                value={config.accountSid}
                                onChange={e => setConfig({...config, accountSid: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Twilio Auth Token</label>
                            <input 
                                type="password" 
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono" 
                                placeholder="••••••••••••••••"
                                value={config.authToken}
                                onChange={e => setConfig({...config, authToken: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Número Remetente (WhatsApp From)</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono" 
                                placeholder="whatsapp:+1234567890"
                                value={config.fromNumber}
                                onChange={e => setConfig({...config, fromNumber: e.target.value})}
                            />
                        </div>
                        <button 
                            onClick={handleSaveConfig}
                            disabled={isSaving}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Salvar Configurações
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex h-full">
                    {/* Lista de Contatos do CRM */}
                    <aside className="w-80 border-r border-slate-100 flex flex-col shrink-0">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" 
                                    placeholder="Buscar no CRM..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredContacts.map((c, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => setToPhone(c.phone || '')}
                                    className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group"
                                >
                                    <p className="text-sm font-bold text-slate-800 truncate">{c.contact_name || c.company_name}</p>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-teal-600">
                                        <PhoneIcon size={10} /> {c.phone || 'Sem telefone'}
                                    </p>
                                </div>
                            ))}
                            {filteredContacts.length === 0 && <p className="p-8 text-center text-xs text-slate-400 italic">Nenhum contato.</p>}
                        </div>
                    </aside>

                    {/* Formulário de Envio */}
                    <main className="flex-1 bg-slate-50 flex flex-col items-center p-10">
                        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
                            <h3 className="text-xl font-bold text-slate-800">Nova Mensagem</h3>
                            
                            <form onSubmit={handleSend} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone de Destino (Com DDI)</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input 
                                            type="text" 
                                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm" 
                                            placeholder="Ex: 5511999999999"
                                            value={toPhone}
                                            onChange={e => setToPhone(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Sempre inclua 55 (Brasil) + DDD + Número.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mensagem</label>
                                    <textarea 
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm h-40 resize-none focus:ring-2 focus:ring-teal-500 outline-none" 
                                        placeholder="Olá! Tudo bem?..."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        maxLength={1600}
                                        required
                                    />
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-slate-400">{message.length}/1600 caracteres</span>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSending || !toPhone || !message.trim()}
                                    className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {isSending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                                    Enviar Agora
                                </button>
                            </form>

                            <div className="pt-6 border-t border-slate-100">
                                <p className="text-xs text-slate-400 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-amber-500" />
                                    Lembre-se que para o WhatsApp, o primeiro contato deve ser um template aprovado se passar de 24h.
                                </p>
                            </div>
                        </div>
                    </main>
                </div>
            )}
        </div>
        
        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-800 text-white flex items-center justify-between text-[10px] font-bold uppercase tracking-widest shrink-0">
            <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-teal-400" /> API de Produção Twilio</span>
            <span className="opacity-50">v1.0.0</span>
        </div>
    </div>
  );
};
