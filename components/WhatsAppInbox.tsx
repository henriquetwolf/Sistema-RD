
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageCircle, Search, MoreVertical, Paperclip, Send, 
  CheckCheck, User, X, Plus, Settings, Save, Smartphone, 
  Copy, Loader2, RefreshCw, Zap, ShieldAlert, Code, Terminal, 
  Database, QrCode, Wifi, WifiOff, CheckCircle2, ChevronRight, ShieldCheck,
  Cpu, Link2, AlertTriangle, Info, Check, Bug, ShieldX, HelpCircle, ArrowUpRight,
  Cloud, Globe, Lock, Server, Activity, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { whatsappService } from '../services/whatsappService';

// --- TYPES ---

interface WAConversation {
  id: string;
  wa_id: string;
  contact_name: string;
  contact_phone: string;
  last_message: string;
  unread_count: number;
  status: 'open' | 'pending' | 'closed';
  updated_at: string;
}

interface WAMessage {
    id: string;
    chat_id: string;
    text: string;
    sender_type: 'user' | 'agent' | 'system';
    created_at: string;
    status: string;
}

interface WAConfig {
  mode: 'evolution' | 'direct';
  instanceUrl: string;
  instanceName: string;
  apiKey: string;
  edgeFunctionName: string;
  gatewayUrl: string; 
  isConnected: boolean;
}

export const WhatsAppInbox: React.FC = () => {
  const [conversations, setConversations] = useState<WAConversation[]>([]);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // States para o QR Code e Diagnóstico
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<'idle' | 'online' | 'offline' | 'error'>('idle');
  const [qrError, setQrError] = useState<{message: string, type: 'connection' | 'security' | 'api'} | null>(null);
  const [connLogs, setConnLogs] = useState<string[]>([]);

  const [config, setConfig] = useState<WAConfig>({
      mode: 'evolution',
      instanceUrl: '',
      instanceName: '',
      apiKey: '',
      edgeFunctionName: 'whatsapp-webhook',
      gatewayUrl: '',
      isConnected: false
  });

  const edgeFunctionUrl = useMemo(() => {
    const baseUrl = (import.meta as any).env?.VITE_APP_SUPABASE_URL || 'https://your-project.supabase.co';
    return `${baseUrl.replace(/\/$/, "")}/functions/v1/${config.edgeFunctionName}`;
  }, [config.edgeFunctionName]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChat = conversations.find(c => c.id === selectedChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
      fetchConversations();
      loadConfig();
  }, []);

  useEffect(() => {
      const timer = setInterval(() => {
          if (!showSettings) {
            fetchConversations(false);
            if (selectedChatId) fetchMessages(selectedChatId, false);
          }
      }, 5000); 
      return () => clearInterval(timer);
  }, [selectedChatId, showSettings]);

  useEffect(() => {
      if (selectedChatId) {
          fetchMessages(selectedChatId);
          clearUnreadCount(selectedChatId);
      } else {
          setMessages([]);
      }
  }, [selectedChatId]);

  const addLog = (msg: string) => setConnLogs(prev => [msg, ...prev].slice(0, 5));

  const loadConfig = async () => {
      const c = await appBackend.getWhatsAppConfig();
      if (c) {
          setConfig(prev => ({ ...prev, ...c }));
          // Auto-test connection to update status label
          if (c.instanceUrl || c.gatewayUrl) {
              setTimeout(() => checkConnectionSilently(c), 500);
          }
      }
  };

  const checkConnectionSilently = async (c: WAConfig) => {
    const baseUrl = c.mode === 'direct' ? c.gatewayUrl : c.instanceUrl;
    if (!baseUrl) return;
    try {
        await fetch(baseUrl.replace(/\/$/, ""), { method: 'HEAD', mode: 'no-cors' });
        setConfig(prev => ({ ...prev, isConnected: true }));
    } catch (err) {
        setConfig(prev => ({ ...prev, isConnected: false }));
    }
  };

  const clearUnreadCount = async (chatId: string) => {
      try {
          await appBackend.client
              .from('crm_whatsapp_chats')
              .update({ unread_count: 0 })
              .eq('id', chatId);
          
          setConversations(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
      } catch (e) {}
  };

  const fetchConversations = async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      try {
          const { data } = await appBackend.client
              .from('crm_whatsapp_chats')
              .select('*')
              .order('updated_at', { ascending: false });
          if (data) setConversations(data);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchMessages = async (chatId: string, showLoading = true) => {
      if (showLoading) setIsLoadingMessages(true);
      try {
          const { data } = await appBackend.client
              .from('crm_whatsapp_messages')
              .select('*')
              .eq('chat_id', chatId)
              .order('created_at', { ascending: true });
          if (data) setMessages(data);
      } catch (e) { console.error(e); } finally { setIsLoadingMessages(false); }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedChatId || !selectedChat) return;
    setIsSending(true);
    const messageText = inputText;
    setInputText('');
    try {
        const result = await whatsappService.sendTextMessage(selectedChat.contact_phone, messageText);
        const waId = result.key?.id || result.messageId; 
        await whatsappService.syncMessage(selectedChatId, messageText, 'agent', waId);
        await fetchMessages(selectedChatId, false);
        await fetchConversations(false);
    } catch (err: any) {
        alert(err.message);
        setInputText(messageText);
    } finally { setIsSending(false); }
  };

  const handleSaveConfig = async () => {
      setIsSavingConfig(true);
      try {
          await appBackend.saveWhatsAppConfig(config);
          setShowSettings(false);
          alert("Configurações de Nuvem salvas!");
      } catch (e: any) { alert(`Erro ao salvar: ${e.message}`); } finally { setIsSavingConfig(false); }
  };

  const testCloudConnection = async () => {
      setIsTestingConn(true);
      setConnStatus('idle');
      const baseUrl = config.mode === 'direct' ? config.gatewayUrl : config.instanceUrl;
      
      if (!baseUrl) {
          alert("Informe a URL do seu servidor na nuvem.");
          setIsTestingConn(false);
          return;
      }

      try {
          const response = await fetch(baseUrl.replace(/\/$/, ""), { method: 'HEAD', mode: 'no-cors' });
          setConnStatus('online');
          setConfig(prev => ({ ...prev, isConnected: true }));
          addLog(`[OK] Servidor Cloud em ${baseUrl} está respondendo.`);
      } catch (err) {
          setConnStatus('offline');
          setConfig(prev => ({ ...prev, isConnected: false }));
          addLog(`[ERRO] Não foi possível alcançar o servidor em ${baseUrl}`);
      } finally {
          setIsTestingConn(false);
      }
  };

  const handleGenerateQr = async () => {
      setIsGeneratingQr(true);
      setQrCode(null);
      setQrError(null);
      
      const baseUrl = config.mode === 'direct' ? config.gatewayUrl : config.instanceUrl;
      const endpoint = config.mode === 'direct' ? '/get-qr' : `/instance/connect/${config.instanceName}`;
      const targetUrl = `${baseUrl.replace(/\/$/, "")}${endpoint}`;

      setConnLogs([
          `[CLOUD] Iniciando pareamento remoto...`,
          `[API] Destino: ${targetUrl}`,
          `[API] Aguardando resposta do gateway...`
      ]);
      
      if (window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
          setQrError({
              type: 'security',
              message: "Erro de Segurança (HTTPS): Seu servidor Cloud precisa ter SSL (https://) para este app conseguir falar com ele."
          });
          setIsGeneratingQr(false);
          return;
      }

      try {
          let token = "";
          if (config.mode === 'direct') {
              const response = await fetch(targetUrl);
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Servidor Cloud retornou erro.");
              token = data.qr;
          } else {
              const response = await fetch(targetUrl, {
                  headers: { 'apikey': config.apiKey }
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Erro na Evolution API.");
              token = data.base64 || data.code;
          }

          if (!token) throw new Error("API Cloud não retornou token de pareamento.");

          const qrUrl = token.startsWith('data:image') 
              ? token 
              : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`;
          
          setQrCode(qrUrl);
          addLog("[OK] QR Code gerado. Escaneie no celular.");
      } catch (err: any) {
          setQrError({ type: 'connection', message: err.message });
          addLog(`[ERRO] ${err.message}`);
      } finally {
          setIsGeneratingQr(false);
      }
  };

  const handleStartNewChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChatPhone || !newChatName) return;
      setIsCreatingChat(true);
      try {
          const chat = await whatsappService.getOrCreateChat(newChatPhone, newChatName);
          await fetchConversations();
          setSelectedChatId(chat.id);
          setShowNewChatModal(false);
          setNewChatPhone('');
          setNewChatName('');
      } catch (e: any) { alert(`Erro ao criar conversa: ${e.message}`); } finally { setIsCreatingChat(false); }
  };

  if (showSettings) {
      return (
          <div className="h-full bg-slate-50 flex flex-col items-center p-6 overflow-y-auto animate-in fade-in custom-scrollbar">
              <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col mb-10">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                          <div className="bg-teal-100 p-2 rounded-xl text-teal-700"><Cloud size={24} /></div>
                          <div>
                              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">Configuração Cloud</h2>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Conexão com Provedores de Mensageria</p>
                          </div>
                      </div>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
                  </div>

                  <div className="p-8 space-y-8 bg-slate-50">
                      
                      {/* SELETOR DE MODO PROFISSIONAL */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={() => setConfig({...config, mode: 'evolution'})}
                            className={clsx(
                                "p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4",
                                config.mode === 'evolution' ? "bg-white border-teal-500 shadow-lg shadow-teal-500/10" : "bg-white border-slate-100 opacity-60 hover:opacity-100"
                            )}
                        >
                            <div className={clsx("p-3 rounded-2xl", config.mode === 'evolution' ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400")}><Link2 size={24}/></div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm uppercase">Evolution API (Recomendado)</h4>
                                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Padrão de mercado para servidores Cloud. Alta performance e estabilidade.</p>
                            </div>
                        </button>
                        <button 
                            onClick={() => setConfig({...config, mode: 'direct'})}
                            className={clsx(
                                "p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4",
                                config.mode === 'direct' ? "bg-white border-indigo-500 shadow-lg shadow-indigo-500/10" : "bg-white border-slate-100 opacity-60 hover:opacity-100"
                            )}
                        >
                            <div className={clsx("p-3 rounded-2xl", config.mode === 'direct' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400")}><Server size={24}/></div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm uppercase">Hosted Private Gateway</h4>
                                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Conexão com seu próprio gateway rodando em um servidor Linux/VPS.</p>
                            </div>
                        </button>
                      </div>

                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in slide-in-from-top-4">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="w-full md:w-72 aspect-square bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
                                    {isGeneratingQr ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <Loader2 size={48} className="animate-spin text-teal-600" />
                                                <QrCode size={24} className="absolute inset-0 m-auto text-teal-200" />
                                            </div>
                                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Sincronizando Cloud...</p>
                                        </div>
                                    ) : qrError ? (
                                        <div className="flex flex-col items-center gap-3 text-red-500 p-4 animate-in zoom-in-95">
                                            <div className="bg-red-50 p-4 rounded-full">
                                                {qrError.type === 'security' ? <ShieldX size={40} /> : <AlertTriangle size={40} />}
                                            </div>
                                            <p className="text-[10px] font-black uppercase leading-tight">Falha na API Cloud</p>
                                            <p className="text-[9px] font-medium leading-relaxed opacity-80">{qrError.message}</p>
                                            <button onClick={handleGenerateQr} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase mt-2 hover:bg-red-700 transition-colors">Tentar Novamente</button>
                                        </div>
                                    ) : qrCode ? (
                                        <div className="w-full h-full p-4 bg-white rounded-3xl shadow-inner animate-in zoom-in-95 border-2 border-teal-50">
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                                        </div>
                                    ) : config.isConnected ? (
                                        <div className="flex flex-col items-center animate-bounce">
                                            <CheckCircle2 size={72} className="text-teal-500 mb-2" />
                                            <p className="text-xs font-black text-teal-600 uppercase tracking-widest">Servidor Online!</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center group">
                                            <div className="bg-white p-6 rounded-full shadow-sm mb-4 border border-slate-100 group-hover:scale-110 transition-transform">
                                                <Cloud size={48} className="text-slate-200 group-hover:text-teal-400 transition-colors" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase leading-tight">Informe a URL abaixo para parear</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-lg font-black text-slate-800">Passo a Passo Cloud:</h4>
                                        <div className={clsx(
                                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all",
                                            config.isConnected ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                        )}>
                                            <Activity size={12}/> {config.isConnected ? 'Online' : 'Offline'}
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        {[
                                            "Informe o endpoint HTTPS do seu servidor na nuvem",
                                            "Clique no botão 'Testar Conexão' para validar o SSL",
                                            "Gere o QR Code e escaneie com seu WhatsApp",
                                            "Ajuste os eventos do Webhook no painel da Evolution"
                                        ].map((step, i) => (
                                            <li key={i} className="flex items-center gap-3 text-xs text-slate-600 font-medium group">
                                                <span className="w-6 h-6 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center text-[10px] font-black border border-teal-100 shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">{i+1}</span>
                                                {step}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="bg-slate-900 rounded-2xl p-4 h-24 font-mono text-[9px] text-teal-400 overflow-y-auto custom-scrollbar leading-relaxed shadow-inner border border-slate-800">
                                        {connLogs.length === 0 ? "> Aguardando dados da nuvem..." : connLogs.map((log, i) => (
                                            <div key={i} className="mb-1">{log}</div>
                                        ))}
                                    </div>
                                    
                                    <div className="pt-2 flex gap-3">
                                        <button 
                                            onClick={testCloudConnection}
                                            disabled={isTestingConn}
                                            className="bg-white border border-slate-200 text-slate-600 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isTestingConn ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                                            Testar Conexão
                                        </button>
                                        <button 
                                            onClick={handleGenerateQr}
                                            disabled={isGeneratingQr}
                                            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {isGeneratingQr ? <Loader2 size={16} className="animate-spin"/> : <QrCode size={16}/>}
                                            {qrCode ? 'Atualizar QR' : 'Gerar QR Code'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {config.mode === 'evolution' ? (
                                <div className="bg-teal-50 p-6 rounded-[2rem] border border-teal-100 animate-in slide-in-from-bottom-2 space-y-4">
                                    <h5 className="text-[10px] font-black text-teal-700 uppercase flex items-center gap-2 mb-1 tracking-widest"><Globe size={14}/> Dados da Instância Evolution API</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-[9px] font-black text-teal-400 uppercase mb-1.5 ml-1">URL Base do Servidor (Cloud)</label>
                                            <input type="text" className="w-full px-4 py-3 border border-teal-200 rounded-xl text-sm font-bold bg-white outline-none focus:ring-4 focus:ring-teal-500/10" value={config.instanceUrl} onChange={e => setConfig({...config, instanceUrl: e.target.value})} placeholder="https://api-whatsapp.seudominio.com" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-teal-400 uppercase mb-1.5 ml-1">Nome da Instância</label>
                                            <input type="text" className="w-full px-4 py-3 border border-teal-200 rounded-xl text-sm font-bold bg-white outline-none focus:ring-4 focus:ring-teal-500/10" value={config.instanceName} onChange={e => setConfig({...config, instanceName: e.target.value})} placeholder="ex: principal" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-teal-400 uppercase mb-1.5 ml-1">Chave de API Global</label>
                                            <div className="relative">
                                                <input type="password" title="Key" className="w-full px-4 py-3 border border-teal-200 rounded-xl text-sm font-bold bg-white outline-none focus:ring-4 focus:ring-teal-500/10" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} />
                                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-200" size={16}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 animate-in slide-in-from-bottom-2 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-[10px] font-black text-indigo-700 uppercase flex items-center gap-2 tracking-widest"><Terminal size={14}/> URL do Gateway VOLL (Hosted)</h5>
                                        {config.gatewayUrl && !config.gatewayUrl.startsWith('https:') && (
                                            <div className="flex items-center gap-1.5 text-red-600 text-[10px] font-black animate-pulse">
                                                <ShieldX size={14}/> Exige HTTPS na nuvem
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            className="w-full px-5 py-4 bg-white border border-indigo-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all" 
                                            value={config.gatewayUrl} 
                                            onChange={e => setConfig({...config, gatewayUrl: e.target.value})}
                                            placeholder="https://seu-servidor-whatsapp.com"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200 group-focus-within:text-indigo-400">
                                            <ArrowUpRight size={20}/>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-indigo-400 leading-relaxed italic"><Info size={10} className="inline mr-1"/> O modo Hosted requer que seu servidor Cloud suporte requisições CORS e possua certificado SSL válido.</p>
                                </div>
                            )}

                            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4 animate-in slide-in-from-bottom-2">
                                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-amber-900 uppercase">Recebimento de Mensagens (Webhook)</p>
                                    <p className="text-[10px] text-amber-800 leading-relaxed">Para receber mensagens, você deve ativar o evento <b>MESSAGES_UPSERT</b> nas configurações de Webhook do seu painel Evolution. Sem isso, o sistema só conseguirá enviar mensagens.</p>
                                </div>
                            </div>
                      </div>

                      {/* WEBHOOK HELPERS */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                              <h3 className="font-black text-slate-700 text-[10px] uppercase tracking-widest flex items-center gap-2"><Database size={18} className="text-teal-600" /> Webhook Cloud</h3>
                              <span className="text-[9px] font-black text-slate-400 uppercase">Supabase Cloud Function</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">Para receber mensagens em tempo real, cadastre esta URL no painel do seu servidor Cloud (Evolution ou Gateway):</p>
                          <div className="p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl relative group">
                              <div className="flex gap-4">
                                  <code className="flex-1 bg-transparent p-1 rounded-xl text-[10px] font-mono text-slate-700 break-all leading-relaxed">{edgeFunctionUrl}</code>
                                  <button onClick={() => { navigator.clipboard.writeText(edgeFunctionUrl); alert("URL Copiada!"); }} className="bg-white border border-slate-200 text-slate-400 hover:text-teal-600 p-3 rounded-2xl active:scale-95 transition-all shadow-sm"><Copy size={20}/></button>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowSettings(false)} className="px-6 py-3 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Cancelar</button>
                      <button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-xl shadow-teal-600/30 flex items-center gap-2 transition-all active:scale-95">
                          {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          Salvar Configuração Cloud
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar List */}
      <div className={clsx("flex flex-col border-r border-slate-100 w-full md:w-80 lg:w-96 shrink-0 bg-slate-50/50", selectedChatId ? "hidden md:flex" : "flex")}>
        <div className="p-6 border-b border-slate-100 bg-white space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3"><MessageCircle className="text-teal-600" /> Atendimento</h2>
                <div className="flex gap-1">
                    <button onClick={() => setShowNewChatModal(true)} className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 active:scale-95" title="Nova Conversa"><Plus size={18} /></button>
                    <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-xl transition-all" title="Configurar"><Settings size={18} /></button>
                </div>
            </div>
            
            {/* Connection Bar */}
            <div className={clsx(
                "p-3 rounded-2xl border-2 flex items-center justify-between transition-all",
                config.isConnected ? "bg-teal-50 border-teal-100" : "bg-red-50 border-red-100"
            )}>
                <div className="flex items-center gap-2">
                    <div className={clsx("w-2 h-2 rounded-full", config.isConnected ? "bg-teal-500 animate-pulse" : "bg-red-500")}></div>
                    <span className={clsx("text-[10px] font-black uppercase tracking-widest", config.isConnected ? "text-teal-700" : "text-red-700")}>
                        {config.isConnected ? "Cloud Online" : "Cloud Offline"}
                    </span>
                </div>
                {config.isConnected ? <Wifi size={14} className="text-teal-400" /> : <WifiOff size={14} className="text-red-400" />}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading && conversations.length === 0 ? (<div className="p-20 text-center flex flex-col items-center"><Loader2 className="animate-spin text-teal-600 mb-2" size={32} /><span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Conectando Nuvem...</span></div>) : 
            conversations.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-4">
                    <MessageCircle size={48} className="mx-auto opacity-10" />
                    <p className="text-sm font-medium">Nenhuma conversa encontrada.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {conversations.map(conv => (
                        <div key={conv.id} onClick={() => setSelectedChatId(conv.id)} className={clsx("p-5 cursor-pointer transition-all hover:bg-white border-l-4 group relative", selectedChatId === conv.id ? "bg-white border-l-teal-500 shadow-sm z-10" : "border-l-transparent")}>
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-black text-sm text-slate-800 group-hover:text-teal-700 transition-colors">{conv.contact_name}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(conv.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate font-medium">{conv.last_message}</p>
                            {conv.unread_count > 0 && <span className="absolute right-5 bottom-5 w-5 h-5 bg-teal-600 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg shadow-teal-600/30">{conv.unread_count}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative min-w-0">
          {selectedChat ? (
              <>
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-slate-500" onClick={() => setSelectedChatId(null)}><ChevronRight size={24} className="rotate-180" /></button>
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold border border-slate-200 overflow-hidden shadow-inner">
                            <User size={28} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-base leading-tight">{selectedChat.contact_name}</h3>
                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{selectedChat.contact_phone}</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    {isLoadingMessages ? (
                        <div className="flex justify-center py-10"><div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Loader2 className="animate-spin" size={14}/> Carregando...</div></div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={clsx("flex animate-in fade-in slide-in-from-bottom-2", msg.sender_type === 'agent' ? "justify-end" : "justify-start")}>
                                <div className={clsx(
                                    "max-w-[75%] rounded-2xl px-4 py-3 shadow-md relative text-sm font-medium leading-relaxed", 
                                    msg.sender_type === 'agent' ? "bg-teal-100 text-teal-900 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                        <span className="text-[9px] font-black text-slate-400 opacity-60 uppercase">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {msg.sender_type === 'agent' && <CheckCheck size={14} className="text-teal-600" />}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-white/95 backdrop-blur-md p-5 border-t border-slate-200">
                    <form onSubmit={handleSendMessage} className="flex gap-3 max-w-5xl mx-auto">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                className="w-full pl-6 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm font-medium transition-all" 
                                placeholder="Escreva sua mensagem aqui..." 
                                value={inputText} 
                                onChange={e => setInputText(e.target.value)} 
                            />
                            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"><Paperclip size={20}/></button>
                        </div>
                        <button type="submit" disabled={isSending || !inputText.trim()} className="bg-teal-600 text-white p-4 rounded-2xl hover:bg-teal-700 disabled:opacity-50 transition-all shadow-xl shadow-teal-600/20 active:scale-95 shrink-0 flex items-center justify-center">
                            {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                        </button>
                    </form>
                </div>
              </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/50 backdrop-blur-sm">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 animate-bounce duration-[3000ms]">
                    <Cloud size={48} className="text-teal-500 opacity-40" />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Atendimento Centralizado (Cloud)</h3>
                <p className="text-sm font-medium max-w-xs text-center mt-2 leading-relaxed">Conecte sua API na nuvem pelas configurações para começar a atender seus clientes.</p>
            </div>
          )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-3"><Plus className="text-teal-600" size={24} /> Nova Conversa</h3>
                      <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleStartNewChat} className="p-8 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">WhatsApp (DDD + Número)</label>
                          <input 
                            type="text" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all" 
                            placeholder="5511999999999" 
                            value={newChatPhone} 
                            onChange={e => setNewChatPhone(e.target.value)} 
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Nome de Identificação</label>
                          <input 
                            type="text" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all" 
                            placeholder="Nome do Cliente" 
                            value={newChatName} 
                            onChange={e => setNewChatName(e.target.value)} 
                            required
                          />
                      </div>
                      <div className="flex justify-end gap-3 pt-6 border-t">
                          <button type="button" onClick={() => setShowNewChatModal(false)} className="px-6 py-3 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Cancelar</button>
                          <button type="submit" disabled={isCreatingChat} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-xl shadow-teal-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                              {isCreatingChat ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                              Abrir Chat
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
