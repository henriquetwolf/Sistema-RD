import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Search, Filter, MoreVertical, Paperclip, Mic, Send, 
  Check, CheckCheck, User, Phone, Mail, Tag, Clock, ChevronRight, 
  MoreHorizontal, Smile, Archive, AlertCircle, RefreshCw, Briefcase,
  X, Plus, Lock, Settings, Save, Smartphone, Globe, ShieldCheck, Copy, ExternalLink, Loader2,
  LayoutGrid, List, Palette, Trash2, GripHorizontal, HelpCircle, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Code, Terminal, Info, Database
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
  const [showWebhookHelp, setShowWebhookHelp] = useState(true);

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
      }, 10000); 
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
        const waId = result.messages?.[0]?.id;
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
              accessToken: config.accessToken.trim(),
              phoneNumberId: config.phoneNumberId.trim(),
              wabaId: config.wabaId.trim(),
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

  // --- HELPERS PARA O WEBHOOK ---
  const supabaseProjectRef = (appBackend.client as any).supabaseUrl?.match(/https:\/\/(.*?)\.supabase\.co/)?.[1] || 'SEU-PROJETO';
  const callbackUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/whatsapp-webhook`;

  const sqlScript = `
-- 1. CRIAR TABELAS (Ignora se já existirem)
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_chats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wa_id text UNIQUE NOT NULL,
    contact_name text,
    contact_phone text,
    last_message text,
    status text DEFAULT 'open',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_whatsapp_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id uuid REFERENCES public.crm_whatsapp_chats(id) ON DELETE CASCADE,
    text text,
    sender_type text CHECK (sender_type IN ('user', 'agent', 'system')),
    wa_message_id text,
    status text,
    created_at timestamptz DEFAULT now()
);

-- 2. HABILITAR SEGURANÇA RLS
ALTER TABLE public.crm_whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS IDEMPOTENTES (Apaga antes de criar para não dar erro)
DROP POLICY IF EXISTS "Acesso total chats" ON public.crm_whatsapp_chats;
CREATE POLICY "Acesso total chats" ON public.crm_whatsapp_chats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total messages" ON public.crm_whatsapp_messages;
CREATE POLICY "Acesso total messages" ON public.crm_whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
  `.trim();

  const edgeFunctionCode = `
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// VERIFY_TOKEN deve ser exatamente o que você digitar na tela da Meta
const VERIFY_TOKEN = "${config.webhookVerifyToken || 'seu_token_aqui'}";

Deno.serve(async (req) => {
  const { method } = req;
  const url = new URL(req.url);

  // 1. VALIDAÇÃO DA META (Obrigatório para ativar o Webhook)
  if (method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Validação efetuada com sucesso!");
      // Meta exige retorno do challenge em texto puro com status 200
      return new Response(challenge, { 
        status: 200, 
        headers: { "Content-Type": "text/plain" } 
      });
    }
    return new Response("Token Inválido", { status: 403 });
  }

  // 2. RECEBIMENTO DE MENSAGENS REAL TIME
  if (method === "POST") {
    try {
      const body = await req.json();
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const contact = value?.contacts?.[0];

      if (message && message.type === 'text') {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const waId = message.from; 
        const text = message.text.body;
        const contactName = contact?.profile?.name || waId;

        // Buscar ou criar conversa
        let { data: chat } = await supabase.from('crm_whatsapp_chats').select('id').eq('wa_id', waId).single();
        if (!chat) {
          const { data: newChat } = await supabase.from('crm_whatsapp_chats').insert([{
             wa_id: waId, contact_name: contactName, contact_phone: waId, last_message: text, status: 'open'
          }]).select().single();
          chat = newChat;
        }

        // Salvar mensagem
        await supabase.from('crm_whatsapp_messages').insert([{
          chat_id: chat.id, text: text, sender_type: 'user', status: 'received'
        }]);

        // Atualizar preview do chat
        await supabase.from('crm_whatsapp_chats').update({ 
            last_message: text, updated_at: new Date().toISOString() 
        }).eq('id', chat.id);
      }
      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
  `.trim();

  if (showSettings) {
      return (
          <div className="h-full bg-slate-50 flex flex-col items-center p-6 overflow-y-auto animate-in fade-in custom-scrollbar">
              <div className="max-w-4xl w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col mb-10">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="bg-teal-100 p-2 rounded-full text-teal-700"><Settings size={20} /></div>
                          <div>
                              <h2 className="text-lg font-bold text-slate-800">Conectar WhatsApp</h2>
                              <p className="text-xs text-slate-500">Configuração da Meta Cloud API</p>
                          </div>
                      </div>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>

                  <div className="p-6 space-y-6 bg-slate-50">
                      {/* PASSO 1 */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2 mb-2"><Lock size={16} className="text-teal-600" /> 1. Credenciais da Meta</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Access Token (Permanente)</label>
                                  <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-50 outline-none h-20 resize-none" placeholder="EAAG..." value={config.accessToken} onChange={e => setConfig({...config, accessToken: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">ID do Telefone</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" value={config.phoneNumberId} onChange={e => setConfig({...config, phoneNumberId: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">ID da Conta WABA</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" value={config.wabaId} onChange={e => setConfig({...config, wabaId: e.target.value})} />
                              </div>
                          </div>
                      </div>

                      {/* PASSO 2 */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex justify-between items-center">
                              <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><Globe size={16} className="text-blue-600" /> 2. Configuração do Webhook</h3>
                              <button onClick={() => setShowWebhookHelp(!showWebhookHelp)} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                                  {showWebhookHelp ? 'Ocultar Guia' : 'Como resolver o erro?'}
                                  <ChevronDown size={14} className={clsx(showWebhookHelp && "rotate-180")} />
                              </button>
                          </div>

                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Token de Verificação (Crie um agora e cole na Meta)</label>
                                  <div className="flex gap-2">
                                      <input type="text" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-blue-700 bg-blue-50" value={config.webhookVerifyToken} onChange={e => setConfig({...config, webhookVerifyToken: e.target.value})} />
                                      <button onClick={() => setConfig({...config, webhookVerifyToken: Math.random().toString(36).substring(2, 12)})} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><RefreshCw size={14}/></button>
                                  </div>
                              </div>

                              {showWebhookHelp && (
                                  <div className="animate-in slide-in-from-top-2 p-5 bg-slate-900 rounded-xl space-y-6">
                                      {/* SQL CORRIGIDO */}
                                      <div className="bg-blue-950/40 p-4 rounded-lg border border-blue-500/30">
                                          <p className="text-blue-400 font-black text-xs uppercase mb-2 flex items-center gap-2"><Database size={14}/> Passo A: Rode o SQL no Supabase</p>
                                          <p className="text-white text-[11px] mb-3 leading-relaxed">Este código apaga políticas antigas se existirem, evitando o erro de "already exists".</p>
                                          <div className="relative">
                                              <pre className="text-[10px] bg-black text-slate-400 p-3 rounded-lg overflow-x-auto max-h-32 border border-slate-800">{sqlScript}</pre>
                                              <button onClick={() => navigator.clipboard.writeText(sqlScript)} className="absolute top-2 right-2 bg-slate-800 text-white px-2 py-1 rounded text-[10px]">Copiar SQL</button>
                                          </div>
                                      </div>

                                      {/* COMANDO DE DEPLOY */}
                                      <div className="bg-red-950/40 p-4 rounded-lg border border-red-500/50">
                                          <p className="text-red-400 font-black text-xs uppercase mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Passo B: Deploy sem trava de segurança</p>
                                          <p className="text-white text-[11px] leading-relaxed">O erro de validação ocorre porque o Supabase bloqueia a Meta por padrão. Você <strong>DEVE</strong> usar este comando exato no terminal:</p>
                                          <div className="mt-3 bg-black rounded p-3 flex justify-between items-center gap-3">
                                              <code className="text-pink-400 text-[10px] font-mono leading-tight">supabase functions deploy whatsapp-webhook --no-verify-jwt</code>
                                              <button onClick={() => navigator.clipboard.writeText('supabase functions deploy whatsapp-webhook --no-verify-jwt')} className="text-slate-500 hover:text-white"><Copy size={14}/></button>
                                          </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                              <span className="text-[10px] text-slate-400 uppercase font-black">URL de Callback (Na Meta)</span>
                                              <div className="flex gap-2 items-center bg-black/40 p-2 rounded border border-slate-800"><code className="text-xs text-teal-400 truncate">{callbackUrl}</code><button onClick={() => navigator.clipboard.writeText(callbackUrl)} className="text-slate-500 hover:text-white"><Copy size={12}/></button></div>
                                          </div>
                                          <div className="space-y-1">
                                              <span className="text-[10px] text-slate-400 uppercase font-black">Token de Verificação (Na Meta)</span>
                                              <div className="flex gap-2 items-center bg-black/40 p-2 rounded border border-slate-800"><code className="text-xs text-teal-400 truncate">{config.webhookVerifyToken || '(Defina acima)'}</code><button onClick={() => navigator.clipboard.writeText(config.webhookVerifyToken)} className="text-slate-500 hover:text-white"><Copy size={12}/></button></div>
                                          </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-800">
                                          <p className="text-white text-xs font-bold mb-3 flex items-center gap-2"><Code size={14} className="text-amber-400"/> Código da Edge Function (Corrigido):</p>
                                          <div className="relative">
                                              <pre className="text-[10px] bg-black text-slate-300 p-4 rounded-lg overflow-x-auto max-h-48 custom-scrollbar border border-slate-800 leading-relaxed">{edgeFunctionCode}</pre>
                                              <button onClick={() => navigator.clipboard.writeText(edgeFunctionCode)} className="absolute top-2 right-2 bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-bold">Copiar Código</button>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button>
                      <button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg shadow-green-600/20 flex items-center gap-2">
                          {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Salvar Configurações
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
      {/* Sidebar List */}
      <div className={clsx("flex flex-col border-r border-slate-200 w-full md:w-80 lg:w-96 shrink-0", selectedChatId ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageCircle className="text-teal-600" /> Atendimento</h2>
            <div className="flex gap-2">
                <button onClick={() => setShowNewChatModal(true)} className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors" title="Nova Conversa"><Plus size={18} /></button>
                <button onClick={() => setShowSettings(true)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-200 rounded-lg" title="Configurações"><Settings size={18} /></button>
                <button onClick={() => fetchConversations()} className="p-1.5 text-slate-400 hover:text-teal-600"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
            {isLoading && conversations.length === 0 ? (<div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-teal-600" /></div>) : 
            conversations.length === 0 ? (<div className="p-8 text-center text-slate-400 text-sm">Nenhuma conversa encontrada.</div>) : (
                conversations.map(conv => (
                    <div key={conv.id} onClick={() => setSelectedChatId(conv.id)} className={clsx("p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all border-l-4", selectedChatId === conv.id ? "bg-teal-50/30 border-l-teal-500" : "border-l-transparent")}>
                        <div className="flex justify-between items-start mb-1"><span className="font-bold text-sm text-slate-800">{conv.contact_name}</span><span className="text-[10px] text-slate-400">{new Date(conv.updated_at).toLocaleDateString()}</span></div>
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
                <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button className="md:hidden text-slate-500" onClick={() => setSelectedChatId(null)}><ChevronRight size={24} className="rotate-180" /></button>
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold"><User size={20} /></div>
                        <div><h3 className="font-bold text-slate-800 text-sm">{selectedChat.contact_name}</h3><p className="text-[10px] text-slate-500">{selectedChat.contact_phone}</p></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    {isLoadingMessages ? (<div className="flex justify-center py-4"><Loader2 className="animate-spin text-teal-600" /></div>) : (
                        messages.map(msg => (
                            <div key={msg.id} className={clsx("flex", msg.sender_type === 'agent' ? "justify-end" : "justify-start")}>
                                <div className={clsx("max-w-[80%] rounded-lg px-3 py-2 shadow-sm relative text-sm", msg.sender_type === 'agent' ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none")}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1"><span className="text-[9px] text-slate-400">{formatTime(msg.created_at)}</span>{msg.sender_type === 'agent' && <CheckCheck size={12} className="text-blue-400" />}</div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="bg-white p-3 border-t border-slate-200">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input type="text" className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-sm" placeholder="Digite uma mensagem" value={inputText} onChange={e => setInputText(e.target.value)} />
                        <button type="submit" disabled={isSending || !inputText.trim()} className="bg-teal-600 text-white p-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors">
                            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        </button>
                    </form>
                </div>
              </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <MessageCircle size={64} className="opacity-20 mb-4" />
                <p className="text-lg font-bold">Selecione uma conversa</p>
                <p className="text-sm">Clique em um contato na lista para iniciar o atendimento.</p>
            </div>
          )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="text-teal-600" size={20} /> Nova Conversa</h3>
                      <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleStartNewChat} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Número de Telefone</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                            placeholder="5511999999999" 
                            value={newChatPhone} 
                            onChange={e => setNewChatPhone(e.target.value)} 
                            required
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Inclua o código do país (55) e o DDD.</p>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Nome do Contato</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                            placeholder="Nome Completo" 
                            value={newChatName} 
                            onChange={e => setNewChatName(e.target.value)} 
                            required
                          />
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t">
                          <button type="button" onClick={() => setShowNewChatModal(false)} className="px-4 py-2 text-slate-500 text-sm font-bold">Cancelar</button>
                          <button type="submit" disabled={isCreatingChat} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                              {isCreatingChat ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              Iniciar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
