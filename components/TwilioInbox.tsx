
import React, { useState, useEffect } from 'react';
import { 
    MessageSquare, Send, Settings, Save, Smartphone, 
    ShieldCheck, Loader2, Search, User, Info, AlertTriangle, 
    Database, CheckCircle, Smartphone as PhoneIcon, FileText,
    Plus, Trash2, Code, ShieldAlert, Globe, Link2
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { twilioService } from '../services/twilioService';
import { TwilioConfig } from '../types';
import clsx from 'clsx';

export const TwilioInbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'config'>('send');
  const [sendMode, setSendMode] = useState<'text' | 'template'>('text');
  
  const [config, setConfig] = useState<TwilioConfig>({
      accountSid: '',
      authToken: '',
      fromNumber: 'whatsapp:+14155238886',
      proxyUrl: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Dados de Envio
  const [toPhone, setToPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [contentSid, setContentSid] = useState('');
  const [variables, setVariables] = useState<{key: string, value: string}[]>([{key: '1', value: ''}]);
  
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
          if (savedConfig) setConfig({ ...config, ...savedConfig });
          if (crmData.data) setContacts(crmData.data);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleSaveConfig = async () => {
      setIsSaving(true);
      try {
          await appBackend.saveTwilioConfig(config);
          alert("Configurações salvas com sucesso!");
          setActiveTab('send');
      } catch (e: any) {
          alert(`Erro: ${e.message}`);
      } finally { setIsSaving(false); }
  };

  const addVariable = () => setVariables([...variables, { key: (variables.length + 1).toString(), value: '' }]);
  const removeVariable = (index: number) => setVariables(variables.filter((_, i) => i !== index));
  const updateVariable = (index: number, val: string) => {
      const newVars = [...variables];
      newVars[index].value = val;
      setVariables(newVars);
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!toPhone) return;
      
      setIsSending(true);
      setLastError(null);
      try {
          let contentVariables = '';
          if (sendMode === 'template') {
              const varsObj: Record<string, string> = {};
              variables.forEach(v => { if(v.value) varsObj[v.key] = v.value; });
              contentVariables = JSON.stringify(varsObj);
          }

          await twilioService.sendMessage({
              to: toPhone,
              text: sendMode === 'text' ? messageText : undefined,
              contentSid: sendMode === 'template' ? contentSid : undefined,
              contentVariables: sendMode === 'template' ? contentVariables : undefined
          });

          alert("Mensagem entregue com sucesso à fila do Twilio!");
          if (sendMode === 'text') setMessageText('');
      } catch (e: any) {
          setLastError(e.message);
      } finally { setIsSending(false); }
  };

  const filteredContacts = contacts.filter(c => 
    (c.contact_name || c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm)
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                    <MessageSquare size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Twilio WhatsApp</h2>
                    <p className="text-xs text-slate-500">Integração oficial via API Cloud.</p>
                </div>
            </div>
            <div className="flex bg-slate-200 p-1 rounded-lg">
                <button onClick={() => { setActiveTab('send'); setLastError(null); }} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", activeTab === 'send' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>Enviar</button>
                <button onClick={() => { setActiveTab('config'); setLastError(null); }} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", activeTab === 'config' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>Configuração</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'config' ? (
                <div className="max-w-3xl mx-auto p-10 space-y-8">
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4">
                        <ShieldAlert className="text-amber-600 shrink-0" size={24} />
                        <div className="text-sm text-amber-800 leading-relaxed">
                            <p className="font-bold mb-1">Atenção sobre o erro de envio:</p>
                            <p>O navegador bloqueia requisições diretas para o Twilio (Erro de CORS). Para que o envio funcione aqui pelo app, você <b>deve</b> usar um URL de Proxy ou criar uma Edge Function no Supabase.</p>
                            <p className="mt-2">Sugestão p/ testes: <code className="bg-white px-1">https://cors-anywhere.herokuapp.com/</code></p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Globe size={14} className="text-blue-500"/> CORS Proxy URL (Opcional, mas recomendado)
                                </label>
                                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono" value={config.proxyUrl} onChange={e => setConfig({...config, proxyUrl: e.target.value})} placeholder="https://seu-proxy.com/" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Account SID</label>
                                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono" value={config.accountSid} onChange={e => setConfig({...config, accountSid: e.target.value})} placeholder="AC..." />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Auth Token</label>
                                <input type="password" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono" value={config.authToken} onChange={e => setConfig({...config, authToken: e.target.value})} placeholder="••••••••" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Smartphone size={14} /> Número Remetente (De)
                                </label>
                                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50" value={config.fromNumber} onChange={e => setConfig({...config, fromNumber: e.target.value})} placeholder="whatsapp:+14155238886" />
                            </div>
                        </div>
                        <button onClick={handleSaveConfig} disabled={isSaving} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Credenciais
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex h-full">
                    {/* Lista CRM */}
                    <aside className="w-80 border-r border-slate-100 flex flex-col shrink-0 bg-white">
                        <div className="p-4 border-b border-slate-50">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input type="text" className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" placeholder="Buscar no CRM..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredContacts.map((c, i) => (
                                <div key={i} onClick={() => setToPhone(c.phone || '')} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group">
                                    <p className="text-sm font-bold text-slate-800 truncate">{c.contact_name || c.company_name}</p>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1"><PhoneIcon size={10} /> {c.phone || 'Sem telefone'}</p>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Envio */}
                    <main className="flex-1 bg-slate-50 flex flex-col items-center p-10 overflow-y-auto custom-scrollbar">
                        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
                            
                            {lastError && (
                                <div className="bg-red-50 border-2 border-red-100 p-4 rounded-xl flex items-start gap-3 text-red-700 animate-in shake">
                                    <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                                    <div className="text-[11px] font-medium leading-relaxed">
                                        <p className="font-black uppercase mb-1">Erro no Envio</p>
                                        <p>{lastError}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800">Nova Mensagem</h3>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button onClick={() => setSendMode('text')} className={clsx("px-3 py-1 text-[10px] font-black uppercase rounded transition-all", sendMode === 'text' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>Texto Livre</button>
                                    <button onClick={() => setSendMode('template')} className={clsx("px-3 py-1 text-[10px] font-black uppercase rounded transition-all", sendMode === 'template' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>Template API</button>
                                </div>
                            </div>
                            
                            <form onSubmit={handleSend} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone Destino (DDI + DDD + Num)</label>
                                    <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-700" placeholder="Ex: 5511999999999" value={toPhone} onChange={e => setToPhone(e.target.value)} required />
                                </div>

                                {sendMode === 'text' ? (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mensagem Personalizada</label>
                                        <textarea className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm h-40 resize-none focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Digite aqui..." value={messageText} onChange={e => setMessageText(e.target.value)} required />
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-top-1 space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Code size={14} className="text-indigo-600"/> Content SID (Template ID)</label>
                                            <input type="text" className="w-full px-4 py-3 border border-indigo-200 bg-indigo-50/30 rounded-xl text-sm font-mono font-bold text-indigo-900" placeholder="HXb5b6..." value={contentSid} onChange={e => setContentSid(e.target.value)} required />
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Variáveis do Template</label>
                                                <button type="button" onClick={addVariable} className="text-[10px] font-black text-teal-600 hover:underline flex items-center gap-1"><Plus size={12}/> Adicionar Variável</button>
                                            </div>
                                            <div className="space-y-3">
                                                {variables.map((v, idx) => (
                                                    <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2">
                                                        <div className="w-12 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-400"># {v.key}</div>
                                                        <input type="text" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder={`Valor para {{${v.key}}}`} value={v.value} onChange={e => updateVariable(idx, e.target.value)} />
                                                        <button type="button" onClick={() => removeVariable(idx)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" disabled={isSending || !toPhone} className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                                    {isSending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />} Enviar via Twilio
                                </button>
                            </form>
                        </div>
                    </main>
                </div>
            )}
        </div>
        
        <div className="px-6 py-3 bg-slate-800 text-white flex items-center justify-between text-[10px] font-bold uppercase tracking-widest shrink-0">
            <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-teal-400" /> Twilio Content API v1.1</span>
            <span className="opacity-50">VOLL PILATES GROUP</span>
        </div>
    </div>
  );
};
