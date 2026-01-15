import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { X, Send, Bot, Sparkles, Loader2, ChevronRight, Key, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface AiAssistantProps {
  onNavigate: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ onNavigate, isOpen, setIsOpen }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string, tabSuggestion?: string }[]>([
    { role: 'bot', text: 'Olá! Sou o seu Guia de Navegação. Como posso te ajudar a encontrar a ferramenta ou aba que você precisa hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const systemPrompt = `Você é o Guia de Navegação do Sistema VOLL Pilates. Seu objetivo único é ajudar usuários administrativos a encontrar as ferramentas corretas.
  
  MAPA DO SISTEMA (Abas disponíveis):
  - "overview": Visão Geral, Dashboards principais de leads e vendas.
  - "hr": Recursos Humanos, Gestão de Equipe.
  - "crm": CRM Comercial, Funis de Vendas.
  - "billing": Cobrança, Financeiro.
  - "inventory": Controle de Estoque.
  - "suporte_interno": Suporte Interno.
  - "whatsapp": Atendimento via WhatsApp.
  - "analysis": Análise de Vendas, ROI.
  - "forms": Formulários.
  - "surveys": Pesquisas.
  - "contracts": Contratos Digitais.
  - "events": Eventos e Workshops.
  - "students": Alunos e Matrículas.
  - "certificates": Certificados.
  - "products": Produtos Digitais.
  - "franchises": Franquias.
  - "partner_studios": Studios Parceiros.
  - "classes": Turmas e Escalas.
  - "teachers": Professores.
  - "global_settings": Configurações.

  REGRAS:
  1. Responda de forma curta e amigável.
  2. Termine sua resposta com [TAB:nome_da_aba]. Exemplo: "Você encontra os contratos aqui. [TAB:contracts]"`;

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setNeedsKey(false);
      setMessages(prev => [...prev, { role: 'bot', text: "Chave atualizada. Pode tentar perguntar novamente!" }]);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    
    // Verifica se a chave foi injetada corretamente
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined' || process.env.API_KEY === '') {
        setNeedsKey(true);
        return;
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Instância criada com a chave detectada no ambiente
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Fix: Updated model to 'gemini-3-flash-preview' for text tasks as per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
        }
      });

      const botText = response.text || "Desculpe, tive dificuldade em processar essa informação.";
      
      const tabMatch = botText.match(/\[TAB:(.*?)\]/);
      const tabSuggestion = tabMatch ? tabMatch[1] : undefined;
      const cleanText = botText.replace(/\[TAB:.*?\]/g, '').trim();

      setMessages(prev => [...prev, { role: 'bot', text: cleanText, tabSuggestion }]);
      setNeedsKey(false);
    } catch (error: any) {
      console.error("Erro detalhado Gemini:", error);
      
      const errorStr = String(error?.message || "").toLowerCase();
      
      // Captura erros de autenticação, faturamento ou permissão de modelo
      if (
          errorStr.includes("api key") || 
          errorStr.includes("403") || 
          errorStr.includes("401") || 
          errorStr.includes("billing") || 
          errorStr.includes("not found") ||
          errorStr.includes("permission")
      ) {
        setNeedsKey(true);
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: "Houve um problema com as credenciais da IA no servidor. Clique abaixo para configurar sua chave manualmente." 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: "Ocorreu um erro técnico de conexão. Por favor, tente novamente em alguns instantes." 
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 md:w-[400px] h-[550px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#0f172a] p-6 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-[#4f46e5] p-2.5 rounded-xl shadow-lg">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest leading-none">Guia Inteligente</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  {/* Fix: Removed reference to non-existent 'config' variable on line 142 */}
                  <div className={clsx("w-1.5 h-1.5 rounded-full", (needsKey) ? "bg-amber-500" : "bg-green-500 animate-pulse")}></div>
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">
                    {needsKey ? "Verificar Chave" : "IA Conectada"}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={clsx("flex flex-col animate-in fade-in slide-in-from-bottom-2", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={clsx(
                  "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' ? "bg-[#4f46e5] text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                {msg.tabSuggestion && (
                  <button 
                    onClick={() => onNavigate(msg.tabSuggestion!)}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#e0e7ff] text-[#4338ca] rounded-full text-[10px] font-black uppercase hover:bg-[#c7d2fe] transition-all border border-indigo-200"
                  >
                    NAVEGAR PARA ABA <ChevronRight size={14} className="mt-0.5" />
                  </button>
                )}
              </div>
            ))}
            
            {needsKey && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl animate-in zoom-in-95 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <AlertTriangle size={16} /> 
                  Falha de Autenticação
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Não foi possível validar sua chave de API automaticamente no Vercel. Selecione-a novamente para restaurar o serviço.
                </p>
                <button 
                  onClick={handleSelectKey}
                  className="w-full py-2.5 bg-amber-600 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-amber-700 transition-all shadow-md active:scale-95"
                >
                  <Key size={14}/> Resolver Problema de Chave
                </button>
              </div>
            )}

            {isLoading && (
              <div className="flex items-start">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 rounded-tl-none shadow-sm">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
            <input 
              type="text" 
              placeholder={needsKey ? "Corrija a chave acima..." : "Onde encontro..."} 
              disabled={needsKey || isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={isLoading || needsKey || !input.trim()}
              className="bg-[#4f46e5] text-white p-3.5 rounded-2xl hover:bg-[#4338ca] transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "p-5 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center gap-3 group",
          isOpen ? "bg-white text-slate-800 border border-slate-200" : "bg-[#4f46e5] text-white"
        )}
      >
        {!isOpen && <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold text-sm whitespace-nowrap">Dúvida de navegação?</span>}
        {isOpen ? <X size={28} /> : <Sparkles size={28} />}
      </button>
    </div>
  );
};