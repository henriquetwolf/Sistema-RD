
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
  - "hr": Recursos Humanos, Gestão de Equipe, Contratação, Dados de Colaboradores.
  - "crm": CRM Comercial, Funis de Vendas, Oportunidades, Agenda de Negociações.
  - "billing": Cobrança, Financeiro, Conciliação Bancária, Acordos de Inadimplência.
  - "inventory": Controle de Estoque, Apostilas, Materiais, Envios para Studios.
  - "suporte_interno": Suporte Interno, Chamados abertos por alunos ou instrutores.
  - "whatsapp": Atendimento, Chat de WhatsApp em tempo real.
  - "analysis": Análise de Vendas, Gráficos de performance e ROI.
  - "forms": Formulários, Criação de formulários de captura de leads.
  - "surveys": Pesquisas, Pesquisas de satisfação e feedbacks.
  - "contracts": Contratos, Gestão de assinaturas digitais.
  - "events": Eventos, Programação de workshops e congressos.
  - "students": Alunos, Gestão de matriculados e histórico de compras.
  - "certificates": Certificados, Emissão e modelos de diplomas.
  - "products": Produtos Digitais, Cursos Online, E-books.
  - "franchises": Franquias, Mapeamento de unidades e raios de exclusividade.
  - "partner_studios": Studios Parceiros, Dados de studios que recebem cursos.
  - "classes": Turmas, Logística de datas, locais e instrutores presenciais.
  - "teachers": Professores, Cadastro docente e honorários.
  - "global_settings": Configurações, Logo, Permissões, Banco de Dados.

  REGRAS:
  1. Responda de forma curta e amigável, como o Guia VOLL.
  2. Sempre que identificar uma aba, use a tag [TAB:nome_da_aba] no final da resposta.
  Exemplo: "Você pode gerenciar os contratos na aba de Contratos. [TAB:contracts]"`;

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setNeedsKey(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Cria a instância no momento da chamada para garantir o uso da chave mais recente
      // A chave process.env.API_KEY é injetada automaticamente no ambiente
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });

      const botText = response.text || "Desculpe, não consegui processar sua dúvida agora.";
      
      const tabMatch = botText.match(/\[TAB:(.*?)\]/);
      const tabSuggestion = tabMatch ? tabMatch[1] : undefined;
      const cleanText = botText.replace(/\[TAB:.*?\]/g, '').trim();

      setMessages(prev => [...prev, { role: 'bot', text: cleanText, tabSuggestion }]);
      setNeedsKey(false);
    } catch (error: any) {
      console.error("Erro na API Gemini:", error);
      
      const errorStr = String(error?.message || "");
      
      // Erro comum de ambiente de produção sem chave injetada ou expirada
      if (errorStr.includes("Requested entity was not found") || 
          errorStr.includes("API_KEY_INVALID") || 
          errorStr.includes("403") || 
          errorStr.includes("401")) {
        setNeedsKey(true);
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: "Houve um problema de autenticação com a IA. Por favor, clique abaixo para configurar uma chave válida." 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: "Tive um pequeno lapso de conexão. Verifique sua rede e tente novamente em alguns segundos." 
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
          {/* Header correspondente à screenshot */}
          <div className="bg-[#0f172a] p-6 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-[#4f46e5] p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest leading-none">Guia Inteligente</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={clsx("w-1.5 h-1.5 rounded-full", needsKey ? "bg-amber-500" : "bg-green-500 animate-pulse")}></div>
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">
                    {needsKey ? "Chave Necessária" : "IA Ativa"}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Chat Area */}
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
                    Navegar para aba <ChevronRight size={14} className="mt-0.5" />
                  </button>
                )}
              </div>
            ))}
            
            {needsKey && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl animate-in zoom-in-95 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <AlertTriangle size={16} /> 
                  Chave Desconfigurada
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  A chave de API não foi detectada no ambiente. Selecione uma chave válida do seu projeto pago para continuar usando o assistente.
                </p>
                <button 
                  onClick={handleSelectKey}
                  className="w-full py-2.5 bg-amber-600 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-amber-700 transition-all shadow-md active:scale-95"
                >
                  <Key size={14}/> Configurar API Key
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

          {/* Footer Input */}
          <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
            <input 
              type="text" 
              placeholder={needsKey ? "Selecione a chave acima..." : "Onde encontro..."} 
              disabled={needsKey || isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
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

      {/* Toggle Button */}
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
