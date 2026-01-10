import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageCircle, Send, CheckCheck, User, X, Plus, 
  Settings, Save, Smartphone, Loader2, Wifi, 
  WifiOff, ChevronRight, RefreshCw, UserCheck, Search, Link2,
  AlertCircle, ShieldCheck, UserPlus, Kanban, List, MoveRight,
  Clock, CheckCircle, Circle, MessageSquare, ExternalLink, GraduationCap, School, Building2, Store, Heart,
  Filter, LayoutGrid, ArrowRightLeft, DollarSign, Briefcase,
  // Added missing icon imports
  Edit2, Trash2
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { whatsappService } from '../services/whatsappService';
import { AttendanceFunnel, AttendanceStage } from '../types';

// --- TYPES ---
type ChatStatus = 'open' | 'pending' | 'waiting' | 'closed';

interface WAConversation {
  id: string;
  wa_id: string;
  contact_name: string;
  contact_phone: string;
  last_message: string;
  unread_count: number;
  status: ChatStatus;
  funnel_id?: string;
  stage_id?: string;
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
  isConnected: boolean;
}

interface WhatsAppInboxProps {
    onNavigateToRecord?: (tab: string, recordId: string) => void;
    currentAgentName?: string;
}

const ATTENDANCE_STAGES: { id: ChatStatus; label: string; color: string; bg: string }[] = [
    { id: 'open', label: 'Novos / Sem Resposta', color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'pending', label: 'Em Atendimento', color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'waiting', label: 'Aguardando Cliente', color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'closed', label: 'Finalizados', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export const WhatsAppInbox: React.FC<WhatsAppInboxProps> = ({ onNavigateToRecord, currentAgentName }) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'config'>('list');
  const [conversations, setConversations] = useState<WAConversation[]>([]);
  const [funnels, setFunnels] = useState<AttendanceFunnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [globalContactInfo, setGlobalContactInfo] = useState<any>(null);
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null);
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showIdentifyModal, setShowIdentifyModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<WAConversation | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Funnel Config States
  const [editingFunnel, setEditingFunnel] = useState<AttendanceFunnel | null>(null);
  const [isSavingFunnel, setIsSavingFunnel] = useState(false);

  // Form Identify
  const [identifyPhone, setIdentifyPhone] = useState('');
  const [identifyName, setIdentifyName] = useState('');
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingCodeValue, setPairingCodeValue] = useState<string | null>(null);
  const [isGeneratingConnection, setIsGeneratingConnection] = useState(false);
  const [connLogs, setConnLogs] = useState<string[]>([]);

  const [config, setConfig] = useState<WAConfig>({
      mode: 'evolution',
      evolutionMethod: 'qr',
      instanceUrl: '',
      instanceName: '',
      apiKey: '',
      pairingNumber: '',
      isConnected: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChat = conversations.find(c => c.id === selectedChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
      fetchConversations();
      fetchFunnels();
      loadConfig();
  }, []);

  useEffect(() => {
      const timer = setInterval(() => {
          if (!showSettings && !showIdentifyModal && viewMode !== 'config') {
            fetchConversations(false);
            if (selectedChatId) fetchMessages(selectedChatId, false);
            checkRealStatus();
          }
      }, 8000); 
      return () => clearInterval(timer);
  }, [selectedChatId, showSettings, showIdentifyModal, config.instanceUrl, viewMode]);

  useEffect(() => {
      if (selectedChatId) {
          fetchMessages(selectedChatId);
          loadGlobalIdentification();
          handleMarkAsRead(selectedChatId);
      } else {
          setMessages([]);
          setGlobalContactInfo(null);
      }
  }, [selectedChatId]);

  const fetchFunnels = async () => {
      try {
          const data = await whatsappService.getFunnels();
          setFunnels(data);
          if (data.length > 0 && !selectedFunnelId) {
              setSelectedFunnelId(data[0].id);
          }
      } catch (e) { console.error(e); }
  };

  const loadGlobalIdentification = async () => {
      if (!selectedChat) return;
      const identifier = selectedChat.contact_phone || selectedChat.wa_id;
      const info = await whatsappService.identifyContactGlobally(identifier, selectedChat.contact_name);
      setGlobalContactInfo(info);
      if (!info && whatsappService.isLid(selectedChat.wa_id)) {
          setIdentifyName(selectedChat.contact_name);
      }
  };

  const handleMarkAsRead = async (chatId: string) => {
      setConversations(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
      try {
          await whatsappService.markAsRead(chatId);
      } catch (e) {
          console.error("Erro ao marcar como lido no DB", e);
      }
  };

  const handleUpdateStage = async (chatId: string, status: ChatStatus) => {
      try {
          await whatsappService.updateChatStatus(chatId, status);
          setConversations(prev => prev.map(c => c.id === chatId ? { ...c, status } : c));
      } catch (e) {
          alert("Erro ao mudar etapa do atendimento.");
      }
  };

  const handleMoveChatAction = async (chat: WAConversation, fId: string, sId: string) => {
      try {
          await whatsappService.moveChat(chat.id, fId, sId);
          setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, funnel_id: fId, stage_id: sId } : c));
          setShowMoveModal(null);
      } catch (e) {
          alert("Erro ao mover chat.");
      }
  };

  const handleDragStart = (id: string) => setDraggedChatId(id);
  const handleOnDrop = async (stageId: string) => {
      if (!draggedChatId || !selectedFunnelId) return;
      try {
          await whatsappService.moveChat(draggedChatId, selectedFunnelId, stageId);
          setConversations(prev => prev.map(c => c.id === draggedChatId ? { ...c, stage_id: stageId } : c));
      } catch (e) {
          alert("Erro ao mover card.");
      }
      setDraggedChatId(null);
  };

  const addLog = (msg: string) => setConnLogs(prev => [msg, ...prev].slice(0, 5));

  const loadConfig = async () => {
      const c = await appBackend.getWhatsAppConfig();
      if (c) {
          setConfig(prev => ({ ...prev, ...c }));
          checkRealStatus(c);
      }
  };

  const checkRealStatus = async (customConfig?: any) => {
    const target = customConfig || config;
    if (!target.instanceUrl || !target.instanceName) return;
    try {
        const baseUrl = target.instanceUrl.replace(/\/$/, "");
        const response = await fetch(`${baseUrl}/instance/connectionState/${target.instanceName}`, {
            headers: { 'apikey': target.apiKey }
        });
        const data = await response.json();
        const connected = data.instance?.state === 'open' || data.state === 'open';
        if (connected !== config.isConnected) setConfig(prev => ({ ...prev, isConnected: connected }));
    } catch (e) {
        if (config.isConnected) setConfig(prev => ({ ...prev, isConnected: false }));
    }
  };

  const fetchConversations = async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      try {
          const { data } = await appBackend.client
              .from('crm_whatsapp_chats')
              .select('*')
              .order('updated_at', { ascending: false });
          
          if (data) {
              const processed = data.map((c: any) => ({
                  ...c,
                  unread_count: c.id === selectedChatId ? 0 : (c.unread_count || 0)
              }));
              setConversations(processed);
          }
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
    const agentName = currentAgentName || 'Atendimento VOLL';
    const signedMessage = `*Atendente ${agentName}:*\n${inputText}`;
    const messageText = inputText;
    setInputText('');
    try {
        const result = await whatsappService.sendTextMessage(selectedChat, signedMessage);
        const waId = result.key?.id || result.messageId; 
        await whatsappService.syncMessage(selectedChatId, signedMessage, 'agent', waId);
        if (selectedChat.status === 'open' || selectedChat.status === 'pending') {
            await handleUpdateStage(selectedChatId, 'waiting');
        }
        await fetchMessages(selectedChatId, false);
        await fetchConversations(false);
    } catch (err: any) {
        alert("Erro ao enviar: " + err.message);
        setInputText(messageText);
    } finally { setIsSending(false); }
  };

  const handleSaveFunnel = async () => {
      if (!editingFunnel?.name) return;
      setIsSavingFunnel(true);
      try {
          await whatsappService.saveFunnel(editingFunnel);
          await fetchFunnels();
          setEditingFunnel(null);
      } catch (e) { alert("Erro ao salvar funil."); } finally { setIsSavingFunnel(false); }
  };

  const handleSaveConfig = async () => {
      setIsSavingConfig(true);
      try {
          await appBackend.saveWhatsAppConfig(config);
          setShowSettings(false);
          alert("Configurações salvas!");
      } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsSavingConfig(false); }
  };

  const handleIdentifySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedChatId || !identifyPhone) return;
      setIsSavingIdentity(true);
      try {
          await whatsappService.associateLidWithPhone(selectedChatId, identifyPhone, identifyName);
          await fetchConversations();
          await loadGlobalIdentification();
          setShowIdentifyModal(false);
          setIdentifyPhone('');
      } catch (e: any) {
          alert("Erro ao identificar: " + e.message);
      } finally {
          setIsSavingIdentity(false);
      }
  };

  const handleConnectEvolution = async () => {
      setIsGeneratingConnection(true);
      setQrCodeUrl(null);
      setPairingCodeValue(null);
      setConnLogs([`Iniciando tentativa de conexão...`]);
      try {
          if (!config.instanceUrl || !config.instanceName) throw new Error("Preencha os dados da instância.");
          const baseUrl = config.instanceUrl.replace(/\/$/, "");
          if (config.evolutionMethod === 'code') {
              const cleanNumber = config.pairingNumber.replace(/\D/g, '');
              const response = await fetch(`${baseUrl}/instance/connect/pairingCode/${config.instanceName}?number=${cleanNumber}`, {
                  headers: { 'apikey': config.apiKey }
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Erro no pareamento");
              setPairingCodeValue(data.code);
          } else {
              const response = await fetch(`${baseUrl}/instance/connect/${config.instanceName}`, {
                  headers: { 'apikey': config.apiKey }
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Erro no QR");
              const token = data.base64 || data.code;
              setQrCodeUrl(token.startsWith('data:image') ? token : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`);
          }
          addLog("Solicitação enviada com sucesso.");
      } catch (err: any) { addLog(`[ERRO] ${err.message}`); } finally { setIsGeneratingConnection(false); }
  };

  const handleStartNewChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChatPhone) return;
      setIsCreatingChat(true);
      try {
          const chat = await whatsappService.getOrCreateChat(newChatPhone, newChatName || newChatPhone);
          await fetchConversations();
          setSelectedChatId(chat.id);
          setShowNewChatModal(false);
          setNewChatPhone('');
          setNewChatName('');
      } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsCreatingChat(false); }
  };

  const formatTime = (dateStr: string) => {
      if (!dateStr) return '';
      try {
          const date = new Date(dateStr);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) { return ''; }
  };

  const formatPhoneDisplay = (id: string, contactPhone?: string) => {
      const number = contactPhone || id;
      if (!number) return '';
      const cleaned = number.replace(/\D/g, '');
      if (cleaned.length > 13 && !contactPhone) return `ID Técnico: ${number.substring(0, 8)}...`;
      if (cleaned.startsWith('55') && cleaned.length >= 12) {
          const ddd = cleaned.slice(2, 4);
          const rest = cleaned.slice(4);
          return `+55 (${ddd}) ${rest.length === 9 ? rest.slice(0, 5) + '-' + rest.slice(5) : rest.slice(0, 4) + '-' + rest.slice(4)}`;
      }
      return number;
  };

  const getEntityIcon = (type: string) => {
      switch(type) {
          case 'student': return <GraduationCap size={12}/>;
          case 'teacher': return <School size={12}/>;
          case 'collaborator': return <Heart size={12} className="fill-blue-600"/>;
          case 'studio': return <Building2 size={12}/>;
          case 'franchise': return <Store size={12}/>;
          default: return <UserCheck size={12}/>;
      }
  };

  const currentFunnel = funnels.find(f => f.id === selectedFunnelId);

  return (
    <div className="flex h-full bg-slate-50 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
      
      {/* SIDEBAR */}
      <div className={clsx("flex flex-col border-r border-slate-100 w-full md:w-80 lg:w-96 shrink-0 bg-white", selectedChatId && viewMode !== 'config' ? "hidden md:flex" : "flex")}>
        <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3"><MessageCircle className="text-teal-600" /> Atendimento</h2>
                <div className="flex gap-1">
                    <div className="bg-slate-100 p-1 rounded-lg flex mr-2">
                        <button onClick={() => setViewMode('list')} className={clsx("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")} title="Vista Lista"><List size={16}/></button>
                        <button onClick={() => setViewMode('kanban')} className={clsx("p-1.5 rounded-md transition-all", viewMode === 'kanban' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")} title="Vista Kanban"><Kanban size={16}/></button>
                        <button onClick={() => setViewMode('config')} className={clsx("p-1.5 rounded-md transition-all", viewMode === 'config' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")} title="Configurar Funis"><Settings size={16}/></button>
                    </div>
                    <button onClick={() => fetchConversations()} className="p-2 text-slate-400 hover:text-teal-600 rounded-xl transition-all"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
                    <button onClick={() => setShowNewChatModal(true)} className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-lg active:scale-95"><Plus size={18} /></button>
                    <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-teal-600 rounded-xl transition-all"><Filter size={18} /></button>
                </div>
            </div>
            
            {viewMode === 'kanban' && (
                <div className="relative animate-in slide-in-from-top-2">
                    <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                    <select 
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                        value={selectedFunnelId || ''}
                        onChange={e => setSelectedFunnelId(e.target.value)}
                    >
                        {funnels.map(f => <option key={f.id} value={f.id}>Funil: {f.name}</option>)}
                    </select>
                </div>
            )}

            <div className={clsx("p-3 rounded-2xl border-2 flex items-center justify-between transition-all", config.isConnected ? "bg-teal-50 border-teal-100" : "bg-red-50 border-red-100")}>
                <div className="flex items-center gap-2">
                    <div className={clsx("w-2 h-2 rounded-full", config.isConnected ? "bg-teal-500 animate-pulse" : "bg-red-500")}></div>
                    <span className={clsx("text-[10px] font-black uppercase tracking-widest", config.isConnected ? "text-teal-700" : "text-red-700")}>{config.isConnected ? "WhatsApp Ativo" : "WhatsApp Offline"}</span>
                </div>
                {config.isConnected ? <Wifi size={14} className="text-teal-400" /> : <WifiOff size={14} className="text-red-400" />}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            {isLoading && conversations.length === 0 ? (<div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-teal-600" /></div>) : 
            viewMode === 'list' ? (
                conversations.map(conv => (
                    <div key={conv.id} onClick={() => setSelectedChatId(conv.id)} className={clsx("p-5 cursor-pointer transition-all hover:bg-white border-l-4 group relative", selectedChatId === conv.id ? "bg-white border-l-teal-500 shadow-sm" : "border-l-transparent border-b border-slate-50")}>
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex flex-col">
                                <span className={clsx("font-black text-sm", conv.unread_count > 0 ? "text-slate-900" : "text-slate-600")}>{conv.contact_name}</span>
                                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{formatPhoneDisplay(conv.wa_id, conv.contact_phone)}</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-300 uppercase">{formatTime(conv.updated_at)}</span>
                        </div>
                        <p className={clsx("text-xs truncate pr-6 mt-1", conv.unread_count > 0 ? "font-bold text-slate-800" : "text-slate-500")}>{conv.last_message}</p>
                        <div className="flex items-center gap-2 mt-2">
                             {ATTENDANCE_STAGES.find(s => s.id === conv.status) && (
                                 <span className={clsx("text-[8px] font-black px-1.5 py-0.5 rounded uppercase border", ATTENDANCE_STAGES.find(s => s.id === conv.status)?.bg, ATTENDANCE_STAGES.find(s => s.id === conv.status)?.color)}>
                                     {ATTENDANCE_STAGES.find(s => s.id === conv.status)?.label}
                                 </span>
                             )}
                             {conv.funnel_id && (
                                 <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase border border-indigo-100 flex items-center gap-1">
                                     <Filter size={8}/> {funnels.find(f => f.id === conv.funnel_id)?.name}
                                 </span>
                             )}
                        </div>
                        {conv.unread_count > 0 && <span className="absolute right-5 bottom-5 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full animate-bounce shadow-lg">{conv.unread_count}</span>}
                    </div>
                ))
            ) : viewMode === 'kanban' ? (
                <div className="p-4 space-y-6">
                    {currentFunnel?.stages.map(stage => {
                        const stageDeals = conversations.filter(c => c.funnel_id === currentFunnel.id && c.stage_id === stage.id);
                        return (
                            <div key={stage.id} className="space-y-2">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <div className={clsx("w-2 h-2 rounded-full", stage.color)}></div>
                                        {stage.title}
                                    </h4>
                                    <span className="text-[9px] font-black bg-slate-100 px-1.5 py-0.5 rounded-full border">{stageDeals.length}</span>
                                </div>
                                <div 
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => handleOnDrop(stage.id)}
                                    className="min-h-[60px] bg-slate-100/50 rounded-2xl p-2 border border-dashed border-slate-200"
                                >
                                    {stageDeals.map(c => (
                                        <div 
                                            key={c.id} 
                                            draggable 
                                            onDragStart={() => handleDragStart(c.id)}
                                            onClick={() => setSelectedChatId(c.id)}
                                            className={clsx("bg-white p-3 rounded-xl shadow-sm border mb-2 cursor-grab active:cursor-grabbing hover:border-teal-400 transition-all", selectedChatId === c.id ? "ring-2 ring-teal-500 border-transparent" : "border-slate-100")}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs font-bold text-slate-800 truncate">{c.contact_name}</p>
                                                {c.unread_count > 0 && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate">{c.last_message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {!currentFunnel && <div className="p-10 text-center text-slate-400 text-xs italic">Crie um funil nas configurações para usar o Kanban.</div>}
                </div>
            ) : (
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between"><h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2"><Filter size={16} className="text-teal-600"/> Gerenciar Funis</h3><button onClick={() => setEditingFunnel({ id: crypto.randomUUID(), name: '', stages: [] })} className="p-1.5 bg-teal-600 text-white rounded-lg"><Plus size={16}/></button></div>
                    <div className="space-y-3">
                        {funnels.map(f => (
                            <div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-teal-300 transition-all group">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-slate-800 text-sm">{f.name}</h4>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingFunnel(f)} className="p-1 text-slate-400 hover:text-teal-600"><Edit2 size={14}/></button>
                                        <button onClick={() => whatsappService.deleteFunnel(f.id).then(fetchFunnels)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {f.stages.map(s => <span key={s.id} className={clsx("px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase border", s.color)}>{s.title}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* ÁREA DE CONVERSA */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative min-w-0">
          {selectedChat ? (
              <>
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm z-10 shrink-0 gap-4">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-slate-500" onClick={() => setSelectedChatId(null)}><ChevronRight size={24} className="rotate-180" /></button>
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold border border-slate-200 shadow-inner"><User size={28} /></div>
                        <div className="min-w-0">
                            <h3 className="font-black text-slate-800 text-base leading-tight truncate">{selectedChat.contact_name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{formatPhoneDisplay(selectedChat.wa_id, selectedChat.contact_phone)}</p>
                                {globalContactInfo && (
                                    <span className={clsx("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 border", globalContactInfo.color)}>
                                        {getEntityIcon(globalContactInfo.type)} {globalContactInfo.label}
                                    </span>
                                )}
                                <button 
                                    onClick={() => setShowMoveModal(selectedChat)}
                                    className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 border border-indigo-100 hover:bg-indigo-100"
                                >
                                    <ArrowRightLeft size={10}/> Mover de Funil
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SELECTOR DE ETAPA LEGADO E DINÂMICO */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
                        {selectedChat.funnel_id ? (
                            funnels.find(f => f.id === selectedChat.funnel_id)?.stages.map(s => (
                                <button 
                                    key={s.id} 
                                    onClick={() => handleMoveChatAction(selectedChat, selectedChat.funnel_id!, s.id)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 transition-all flex-1 md:flex-none justify-center whitespace-nowrap",
                                        selectedChat.stage_id === s.id ? "bg-white text-indigo-700 shadow-md ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {selectedChat.stage_id === s.id ? <CheckCircle size={10}/> : <Circle size={10}/>}
                                    {s.title}
                                </button>
                            ))
                        ) : (
                            ATTENDANCE_STAGES.map(stage => (
                                <button 
                                    key={stage.id} 
                                    onClick={() => handleUpdateStage(selectedChat.id, stage.id)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 transition-all flex-1 md:flex-none justify-center whitespace-nowrap",
                                        selectedChat.status === stage.id ? "bg-white text-indigo-700 shadow-md ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {selectedChat.status === stage.id ? <CheckCircle size={10}/> : <Circle size={10}/>}
                                    {stage.label.split(' ')[0]}
                                </button>
                            ))
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    {messages.map(msg => (
                        <div key={msg.id} className={clsx("flex animate-in fade-in slide-in-from-bottom-2", msg.sender_type === 'agent' ? "justify-end" : "justify-start")}>
                            <div className={clsx("max-w-[75%] rounded-2xl px-4 py-3 shadow-md relative text-sm font-medium", msg.sender_type === 'agent' ? "bg-teal-100 text-teal-900 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none")}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                    <span className="text-[9px] font-black text-slate-400 opacity-60 uppercase">{new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.sender_type === 'agent' && <CheckCheck size={14} className="text-teal-600" />}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-white/95 backdrop-blur-md p-5 border-t border-slate-200 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-3 max-w-5xl mx-auto">
                        <input type="text" className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:bg-white focus:ring-4 focus:ring-teal-500/10 text-sm font-medium transition-all" placeholder="Escreva aqui..." value={inputText} onChange={e => setInputText(e.target.value)} />
                        <button type="submit" disabled={isSending || !inputText.trim()} className="bg-teal-600 text-white p-4 rounded-2xl hover:bg-teal-700 disabled:opacity-50 shadow-xl active:scale-95 shrink-0 flex items-center justify-center">
                            {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                        </button>
                    </form>
                </div>
              </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/50 backdrop-blur-sm">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 animate-bounce"><MessageSquare size={48} className="text-teal-500 opacity-40" /></div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Atendimento WhatsApp</h3>
                <p className="text-sm font-medium text-center mt-2 max-w-xs px-6">Selecione uma conversa ao lado para visualizar a ficha completa do atendimento.</p>
            </div>
          )}
      </div>

      {/* MODAL CONFIG FUNNEL */}
      {editingFunnel && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">Configurar Funil de Atendimento</h3>
                      <button onClick={() => setEditingFunnel(null)} className="p-2 text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome do Funil</label>
                          <input type="text" className="w-full px-4 py-2 border rounded-xl font-bold" value={editingFunnel.name} onChange={e => setEditingFunnel({...editingFunnel, name: e.target.value})} placeholder="Ex: Atendimento Geral, Financeiro..." />
                      </div>
                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapas do Funil</h4>
                              <button onClick={() => setEditingFunnel({...editingFunnel, stages: [...editingFunnel.stages, { id: crypto.randomUUID(), title: 'Nova Etapa', color: 'bg-slate-500' }]})} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-[10px] font-bold">+ Adicionar</button>
                          </div>
                          <div className="space-y-2">
                              {editingFunnel.stages.map((stage, idx) => (
                                  <div key={stage.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                      <input type="text" className="flex-1 bg-white border px-3 py-1.5 rounded-lg text-sm font-bold" value={stage.title} onChange={e => {
                                          const newStages = [...editingFunnel.stages];
                                          newStages[idx].title = e.target.value;
                                          setEditingFunnel({...editingFunnel, stages: newStages});
                                      }} />
                                      <select className="px-2 py-1.5 border rounded-lg text-xs font-bold bg-white" value={stage.color} onChange={e => {
                                          const newStages = [...editingFunnel.stages];
                                          newStages[idx].color = e.target.value;
                                          setEditingFunnel({...editingFunnel, stages: newStages});
                                      }}>
                                          <option value="bg-slate-500">Cinza</option>
                                          <option value="bg-red-500">Vermelho</option>
                                          <option value="bg-amber-500">Amarelo</option>
                                          <option value="bg-blue-500">Azul</option>
                                          <option value="bg-green-500">Verde</option>
                                          <option value="bg-purple-500">Roxo</option>
                                      </select>
                                      <button onClick={() => setEditingFunnel({...editingFunnel, stages: editingFunnel.stages.filter((_, i) => i !== idx)})} className="p-1.5 text-red-400 hover:bg-red-100 rounded-lg"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl">
                      <button onClick={() => setEditingFunnel(null)} className="px-6 py-2.5 text-slate-600 font-bold">Cancelar</button>
                      <button onClick={handleSaveFunnel} disabled={isSavingFunnel} className="bg-teal-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2">
                          {isSavingFunnel ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Funil
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL MOVE CHAT */}
      {showMoveModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">Direcionar Atendimento</h3>
                      <button onClick={() => setShowMoveModal(null)} className="p-2 text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-black">{showMoveModal.contact_name.charAt(0)}</div>
                          <div><p className="text-[10px] font-black text-indigo-400 uppercase">Mover cliente:</p><p className="text-sm font-bold text-indigo-900">{showMoveModal.contact_name}</p></div>
                      </div>
                      <div className="space-y-4">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o Funil de Destino</p>
                          <div className="grid grid-cols-1 gap-2">
                              {funnels.map(f => (
                                  <div key={f.id} className="space-y-1">
                                      <div className="px-2 py-1 text-[10px] font-black text-slate-400 uppercase bg-slate-100 rounded flex items-center gap-2"><LayoutGrid size={10}/> {f.name}</div>
                                      <div className="flex flex-wrap gap-2 p-2">
                                          {f.stages.map(s => (
                                              <button 
                                                key={s.id} 
                                                onClick={() => handleMoveChatAction(showMoveModal, f.id, s.id)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all hover:shadow-md",
                                                    showMoveModal.funnel_id === f.id && showMoveModal.stage_id === s.id ? "bg-teal-600 text-white border-transparent" : "bg-white text-slate-600 border-slate-200"
                                                )}
                                              >
                                                  {s.title}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                              <div className="space-y-1 mt-4">
                                  <div className="px-2 py-1 text-[10px] font-black text-slate-400 uppercase bg-slate-100 rounded flex items-center gap-2"><Clock size={10}/> Fluxo Legado</div>
                                  <div className="flex flex-wrap gap-2 p-2">
                                      <button onClick={() => { whatsappService.moveChat(showMoveModal.id, '', ''); handleUpdateStage(showMoveModal.id, 'closed'); setShowMoveModal(null); }} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-200">Resetar p/ Atendimento Raiz</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL SETTINGS & IDENTIFY (Existentes no arquivo anterior) */}
      {showIdentifyModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3"><UserPlus className="text-amber-600" size={24}/> <h3 className="text-lg font-black text-slate-800">Identificar Contato</h3></div>
                      <button onClick={() => setShowIdentifyModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleIdentifySubmit} className="p-8 space-y-6">
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-xs text-amber-800 mb-2"><AlertCircle size={16} className="shrink-0" /><p>Vincule este ID técnico ao número real para que o sistema o reconheça no futuro.</p></div>
                      <div className="space-y-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Número de Telefone (Real)</label><div className="relative"><Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/><input type="text" required className="w-full pl-12 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl text-sm focus:bg-white outline-none font-bold" value={identifyPhone} onChange={e => setIdentifyPhone(e.target.value.replace(/\D/g, ''))} placeholder="5551999999999" /></div></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome de Identificação</label><input type="text" required className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl text-sm outline-none font-bold" value={identifyName} onChange={e => setIdentifyName(e.target.value)} placeholder="Nome do cliente" /></div>
                      </div>
                      <button type="submit" disabled={isSavingIdentity} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">{isSavingIdentity ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Identificação</button>
                  </form>
              </div>
          </div>
      )}

      {showSettings && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center">
                      <div className="flex items-center gap-3"><Settings className="text-teal-600" size={24}/> <h3 className="text-lg font-black text-slate-800">Evolution API Config</h3></div>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">URL da API</label><input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={config.instanceUrl} onChange={e => setConfig({...config, instanceUrl: e.target.value})} placeholder="https://api.voll.com" /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome Instância</label><input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={config.instanceName} onChange={e => setConfig({...config, instanceName: e.target.value})} placeholder="Instancia_VOLL" /></div>
                          <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">API Key Global</label><input type="password" title="API Key" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} /></div>
                      </div>
                      <div className="p-6 bg-teal-50 rounded-[2rem] border-2 border-teal-100 space-y-4">
                        <div className="flex justify-between items-center"><h4 className="text-xs font-black text-teal-800 uppercase tracking-widest">Conectar Novo Aparelho</h4><div className="flex gap-2"><button onClick={() => setConfig({...config, evolutionMethod: 'qr'})} className={clsx("px-3 py-1 rounded-lg text-[10px] font-bold uppercase", config.evolutionMethod === 'qr' ? "bg-teal-600 text-white" : "bg-white text-teal-600 border")}>QR Code</button><button onClick={() => setConfig({...config, evolutionMethod: 'code'})} className={clsx("px-3 py-1 rounded-lg text-[10px] font-bold uppercase", config.evolutionMethod === 'code' ? "bg-teal-600 text-white" : "bg-white text-teal-600 border")}>Código</button></div></div>
                        {config.evolutionMethod === 'code' && (<div><label className="block text-[10px] font-bold text-teal-700 uppercase mb-1">Celular (com DDI+DDD)</label><input type="text" className="w-full px-4 py-2 border rounded-xl text-sm" placeholder="5551999999999" value={config.pairingNumber} onChange={e => setConfig({...config, pairingNumber: e.target.value})} /></div>)}
                        <button onClick={handleConnectEvolution} disabled={isGeneratingConnection} className="w-full py-4 bg-white border-2 border-teal-500 text-teal-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-teal-500 hover:text-white transition-all flex items-center justify-center gap-2">{isGeneratingConnection ? <Loader2 size={18} className="animate-spin"/> : <Wifi size={18}/>} Iniciar Pareamento</button>
                        {qrCodeUrl && (<div className="flex flex-col items-center pt-4 animate-in zoom-in-95"><div className="p-4 bg-white rounded-3xl shadow-xl border-2 border-teal-100"><img src={qrCodeUrl} className="w-48 h-48" alt="QR" /></div><p className="text-xs text-teal-600 font-bold mt-4">ESCANEIE COM SEU CELULAR</p></div>)}
                        {pairingCodeValue && (<div className="text-center pt-4 animate-in zoom-in-95"><div className="inline-block px-10 py-6 bg-white rounded-3xl shadow-xl border-2 border-teal-200 text-3xl font-black tracking-[0.5em] text-teal-600">{pairingCodeValue}</div><p className="text-xs text-teal-600 font-bold mt-4 uppercase">DIGITE NO SEU WHATSAPP</p></div>)}
                        <div className="space-y-1">{connLogs.map((log, i) => (<p key={i} className="text-[10px] font-mono text-teal-400">{log}</p>))}</div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-[2rem]"><button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2">{isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Configurações</button></div>
              </div>
          </div>
      )}

      {showNewChatModal && (
          <div className="fixed inset-0 z-150 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50"><div className="flex items-center gap-3"><Plus className="text-teal-600" size={24}/> <h3 className="text-lg font-black text-slate-800">Nova Conversa</h3></div><button onClick={() => setShowNewChatModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button></div>
                  <form onSubmit={handleStartNewChat} className="p-8 space-y-6">
                      <div className="space-y-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Celular do Destinatário</label><div className="relative"><Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/><input type="text" required className="w-full pl-12 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl text-sm focus:bg-white outline-none font-bold" value={newChatPhone} onChange={e => setNewChatPhone(e.target.value.replace(/\D/g, ''))} placeholder="5551999999999" /></div></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome (Opcional)</label><input type="text" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl text-sm outline-none" value={newChatName} onChange={e => setNewChatName(e.target.value)} placeholder="Identificação do contato" /></div>
                      </div>
                      <button type="submit" disabled={isCreatingChat} className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-teal-600/20 active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">{isCreatingChat ? <Loader2 size={18} className="animate-spin" /> : 'Abrir Chat'}</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
