
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Settings, Save, ShieldCheck, 
  Smartphone, User, History, Loader2, AlertCircle, 
  CheckCircle2, Info, ArrowLeft, Trash2, KeyRound, RefreshCw
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { twilioService } from '../services/twilioService';
import { TwilioConfig, ActivityLog } from '../types';
import clsx from 'clsx';

interface TwilioManagerProps {
  onBack: () => void;
}

export const TwilioManager: React.FC<TwilioManagerProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'config' | 'history'>('send');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Config State
  const [config, setConfig] = useState<TwilioConfig>({
    accountSid: '',
    authToken: '',
    fromNumber: ''
  });

  // Message State
  const [toPhone, setToPhone] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const savedConfig = await appBackend.getTwilioConfig();
      if (savedConfig) setConfig(savedConfig);
      
      const activityLogs = await appBackend.getActivityLogs(50);
      setLogs(activityLogs.filter(l => l.module === 'twilio'));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      await appBackend.saveTwilioConfig(config);
      alert("Configurações salvas com sucesso!");
      setActiveTab('send');
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toPhone || !messageBody) return;
    
    setIsSending(true);
    try {
      const result = await twilioService.sendMessage(toPhone, messageBody);
      
      await appBackend.logActivity({
        action: 'create',
        module: 'twilio',
        details: `WhatsApp enviado p/ ${toPhone}: ${messageBody.substring(0, 40)}...`,
        recordId: result.sid
      });

      alert("Mensagem enviada com sucesso!");
      setMessageBody('');
      setToPhone('');
      loadData();
    } catch (e: any) {
      alert(`Erro no Twilio: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="text-red-500" /> WhatsApp Twilio
            </h2>
            <p className="text-slate-500 text-sm">Envio de notificações e mensagens via API Twilio.</p>
          </div>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
        <button 
          onClick={() => setActiveTab('send')}
          className={clsx("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'send' ? "bg-red-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
        >
          <Send size={18}/> Enviar Mensagem
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={clsx("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'history' ? "bg-red-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
        >
          <History size={18}/> Histórico
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={clsx("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'config' ? "bg-red-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
        >
          <Settings size={18}/> Configuração API
        </button>
      </div>

      <div className="max-w-4xl">
        {activeTab === 'send' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-left-2">
            <div className="p-8 space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-xs text-blue-800">
                <Info size={18} className="shrink-0 text-blue-600" />
                <p>O número deve conter DDI e DDD (ex: 5511999999999). Se usar o Sandbox do Twilio, o destinatário deve ter enviado a mensagem de adesão primeiro.</p>
              </div>

              <form onSubmit={handleSend} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">Celular do Destinatário</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="5511999999999"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold"
                      value={toPhone}
                      onChange={e => setToPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">Mensagem</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all h-40 resize-none"
                    placeholder="Digite sua mensagem aqui..."
                    value={messageBody}
                    onChange={e => setMessageBody(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSending || !toPhone || !messageBody}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all active:scale-95"
                  >
                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    Enviar WhatsApp
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-2">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-red-100 p-2 rounded-lg text-red-600"><ShieldCheck size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800">Credenciais Twilio</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Account SID</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                    value={config.accountSid}
                    onChange={e => setConfig({...config, accountSid: e.target.value})}
                    placeholder="AC..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Auth Token</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
                    <input 
                      type="password" 
                      className="w-full pl-9 pr-4 py-2 border rounded-lg font-mono text-sm"
                      value={config.authToken}
                      onChange={e => setConfig({...config, authToken: e.target.value})}
                    />
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Número Twilio (WhatsApp)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border rounded-lg text-sm"
                    value={config.fromNumber}
                    onChange={e => setConfig({...config, fromNumber: e.target.value})}
                    placeholder="whatsapp:+14155238886"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button 
                  onClick={handleSaveConfig}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
                >
                  <Save size={18} /> Salvar Credenciais
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Últimos Envios</h3>
                    <button onClick={loadData} className="p-2 text-slate-400 hover:text-red-500"><RefreshCw size={16} /></button>
                </div>
                <div className="divide-y divide-slate-100">
                    {logs.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 text-sm">Nenhum envio registrado.</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{log.details}</p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ENVIADO</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
