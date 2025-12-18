
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Search, Filter, MoreVertical, Paperclip, Mic, Send, 
  Check, CheckCheck, User, Phone, Mail, Tag, Clock, ChevronRight, 
  MoreHorizontal, Smile, Archive, AlertCircle, RefreshCw, Briefcase,
  X, Plus, Lock, Settings, Save, Smartphone, Globe, ShieldCheck, Copy, ExternalLink, Loader2,
  LayoutGrid, List, Palette, Trash2, GripHorizontal, HelpCircle, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2
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
  crm_stage: string;
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
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  webhookVerifyToken: string;
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

  // New Chat Form
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [config, setConfig] = useState<WAConfig>({
      accessToken: '',
      phoneNumberId: '',
      wabaId: '',
      webhookVerifyToken: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChat = conversations.find(c => c.id === selectedChatId);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load Data
  useEffect(() => {
      fetchConversations();
      loadConfig();
  }, []);

  // Polling para novas mensagens
  useEffect(() => {
      const timer = setInterval(() => {
          if (!showSettings) {
            fetchConversations(false);
            if (selectedChatId) fetchMessages(selectedChatId, false);
          }
      }, 10000); 
      return () => clearInterval(timer);
  }, [selectedChatId, showSettings]);

  // Load messages when chat changes
  useEffect(() => {
      if (selectedChatId) {
          fetchMessages(selectedChatId);
      } else {
          setMessages([]);
      }
  }, [selectedChatId]);

  const loadConfig = async () => {
      const c = await appBackend.getWhatsAppConfig();
      if (c) setConfig(c);
  };

  const fetchConversations = async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      try {
          const { data } = await appBackend.client
              .from('crm_whatsapp_chats')
              .select('*')
              .order('updated_at', { ascending: false });
          if (data) setConversations(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
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
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingMessages(false);
      }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedChatId || !selectedChat) return;

    setIsSending(true);
    const messageText = inputText;
    setInputText('');

    try {
        const result = await whatsappService.sendTextMessage(selectedChat.contact_phone, messageText);
        const waId = result.messages?.[0]?.id;
        await whatsappService.syncMessage(selectedChatId, messageText, 'agent', waId);
        await fetchMessages(selectedChatId, false);
        await fetchConversations(false);
    } catch (err: any) {
        alert(err.message);
        setInputText(messageText);
    } finally {
        setIsSending(false);
    }
  };

  const handleSaveConfig = async () => {
      setIsSavingConfig(true);
      try {
          // Aplicar TRIM em todos os campos para evitar erros de parser de token
          const cleanConfig = {
              accessToken: config.accessToken.trim(),
              phoneNumberId: config.phoneNumberId.trim(),
              wabaId: config.wabaId.trim(),
              webhookVerifyToken: config.webhookVerifyToken.trim()
          };
          await appBackend.saveWhatsAppConfig(cleanConfig);
          setConfig(cleanConfig);
          setShowSettings(false);
          alert("Configurações salvas e campos limpos de espaços!");
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
      } finally {
          setIsSavingConfig(false);
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
      } catch (e: any) {
          alert(`Erro ao criar conversa: ${e.message}`);
      } finally {
          setIsCreatingChat(false);
      }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- RENDER CONFIG SCREEN ---
  if (showSettings) {
      return (
          <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in">
              <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="bg-teal-100 p-2 rounded-full text-teal-700">
                              <Settings size={20} />
                          </div>
                          <div>
                              <h2 className="text-lg font-bold text-slate-800">Configurações do Atendimento</h2>
                              <p className="text-xs text-slate-500">Integração Oficial (WhatsApp Cloud API)</p>
                          </div>
                      </div>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 space-y-6">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm flex gap-3">
                          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                          <div className="text-amber-800 text-xs font-medium">
                              Certifique-se de usar um <strong>Token Permanente</strong> (Gerado em Usuários do Sistema no Gerenciador de Negócios). Tokens temporários duram apenas 24h.
                          </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2 mb-2">
                              <Lock size={16} /> Credenciais da API
                          </h3>
                          <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Access Token</label>
                              <textarea 
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none h-24 resize-none"
                                  placeholder="EAAG..."
                                  value={config.accessToken}
                                  onChange={e => setConfig({...config, accessToken: e.target.value})}
                              />
                              <p className="text-[10px] text-slate-400 mt-1 italic">Evite espaços no início ou fim.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number ID</label>
                                  <input 
                                      type="text" 
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                                      placeholder="Ex: 1059..."
                                      value={config.phoneNumberId}
                                      onChange={e => setConfig({...config, phoneNumberId: e.target.value})}
                                  />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">WABA ID</label>
                                  <input 
                                      type="text" 
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                                      placeholder="Ex: 1098..."
                                      value={config.wabaId}
                                      onChange={e => setConfig({...config, wabaId: e.target.value})}
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2 mb-2">
                              <ShieldCheck size={16} /> Webhook
                          </h3>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Verify Token</label>
                              <input 
                                  type="text" 
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  value={config.webhookVerifyToken}
                                  onChange={e => setConfig({...config, webhookVerifyToken: e.target.value})}
                                  placeholder="voll_secret_token"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                      <button 
                          onClick={handleSaveConfig}
                          disabled={isSavingConfig}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2"
                      >
                          {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Salvar Configurações
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER MAIN INBOX ---
  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
      
      {/* Sidebar List */}
      <div className={clsx("flex flex-col border-r border-slate-200 w-full md:w-80 lg:w-96 shrink-0", selectedChatId ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MessageCircle className="text-teal-600" /> Atendimento
            </h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowNewChatModal(true)}
                    className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    title="Nova Conversa"
                >
                    <Plus size={18} />
                </button>
                <button 
                    onClick={() => setShowSettings(true)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-200 rounded-lg"
                    title="Configurações"
                >
                    <Settings size={18} />
                </button>
                <button onClick={fetchConversations} className="p-1.5 text-slate-400 hover:text-teal-600"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
            {isLoading && conversations.length === 0 ? (
                <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-teal-600" /></div>
            ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Nenhuma conversa encontrada.</div>
            ) : (
                conversations.map(conv => (
                    <div 
                        key={conv.id} 
                        onClick={() => setSelectedChatId(conv.id)}
                        className={clsx(
                            "p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all border-l-4",
                            selectedChatId === conv.id ? "bg-teal-50/30 border-l-teal-500" : "border-l-transparent"
                        )}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-slate-800">{conv.contact_name}</span>
                            <span className="text-[10px] text-slate-400">{new Date(conv.updated_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{conv.last_message}</p>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative min-w-0">
          {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button className="md:hidden text-slate-500" onClick={() => setSelectedChatId(null)}><ChevronRight size={24} className="rotate-180" /></button>
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold"><User size={20} /></div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">{selectedChat.contact_name}</h3>
                            <p className="text-[10px] text-slate-500">{selectedChat.contact_phone}</p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    {isLoadingMessages ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-teal-600" /></div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={clsx("flex", msg.sender_type === 'agent' ? "justify-end" : "justify-start")}>
                                <div className={clsx(
                                    "max-w-[80%] rounded-lg px-3 py-2 shadow-sm relative text-sm",
                                    msg.sender_type === 'agent' ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className="text-[9px] text-slate-400">{formatTime(msg.created_at)}</span>
                                        {msg.sender_type === 'agent' && <CheckCheck size={12} className="text-blue-400" />}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="bg-white p-3 border-t border-slate-200">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-sm"
                            placeholder="Digite uma mensagem"
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={isSending || !inputText.trim()}
                            className="bg-teal-600 text-white p-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
                        >
                            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        </button>
                    </form>
                </div>
              </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <MessageCircle size={64} className="opacity-20 mb-4" />
                <p className="text-sm">Selecione uma conversa ou inicie uma nova.</p>
                <button onClick={() => setShowNewChatModal(true)} className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-teal-700">Nova Conversa</button>
            </div>
          )}
      </div>

      {/* NEW CHAT MODAL */}
      {showNewChatModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Iniciar Chat</h3>
                      <button onClick={() => setShowNewChatModal(false)}><X size={20} /></button>
                  </div>
                  <form onSubmit={handleStartNewChat} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nome do Contato</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="Ex: João Aluno"
                            value={newChatName}
                            onChange={e => setNewChatName(e.target.value)}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">WhatsApp (Com DDD)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="5511999999999"
                            value={newChatPhone}
                            onChange={e => setNewChatPhone(e.target.value)}
                            required
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Inclua o 55 (Brasil) e o DDD.</p>
                      </div>
                      <button 
                        type="submit"
                        disabled={isCreatingChat}
                        className="w-full bg-teal-600 text-white py-2 rounded-lg font-bold hover:bg-teal-700 transition-colors disabled:opacity-50"
                      >
                          {isCreatingChat ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Começar Conversa'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
