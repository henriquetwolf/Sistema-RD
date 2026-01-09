
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Search, Filter, MoreVertical, Paperclip, Mic, Send, 
  Check, CheckCheck, User, Phone, Mail, Tag, Clock, ChevronRight, 
  MoreHorizontal, Smile, Archive, AlertCircle, RefreshCw, Briefcase,
  X, Plus, Lock, Settings, Save, Smartphone, Globe, ShieldCheck, Copy, ExternalLink, Loader2,
  LayoutGrid, List, Palette, Trash2, GripHorizontal, HelpCircle, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Code, Terminal, Info, Database, Zap
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
  instanceUrl: string;
  instanceName: string;
  apiKey: string;
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

  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [config, setConfig] = useState<WAConfig>({
      instanceUrl: '',
      instanceName: '',
      apiKey: '',
      webhookVerifyToken: ''
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
      }, 5000); 
      return () => clearInterval(timer);
  }, [selectedChatId, showSettings]);

  useEffect(() => {
      if (selectedChatId) fetchMessages(selectedChatId);
      else setMessages([]);
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
          const cleanConfig = {
              instanceUrl: config.instanceUrl.trim(),
              instanceName: config.instanceName.trim(),
              apiKey: config.apiKey.trim(),
              webhookVerifyToken: config.webhookVerifyToken.trim()
          };
          await appBackend.saveWhatsAppConfig(cleanConfig);
          setConfig(cleanConfig);
          setShowSettings(false);
          alert("Configurações salvas!");
      } catch (e: any) { alert(`Erro ao salvar: ${e.message}`); } finally { setIsSavingConfig(false); }
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

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // URL da Edge Function (assumindo que o usuário criou a função whatsapp-webhook)
  const supabaseProjectUrl = (appBackend.client as any).supabaseUrl || 'https://sua-url.supabase.co';
  const edgeFunctionUrl = `${supabaseProjectUrl}/functions/v1/whatsapp-webhook`;

  const sqlTablesScript = `
-- 1. TABELAS DE WHATSAPP
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_id text UNIQUE NOT NULL,
    contact_name text,
    contact_phone text,
    last_message text,
    unread_count integer DEFAULT 0,
    status text DEFAULT 'open',
    crm_stage text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_whatsapp_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id uuid REFERENCES public.crm_whatsapp_chats(id) ON DELETE CASCADE,
    text text,
    sender_type text, -- 'user' ou 'agent'
    status text,
    wa_message_id text UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Permissões básicas
ALTER TABLE public.crm_whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to chats" ON public.crm_whatsapp_chats;
CREATE POLICY "Public access to chats" ON public.crm_whatsapp_chats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to messages" ON public.crm_whatsapp_messages;
CREATE POLICY "Public access to messages" ON public.crm_whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.crm_whatsapp_chats TO anon, authenticated, service_role;
GRANT ALL ON public.crm_whatsapp_messages TO anon, authenticated, service_role;
  `.trim();

  const edgeFunctionCode = `
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { event, data } = payload

    if (event === 'MESSAGES_UPSERT' && !data.key.fromMe) {
      const waId = data.key.remoteJid.split('@')[0]
      const contactName = data.pushName || waId
      const text = data.message?.conversation || 
                   data.message?.extendedTextMessage?.text || 
                   data.message?.imageMessage?.caption || 
                   data.message?.videoMessage?.caption || 
                   "(Mídia)"

      const { data: chat } = await supabaseClient
        .from('crm_whatsapp_chats')
        .upsert({
          wa_id: waId,
          contact_name: contactName,
          contact_phone: waId,
          last_message: text,
          updated_at: new Date().toISOString()
        }, { onConflict: 'wa_id' })
        .select()
        .single()

      await supabaseClient
        .from('crm_whatsapp_messages')
        .insert({
          chat_id: chat.id,
          text: text,
          sender_type: 'user',
          status: 'received',
          wa_message_id: data.key.id
        })
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
  `.trim();

  if (showSettings) {
      return (
          <div className="h-full bg-slate-50 flex flex-col items-center p-6 overflow-y-auto animate-in fade-in custom-scrollbar">
              <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col mb-10">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="bg-teal-100 p-2 rounded-xl text-teal-700"><Settings size={24} /></div>
                          <div>
                              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ativar Recebimento</h2>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Sincronização via Edge Function</p>
                          </div>
                      </div>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
                  </div>

                  <div className="p-8 space-y-8 bg-slate-50">
                      {/* PASSO 1: SQL NO SUPABASE */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <h3 className="font-black text-slate-700 text-xs uppercase flex items-center gap-2">
                              <Database size={18} className="text-teal-600" /> Passo 1: Criar Tabelas no Supabase
                          </h3>
                          <div className="relative group">
                              <pre className="text-[10px] bg-slate-900 text-teal-400 p-5 rounded-2xl overflow-x-auto max-h-40 custom-scrollbar border border-slate-800 leading-relaxed font-mono">
                                  {sqlTablesScript}
                              </pre>
                              <button onClick={() => { navigator.clipboard.writeText(sqlTablesScript); alert("Tabelas copiadas!"); }} className="absolute top-3 right-3 bg-teal-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase">Copiar SQL</button>
                          </div>
                      </div>

                      {/* PASSO 2: EDGE FUNCTION */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <h3 className="font-black text-slate-700 text-xs uppercase flex items-center gap-2">
                              <Terminal size={18} className="text-blue-600" /> Passo 2: Criar Edge Function
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                              No seu terminal local, use o comando <code>supabase functions new whatsapp-webhook</code> e cole o código abaixo. Depois dê o deploy. Ou crie diretamente no painel do Supabase se disponível.
                          </p>
                          <div className="relative group">
                              <pre className="text-[10px] bg-slate-900 text-blue-300 p-5 rounded-2xl overflow-x-auto max-h-40 custom-scrollbar border border-slate-800 leading-relaxed font-mono">
                                  {edgeFunctionCode}
                              </pre>
                              <button onClick={() => { navigator.clipboard.writeText(edgeFunctionCode); alert("Código da Função copiado!"); }} className="absolute top-3 right-3 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase">Copiar Código</button>
                          </div>
                      </div>

                      {/* PASSO 3: WEBHOOK EVOLUTION */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <h3 className="font-black text-slate-700 text-xs uppercase flex items-center gap-2">
                              <Zap size={18} className="text-amber-500" /> Passo 3: Webhook na Evolution
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                              Copie a URL da sua Edge Function e cole na configuração de Webhook da sua instância na Evolution API. Selecione o evento <strong>MESSAGES_UPSERT</strong>.
                          </p>
                          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                              <label className="block text-[10px] font-black text-amber-700 uppercase mb-1">URL DO WEBHOOK</label>
                              <div className="flex gap-2">
                                  <code className="flex-1 bg-white border border-amber-300 p-3 rounded-xl text-xs font-mono text-slate-700 break-all leading-relaxed">{edgeFunctionUrl}</code>
                                  <button onClick={() => { navigator.clipboard.writeText(edgeFunctionUrl); alert("URL Copiada!"); }} className="bg-amber-600 text-white p-3 rounded-xl active:scale-95 transition-all"><Copy size={20}/></button>
                              </div>
                          </div>
                      </div>

                      {/* CONFIGURAÇÃO DE ENVIO */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                          <h3 className="font-black text-slate-700 text-xs uppercase flex items-center gap-2"><Smartphone size={18} className="text-blue-600" /> Configuração para Enviar Mensagens</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">URL Base da API Evolution</label>
                                  <input type="text" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl text-sm font-mono focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="https://api.seusite.com" value={config.instanceUrl} onChange={e => setConfig({...config, instanceUrl: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">Nome da Instância</label>
                                  <input type="text" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl text-sm font-mono focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Ex: principal" value={config.instanceName} onChange={e => setConfig({...config, instanceName: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">API Key da Evolution</label>
                                  <input type="password" title="Global API Key" className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl text-sm font-mono focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowSettings(false)} className="px-6 py-3 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Cancelar</button>
                      <button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-green-600 hover:bg-green-700 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-xl shadow-green-600/20 flex items-center gap-2 transition-all active:scale-95">
                          {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          Salvar Configurações
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
        <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3"><MessageCircle className="text-teal-600" /> Atendimento</h2>
            <div className="flex gap-2">
                <button onClick={() => setShowNewChatModal(true)} className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 active:scale-95" title="Nova Conversa"><Plus size={20} /></button>
                <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-xl transition-all" title="Configurar"><Settings size={20} /></button>
                <button onClick={() => fetchConversations()} className="p-2 text-slate-400 hover:text-teal-600 transition-all"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading && conversations.length === 0 ? (<div className="p-20 text-center flex flex-col items-center"><Loader2 className="animate-spin text-teal-600 mb-2" size={32} /><span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sincronizando...</span></div>) : 
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
                                        <span className="text-[9px] font-black text-slate-400 opacity-60 uppercase">{formatTime(msg.created_at)}</span>
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
                            {isSending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                        </button>
                    </form>
                </div>
              </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/50 backdrop-blur-sm">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 animate-bounce duration-[3000ms]">
                    <MessageCircle size={48} className="text-teal-500 opacity-40" />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Atendimento Centralizado</h3>
                <p className="text-sm font-medium max-w-xs text-center mt-2 leading-relaxed">Selecione uma conversa na lista à esquerda para começar a responder.</p>
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
