
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
  const [showWebhookHelp, setShowWebhookHelp] = useState(true);
  const [helpTab, setHelpTab] = useState<'sql' | 'edge'>('sql');

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
          alert("Configurações da Evolution API salvas!");
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
  const supabaseUrl = (appBackend.client as any).supabaseUrl || 'https://sua-url.supabase.co';
  const supabaseProjectRef = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1] || 'SEU-PROJETO';
  
  const sqlRpcUrl = `${supabaseUrl}/rest/v1/rpc/handle_evolution_webhook`;
  const edgeUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/whatsapp-webhook`;

  const sqlCode = `
-- 1. CRIAR A FUNÇÃO QUE PROCESSA O WEBHOOK (Cole no SQL Editor do Supabase)
CREATE OR REPLACE FUNCTION public.handle_evolution_webhook(event text, data jsonb)
RETURNS json AS $$
DECLARE
  v_wa_id text;
  v_text text;
  v_contact_name text;
  v_chat_id uuid;
BEGIN
  -- Filtra apenas mensagens recebidas (ignora as que você enviou)
  IF (event = 'messages.upsert' AND NOT (data->'key'->>'fromMe')::boolean) THEN
    
    v_wa_id := split_part(data->'key'->>'remoteJid', '@', 1);
    v_text := COALESCE(
      data->'message'->>'conversation',
      data->'message'->'extendedTextMessage'->>'text',
      data->'message'->'imageMessage'->>'caption',
      '(Mídia ou Mensagem sem texto)'
    );
    v_contact_name := COALESCE(data->>'pushName', v_wa_id);

    -- Busca ou cria o chat
    SELECT id INTO v_chat_id FROM crm_whatsapp_chats WHERE wa_id = v_wa_id LIMIT 1;
    
    IF v_chat_id IS NULL THEN
      INSERT INTO crm_whatsapp_chats (wa_id, contact_name, contact_phone, last_message, status, updated_at)
      VALUES (v_wa_id, v_contact_name, v_wa_id, v_text, 'open', now())
      RETURNING id INTO v_chat_id;
    END IF;

    -- Insere a mensagem
    INSERT INTO crm_whatsapp_messages (chat_id, text, sender_type, status, wa_message_id, created_at)
    VALUES (v_chat_id, v_text, 'user', 'received', data->'key'->>'id', now());

    -- Atualiza lista
    UPDATE crm_whatsapp_chats SET last_message = v_text, updated_at = now() WHERE id = v_chat_id;
  END IF;

  RETURN json_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. DAR PERMISSÃO PÚBLICA
GRANT EXECUTE ON FUNCTION public.handle_evolution_webhook TO anon;
GRANT EXECUTE ON FUNCTION public.handle_evolution_webhook TO service_role;
  `.trim();

  const edgeFunctionCode = `
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * WEBHOOK PARA EVOLUTION API -> SUPABASE CLOUD (Versão CLI)
 * Instrução: supabase functions deploy whatsapp-webhook --no-verify-jwt
 */

Deno.serve(async (req) => {
  const { method } = req;
  if (method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  if (method !== "POST") return new Response("Not Allowed", { status: 405 });

  try {
    const body = await req.json();
    if (body.event === "messages.upsert" && !body.data?.key?.fromMe) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
      const key = body.data.key;
      const waId = key.remoteJid.split('@')[0];
      const text = body.data.message?.conversation || body.data.message?.extendedTextMessage?.text || "(Mídia)";
      
      let { data: chat } = await supabase.from('crm_whatsapp_chats').select('id').eq('wa_id', waId).maybeSingle();
      if (!chat) {
        const { data: n } = await supabase.from('crm_whatsapp_chats').insert([{ wa_id: waId, contact_name: body.data.pushName || waId, contact_phone: waId, last_message: text, status: 'open' }]).select().single();
        chat = n;
      }
      await supabase.from('crm_whatsapp_messages').insert([{ chat_id: chat.id, text, sender_type: 'user', status: 'received', wa_message_id: key.id }]);
      await supabase.from('crm_whatsapp_chats').update({ last_message: text, updated_at: new Date().toISOString() }).eq('id', chat.id);
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
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
                              <h2 className="text-lg font-bold text-slate-800">Configurações de Conexão</h2>
                              <p className="text-xs text-slate-500">Sincronize a Evolution API com seu Banco de Dados</p>
                          </div>
                      </div>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>

                  <div className="p-6 space-y-6 bg-slate-50">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2 mb-2"><Smartphone size={16} className="text-teal-600" /> 1. Sua Instância Evolution</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">URL Base da API (Ex: do Easypanel)</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-50 outline-none" placeholder="https://evolution.seusite.com" value={config.instanceUrl} onChange={e => setConfig({...config, instanceUrl: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome da Instância</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" placeholder="ex: principal" value={config.instanceName} onChange={e => setConfig({...config, instanceName: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">API Key da Evolution</label>
                                  <input type="password" title="Global API Key" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} />
                              </div>
                          </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex justify-between items-center">
                              <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><Globe size={16} className="text-blue-600" /> 2. Recebimento de Mensagens</h3>
                              <button onClick={() => setShowWebhookHelp(!showWebhookHelp)} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                                  {showWebhookHelp ? 'Ocultar Guia' : 'Como ativar?'}
                                  <ChevronDown size={14} className={clsx(showWebhookHelp && "rotate-180")} />
                              </button>
                          </div>

                          {showWebhookHelp && (
                              <div className="animate-in slide-in-from-top-2 space-y-4">
                                  <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                                      <button onClick={() => setHelpTab('sql')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", helpTab === 'sql' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500")}>
                                          <Zap size={14}/> Método Sem Instalação (SQL)
                                      </button>
                                      <button onClick={() => setHelpTab('edge')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", helpTab === 'edge' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500")}>
                                          <Terminal size={14}/> Método Terminal (CLI)
                                      </button>
                                  </div>

                                  {helpTab === 'sql' ? (
                                      <div className="p-5 bg-slate-900 rounded-2xl space-y-6">
                                          <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/30">
                                              <p className="text-indigo-400 font-black text-xs uppercase mb-3 flex items-center gap-2"><Info size={14}/> Passo a Passo (Zero Instalação)</p>
                                              <ol className="text-white text-[11px] space-y-3 list-decimal ml-4 leading-relaxed">
                                                  <li>Vá no seu painel do Supabase e clique em <strong>SQL Editor</strong> (ícone &gt;_).</li>
                                                  <li>Clique em "New Query", cole o código abaixo e clique em <strong>RUN</strong>.</li>
                                                  <li>No painel da Evolution API, vá em Webhooks e use a URL abaixo:</li>
                                              </ol>
                                              <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/5 space-y-3">
                                                  <div>
                                                      <span className="text-[9px] text-slate-500 uppercase font-black">URL do Webhook (CUIDADO: mude na Evolution)</span>
                                                      <div className="flex gap-2 items-center bg-black/40 p-2 rounded border border-slate-800 mt-1">
                                                          <code className="text-xs text-teal-400 truncate flex-1">{sqlRpcUrl}</code>
                                                          <button onClick={() => navigator.clipboard.writeText(sqlRpcUrl)} className="text-slate-500 hover:text-white"><Copy size={14}/></button>
                                                      </div>
                                                  </div>
                                                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                      <p className="text-amber-400 text-[10px] font-bold">⚠️ IMPORTANTE: No painel Evolution, você DEVE adicionar um Header (Cabeçalho):</p>
                                                      <p className="text-white text-[10px] mt-1">Chave: <code className="text-teal-400">apikey</code> | Valor: <code className="text-teal-400">SUA-ANON-KEY-DO-SUPABASE</code></p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="relative">
                                              <p className="text-white text-[10px] font-black uppercase mb-2 flex items-center gap-2"><Code size={14} className="text-amber-400"/> Código SQL para o Supabase:</p>
                                              <pre className="text-[10px] bg-black text-slate-300 p-4 rounded-xl overflow-x-auto max-h-48 custom-scrollbar border border-slate-800 leading-relaxed font-mono">{sqlCode}</pre>
                                              <button onClick={() => navigator.clipboard.writeText(sqlCode)} className="absolute top-8 right-2 bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-bold">Copiar SQL</button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="p-5 bg-slate-900 rounded-2xl space-y-6">
                                          <div className="bg-teal-950/40 p-4 rounded-xl border border-teal-500/30">
                                              <p className="text-teal-400 font-black text-xs uppercase mb-3 flex items-center gap-2"><Terminal size={14}/> Usando o Supabase CLI</p>
                                              <ol className="text-white text-[11px] space-y-3 list-decimal ml-4 leading-relaxed">
                                                  <li>No terminal do seu PC: <code className="bg-black/50 px-1 text-teal-300">supabase functions new whatsapp-webhook</code></li>
                                                  <li>Cole o código abaixo no arquivo <code className="text-teal-300">index.ts</code> gerado.</li>
                                                  <li>Faça o deploy: <code className="bg-black/50 px-1 text-teal-300">supabase functions deploy whatsapp-webhook --no-verify-jwt</code></li>
                                              </ol>
                                              <div className="mt-4">
                                                  <span className="text-[9px] text-slate-500 uppercase font-black">URL do Webhook (CLI):</span>
                                                  <div className="flex gap-2 items-center bg-black/40 p-2 rounded border border-slate-800 mt-1">
                                                      <code className="text-xs text-teal-400 truncate flex-1">{edgeUrl}</code>
                                                      <button onClick={() => navigator.clipboard.writeText(edgeUrl)} className="text-slate-500 hover:text-white"><Copy size={14}/></button>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="relative">
                                              <p className="text-white text-[10px] font-black uppercase mb-2 flex items-center gap-2"><Code size={14} className="text-amber-400"/> Código da Função (Deno):</p>
                                              <pre className="text-[10px] bg-black text-slate-300 p-4 rounded-xl overflow-x-auto max-h-48 custom-scrollbar border border-slate-800 leading-relaxed font-mono">{edgeFunctionCode}</pre>
                                              <button onClick={() => navigator.clipboard.writeText(edgeFunctionCode)} className="absolute top-8 right-2 bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-bold">Copiar Código</button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button>
                      <button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg shadow-green-600/20 flex items-center gap-2">
                          {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Salvar Configuração Evolution
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
                <button onClick={() => setShowSettings(true)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-200 rounded-lg" title="Configurações Evolution"><Settings size={18} /></button>
                <button onClick={() => fetchConversations()} className="p-1.5 text-slate-400 hover:text-teal-600"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
            {isLoading && conversations.length === 0 ? (<div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-teal-600" /></div>) : 
            conversations.length === 0 ? (<div className="p-8 text-center text-slate-400 text-sm">Nenhuma conversa encontrada via Evolution.</div>) : (
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
                <p className="text-sm">Clique em um contato na lista para iniciar o atendimento via Evolution.</p>
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

// Sub-componentes ícones que faltavam
const Server = ({ size, className }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
        <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
        <line x1="6" x2="6.01" y1="6" y2="6"/>
        <line x1="6" x2="6.01" y1="18" y2="18"/>
    </svg>
);
