import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageCircle, Send, CheckCheck, User, X, Plus, 
  Settings, Save, Smartphone, Loader2, Wifi, 
  WifiOff, ChevronRight, ChevronDown, RefreshCw, UserCheck, Search, Link2,
  AlertCircle, ShieldCheck, UserPlus, List, MoveRight,
  Clock, CheckCircle, Circle, MessageSquare, ExternalLink, GraduationCap, School, Building2, Store, Heart,
  Filter, LayoutGrid, ArrowRightLeft, DollarSign, Briefcase,
  Edit2, Trash2, Tag, Hash, Kanban, Copy,
  // Added missing icon imports to fix line 572 and 575
  Bot, Zap
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { whatsappService } from '../services/whatsappService';
import { AttendanceTag, AiConfig } from '../types';

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
  tag?: string;
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

const ATTENDANCE_STAGES: { id: ChatStatus; label: string; color: string; bg: string; dot: string }[] = [
    { id: 'open', label: 'Novos / Sem Resposta', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
    { id: 'pending', label: 'Em Atendimento', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    { id: 'waiting', label: 'Aguardando Cliente', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
    { id: 'closed', label: 'Finalizados', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
];

export const WhatsAppInbox: React.FC<WhatsAppInboxProps> = ({ onNavigateToRecord, currentAgentName }) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'config'>('list');
  const [conversations, setConversations] = useState<WAConversation[]>([]);
  const [tags, setTags] = useState<AttendanceTag[]>([]);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [globalContactInfo, setGlobalContactInfo] = useState<any>(null);
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<ChatStatus[]>([]);

  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showIdentifyModal, setShowIdentifyModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Tag Config States
  const [editingTag, setEditingTag] = useState<Partial<AttendanceTag> | null>(null);
  const [isSavingTag, setIsSavingTag] = useState(false);

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

  // URL de Webhook específica fornecida pelo usuário para o Supabase Functions
  const webhookUrlDisplay = "https://wfrzsnwisypmgsbeccfj.supabase.co/functions/v1/rapid-service";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
      fetchConversations();
      fetchTags();
      loadConfig();
      fetchAiConfig();
  }, []);

  const fetchAiConfig = async () => {
    try {
      const cfg = await appBackend.getAiConfig();
      setAiConfig(cfg);
    } catch (e) {
      console.error("Erro ao carregar config da IA:", e);
    }
  };

  useEffect(() => {
      const timer = setInterval(() => {
          if (!showSettings && !showIdentifyModal && viewMode !== 'config') {
            fetchConversations(false);
            if (selectedChatId) fetchMessages(selectedChatId, false);
            checkRealStatus();
            fetchAiConfig(); // Atualiza status da IA periodicamente
          }
      }, 15000); 
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

  const fetchTags = async () => {
      try {
          const data = await whatsappService.getTags();
          setTags(data);
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

  const handleUpdateTag = async (chatId: string, tagName: string | null) => {
      try {
          await whatsappService.updateChatTag(chatId, tagName);
          setConversations(prev => prev.map(c => c.id === chatId ? { ...c, tag: tagName || undefined } : c));
      } catch (e) {
          alert("Erro ao associar tag.");
      }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
      e.stopPropagation();
      if (!window.confirm("Excluir este atendimento permanentemente? Esta ação não pode ser desfeita.")) return;
      
      try {
          await whatsappService.deleteChat(chatId);
          setConversations(prev => prev.filter(c => c.id !== chatId));
          if (selectedChatId === chatId) setSelectedChatId(null);
      } catch (e) {
          alert("Erro ao excluir atendimento.");
      }
  };

  const handleDragStart = (id: string) => setDraggedChatId(id);
  const handleOnDrop = async (newStatus: ChatStatus) => {
      if (!draggedChatId) return;
      try {
          await whatsappService.updateChatStatus(draggedChatId, newStatus);
          setConversations(prev => prev.map(c => c.id === draggedChatId ? { ...c, status: newStatus } : c));
      } catch (e) {
          alert("Erro ao mover atendimento.");
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
        let baseUrl = target.instanceUrl.trim();
        if (!baseUrl.includes('://')) {
            baseUrl = `https://${baseUrl}`;
        }
        baseUrl = baseUrl.replace(/\/$/, "");

        const response = await fetch(`${baseUrl}/instance/connectionState/${target.instanceName.trim()}`, {
            headers: { 'apikey': target.apiKey.trim() }
        });
        const data = await response.json();
        const state = data.instance?.state || data.state || 'closed';
        const connected = state === 'open';
        
        if (connected !== config.isConnected) {
            setConfig(prev => ({ ...prev, isConnected: connected }));
        }
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
    const originalText = inputText;
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
        setInputText(originalText);
    } finally { setIsSending(false); }
  };

  const handleSaveTag = async () => {
      if (!editingTag?.name) return;
      setIsSavingTag(true);
      try {
          await whatsappService.saveTag(editingTag);
          await fetchTags();
          setEditingTag(null);
      } catch (e) { alert("Erro ao salvar tag."); } finally { setIsSavingTag(false); }
  };

  const handleIdentifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !identifyPhone || !identifyName) return;
    setIsSavingIdentity(true);
    try {
        await whatsappService.associateLidWithPhone(selectedChatId, identifyPhone, identifyName);
        await fetchConversations();
        setShowIdentifyModal(false);
        setIdentifyPhone('');
        setIdentifyName('');
        loadGlobalIdentification();
    } catch (err: any) {
        alert("Erro ao identificar contato: " + err.message);
    } finally {
        setIsSavingIdentity(false);
    }
  };

  const handleSaveConfig = async () => {
      setIsSavingConfig(true);
      try {
          const sanitizedConfig = {
              ...config,
              instanceUrl: config.instanceUrl.trim().replace(/\/$/, ""),
              instanceName: config.instanceName.trim(),
              apiKey: config.apiKey.trim()
          };
          await appBackend.saveWhatsAppConfig(sanitizedConfig);
          setConfig(sanitizedConfig);
          setShowSettings(false);
          alert("Configurações salvas!");
          checkRealStatus(sanitizedConfig);
      } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsSavingConfig(false); }
  };

  const handleConnectEvolution = async () => {
      setIsGeneratingConnection(true);
      setQrCodeUrl(null);
      setPairingCodeValue(null);
      setConnLogs([`Iniciando tentativa de conexão...`]);
      try {
          if (!config.instanceUrl || !config.instanceName) throw new Error("Preencha os dados da instância.");
          
          let baseUrl = config.instanceUrl.trim();
          if (!baseUrl.includes('://')) {
              baseUrl = `https://${baseUrl}`;
          }
          baseUrl = baseUrl.replace(/\/$/, "");

          if (config.evolutionMethod === 'code') {
              const cleanNumber = config.pairingNumber.replace(/\D/g, '');
              if (!cleanNumber) throw new Error("Número de pareamento é obrigatório para este método.");
              
              let response = await fetch(`${baseUrl}/instance/connect/pairing-code/${config.instanceName.trim()}?number=${cleanNumber}`, {
                  headers: { 'apikey': config.apiKey.trim() }
              });
              
              if (!response.ok && response.status === 404) {
                  response = await fetch(`${baseUrl}/instance/connect/pairingCode/${config.instanceName.trim()}?number=${cleanNumber}`, {
                      headers: { 'apikey': config.apiKey.trim() }
                  });
              }

              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Erro no pareamento por código.");
              setPairingCodeValue(data.code || data.pairingCode);
          } else {
              const response = await fetch(`${baseUrl}/instance/connect/${config.instanceName.trim()}`, {
                  headers: { 'apikey': config.apiKey.trim() }
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Erro ao gerar QR Code.");
              const token = data.base64 || data.code;
              setQrCodeUrl(token.startsWith('data:image') ? token : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`);
          }
          addLog("Solicitação enviada com sucesso. Verifique o celular.");
      } catch (err: any) { 
          addLog(`[ERRO] ${err.message}`); 
          console.error("Erro no pareamento:", err);
      } finally { setIsGeneratingConnection(false); }
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

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      // REGRA: Se Atendimento Automático estiver ATIVADO, ocultamos chats em estágio de atendimento do robô (open/pending)
      // pois eles estão sendo tratados pela IA e não devem "direcionar" para o atendimento humano.
      if (aiConfig?.isActive && (c.status === 'open' || c.status === 'pending')) {
          return false;
      }

      const matchesSearch = (c.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPhone = (c.contact_phone || c.wa_id || '').includes(searchPhone.replace(/\D/g, ''));
      const matchesTag = selectedTagFilter === 'all' || c.tag === selectedTagFilter;
      const matchesStatus = selectedStatusFilters.length === 0 || selectedStatusFilters.includes(c.status);
      return matchesSearch && matchesPhone && matchesTag && matchesStatus;
    });
  }, [conversations, searchTerm, searchPhone, selectedTagFilter, selectedStatusFilters, aiConfig]);

  const toggleStatusFilter = (status: ChatStatus) => {
      setSelectedStatusFilters(prev => 
          prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
      );
  };

  return (
    <div className="flex h-full bg-slate-50 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
      
      {/* SIDEBAR */}
      <div className={clsx("flex flex-col border-r border-slate-100 w-full md:w-80 lg:w-96 shrink-0 bg-white", selectedChatId && viewMode !== 'config' ? "hidden md:flex" : "flex")}>
        <div className="p-6 border-b border-slate-100 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3"><MessageCircle className="text-teal-600" /> Atendimento</h2>
                <div className="flex gap-1">
                    <div className="bg-slate-100 p-1 rounded-lg flex mr-2">
                        <button onClick={() => setViewMode('list')} className={clsx("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")} title="Vista Lista"><List size={16}/></button>
                        <button onClick={() => setViewMode('kanban')} className={clsx("p-1.5 rounded-md transition-all", viewMode === 'kanban' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")} title="Vista Kanban"><Kanban size={16}/></button>
                        <button onClick={() => setViewMode('config')} className={clsx("p-1.5 rounded-md transition-all", viewMode === 'config' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")} title="Configurar Tags"><Settings size={16}/></button>
                    </div>
                    <button onClick={() => fetchConversations()} className="p-2 text-slate-400 hover:text-teal-600 rounded-xl transition-all"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
                    <button onClick={() => setShowNewChatModal(true)} className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-lg active:scale-95"><Plus size={18} /></button>
                    <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-teal-600 rounded-xl transition-all"><Filter size={18} /></button>
                </div>
            </div>

            <div className="space-y-2 animate-in slide-in-from-top-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome..." 
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                    <input 
                        type="text" 
                        placeholder="Filtrar por telefone..." 
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                        value={searchPhone}
                        onChange={e => setSearchPhone(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <div className="relative">
                        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12}/>
                        <select 
                            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                            value={selectedTagFilter}
                            onChange={e => setSelectedTagFilter(e.target.value)}
                        >
                            <option value="all">Todas Tags</option>
                            <option value="">Sem Tag</option>
                            {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12}/>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                        {ATTENDANCE_STAGES.map(s => (
                            <button
                                key={s.id}
                                onClick={() => toggleStatusFilter(s.id)}
                                className={clsx(
                                    "px-2 py-1 rounded-full text-[8px] font-black uppercase border transition-all",
                                    selectedStatusFilters.includes(s.id) 
                                        ? `${s.bg} ${s.color} border-current shadow-sm` 
                                        : "bg-slate-50 text-slate-400 border-slate-200"
                                )}
                            >
                                {s.label.split(' ')[0]}
                            </button>
                        ))}
                        {selectedStatusFilters.length > 0 && (
                            <button onClick={() => setSelectedStatusFilters([])} className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={10}/></button>
                        )}
                    </div>
                </div>
            </div>

            <div className={clsx("p-3 rounded-2xl border-2 flex items-center justify-between transition-all", config.isConnected ? "bg-teal-50 border-teal-100" : "bg-red-50 border-red-100")}>
                <div className="flex items-center gap-2">
                    <div className={clsx("w-2 h-2 rounded-full", config.isConnected ? "bg-teal-500 animate-pulse" : "bg-red-500")}></div>
                    <span className={clsx("text-[10px] font-black uppercase tracking-widest", config.isConnected ? "text-teal-700" : "text-red-700")}>{config.isConnected ? "WhatsApp Ativo" : "WhatsApp Offline"}</span>
                </div>
                {config.isConnected ? <Wifi size={14} className="text-teal-400" /> : <WifiOff size={14} className="text-red-400" />}
            </div>
            
            {aiConfig?.isActive && (
                <div className="bg-indigo-600 p-3 rounded-2xl text-white flex items-center justify-between shadow-lg shadow-indigo-200 animate-pulse mt-2">
                    <div className="flex items-center gap-2">
                        <Bot size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">IA Operacional Ativa</span>
                    </div>
                    <Zap size={14} fill="currentColor" className="text-amber-400" />
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            {isLoading && filteredConversations.length === 0 ? (<div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-teal-600" /></div>) : 
            viewMode === 'list' ? (
                filteredConversations.map(conv => (
                    <div key={conv.id} onClick={() => setSelectedChatId(conv.id)} className={clsx("p-5 cursor-pointer transition-all hover:bg-white border-l-4 group relative", selectedChatId === conv.id ? "bg-white border-l-teal-50 shadow-sm" : "border-l-transparent border-b border-slate-50")}>
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex flex-col">
                                <span className={clsx("font-black text-sm", conv.unread_count > 0 ? "text-slate-900" : "text-slate-600")}>{conv.contact_name}</span>
                                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{formatPhoneDisplay(conv.wa_id, conv.contact_phone)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-300 uppercase">{formatTime(conv.updated_at)}</span>
                                <button onClick={(e) => handleDeleteChat(e, conv.id)} className="p-1 mt-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                            </div>
                        </div>
                        <p className={clsx("text-xs truncate pr-6 mt-1", conv.unread_count > 0 ? "font-bold text-slate-800" : "text-slate-500")}>{conv.last_message}</p>
                        <div className="flex items-center gap-2 mt-2">
                             {ATTENDANCE_STAGES.find(s => s.id === conv.status) && (
                                 <span className={clsx("text-[8px] font-black px-1.5 py-0.5 rounded uppercase border", ATTENDANCE_STAGES.find(s => s.id === conv.status)?.bg, ATTENDANCE_STAGES.find(s => s.id === conv.status)?.color)}>
                                     {ATTENDANCE_STAGES.find(s => s.id === conv.status)?.label}
                                 </span>
                             )}
                             {conv.tag && (
                                 <span className={clsx("text-[8px] font-black px-1.5 py-0.5 rounded uppercase border flex items-center gap-1", tags.find(t => t.name === conv.tag)?.color || 'bg-slate-50 text-slate-500')}>
                                     <Tag size={8}/> {conv.tag}
                                 </span>
                             )}
                        </div>
                        {conv.unread_count > 0 && <span className="absolute right-5 bottom-5 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full animate-bounce shadow-lg">{conv.unread_count}</span>}
                    </div>
                ))
            ) : viewMode === 'kanban' ? (
                <div className="p-4 flex flex-col gap-6">
                    {ATTENDANCE_STAGES.map(stage => {
                        const stageChats = filteredConversations.filter(c => c.status === stage.id);
                        return (
                            <div key={stage.id} className="space-y-2">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className={clsx("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", stage.color)}>
                                        <div className={clsx("w-2 h-2 rounded-full", stage.dot)}></div>
                                        {stage.label}
                                    </h4>
                                    <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full border">{stageChats.length}</span>
                                </div>
                                <div 
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => handleOnDrop(stage.id)}
                                    className="min-h-[80px] bg-slate-100/50 rounded-2xl p-2 border border-dashed border-slate-200 transition-colors"
                                >
                                    {stageChats.map(c => (
                                        <div 
                                            key={c.id} 
                                            draggable 
                                            onDragStart={() => handleDragStart(c.id)}
                                            onClick={() => setSelectedChatId(c.id)}
                                            className={clsx("bg-white p-3 rounded-xl shadow-sm border mb-2 cursor-grab active:cursor-grabbing hover:border-teal-400 transition-all group relative", selectedChatId === c.id ? "ring-2 ring-teal-500 border-transparent" : "border-slate-100")}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs font-bold text-slate-800 truncate pr-4">{c.contact_name}</p>
                                                <button onClick={(e) => handleDeleteChat(e, c.id)} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 absolute top-2 right-2"><Trash2 size={10}/></button>
                                            </div>
                                            <p className="text-[10px] text-slate-500 truncate">{c.last_message}</p>
                                            {c.tag && (
                                                <div className="mt-2 flex">
                                                    <span className={clsx("text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase border", tags.find(t => t.name === c.tag)?.color || 'bg-slate-400 text-slate-50')}>
                                                        {c.tag}
                                                    </span>
                                                </div>
                                            )}
                                            {c.unread_count > 0 && <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2"><Tag size={16} className="text-teal-600"/> Gerenciar Tags</h3>
                        <button onClick={() => setEditingTag({ name: '', color: 'bg-slate-100 text-slate-600 border-slate-200' })} className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-md active:scale-95 transition-all"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-3">
                        {tags.map(t => (
                            <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-teal-300 transition-all group">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-3 h-3 rounded-full border shadow-inner", t.color.split(' ')[0])}></div>
                                        <h4 className="font-bold text-slate-800 text-sm">{t.name}</h4>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingTag(t)} className="p-1 text-slate-400 hover:text-teal-600"><Edit2 size={14}/></button>
                                        <button onClick={() => whatsappService.deleteTag(t.id).then(fetchTags)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {tags.length === 0 && <div className="p-10 text-center text-slate-300 text-xs italic">Nenhuma tag cadastrada. Clique em "+" para criar.</div>}
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
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold border border-slate-200 shadow-inner overflow-hidden">
                            {globalContactInfo?.photoUrl ? <img src={globalContactInfo.photoUrl} className="w-full h-full object-cover" /> : <User size={28} />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-slate-800 text-base leading-tight truncate">{selectedChat.contact_name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{formatPhoneDisplay(selectedChat.wa_id, selectedChat.contact_phone)}</p>
                                <button onClick={() => setShowIdentifyModal(true)} className="p-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Identificar Contato Manualmente">
                                    <UserPlus size={14} />
                                </button>
                                {globalContactInfo && (
                                    <span className={clsx("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 border", globalContactInfo.color)}>
                                        {getEntityIcon(globalContactInfo.type)} {globalContactInfo.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative group">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                            <select 
                                className="pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer hover:bg-slate-200 transition-all"
                                value={selectedChat.tag || ''}
                                onChange={e => handleUpdateTag(selectedChat.id, e.target.value || null)}
                            >
                                <option value="">Associar Tag...</option>
                                {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12}/>
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
                            {ATTENDANCE_STAGES.map(stage => (
                                <button 
                                    key={stage.id} 
                                    onClick={() => handleUpdateStage(selectedChat.id, stage.id)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 transition-all justify-center whitespace-nowrap",
                                        selectedChat.status === stage.id ? "bg-white text-indigo-700 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {selectedChat.status === stage.id ? <CheckCircle size={10}/> : <Circle size={10}/>}
                                    {stage.label.split(' ')[0]}
                                </button>
                            ))}
                        </div>
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
                    <div className="max-w-5xl mx-auto flex flex-col gap-2">
                        <form onSubmit={handleSendMessage} className="flex gap-3">
                            <input type="text" className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:bg-white focus:ring-4 focus:ring-teal-500/10 text-sm font-medium transition-all" placeholder="Escreva aqui..." value={inputText} onChange={e => setInputText(e.target.value)} />
                            <button type="submit" disabled={isSending || !inputText.trim()} className="bg-teal-600 text-white p-4 rounded-2xl hover:bg-teal-700 disabled:opacity-50 shadow-xl active:scale-95 shrink-0 flex items-center justify-center">
                                {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                            </button>
                        </form>
                        <div className="flex justify-end pr-2">
                             <button onClick={(e) => handleDeleteChat(e, selectedChat.id)} className="text-[10px] font-black uppercase text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"><Trash2 size={12}/> Excluir este atendimento</button>
                        </div>
                    </div>
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

      {/* MODAL CONFIG TAGS (ADD/EDIT) */}
      {editingTag && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 flex flex-col">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <h3 className="text-lg font-black text-slate-800">{editingTag.id ? 'Editar Tag' : 'Criar Nova Tag'}</h3>
                      <button onClick={() => setEditingTag(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Tag</label>
                          <input type="text" className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white outline-none transition-all focus:ring-2 focus:ring-teal-50" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})} placeholder="Ex: Financeiro, Dúvida Técnica..." autoFocus />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cor de Identificação</label>
                          <div className="grid grid-cols-4 gap-2">
                              {[
                                  { bg: 'bg-slate-100 text-slate-600 border-slate-200' },
                                  { bg: 'bg-red-50 text-red-700 border-red-200' },
                                  { bg: 'bg-amber-50 text-amber-700 border-amber-200' },
                                  { bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                                  { bg: 'bg-green-50 text-green-700 border-green-200' },
                                  { bg: 'bg-purple-50 text-purple-700 border-purple-200' },
                                  { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                                  { bg: 'bg-teal-50 text-teal-700 border-teal-200' }
                              ].map((c, i) => (
                                  <button 
                                    key={i} 
                                    onClick={() => setEditingTag({...editingTag, color: c.bg})} 
                                    className={clsx("w-full h-10 rounded-lg border-2 transition-all hover:scale-105 active:scale-95", c.bg.split(' ')[0], editingTag.color?.startsWith(c.bg.split(' ')[0]) ? "border-slate-800 ring-2 ring-slate-800/20" : "border-transparent")}
                                  ></button>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl">
                      <button onClick={() => setEditingTag(null)} className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:underline">Cancelar</button>
                      <button onClick={handleSaveTag} disabled={isSavingTag || !editingTag.name?.trim()} className="bg-teal-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                          {isSavingTag ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {editingTag.id ? 'Salvar Tag' : 'Criar Tag'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL IDENTIFY */}
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
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center">
                      <div className="flex items-center gap-3"><Settings className="text-teal-600" size={24}/> <h3 className="text-lg font-black text-slate-800">Evolution API Config</h3></div>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">URL da API</label><input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" value={config.instanceUrl} onChange={e => setConfig({...config, instanceUrl: e.target.value})} placeholder="https://api.voll.com" /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome Instância</label><input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" value={config.instanceName} onChange={e => setConfig({...config, instanceName: e.target.value})} placeholder="Instancia_VOLL" /></div>
                          <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">API Key Global</label><input type="password" title="API Key" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} /></div>
                      </div>

                      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] space-y-3">
                          <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2"><Link2 size={12}/> URL de Webhook p/ Evolution API</label>
                          <div className="flex gap-2">
                              <input type="text" readOnly className="flex-1 px-4 py-3 bg-white border border-indigo-200 rounded-2xl text-[11px] font-mono text-indigo-900 shadow-sm" value={webhookUrlDisplay} />
                              <button onClick={() => { navigator.clipboard.writeText(webhookUrlDisplay); alert("Link do Webhook copiado!"); }} className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-md active:scale-95" title="Copiar URL"><Copy size={20}/></button>
                          </div>
                          <div className="flex items-start gap-2 bg-white/50 p-3 rounded-xl">
                              <AlertCircle size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-indigo-600 leading-relaxed"><strong>Instruções:</strong> No painel da Evolution, vá em <strong>Webhook &gt; Events</strong> e cole este link. Ative os eventos de <em>MESSAGES_UPSERT</em> e <em>SEND_MESSAGE</em> para sincronizar as conversas.</p>
                          </div>
                      </div>

                      <div className="p-6 bg-teal-50 rounded-[2rem] border-2 border-teal-100 space-y-4">
                        <div className="flex justify-between items-center"><h4 className="text-xs font-black text-teal-800 uppercase tracking-widest">Conectar Novo Aparelho</h4><div className="flex gap-2"><button onClick={() => setConfig({...config, evolutionMethod: 'qr'})} className={clsx("px-3 py-1 rounded-lg text-[10px] font-bold uppercase", config.evolutionMethod === 'qr' ? "bg-teal-600 text-white" : "bg-white text-teal-600 border")}>QR Code</button><button onClick={() => setConfig({...config, evolutionMethod: 'code'})} className={clsx("px-3 py-1 rounded-lg text-[10px] font-bold uppercase", config.evolutionMethod === 'code' ? "bg-teal-600 text-white" : "bg-white text-teal-600 border")}>Código</button></div></div>
                        {config.evolutionMethod === 'code' && (<div><label className="block text-[10px] font-bold text-teal-700 uppercase mb-1">Celular (com DDI+DDD)</label><input type="text" className="w-full px-4 py-2 border rounded-xl text-sm" placeholder="5551999999999" value={config.pairingNumber} onChange={e => setConfig({...config, pairingNumber: e.target.value})} /></div>)}
                        <button onClick={handleConnectEvolution} disabled={isGeneratingConnection} className="w-full py-4 bg-white border-2 border-teal-500 text-teal-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-teal-500 hover:text-white transition-all flex items-center justify-center gap-2">{isGeneratingConnection ? <Loader2 size={18} className="animate-spin"/> : <Wifi size={18}/>} Iniciar Pareamento</button>
                        {qrCodeUrl && (
                            <div className="flex flex-col items-center pt-4 animate-in zoom-in-95"><div className="p-4 bg-white rounded-3xl shadow-xl border-2 border-teal-100"><img src={qrCodeUrl} className="w-48 h-48" alt="QR" /></div><p className="text-xs text-teal-600 font-bold mt-4">ESCANEIE COM SEU CELULAR</p></div>
                        )}
                        {pairingCodeValue && (
                            <div className="text-center pt-4 animate-in zoom-in-95"><div className="inline-block px-10 py-6 bg-white rounded-3xl shadow-xl border-2 border-teal-200 text-3xl font-black tracking-[0.5em] text-teal-600">{pairingCodeValue}</div><p className="text-xs text-teal-600 font-bold mt-4 uppercase">DIGITE NO SEU WHATSAPP</p></div>
                        )}
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
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome (Opcional)</label><input type="text" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl text-sm outline-none" value={newChatName} onChange={setNewChatName(e.target.value)} placeholder="Identificação do contato" /></div>
                      </div>
                      <button type="submit" disabled={isCreatingChat} className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-teal-600/20 active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3">{isCreatingChat ? <Loader2 size={18} className="animate-spin" /> : 'Abrir Chat'}</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
