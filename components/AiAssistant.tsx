
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, X, Send, Bot, Sparkles, Loader2, ArrowRight, Key } from 'lucide-react';
import clsx from 'clsx';

interface AiAssistantProps {
  onNavigate: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ onNavigate, isOpen, setIsOpen }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string, tabSuggestion?: string }[]>([
    { role: 'bot', text: 'Olá! Sou o Assistente VOLL. Como posso te ajudar a encontrar algo no sistema hoje?' }
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
  1. Se o usuário perguntar "onde vejo meus colaboradores", diga para ir em "Recursos Humanos".
  2. Responda de forma curta e amigável.
  3. SEMPRE que identificar o destino, termine sua resposta com a tag [TAB:nome_da_aba] para que eu possa navegar o usuário automaticamente. Exemplo: "Você pode gerenciar os alunos na aba Alunos. [TAB:students]"`;

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setNeedsKey(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Verificação de API Key antes de prosseguir
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      setNeedsKey(true);
      return;
    }

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userText, // Usando formato de string direta para maior compatibilidade
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });

      const botText = response.text || "Desculpe, não consegui processar sua dúvida.";
      
      const tabMatch = botText.match(/\[TAB:(.*?)\]/);
      const tabSuggestion = tabMatch ? tabMatch[1] : undefined;
      const cleanText = botText.replace(/\[TAB:.*?\]/g, '').trim();

      setMessages(prev => [...prev, { role: 'bot', text: cleanText, tabSuggestion }]);
      setNeedsKey(false);
    } catch (error: any) {
      console.error("Erro na API do Gemini:", error);
      
      if (error.message?.includes("Requested entity was not found")) {
        setNeedsKey(true);
      }

      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: "Houve um problema ao processar sua solicitação. Certifique-se de que uma chave de API válida está configurada." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 p-2 rounded-xl">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest">Guia Inteligente</h4>
                <div className="flex items-center gap-1.5">
                  <div className={clsx("w-1.5 h-1.5 rounded-full", needsKey ? "bg-amber-500" : "bg-green-500 animate-pulse")}></div>
                  <span className="text-[10px] font-bold opacity-60">{needsKey ? "Chave Pendente" : "IA Ativa"}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={clsx("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={clsx(
                  "max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                {msg.tabSuggestion && (
                  <button 
                    onClick={() => onNavigate(msg.tabSuggestion!)}
                    className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase hover:bg-indigo-200 transition-all border border-indigo-200"
                  >
                    Ir para esta aba <ArrowRight size={12}/>
                  </button>
                )}
              </div>
            ))}
            
            {needsKey && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in fade-in zoom-in-95">
                <p className="text-xs text-amber-800 font-medium mb-3">Sua chave de API não foi detectada ou expirou. Por favor, selecione uma chave válida para continuar.</p>
                <button 
                  onClick={handleSelectKey}
                  className="w-full py-2 bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-700 transition-all"
                >
                  <Key size={14}/> Configurar API Key
                </button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="block text-center text-[10px] text-amber-600 mt-2 hover:underline">Saiba mais sobre faturamento</a>
              </div>
            )}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 rounded-tl-none">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              placeholder={needsKey ? "Configure a chave acima..." : "Onde encontro..."} 
              disabled={needsKey}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={isLoading || needsKey}
              className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center gap-3 group",
          isOpen ? "bg-red-50 text-slate-800" : "bg-indigo-600 text-white"
        )}
      >
        {!isOpen && <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold text-sm whitespace-nowrap">Dúvida de navegação?</span>}
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
};
