
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

// --- TYPES (Mocking Backend Structure) ---

interface WATag {
  id: string;
  name: string;
  color: string;
}

interface WAContact {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  email?: string;
  tags: string[]; // Array of Tag IDs or Names
  crmStage: string; // Pipeline stage link
  notes: string;
}

interface WAMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'audio' | 'note'; // 'note' is internal note
}

interface WAConversation {
  id: string;
  contact: WAContact;
  lastMessage: WAMessage;
  unreadCount: number;
  assignedTo?: string; // Agent ID
  status: 'open' | 'pending' | 'closed';
  messages: WAMessage[]; // In real app, this is fetched separately
}

interface WAConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  webhookVerifyToken: string;
}

// --- MOCK DATA ---
const INITIAL_TAGS: WATag[] = [
    { id: 't1', name: 'Interessado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 't2', name: 'VIP', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 't3', name: 'Novo Lead', color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 't4', name: 'Parceiro', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { id: 't5', name: 'Frio', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const STAGES = ['Novo Lead', 'Sem Contato', 'Contatado', 'Negociação', 'Fechado', 'Perdido'];

const MOCK_CONVERSATIONS: WAConversation[] = [
  {
    id: '1',
    contact: { 
      id: 'c1', name: 'Ana Silva', phone: '+55 11 99999-1111', 
      tags: ['Interessado', 'VIP'], crmStage: 'Negociação', notes: 'Cliente prefere contato pela manhã.' 
    },
    unreadCount: 2,
    assignedTo: 'me',
    status: 'open',
    lastMessage: { id: 'm2', text: 'Gostaria de saber mais sobre o curso de Pilates.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 5), status: 'read', type: 'text' },
    messages: [
      { id: 'm1', text: 'Olá, bom dia!', sender: 'agent', timestamp: new Date(Date.now() - 1000 * 60 * 60), status: 'read', type: 'text' },
      { id: 'm2', text: 'Gostaria de saber mais sobre o curso de Pilates.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 5), status: 'delivered', type: 'text' }
    ]
  },
  {
    id: '2',
    contact: { 
      id: 'c2', name: 'Carlos Eduardo', phone: '+55 21 98888-2222', 
      tags: ['Novo Lead'], crmStage: 'Sem Contato', notes: '' 
    },
    unreadCount: 0,
    assignedTo: 'queue',
    status: 'open',
    lastMessage: { id: 'm3', text: 'Obrigado pelo retorno.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), status: 'read', type: 'text' },
    messages: [
      { id: 'm3', text: 'Obrigado pelo retorno.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), status: 'read', type: 'text' }
    ]
  },
  {
    id: '3',
    contact: { 
      id: 'c3', name: 'Studio Viva', phone: '+55 31 97777-3333', 
      tags: ['Parceiro'], crmStage: 'Fechado', notes: 'Franqueado em implantação.' 
    },
    unreadCount: 0,
    assignedTo: 'other',
    status: 'closed',
    lastMessage: { id: 'm4', text: 'Contrato assinado!', sender: 'agent', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), status: 'read', type: 'text' },
    messages: [
      { id: 'm4', text: 'Contrato assinado!', sender: 'agent', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), status: 'read', type: 'text' }
    ]
  }
];

export const WhatsAppInbox: React.FC = () => {
  const [conversations, setConversations] = useState<WAConversation[]>(MOCK_CONVERSATIONS);
  const [tags, setTags] = useState<WATag[]>(INITIAL_TAGS);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'unread'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'connection' | 'tags'>('connection');

  // Help Accordion State
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  // Drag & Drop State
  const [draggedConvId, setDraggedConvId] = useState<string | null>(null);

  // Tag Manager State
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('bg-slate-100 text-slate-700 border-slate-200');

  // Configuration State
  const [config, setConfig] = useState<WAConfig>({
      accessToken: '',
      phoneNumberId: '',
      wabaId: '',
      webhookVerifyToken: 'voll_secret_token_123'
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChat = conversations.find(c => c.id === selectedChatId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  // Load Config on mount or when settings open
  useEffect(() => {
      loadConfig();
  }, []);

  const loadConfig = async () => {
      setIsLoadingConfig(true);
      try {
          const cloudConfig = await appBackend.getWhatsAppConfig();
          if (cloudConfig) {
              setConfig(cloudConfig);
          }
      } catch (e) {
          console.error("Erro ao carregar configuração", e);
      } finally {
          setIsLoadingConfig(false);
      }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedChatId) return;

    const newMessage: WAMessage = {
      id: crypto.randomUUID(),
      text: inputText,
      sender: 'agent',
      type: isNoteMode ? 'note' : 'text',
      timestamp: new Date(),
      status: 'sent'
    };

    setConversations(prev => prev.map(c => {
      if (c.id === selectedChatId) {
        return {
          ...c,
          messages: [...c.messages, newMessage],
          lastMessage: newMessage
        };
      }
      return c;
    }));

    setInputText('');
    setIsNoteMode(false);
  };

  const handleSaveConfig = async () => {
      setIsSavingConfig(true);
      try {
          await appBackend.saveWhatsAppConfig(config);
          setIsSavingConfig(false);
          setShowSettings(false);
          alert("Configurações salvas no banco de dados! Todos os usuários agora verão as mesmas credenciais.");
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
          setIsSavingConfig(false);
      }
  };

  // --- DRAG AND DROP LOGIC ---
  const handleDragStart = (e: React.DragEvent, convId: string) => {
      setDraggedConvId(convId);
      e.dataTransfer.effectAllowed = "move";
      // Hack for Firefox to allow drag
      e.dataTransfer.setData("text/plain", convId);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
      e.preventDefault();
      if (!draggedConvId) return;

      // Update the stage of the dragged conversation
      setConversations(prev => prev.map(c => {
          if (c.id === draggedConvId) {
              return {
                  ...c,
                  contact: {
                      ...c.contact,
                      crmStage: targetStage
                  }
              };
          }
          return c;
      }));
      setDraggedConvId(null);
  };

  // --- TAG MANAGEMENT ---
  const handleAddTag = () => {
      if (!newTagName.trim()) return;
      const newTag: WATag = {
          id: crypto.randomUUID(),
          name: newTagName,
          color: newTagColor
      };
      setTags([...tags, newTag]);
      setNewTagName('');
  };

  const handleDeleteTag = (id: string) => {
      setTags(tags.filter(t => t.id !== id));
  };

  const getTagStyle = (tagName: string) => {
      const tag = tags.find(t => t.name === tagName);
      return tag ? tag.color : 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const filteredConversations = conversations.filter(c => {
    if (filterMode === 'mine') return c.assignedTo === 'me';
    if (filterMode === 'unread') return c.unreadCount > 0;
    return true;
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return formatTime(date);
    if (days === 1) return 'Ontem';
    return date.toLocaleDateString();
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

                  {/* Tabs */}
                  <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white">
                      <button 
                        onClick={() => setSettingsTab('connection')}
                        className={clsx("px-4 py-3 text-sm font-bold border-b-2 transition-colors", settingsTab === 'connection' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}
                      >
                          Conexão API
                      </button>
                      <button 
                        onClick={() => setSettingsTab('tags')}
                        className={clsx("px-4 py-3 text-sm font-bold border-b-2 transition-colors", settingsTab === 'tags' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}
                      >
                          Etiquetas (Funil)
                      </button>
                  </div>

                  <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                      
                      {isLoadingConfig ? (
                          <div className="flex flex-col items-center justify-center h-64 gap-3">
                              <Loader2 className="animate-spin text-teal-600" size={32} />
                              <p className="text-sm text-slate-500">Buscando configurações na nuvem...</p>
                          </div>
                      ) : (
                        <>
                            {/* TAB: CONNECTION */}
                            {settingsTab === 'connection' && (
                                <div className="p-6 space-y-6">
                                    
                                    {/* Warning about Temp Token */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm flex gap-3">
                                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                        <div className="text-amber-800 text-xs">
                                            <strong>Atenção:</strong> O token exibido na tela inicial do painel da Meta expira em 24 horas. 
                                            Para uma conexão estável, você deve criar um <strong>Usuário do Sistema</strong> e gerar um token permanente.
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2">
                                                <Lock size={16} /> Credenciais da API
                                            </h3>
                                            <a 
                                                href="https://developers.facebook.com/apps/" 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                                            >
                                                Abrir Painel Meta <ExternalLink size={12}/>
                                            </a>
                                        </div>

                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Access Token (Permanente)</label>
                                                <input 
                                                    type="password" 
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                                                    placeholder="EAAG..."
                                                    value={config.accessToken}
                                                    onChange={e => setConfig({...config, accessToken: e.target.value})}
                                                />
                                                <button 
                                                    onClick={() => setShowTokenHelp(!showTokenHelp)}
                                                    className="text-[10px] text-teal-600 font-bold mt-1 flex items-center gap-1 hover:underline"
                                                >
                                                    <HelpCircle size={10} /> Como obter token permanente?
                                                </button>
                                                
                                                {/* Token Help Accordion */}
                                                {showTokenHelp && (
                                                    <div className="mt-2 p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 space-y-1 animate-in fade-in slide-in-from-top-1">
                                                        <p>1. No Business Manager, vá em <strong>Configurações do Negócio</strong>.</p>
                                                        <p>2. Em <strong>Usuários</strong> {'>'} <strong>Usuários do Sistema</strong>, adicione um usuário "Admin".</p>
                                                        <p>3. Clique em "Gerar novo token" e selecione o app criado.</p>
                                                        <p>4. Marque as permissões: <code>whatsapp_business_messaging</code> e <code>whatsapp_business_management</code>.</p>
                                                        <p>5. Copie o token gerado e cole acima.</p>
                                                    </div>
                                                )}
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
                                                    <p className="text-[10px] text-slate-400 mt-1">Encontrado em: WhatsApp {'>'} Configuração da API</p>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-1">WABA ID (Business Account)</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                                                        placeholder="Ex: 1098..."
                                                        value={config.wabaId}
                                                        onChange={e => setConfig({...config, wabaId: e.target.value})}
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1">Encontrado em: WhatsApp {'>'} Configuração da API</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Webhook Section */}
                                    <div className="space-y-4 pt-2">
                                        <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2">
                                            <ShieldCheck size={16} /> Configuração do Webhook
                                        </h3>
                                        
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100 mb-2">
                                                No painel da Meta, vá em <strong>WhatsApp {'>'} Configuração</strong> e configure o Webhook com os dados abaixo.
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Callback URL</label>
                                                    <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-2 items-center justify-between group hover:border-slate-300 transition-colors">
                                                        <span className="text-xs font-mono text-slate-600 truncate select-all">https://api.vollpilates.com.br/webhook/whatsapp</span>
                                                        <button 
                                                            onClick={() => navigator.clipboard.writeText("https://api.vollpilates.com.br/webhook/whatsapp")}
                                                            className="text-slate-400 hover:text-teal-600 p-1" 
                                                            title="Copiar"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Verify Token</label>
                                                    <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-2 items-center justify-between group hover:border-slate-300 transition-colors">
                                                        <span className="text-xs font-mono text-slate-600 truncate select-all">{config.webhookVerifyToken}</span>
                                                        <button 
                                                            onClick={() => navigator.clipboard.writeText(config.webhookVerifyToken)}
                                                            className="text-slate-400 hover:text-teal-600 p-1" 
                                                            title="Copiar"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <p className="text-xs font-bold text-slate-600 mb-2">Campos para Assinar (Webhooks Fields):</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1"><CheckCircle2 size={10}/> messages</span>
                                                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1"><CheckCircle2 size={10}/> message_status</span>
                                                    <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-1 rounded text-[10px] font-mono">message_deliveries</span>
                                                    <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-1 rounded text-[10px] font-mono">message_reads</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: TAGS */}
                            {settingsTab === 'tags' && (
                                <div className="p-6 space-y-6">
                                    <div className="flex gap-2 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nova Etiqueta</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                placeholder="Ex: Urgente, Pós-Venda..."
                                                value={newTagName}
                                                onChange={e => setNewTagName(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-40">
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Estilo</label>
                                            <select 
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                                value={newTagColor}
                                                onChange={e => setNewTagColor(e.target.value)}
                                            >
                                                <option value="bg-slate-100 text-slate-700 border-slate-200">Cinza</option>
                                                <option value="bg-blue-100 text-blue-700 border-blue-200">Azul</option>
                                                <option value="bg-green-100 text-green-700 border-green-200">Verde</option>
                                                <option value="bg-amber-100 text-amber-700 border-amber-200">Laranja</option>
                                                <option value="bg-red-100 text-red-700 border-red-200">Vermelho</option>
                                                <option value="bg-purple-100 text-purple-700 border-purple-200">Roxo</option>
                                            </select>
                                        </div>
                                        <button onClick={handleAddTag} className="bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-lg transition-colors">
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase">Etiquetas Existentes</h3>
                                        <div className="space-y-2">
                                            {tags.map(tag => (
                                                <div key={tag.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <Palette size={16} className="text-slate-400" />
                                                        <span className={clsx("text-xs font-bold px-2 py-1 rounded border", tag.color)}>
                                                            {tag.name}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => handleDeleteTag(tag.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {tags.length === 0 && <p className="text-sm text-slate-400 italic">Nenhuma etiqueta cadastrada.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                      )}

                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                      <button 
                          onClick={handleSaveConfig}
                          disabled={isSavingConfig || isLoadingConfig}
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

  // --- RENDER MAIN INBOX OR KANBAN ---
  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
      
      {/* LEFT SIDEBAR: LIST MODE OR KANBAN TOGGLE AREA */}
      <div className={clsx("flex flex-col border-r border-slate-200 transition-all", 
          viewMode === 'kanban' ? "w-full" : "w-full md:w-80 lg:w-96",
          (selectedChatId && viewMode === 'list') ? "hidden md:flex" : "flex"
      )}>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MessageCircle className="text-teal-600" /> Atendimento
            </h2>
            <div className="flex gap-1">
                {/* View Toggles */}
                <div className="flex bg-slate-200 rounded-lg p-0.5 mr-2">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={clsx("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        title="Lista"
                    >
                        <List size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('kanban')}
                        className={clsx("p-1.5 rounded-md transition-all", viewMode === 'kanban' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        title="Funil (Kanban)"
                    >
                        <LayoutGrid size={16} />
                    </button>
                </div>

               <button 
                  onClick={() => setShowSettings(true)} 
                  className={clsx(
                      "p-1.5 rounded-lg transition-colors", 
                      config.accessToken ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                  )}
                  title="Configurar Conexão"
               >
                   <Settings size={16} />
               </button>
            </div>
          </div>
          
          {/* Filters (List Mode Only) */}
          {viewMode === 'list' && (
              <>
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                    type="text" 
                    placeholder="Buscar contatos..." 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => setFilterMode('all')}
                        className={clsx("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", filterMode === 'all' ? "bg-white shadow text-slate-800 border border-slate-100" : "text-slate-500 hover:bg-slate-200/50")}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFilterMode('mine')}
                        className={clsx("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", filterMode === 'mine' ? "bg-white shadow text-teal-700 border border-slate-100" : "text-slate-500 hover:bg-slate-200/50")}
                    >
                        Meus
                    </button>
                    <button 
                        onClick={() => setFilterMode('unread')}
                        className={clsx("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", filterMode === 'unread' ? "bg-white shadow text-slate-800 border border-slate-100" : "text-slate-500 hover:bg-slate-200/50")}
                    >
                        Não Lidos
                    </button>
                </div>
              </>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
            {viewMode === 'list' ? (
                // LIST VIEW
                <div>
                    {filteredConversations.map(conv => (
                        <div 
                        key={conv.id} 
                        onClick={() => setSelectedChatId(conv.id)}
                        className={clsx(
                            "p-4 border-b border-slate-100 cursor-pointer hover:bg-white transition-colors relative group",
                            selectedChatId === conv.id ? "bg-white border-l-4 border-l-teal-500" : "border-l-4 border-l-transparent"
                        )}
                        >
                        <div className="flex justify-between items-start mb-1">
                            <h4 className={clsx("font-bold text-sm", conv.unreadCount > 0 ? "text-slate-900" : "text-slate-700")}>
                            {conv.contact.name}
                            </h4>
                            <span className={clsx("text-xs", conv.unreadCount > 0 ? "text-teal-600 font-bold" : "text-slate-400")}>
                            {formatRelativeTime(conv.lastMessage.timestamp)}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-end">
                            <p className="text-xs text-slate-500 line-clamp-1 flex-1 pr-4">
                            {conv.lastMessage.sender === 'agent' && <span className="text-slate-400 mr-1">Você:</span>}
                            {conv.lastMessage.text}
                            </p>
                            {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                                {conv.unreadCount}
                            </span>
                            )}
                        </div>

                        {/* CRM Stage & Tags (Mini) */}
                        <div className="mt-2 flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-medium border border-slate-200">
                                {conv.contact.crmStage}
                            </span>
                            {conv.contact.tags.slice(0, 2).map(t => (
                                <span key={t} className={clsx("px-1.5 py-0.5 rounded text-[9px] font-medium border", getTagStyle(t))}>
                                    {t}
                                </span>
                            ))}
                        </div>
                        </div>
                    ))}
                </div>
            ) : (
                // KANBAN VIEW
                <div className="h-full overflow-x-auto p-4 flex gap-4">
                    {STAGES.map(stage => (
                        <div 
                            key={stage} 
                            className="w-72 flex-shrink-0 flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage)}
                        >
                            <div className="p-3 border-b border-slate-200 bg-white rounded-t-xl sticky top-0 z-10">
                                <h3 className="font-bold text-slate-700 text-sm flex justify-between items-center">
                                    {stage}
                                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">{conversations.filter(c => c.contact.crmStage === stage).length}</span>
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {conversations.filter(c => c.contact.crmStage === stage).map(conv => (
                                    <div 
                                        key={conv.id}
                                        draggable 
                                        onDragStart={(e) => handleDragStart(e, conv.id)}
                                        onClick={() => { setViewMode('list'); setSelectedChatId(conv.id); }}
                                        className={clsx(
                                            "bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group",
                                            draggedConvId === conv.id ? "opacity-50 ring-2 ring-teal-400 rotate-2 scale-105" : ""
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm text-slate-800">{conv.contact.name}</span>
                                            {conv.unreadCount > 0 && <div className="w-2 h-2 bg-teal-500 rounded-full"></div>}
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-2 bg-slate-50 p-1.5 rounded">
                                            {conv.lastMessage.text}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {conv.contact.tags.map(t => (
                                                <span key={t} className={clsx("text-[9px] px-1.5 py-0.5 rounded border font-medium", getTagStyle(t))}>
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-[10px] text-slate-400 text-right">
                                            {formatRelativeTime(conv.lastMessage.timestamp)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* 2. CHAT WINDOW (Only visible in list mode when chat selected) */}
      {viewMode === 'list' && selectedChat ? (
        <div className="flex-1 flex flex-col bg-[#efeae2] relative min-w-0">
          
          {/* Header */}
          <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-3">
              <button className="md:hidden text-slate-500" onClick={() => setSelectedChatId(null)}>
                <ChevronRight size={24} className="rotate-180" />
              </button>
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                 <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{selectedChat.contact.name}</h3>
                <p className="text-xs text-slate-500">{selectedChat.contact.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="hidden md:flex bg-slate-100 rounded-lg p-1">
                   <button className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-white rounded transition-all" title="Transferir">Transferir</button>
                   <button className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-white rounded transition-all" title="Finalizar">Finalizar</button>
               </div>
               <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                 <MoreVertical size={20} />
               </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
            {selectedChat.messages.map((msg, index) => {
              const isMe = msg.sender === 'agent';
              const isNote = msg.type === 'note';
              
              if (isNote) {
                  return (
                      <div key={msg.id} className="flex justify-center my-2">
                          <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm max-w-[80%]">
                              <AlertCircle size={14} /> 
                              <span className="font-bold">Nota Interna:</span> {msg.text}
                              <span className="text-[10px] opacity-70 ml-2">{formatTime(msg.timestamp)}</span>
                          </div>
                      </div>
                  );
              }

              return (
                <div key={msg.id} className={clsx("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={clsx(
                    "max-w-[70%] rounded-lg px-3 py-2 shadow-sm relative text-sm",
                    isMe ? "bg-[#d9fdd3] text-slate-900 rounded-tr-none" : "bg-white text-slate-900 rounded-tl-none"
                  )}>
                    <p className="leading-relaxed">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-slate-500">
                        {formatTime(msg.timestamp)}
                      </span>
                      {isMe && (
                        <span className={clsx("text-[14px]", msg.status === 'read' ? "text-blue-500" : "text-slate-400")}>
                          <CheckCheck size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white p-3 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2 px-1">
                <button 
                    onClick={() => setIsNoteMode(!isNoteMode)}
                    className={clsx(
                        "text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors font-bold",
                        isNoteMode ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                >
                    {isNoteMode ? 'Modo Nota Interna (Privado)' : 'Nota Interna'}
                </button>
                <div className="h-4 w-px bg-slate-300 mx-1"></div>
                <button className="text-slate-400 hover:text-slate-600"><Smile size={20}/></button>
                <button className="text-slate-400 hover:text-slate-600"><Paperclip size={20}/></button>
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                <div className={clsx("flex-1 border rounded-xl overflow-hidden transition-colors flex items-center px-2", isNoteMode ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200 focus-within:border-teal-500")}>
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder={isNoteMode ? "Escrever nota interna..." : "Digite uma mensagem"}
                        className="w-full py-3 px-2 bg-transparent outline-none text-sm text-slate-800"
                    />
                </div>
                {inputText ? (
                    <button type="submit" className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
                        <Send size={20} />
                    </button>
                ) : (
                    <button type="button" className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                        <Mic size={20} />
                    </button>
                )}
            </form>
          </div>

        </div>
      ) : viewMode === 'list' ? (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#f0f2f5] text-slate-400 border-b border-slate-200">
            <div className="w-64 h-64 bg-slate-200 rounded-full flex items-center justify-center mb-6 opacity-50">
                <MessageCircle size={80} />
            </div>
            <h3 className="text-xl font-bold text-slate-600">WhatsApp Web VOLL</h3>
            <p className="text-sm mt-2">Envie e receba mensagens sem precisar manter seu celular conectado.</p>
            <div className="mt-8 text-xs text-slate-400 flex items-center gap-2">
                <Lock size={12} /> Criptografia de ponta a ponta
            </div>
        </div>
      ) : null}

      {/* 3. RIGHT SIDEBAR: CONTEXT (CRM) */}
      {selectedChat && viewMode === 'list' && (
        <div className="hidden lg:flex w-80 bg-white border-l border-slate-200 flex-col overflow-y-auto">
            <div className="p-6 border-b border-slate-100 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center text-slate-400 border-2 border-slate-50">
                    <User size={40} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{selectedChat.contact.name}</h3>
                <p className="text-slate-500 text-sm">{selectedChat.contact.phone}</p>
            </div>

            <div className="p-4 space-y-6">
                {/* Pipeline Stage */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <Briefcase size={14} /> Etapa do Funil
                    </h4>
                    <select 
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-teal-500"
                        defaultValue={selectedChat.contact.crmStage}
                    >
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Tags */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <Tag size={14} /> Etiquetas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedChat.contact.tags.map(tag => (
                            <span key={tag} className={clsx("text-xs px-2 py-1 rounded border flex items-center gap-1", getTagStyle(tag))}>
                                {tag} <button className="hover:opacity-70"><X size={10} /></button>
                            </span>
                        ))}
                        <button className="text-xs text-slate-400 border border-dashed border-slate-300 px-2 py-1 rounded hover:bg-slate-50 hover:text-slate-600 flex items-center gap-1">
                            <Plus size={12} /> Add
                        </button>
                    </div>
                </div>

                {/* Contact Info */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Dados de Contato</h4>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Phone size={16} className="text-slate-400" />
                            {selectedChat.contact.phone}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Mail size={16} className="text-slate-400" />
                            {selectedChat.contact.email || 'Email não informado'}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Clock size={16} className="text-slate-400" />
                            Local: 14:30 (GMT-3)
                        </div>
                    </div>
                </div>

                {/* Fixed Notes */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase">Notas Fixas CRM</h4>
                        <button className="text-teal-600 text-xs font-bold hover:underline">Editar</button>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800 leading-relaxed">
                        {selectedChat.contact.notes || "Nenhuma nota registrada."}
                    </div>
                </div>

            </div>
        </div>
      )}

    </div>
  );
};
