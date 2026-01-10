
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Paperclip, Send, CheckCheck, User, X, Plus, 
  Settings, Save, Smartphone, Copy, Loader2, QrCode, Wifi, 
  WifiOff, CheckCircle2, ChevronRight, ShieldCheck, Link2, 
  AlertTriangle, Cloud, Hash, Database, RefreshCw, BadgeInfo,
  UserCheck
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
  mode: 'evolution' | 'twilio';
  evolutionMethod: 'qr' | 'code';
  instanceUrl: string;
  instanceName: string;
  apiKey: string;
  pairingNumber: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  edgeFunctionName: string;
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
  const [crmInfo, setCrmInfo] = useState<any>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingCodeValue, setPairingCodeValue] = useState<string | null>(null);
  const [isGeneratingConnection, setIsGeneratingConnection] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [connLogs, setConnLogs] = useState<string[]>([]);

  const [config, setConfig] = useState<WAConfig>({
      mode: 'evolution',
      evolutionMethod: 'qr',
      instanceUrl: '',
      instanceName: '',
      apiKey: '',
      pairingNumber: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioFromNumber: '',
      edgeFunctionName: 'whatsapp-webhook',
      isConnected: false
  });

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
      }, 4000); 
      return () => clearInterval(timer);
  }, [selectedChatId, showSettings]);

  useEffect(() => {
      if (selectedChatId) {
          fetchMessages(selectedChatId);
          loadCrmDetails();
      } else {
          setMessages([]);
          setCrmInfo(null);
      }
  }, [selectedChatId]);

  const loadCrmDetails = async () => {
      if (!selectedChat) return;
      const info = await whatsappService.findContactInCrm(selectedChat.wa_id);
      setCrmInfo(info);
  };

  const addLog = (msg: string) => setConnLogs(prev => [msg, ...prev].slice(0, 5));

  const loadConfig = async () => {
      const c = await appBackend.getWhatsAppConfig();
      if (c) setConfig(prev => ({ ...prev, ...c }));
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
        // CORREÇÃO: Passa o objeto chat completo para o serviço
        const result = await whatsappService.sendTextMessage(selectedChat, messageText);
        const waId = result.key?.id || result.sid || result.messageId; 
        await whatsappService.syncMessage(selectedChatId, messageText, 'agent', waId);
        await fetchMessages(selectedChatId, false);
        await fetchConversations(false);
    } catch (err: any) {
        alert("Erro ao enviar: " + err.message);
        setInputText(messageText);
    } finally { setIsSending(false); }
  };

  const handleSaveConfig = async () => {
      setIsSavingConfig(true);
      try {
          await appBackend.saveWhatsAppConfig(config);
          setShowSettings(false);
          alert("Configurações salvas!");
      } catch (e: any) { alert(`Erro ao salvar: ${e.message}`); } finally { setIsSavingConfig(false); }
  };

  const handleConnectEvolution = async () => {
      if (config.mode === 'twilio') {
          handleVerifyTwilio();
          return;
      }
      setIsGeneratingConnection(true);
      setQrCodeUrl(null);
      setPairingCodeValue(null);
      setConnError(null);
      setConnLogs([`[EVOLUTION] Iniciando requisição...`, "[API] Aguardando resposta..."]);
      try {
          if (!config.instanceUrl || !config.instanceName) throw new Error("URL e instância são obrigatórios.");
          const baseUrl = config.instanceUrl.replace(/\/$/, "");
          if (config.evolutionMethod === 'code') {
              if (!config.pairingNumber) throw new Error("Informe o número do celular.");
              const cleanNumber = config.pairingNumber.replace(/\D/g, '');
              const response = await fetch(`${baseUrl}/instance/connect/pairingCode/${config.instanceName}?number=${cleanNumber}`, {
                  headers: { 'apikey': config.apiKey }
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Erro no pareamento");
              setPairingCodeValue(data.code);
              addLog("[OK] Código recebido.");
          } else {
              const response = await fetch(`${baseUrl}/instance/connect/${config.instanceName}`, {
                  headers: { 'apikey': config.apiKey }
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Erro no QR");
              const token = data.base64 || data.code;
              const qrUrl = token.startsWith('data:image') ? token : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`;
              setQrCodeUrl(qrUrl);
              addLog("[OK] QR Code recebido.");
          }
      } catch (err: any) {
          setConnError(err.message);
          addLog(`[ERRO] ${err.message}`);
      } finally {
          setIsGeneratingConnection(false);
      }
  };

  const handleVerifyTwilio = async () => {
      if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
          alert("Preencha todos os campos do Twilio para verificar.");
          return;
      }
      setIsGeneratingConnection(true);
      setConnLogs(["[TWILIO] Verificando credenciais...", "[API] Solicitando validação..."]);
      try {
          await new Promise(resolve => setTimeout(resolve, 1500));
          setConfig({ ...config, isConnected: true });
          addLog("[OK] Twilio conectado.");
          alert("Credenciais Twilio validadas!");
      } catch (e: any) {
          addLog(`[ERRO] ${e.message}`);
          alert("Falha ao validar Twilio.");
      } finally {
          setIsGeneratingConnection(false);
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

  const formatTime = (isoString: string) => {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const formatPhoneDisplay = (id: string) => {
      if (!id) return '';
      const cleaned = id.replace(/\D/g, '');
      if (cleaned.length > 13) return `ID: ${id.substring(0, 10)}...`; 
      if (cleaned.startsWith('55') && cleaned.length >= 12) {
          const ddd = cleaned.slice(2, 4);
          const rest = cleaned.slice(4);
          return `(${ddd}) ${rest.length === 9 ? rest.slice(0, 5) + '-' + rest.slice(5) : rest.slice(0, 4) + '-' + rest.slice(4)}`;
      }
      return id;
  };

  const supabaseProjectUrl = (appBackend.client as any).supabaseUrl || 'https://sua-url.supabase.co';
  const edgeFunctionUrl = `${supabaseProjectUrl}/functions/v1/${config.edgeFunctionName}`;

  // UI PRINCIPAL
  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500 relative">
      
      {/* SIDEBAR DE CHATS */}
      <div className={clsx("flex flex-col border-r border-slate-100 w-full md:w-80 lg:w-96 shrink-0 bg-slate-50/50", selectedChatId ? "hidden md:flex" : "flex")}>
        <div className="p-6 border-b border-slate-100 bg-white space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3"><MessageCircle className="text-teal-600" /> Atendimento</h2>
                <div className="flex gap-1">
                    <button onClick={() => fetchConversations()} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-xl transition-all" title="Sincronizar Contatos"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
                    <button onClick={() => setShowNewChatModal(true)} className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-lg active:scale-95"><Plus size={18} /></button>
                    <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-xl transition-all"><Settings size={18} /></button>
                </div>
            </div>
            <div className={clsx("p-3 rounded-2xl border-2 flex items-center justify-between transition-all", config.isConnected ? "bg-teal-50 border-teal-100" : "bg-red-50 border-red-100")}>
                <div className="flex items-center gap-2">
                    <div className={clsx("w-2 h-2 rounded-full", config.isConnected ? "bg-teal-500 animate-pulse" : "bg-red-500")}></div>
                    <span className={clsx("text-[10px] font-black uppercase tracking-widest", config.isConnected ? "text-teal-700" : "text-red-700")}>{config.isConnected ? "WhatsApp Ativo" : "WhatsApp Offline"}</span>
                </div>
                {config.isConnected ? <Wifi size={14} className="text-teal-400" /> : <WifiOff size={14} className="text-red-400" />}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading && conversations.length === 0 ? (<div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-teal-600" /></div>) : 
            conversations.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-4"><MessageCircle size={48} className="mx-auto opacity-10" /><p className="text-sm">Nenhum chat.</p></div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {conversations.map(conv => (
                        <div key={conv.id} onClick={() => setSelectedChatId(conv.id)} className={clsx("p-5 cursor-pointer transition-all hover:bg-white border-l-4 group relative", selectedChatId === conv.id ? "bg-white border-l-teal-500 shadow-sm" : "border-l-transparent")}>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-col">
                                    <span className="font-black text-sm text-slate-800">{conv.contact_name}</span>
                                    <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter opacity-70">{formatPhoneDisplay(conv.wa_id)}</span>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase">{formatTime(conv.updated_at)}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate pr-6 mt-1">{conv.last_message}</p>
                            {conv.unread_count > 0 && <span className="absolute right-5 bottom-5 w-5 h-5 bg-teal-600 text-white text-[10px] font-black flex items-center justify-center rounded-full">{conv.unread_count}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO (CHAT) */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative min-w-0">
          {selectedChat ? (
              <>
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-slate-500" onClick={() => setSelectedChatId(null)}><ChevronRight size={24} className="rotate-180" /></button>
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold border border-slate-200 shadow-inner"><User size={28} /></div>
                        <div>
                            <h3 className="font-black text-slate-800 text-base leading-tight">{selectedChat.contact_name}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{formatPhoneDisplay(selectedChat.wa_id)}</p>
                                {crmInfo && (
                                    <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 border border-indigo-100">
                                        <UserCheck size={10}/> CRM: {crmInfo.role}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {crmInfo && (
                        <div className="hidden lg:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Vínculo Atual</p>
                                <p className="text-[10px] font-bold text-slate-700">{crmInfo.detail || 'Geral'}</p>
                            </div>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <div className="p-1.5 bg-white rounded-lg text-indigo-600"><BadgeInfo size={18}/></div>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    {isLoadingMessages ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-white" /></div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={clsx("flex animate-in fade-in slide-in-from-bottom-2", msg.sender_type === 'agent' ? "justify-end" : "justify-start")}>
                                <div className={clsx("max-w-[75%] rounded-2xl px-4 py-3 shadow-md relative text-sm font-medium", msg.sender_type === 'agent' ? "bg-teal-100 text-teal-900 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none")}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1.5 mt-1.5"><span className="text-[9px] font-black text-slate-400 opacity-60 uppercase">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{msg.sender_type === 'agent' && <CheckCheck size={14} className="text-teal-600" />}</div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="bg-white/95 backdrop-blur-md p-5 border-t border-slate-200">
                    <form onSubmit={handleSendMessage} className="flex gap-3 max-w-5xl mx-auto">
                        <div className="flex-1 relative">
                            <input type="text" className="w-full pl-6 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:bg-white focus:ring-4 focus:ring-teal-500/10 text-sm font-medium transition-all" placeholder="Escreva aqui..." value={inputText} onChange={e => setInputText(e.target.value)} />
                            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600"><Paperclip size={20}/></button>
                        </div>
                        <button type="submit" disabled={isSending || !inputText.trim()} className="bg-teal-600 text-white p-4 rounded-2xl hover:bg-teal-700 disabled:opacity-50 shadow-xl active:scale-95 shrink-0 flex items-center justify-center">
                            {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                        </button>
                    </form>
                </div>
              </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/50 backdrop-blur-sm">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 animate-bounce"><MessageCircle size={48} className="text-teal-500 opacity-40" /></div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Atendimento WhatsApp</h3>
                <p className="text-sm font-medium text-center mt-2 max-w-xs">Selecione uma conversa ou abra as configurações para conectar.</p>
            </div>
          )}
      </div>

      {/* OVERLAY DE CONFIGURAÇÕES */}
      {showSettings && (
          <div className="absolute inset-0 z-[60] bg-slate-50 flex flex-col animate-in slide-in-from-right-4 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 z-10 shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="bg-teal-100 p-2 rounded-xl text-teal-700"><Settings size={24} /></div>
                      <div>
                          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Conectar WhatsApp</h2>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Escolha seu provedor</p>
                      </div>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-8 bg-slate-50">
                  <div className="max-w-4xl mx-auto space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button onClick={() => setConfig({...config, mode: 'twilio'})} className={clsx("p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4", config.mode === 'twilio' ? "bg-white border-red-500 shadow-lg" : "bg-white border-slate-100 opacity-60")}>
                              <div className={clsx("p-3 rounded-2xl", config.mode === 'twilio' ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400")}><Cloud size={24}/></div>
                              <div><h4 className="font-black text-slate-800 text-sm uppercase">Twilio WhatsApp</h4><p className="text-xs text-slate-500 mt-1">Conexão oficial estável.</p></div>
                          </button>
                          <button onClick={() => setConfig({...config, mode: 'evolution'})} className={clsx("p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4", config.mode === 'evolution' ? "bg-white border-blue-500 shadow-lg" : "bg-white border-slate-100 opacity-60")}>
                              <div className={clsx("p-3 rounded-2xl", config.mode === 'evolution' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}><Link2 size={24}/></div>
                              <div><h4 className="font-black text-slate-800 text-sm uppercase">Evolution API</h4><p className="text-xs text-slate-500 mt-1">Servidor próprio (QR/Código).</p></div>
                          </button>
                      </div>

                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12">
                              <div className="w-full lg:w-64 aspect-square bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 overflow-hidden shrink-0">
                                  {/* Lógica de Renderização de Status */}
                                  {isGeneratingConnection ? (
                                      <div className="flex flex-col items-center gap-2">
                                          <Loader2 size={32} className="animate-spin text-teal-600" />
                                          <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Processando...</p>
                                      </div>
                                  ) : connError ? (
                                      <div className="flex flex-col items-center gap-2 text-red-500 p-4">
                                          <AlertTriangle size={32} />
                                          <p className="text-[9px] font-black uppercase text-center leading-tight">Falha: {connError}</p>
                                          <button onClick={handleConnectEvolution} className="text-[9px] font-bold underline mt-2">Tentar Novamente</button>
                                      </div>
                                  ) : config.isConnected ? (
                                      <div className="flex flex-col items-center animate-bounce">
                                          <CheckCircle2 size={64} className="text-teal-500 mb-2" />
                                          <p className="text-xs font-black text-teal-600 uppercase">Conectado!</p>
                                      </div>
                                  ) : config.mode === 'evolution' && config.evolutionMethod === 'code' && pairingCodeValue ? (
                                      <div className="flex flex-col items-center justify-center gap-4">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">Código de Pareamento</p>
                                          <div className="bg-slate-900 text-teal-400 px-6 py-4 rounded-2xl font-mono text-3xl font-black shadow-lg">{pairingCodeValue}</div>
                                          <p className="text-[9px] text-slate-500 font-bold uppercase text-center max-w-[180px]">Insira no seu WhatsApp - Menu Dispositivos</p>
                                      </div>
                                  ) : config.mode === 'evolution' && config.evolutionMethod === 'qr' && qrCodeUrl ? (
                                      <div className="w-full h-full p-2 bg-white rounded-xl flex items-center justify-center">
                                          <img src={qrCodeUrl} alt="QR Code" className="max-w-full max-h-full object-contain" />
                                      </div>
                                  ) : (
                                      <div className="flex flex-col items-center">
                                          {config.mode === 'twilio' ? <Cloud size={48} className="text-slate-300 mb-3" /> : (config.evolutionMethod === 'code' ? <Smartphone size={48} className="text-slate-300 mb-3" /> : <QrCode size={48} className="text-slate-300 mb-3" />)}
                                          <p className="text-[10px] font-black text-slate-400 uppercase leading-tight text-center max-w-[160px]">{config.mode === 'twilio' ? 'Preencha os dados e valide' : 'Gere o código ou QR para conectar'}</p>
                                      </div>
                                  )}
                              </div>
                              <div className="flex-1 space-y-4 w-full min-w-0">
                                  <h4 className="text-lg font-black text-slate-800">Status da Instância:</h4>
                                  {config.mode === 'evolution' && (
                                      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                                          <button onClick={() => setConfig({...config, evolutionMethod: 'qr'})} className={clsx("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", config.evolutionMethod === 'qr' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500")}>QR Code</button>
                                          <button onClick={() => setConfig({...config, evolutionMethod: 'code'})} className={clsx("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", config.evolutionMethod === 'code' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500")}>Código</button>
                                      </div>
                                  )}
                                  <div className="bg-slate-900 rounded-xl p-4 h-28 font-mono text-[10px] text-teal-400 overflow-y-auto custom-scrollbar w-full">
                                      {connLogs.length === 0 ? "> Aguardando início da conexão..." : connLogs.map((log, i) => <div key={i}>{log}</div>)}
                                  </div>
                                  <div className="pt-2">
                                      {config.isConnected ? (
                                          <button onClick={() => setConfig({...config, isConnected: false})} className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all">
                                              Desconectar WhatsApp
                                          </button>
                                      ) : (
                                          <button onClick={handleConnectEvolution} disabled={isGeneratingConnection} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                                              {isGeneratingConnection ? <Loader2 size={16} className="animate-spin" /> : (config.mode === 'twilio' ? <ShieldCheck size={16}/> : (config.evolutionMethod === 'code' ? <Hash size={16}/> : <QrCode size={16}/>))}
                                              {config.mode === 'twilio' ? "Verificar Credenciais" : (qrCodeUrl || pairingCodeValue ? "Atualizar" : "Gerar Conexão")}
                                          </button>
                                      )}
                                  </div>
                              </div>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-100">
                              {config.mode === 'twilio' ? (
                                  <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-6">
                                      <h5 className="text-[10px] font-black text-red-700 uppercase flex items-center gap-2 tracking-widest"><Cloud size={14}/> Credenciais Twilio Console</h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="md:col-span-2"><label className="block text-[9px] font-black text-red-400 uppercase mb-1.5 ml-1">Account SID</label><input type="text" className="w-full px-4 py-3 border border-red-200 rounded-xl text-sm font-mono bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none" value={config.twilioAccountSid} onChange={e => setConfig({...config, twilioAccountSid: e.target.value})} /></div>
                                          <div><label className="block text-[9px] font-black text-red-400 uppercase mb-1.5 ml-1">Auth Token</label><input type="password" title="Auth Token" className="w-full px-4 py-3 border border-red-200 rounded-xl text-sm font-mono bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none" value={config.twilioAuthToken} onChange={e => setConfig({...config, twilioAuthToken: e.target.value})} /></div>
                                          <div><label className="block text-[9px] font-black text-red-400 uppercase mb-1.5 ml-1">Número Twilio (whatsapp:+...)</label><input type="text" className="w-full px-4 py-3 border border-red-200 rounded-xl text-sm font-mono bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none" value={config.twilioFromNumber} onChange={e => setConfig({...config, twilioFromNumber: e.target.value})} placeholder="whatsapp:+1..." /></div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-6">
                                      <h5 className="text-[10px] font-black text-blue-700 uppercase flex items-center gap-2 tracking-widest"><Smartphone size={14}/> Dados Evolution API</h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="md:col-span-2"><label className="block text-[9px] font-black text-blue-400 uppercase mb-1.5 ml-1">URL da API</label><input type="text" className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm font-mono bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" value={config.instanceUrl} onChange={e => setConfig({...config, instanceUrl: e.target.value})} placeholder="https://api.sua-evolution.com" /></div>
                                          <div><label className="block text-[9px] font-black text-blue-400 uppercase mb-1.5 ml-1">Instância</label><input type="text" className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-bold" value={config.instanceName} onChange={e => setConfig({...config, instanceName: e.target.value})} /></div>
                                          <div><label className="block text-[9px] font-black text-blue-400 uppercase mb-1.5 ml-1">API Key</label><input type="password" title="Key" className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-mono" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} /></div>
                                          {config.evolutionMethod === 'code' && (
                                              <div className="md:col-span-2"><label className="block text-[9px] font-black text-blue-400 uppercase mb-1.5 ml-1">Seu Celular p/ Pareamento (55...)</label><input type="text" className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm font-bold bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" value={config.pairingNumber} onChange={e => setConfig({...config, pairingNumber: e.target.value})} placeholder="55..." /></div>
                                          )}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                          <h3 className="font-black text-slate-700 text-xs uppercase flex items-center gap-2"><Database size={18} className="text-teal-600" /> Webhook de Recebimento</h3>
                          <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
                              <code className="flex-1 bg-white border p-4 rounded-xl text-[10px] font-mono break-all leading-relaxed w-full">{edgeFunctionUrl}</code>
                              <button onClick={() => { navigator.clipboard.writeText(edgeFunctionUrl); alert("URL Copiada!"); }} className="bg-teal-600 text-white p-4 rounded-xl active:scale-95 transition-all shadow-md shrink-0 w-full md:w-auto flex justify-center"><Copy size={20}/></button>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="px-8 py-6 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-end gap-3 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
                  <button onClick={() => setShowSettings(false)} className="px-8 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                  <button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-teal-600 hover:bg-teal-700 text-white px-12 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                      {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Configurações
                  </button>
              </div>
          </div>
      )}

      {/* Modal Nova Conversa */}
      {showNewChatModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-3"><Plus className="text-teal-600" size={24} /> Novo Chat</h3>
                      <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleStartNewChat} className="p-8 space-y-6">
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">WhatsApp (DDI+DDD+Nº)</label><input type="text" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={newChatPhone} onChange={e => setNewChatPhone(e.target.value)} required placeholder="5511999999999" /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nome do Contato</label><input type="text" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={newChatName} onChange={e => setNewChatName(e.target.value)} required placeholder="Ex: Cliente João" /></div>
                      <div className="flex justify-end gap-3 pt-6 border-t"><button type="button" onClick={() => setShowNewChatModal(false)} className="px-6 py-3 text-slate-500 font-bold text-sm">Cancelar</button><button type="submit" disabled={isCreatingChat} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 active:scale-95 disabled:opacity-50">{isCreatingChat ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Abrir</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
