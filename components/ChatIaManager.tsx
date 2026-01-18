import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bot, Save, Plus, Trash2, Edit2, Loader2, Sparkles, 
  MessageSquare, BookOpen, Settings, Zap, Play, Pause,
  Search, X, Send, User, ChevronRight, Info, AlertCircle,
  Database, Layout, Kanban, Sliders, Globe, RefreshCw,
  CheckCircle2, Smartphone, Wifi, WifiOff, Link2, Copy,
  MessageCircle, GraduationCap, Target, Users, UserCheck, ArrowRightLeft,
  Check
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { appBackend, Pipeline } from '../services/appBackend';
import { AiConfig, AiKnowledgeItem } from '../types';
import clsx from 'clsx';

interface ChatIaManagerProps {
  onBack: () => void;
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

export const ChatIaManager: React.FC<ChatIaManagerProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'knowledge' | 'simulator' | 'whatsapp' | 'agent'>('config');
  const [config, setConfig] = useState<AiConfig>({ 
    id: 'default', 
    systemPrompt: '', 
    isActive: false, 
    temperature: 0.7, 
    updatedAt: '',
    agentConfig: {
      autoCreateDeal: false,
      pipelineName: 'Padrão',
      stageId: 'new',
      distributionMode: 'fixed'
    }
  });
  const [knowledge, setKnowledge] = useState<AiKnowledgeItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // WhatsApp Config States
  const [waConfig, setWaConfig] = useState<WAConfig>({
      mode: 'evolution',
      evolutionMethod: 'qr',
      instanceUrl: '',
      instanceName: '',
      apiKey: '',
      pairingNumber: '',
      isConnected: false
  });
  const [isSavingWAConfig, setIsSavingWAConfig] = useState(false);
  const [isGeneratingWAConnection, setIsGeneratingWAConnection] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingCodeValue, setPairingCodeValue] = useState<string | null>(null);
  const [waConnLogs, setWaConnLogs] = useState<string[]>([]);

  const webhookUrlDisplay = "https://wfrzsnwisypmgsbeccfj.supabase.co/functions/v1/rapid-service";

  // Modal States
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<AiKnowledgeItem> | null>(null);

  // Simulator States
  const [simInput, setSimInput] = useState('');
  const [simMessages, setSimMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    loadWAConfig();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simMessages]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configData, knowledgeData, classesRes, pipesRes, teamsRes, collabRes] = await Promise.all([
        appBackend.getAiConfig(),
        appBackend.getAiKnowledgeItems(),
        appBackend.client.from('crm_classes').select('*').order('date_mod_1', { ascending: true }),
        appBackend.getPipelines(),
        appBackend.client.from('crm_teams').select('*'),
        appBackend.client.from('crm_collaborators').select('id, full_name').eq('status', 'active').eq('department', 'Comercial')
      ]);
      
      if (configData) {
          setConfig({
              ...configData,
              agentConfig: configData.agentConfig || {
                  autoCreateDeal: false,
                  pipelineName: 'Padrão',
                  stageId: 'new',
                  distributionMode: 'fixed'
              }
          });
      }
      
      setKnowledge(knowledgeData);
      setClasses(classesRes.data || []);
      setPipelines(pipesRes || []);
      setTeams(teamsRes.data || []);
      setCollaborators(collabRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWAConfig = async () => {
    const c = await appBackend.getWhatsAppConfig();
    if (c) {
        setWaConfig(prev => ({ ...prev, ...c }));
        checkWARealStatus(c);
    }
  };

  const checkWARealStatus = async (targetConfig?: any) => {
    const target = targetConfig || waConfig;
    if (!target.instanceUrl || !target.instanceName) return;
    try {
        let baseUrl = target.instanceUrl.trim();
        if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
        baseUrl = baseUrl.replace(/\/$/, "");

        const response = await fetch(`${baseUrl}/instance/connectionState/${target.instanceName.trim()}`, {
            headers: { 'apikey': target.apiKey.trim() }
        });
        const data = await response.json();
        const state = data.instance?.state || data.state || 'closed';
        setWaConfig(prev => ({ ...prev, isConnected: state === 'open' }));
    } catch (e) {
        setWaConfig(prev => ({ ...prev, isConnected: false }));
    }
  };

  const handleSaveWAConfig = async () => {
    setIsSavingWAConfig(true);
    try {
        const sanitizedConfig = {
            ...waConfig,
            instanceUrl: waConfig.instanceUrl.trim().replace(/\/$/, ""),
            instanceName: waConfig.instanceName.trim(),
            apiKey: waConfig.apiKey.trim()
        };
        // Salva as credenciais do WhatsApp
        await appBackend.saveWhatsAppConfig(sanitizedConfig);
        // CRÍTICO: Também salva o status de ativação da IA para garantir que a Edge Function responda
        await appBackend.saveAiConfig(config);
        
        setWaConfig(sanitizedConfig);
        alert("Configurações salvas com sucesso!");
        checkWARealStatus(sanitizedConfig);
    } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsSavingWAConfig(false); }
  };

  const handleConnectWAEvolution = async () => {
    setIsGeneratingWAConnection(true);
    setQrCodeUrl(null);
    setPairingCodeValue(null);
    setWaConnLogs([`Iniciando tentativa de conexão...`]);
    try {
        if (!waConfig.instanceUrl || !waConfig.instanceName) throw new Error("Preencha os dados da instância.");
        
        let baseUrl = waConfig.instanceUrl.trim();
        if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
        baseUrl = baseUrl.replace(/\/$/, "");

        if (waConfig.evolutionMethod === 'code') {
            const cleanNumber = waConfig.pairingNumber.replace(/\D/g, '');
            if (!cleanNumber) throw new Error("Número de pareamento é obrigatório.");
            
            let response = await fetch(`${baseUrl}/instance/connect/pairing-code/${waConfig.instanceName.trim()}?number=${cleanNumber}`, {
                headers: { 'apikey': waConfig.apiKey.trim() }
            });
            
            if (!response.ok && response.status === 404) {
                response = await fetch(`${baseUrl}/instance/connect/pairingCode/${waConfig.instanceName.trim()}?number=${cleanNumber}`, {
                    headers: { 'apikey': waConfig.apiKey.trim() }
                });
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro no pareamento.");
            setPairingCodeValue(data.code || data.pairingCode);
        } else {
            const response = await fetch(`${baseUrl}/instance/connect/${waConfig.instanceName.trim()}`, {
                headers: { 'apikey': waConfig.apiKey.trim() }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro ao gerar QR.");
            const token = data.base64 || data.code;
            setQrCodeUrl(token.startsWith('data:image') ? token : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`);
        }
    } catch (err: any) { 
        setWaConnLogs(prev => [`[ERRO] ${err.message}`, ...prev]);
    } finally { setIsGeneratingWAConnection(false); }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await appBackend.saveAiConfig(config);
      alert("Configuração salva com sucesso!");
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKnowledgeItem = async () => {
    if (!editingItem?.title || !editingItem?.content) return;
    setIsSaving(true);
    try {
      await appBackend.saveAiKnowledgeItem({
        ...editingItem,
        id: editingItem.id || crypto.randomUUID(),
        createdAt: editingItem.createdAt || new Date().toISOString()
      } as AiKnowledgeItem);
      await fetchData();
      setShowItemModal(false);
      setEditingItem(null);
    } catch (e: any) {
      alert("Erro ao salvar item: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Excluir este bloco de conhecimento?")) return;
    try {
      await appBackend.deleteAiKnowledgeItem(id);
      setKnowledge(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  const updateAgentConfig = (field: string, value: any) => {
      setConfig(prev => ({
          ...prev,
          agentConfig: {
              ...(prev.agentConfig || { autoCreateDeal: false, pipelineName: 'Padrão', stageId: 'new', distributionMode: 'fixed' }),
              [field]: value
          }
      }));
  };

  const upcomingClasses = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return classes.filter(c => c.date_mod_1 && c.date_mod_1 > today);
  }, [classes]);

  const dynamicClassesBlockText = useMemo(() => {
    if (upcomingClasses.length === 0) return "Nenhuma turma futura cadastrada no momento.";
    return upcomingClasses.map(c => 
      `ESTADO: ${c.state} | CIDADE: ${c.city} | CURSO: ${c.course} | TURMA: ${c.class_code} | STUDIO: ${c.studio_mod_1} | STATUS: ${c.status} | INÍCIO MOD 1: ${new Date(c.date_mod_1).toLocaleDateString('pt-BR')}`
    ).join('\n');
  }, [upcomingClasses]);

  const handleSimulate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!simInput.trim() || isSimulating) return;

    const userMsg = simInput.trim();
    setSimInput('');
    setSimMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsSimulating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const knowledgeContext = knowledge.map(k => `TÍTULO: ${k.title}\nCONTEÚDO: ${k.content}`).join('\n\n');
      
      const fullSystemPrompt = `
      ${config.systemPrompt}
      
      BASE DE CONHECIMENTO ATUALIZADA (TURMAS FUTURAS):
      ${dynamicClassesBlockText}
      
      BASE DE CONHECIMENTO ADICIONAL:
      ${knowledgeContext}
      
      REGRAS:
      - Use prioritariamente as informações da base de conhecimento de turmas e adicional acima.
      - Se não souber a resposta, peça para o usuário aguardar um atendente humano.
      - Seja breve e focado em converter leads ou ajudar alunos.
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: fullSystemPrompt,
          temperature: config.temperature,
        }
      });

      setSimMessages(prev => [...prev, { role: 'bot', text: response.text || "Desculpe, tive um problema técnico." }]);
    } catch (error: any) {
      setSimMessages(prev => [...prev, { role: 'bot', text: "Erro na conexão com a IA: " + error.message }]);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredKnowledge = knowledge.filter(k => 
    k.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    k.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPipeline = useMemo(() => {
      return pipelines.find(p => p.name === config.agentConfig?.pipelineName) || pipelines[0];
  }, [pipelines, config.agentConfig?.pipelineName]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200 text-white">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Inteligência Artificial de Atendimento</h2>
            <p className="text-xs text-slate-500 font-medium">Configure o cérebro do seu robô de WhatsApp.</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner shrink-0 overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab('config')} className={clsx("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'config' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>
            <Sliders size={14}/> Configuração
          </button>
          <button onClick={() => setActiveTab('agent')} className={clsx("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'agent' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>
            <Bot size={14}/> Agente
          </button>
          <button onClick={() => setActiveTab('knowledge')} className={clsx("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'knowledge' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>
            <BookOpen size={14}/> Base de Conhecimento
          </button>
          <button onClick={() => setActiveTab('whatsapp')} className={clsx("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'whatsapp' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>
            <MessageCircle size={14}/> Config. WhatsApp
          </button>
          <button onClick={() => setActiveTab('simulator')} className={clsx("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'simulator' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>
            <Zap size={14}/> Simulador
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'config' && (
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 animate-in slide-in-from-left-4">
            <section className="max-w-4xl space-y-6">
              <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex gap-4 text-sm text-indigo-800 shadow-sm">
                <Info size={32} className="shrink-0 text-indigo-600" />
                <p>Este painel define como a IA deve se comportar. O <strong>Prompt de Sistema</strong> é a instrução mestre que define a personalidade, o tom de voz e as limitações do robô.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Personalidade do Atendente (Prompt de Sistema)</label>
                  <span className="text-[10px] font-bold text-slate-300">Dica: Seja específico sobre o que ele pode e não pode fazer.</span>
                </div>
                <textarea 
                  className="w-full h-80 p-8 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-indigo-500 rounded-[2.5rem] text-sm font-medium leading-relaxed outline-none transition-all shadow-inner"
                  placeholder="Ex: Você é o assistente virtual da VOLL Pilates. Seu objetivo é ajudar novos alunos a tirarem dúvidas sobre cursos presenciais e online. Use um tom amigável, profissional e direto..."
                  value={config.systemPrompt}
                  onChange={e => setConfig({...config, systemPrompt: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sliders size={14}/> Criatividade (Temperature)</h4>
                  <div className="space-y-4">
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      value={config.temperature}
                      onChange={e => setConfig({...config, temperature: parseFloat(e.target.value)})}
                    />
                    <div className="flex justify-between text-[10px] font-black text-slate-400">
                      <span>PRECISO / RIGOROSO (0.0)</span>
                      <span className="text-indigo-600 text-sm">{config.temperature}</span>
                      <span>CRIATIVO / FLUÍDO (1.0)</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={clsx("p-3 rounded-2xl transition-all", config.isActive ? "bg-green-600 text-white shadow-lg" : "bg-slate-100 text-slate-400")}>
                      {config.isActive ? <Play size={20}/> : <Pause size={20}/>}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Automação Ativa</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Responder automaticamente no WhatsApp.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.isActive} onChange={e => setConfig({...config, isActive: e.target.checked})} />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end">
                <button 
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                  Salvar Configuração Mestra
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 animate-in slide-in-from-right-4">
             <section className="max-w-4xl space-y-8">
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex gap-4 text-sm text-blue-800 shadow-sm">
                    <Target size={32} className="shrink-0 text-blue-600" />
                    <p>Configure como a IA deve interagir com seu <strong>CRM Comercial</strong>. Quando ativado, assim que a atendente capturar o nome e telefone de um novo contato, uma negociação será criada automaticamente no funil e etapa selecionados.</p>
                </div>

                <div className="p-8 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between border-b pb-6">
                        <div className="flex items-center gap-4">
                            <div className={clsx("p-4 rounded-2xl shadow-sm transition-all", config.agentConfig?.autoCreateDeal ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400")}>
                                <Zap size={24}/>
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-widest">Criação Automática de Negócio</h3>
                                <p className="text-xs text-slate-500 font-medium">Transformar chats em oportunidades no CRM.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-110">
                            <input type="checkbox" className="sr-only peer" checked={config.agentConfig?.autoCreateDeal || false} onChange={e => updateAgentConfig('autoCreateDeal', e.target.checked)} />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {config.agentConfig?.autoCreateDeal && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Funil de Destino (CRM)</label>
                                <div className="relative group">
                                    <Kanban className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <select 
                                        className="w-full pl-12 pr-10 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer transition-all"
                                        value={config.agentConfig?.pipelineName || ''}
                                        onChange={e => updateAgentConfig('pipelineName', e.target.value)}
                                    >
                                        {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18}/>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Etapa Inicial</label>
                                <div className="relative group">
                                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <select 
                                        className="w-full pl-12 pr-10 py-3.5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer transition-all"
                                        value={config.agentConfig?.stageId || ''}
                                        onChange={e => updateAgentConfig('stageId', e.target.value)}
                                    >
                                        {(currentPipeline?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18}/>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-6 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-3 mb-2">
                                    <Users size={18} className="text-indigo-600"/>
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Distribuição do Lead</h4>
                                </div>
                                
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                                    <div className="flex bg-white p-1 rounded-xl border shadow-sm w-fit">
                                        <button 
                                            onClick={() => updateAgentConfig('distributionMode', 'fixed')}
                                            className={clsx("px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", config.agentConfig?.distributionMode === 'fixed' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
                                        >
                                            <UserCheck size={14}/> Vendedor Fixo
                                        </button>
                                        <button 
                                            onClick={() => updateAgentConfig('distributionMode', 'round-robin')}
                                            className={clsx("px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", config.agentConfig?.distributionMode === 'round-robin' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
                                        >
                                            <ArrowRightLeft size={14}/> Rodízio por Equipe
                                        </button>
                                    </div>

                                    {config.agentConfig?.distributionMode === 'fixed' ? (
                                        <div className="animate-in slide-in-from-top-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Selecionar Consultor Responsável</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                <select 
                                                    className="w-full pl-12 pr-10 py-3.5 border-2 border-slate-100 bg-white rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer focus:border-indigo-500 transition-all"
                                                    value={config.agentConfig?.fixedOwnerId || ''}
                                                    onChange={e => updateAgentConfig('fixedOwnerId', e.target.value)}
                                                >
                                                    <option value="">Escolha um consultor comercial...</option>
                                                    {collaborators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18}/>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="animate-in slide-in-from-top-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Selecionar Equipe Comercial</label>
                                            <div className="relative group">
                                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                <select 
                                                    className="w-full pl-12 pr-10 py-3.5 border-2 border-slate-100 bg-white rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer focus:border-indigo-500 transition-all"
                                                    value={config.agentConfig?.teamId || ''}
                                                    onChange={e => updateAgentConfig('teamId', e.target.value)}
                                                >
                                                    <option value="">Escolha uma equipe...</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18}/>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-3 font-medium px-1 flex items-center gap-1.5"><Info size={12}/> Novos negócios serão distribuídos sequencialmente (Round Robin) entre os membros desta equipe.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-8 border-t flex justify-end">
                    <button 
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                        Salvar Configurações do Agente
                    </button>
                </div>
             </section>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-500">
            <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar na base de conhecimento..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => { setEditingItem({ title: '', content: '' }); setShowItemModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Plus size={18}/> Novo Bloco de Conhecimento
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Bloco Dinâmico de Cursos/Turmas */}
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] border border-indigo-500 p-6 shadow-xl flex flex-col group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-10">
                          <GraduationCap size={80} className="text-white" />
                      </div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-white/20 text-white rounded-2xl">
                          <GraduationCap size={20}/>
                        </div>
                        <span className="text-[8px] font-black text-indigo-200 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full border border-white/20">Sincronizado Automático</span>
                      </div>
                      <h3 className="font-black text-white mb-2 relative z-10">Cursos/Turmas</h3>
                      <div className="flex-1 overflow-y-auto max-h-40 custom-scrollbar-dark mb-4 pr-2">
                        <pre className="text-[10px] text-indigo-100 font-mono whitespace-pre-wrap leading-relaxed">
                            {dynamicClassesBlockText}
                        </pre>
                      </div>
                      <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center text-[9px] font-black text-indigo-300 uppercase tracking-widest">
                        <span>VOLL LIVE DATA</span>
                        <span>{upcomingClasses.length} Turmas Futuras</span>
                      </div>
                  </div>

                  {filteredKnowledge.map(item => (
                    <div key={item.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all flex flex-col group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <BookOpen size={20}/>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingItem(item); setShowItemModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16}/></button>
                        </div>
                      </div>
                      <h3 className="font-black text-slate-800 mb-2 truncate" title={item.title}>{item.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed font-medium mb-6">{item.content}</p>
                      <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        <span>VOLL KNOWLEDGE BASE</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  
                  {filteredKnowledge.length === 0 && upcomingClasses.length === 0 && (
                    <div className="col-span-full text-center py-32 text-slate-300">
                      <Database size={64} className="mx-auto mb-4 opacity-10" />
                      <p className="font-black uppercase tracking-widest text-xs">Base de conhecimento vazia</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 animate-in slide-in-from-right-4">
                {/* Botão de Ativação Geral IA */}
                <div className="max-w-4xl bg-white rounded-[2rem] border-2 border-indigo-100 p-8 flex items-center justify-between shadow-lg shadow-indigo-100/20 group">
                    <div className="flex items-center gap-6">
                        <div className={clsx("p-5 rounded-[1.5rem] transition-all duration-500", config.isActive ? "bg-green-600 text-white shadow-xl shadow-green-200 rotate-12" : "bg-slate-100 text-slate-400")}>
                            {config.isActive ? <Zap size={32} fill="currentColor"/> : <Pause size={32}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 text-xl tracking-tight">Atendimento Automático IA</h4>
                            <p className="text-xs text-slate-500 font-medium mt-1">Quando ativado, a IA interceptará e responderá novos chats no WhatsApp baseando-se no conhecimento salvo.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer scale-125 mr-4">
                        <input type="checkbox" className="sr-only peer" checked={config.isActive} onChange={e => setConfig({...config, isActive: e.target.checked})} />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600 shadow-inner"></div>
                    </label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 space-y-8 shadow-sm">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b pb-6">
                                <Settings className="text-indigo-600" size={20}/> Configuração de Instância (Evolution)
                            </h3>
                            
                            <div className="space-y-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">URL da API</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" value={waConfig.instanceUrl} onChange={e => setWaConfig({...waConfig, instanceUrl: e.target.value})} placeholder="https://api.voll.com" /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nome Instância</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" value={waConfig.instanceName} onChange={e => setWaConfig({...waConfig, instanceName: e.target.value})} placeholder="Instancia_VOLL" /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">API Key Global</label><input type="password" title="API Key" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" value={waConfig.apiKey} onChange={e => setWaConfig({...waConfig, apiKey: e.target.value})} /></div>
                            </div>

                            <button 
                                onClick={handleSaveWAConfig} 
                                disabled={isSavingWAConfig}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isSavingWAConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Credenciais
                            </button>
                        </div>

                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Link2 size={100}/></div>
                            <div className="flex items-center gap-3 mb-2"><Link2 className="text-indigo-400" size={24}/> <h3 className="text-xs font-black uppercase tracking-widest">Sincronização Webhook</h3></div>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">URL para a Evolution API enviar eventos para que a IA processe e responda em tempo real.</p>
                            <div className="flex gap-2">
                                <input type="text" readOnly className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-mono text-indigo-300 outline-none" value={webhookUrlDisplay} />
                                <button onClick={() => { navigator.clipboard.writeText(webhookUrlDisplay); alert("Webhook copiado!"); }} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all active:scale-95" title="Copiar URL"><Copy size={18}/></button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 text-center space-y-8 shadow-sm">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center justify-center gap-3">
                                <Smartphone className="text-indigo-600" size={20}/> Status do Dispositivo
                            </h3>
                            <div className={clsx("p-10 rounded-[2.5rem] border-4 flex flex-col items-center gap-6 transition-all duration-500", waConfig.isConnected ? "bg-teal-50 border-teal-200 shadow-inner" : "bg-red-50 border-red-200 shadow-inner")}>
                                {waConfig.isConnected ? <Wifi size={64} className="text-teal-500 animate-pulse"/> : <WifiOff size={64} className="text-red-400"/>}
                                <div className="space-y-1">
                                    <span className={clsx("text-sm font-black uppercase tracking-widest", waConfig.isConnected ? "text-teal-700" : "text-red-700")}>
                                        {waConfig.isConnected ? "Aparelho Conectado" : "Aguardando Conexão"}
                                    </span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Última checagem: Agora</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleConnectWAEvolution} 
                                disabled={isGeneratingWAConnection || !waConfig.instanceUrl} 
                                className="w-full py-5 bg-white border-2 border-indigo-50 text-indigo-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isGeneratingWAConnection ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Gerar Novo QR Code
                            </button>
                            {qrCodeUrl && (
                                <div className="p-6 bg-white rounded-3xl shadow-2xl border-2 border-indigo-100 animate-in zoom-in-95">
                                    <img src={qrCodeUrl} className="w-full h-auto rounded-xl" />
                                    <p className="text-[10px] font-black text-indigo-600 uppercase mt-4 tracking-widest">Escaneie com seu Celular</p>
                                </div>
                            )}
                            {pairingCodeValue && (
                                <div className="text-center pt-4 animate-in zoom-in-95">
                                    <div className="inline-block px-10 py-6 bg-white rounded-3xl shadow-xl border-2 border-indigo-200 text-3xl font-black tracking-[0.5em] text-indigo-600">{pairingCodeValue}</div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase mt-4 tracking-widest">Digite no seu WhatsApp</p>
                                </div>
                            )}
                            <div className="space-y-1 text-left">{waConnLogs.map((log, i) => (<p key={i} className="text-[10px] font-mono text-slate-400">{log}</p>))}</div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'simulator' && (
          <div className="flex-1 flex overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            {/* Lado Esquerdo: Info Contexto */}
            <aside className="w-80 border-r border-slate-100 p-8 hidden lg:block overflow-y-auto custom-scrollbar bg-slate-50/50">
               <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Sparkles size={14} className="text-amber-500"/> Contexto Ativo</h4>
                    <div className="p-4 bg-white rounded-2xl border shadow-sm">
                      <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic line-clamp-6">"{config.systemPrompt}"</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Database size={14} className="text-indigo-500"/> Fontes Utilizadas</h4>
                    <div className="space-y-2">
                        <div className="p-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold border border-indigo-500 shadow-sm flex items-center gap-2">
                            <GraduationCap size={12} /> Cursos/Turmas (Live)
                        </div>
                        {knowledge.slice(0, 5).map(k => (
                          <div key={k.id} className="flex items-center gap-2 p-2 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100">
                            <CheckCircle2 size={10} /> {k.title}
                          </div>
                        ))}
                        {knowledge.length > 5 && <p className="text-[9px] text-slate-400 text-center font-bold">+ {knowledge.length - 5} blocos carregados</p>}
                    </div>
                  </div>
               </div>
            </aside>

            {/* Centro: Área de Chat */}
            <main className="flex-1 flex flex-col bg-slate-100 relative">
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {simMessages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare size={48} className="opacity-10 mb-4" />
                        <p className="font-black uppercase tracking-widest text-[10px]">Aguardando sua primeira pergunta...</p>
                      </div>
                    )}
                    {simMessages.map((msg, i) => (
                      <div key={i} className={clsx("flex animate-in fade-in slide-in-from-bottom-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={clsx(
                          "max-w-[80%] p-5 rounded-3xl shadow-md text-sm font-medium leading-relaxed",
                          msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                        )}>
                          <span className={clsx("block text-[8px] font-black uppercase mb-1.5 opacity-60", msg.role === 'user' ? "text-indigo-100" : "text-slate-400")}>{msg.role === 'user' ? 'Você (Simulador)' : 'Assistente IA (Simulado)'}</span>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isSimulating && (
                      <div className="flex justify-start">
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border shadow-sm">
                          <Loader2 className="animate-spin text-indigo-600" size={20} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-8 bg-white border-t border-slate-200">
                    <form onSubmit={handleSimulate} className="max-w-4xl mx-auto flex gap-4">
                        <input 
                          type="text" 
                          className="flex-1 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium text-sm"
                          placeholder="Digite uma dúvida comum do aluno para testar o robô..."
                          value={simInput}
                          onChange={e => setSimInput(e.target.value)}
                        />
                        <button 
                          type="submit" 
                          disabled={!simInput.trim() || isSimulating}
                          className="bg-indigo-600 text-white p-4 rounded-[1.5rem] shadow-xl hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center shrink-0"
                        >
                          <Send size={24} />
                        </button>
                    </form>
                    <p className="text-[9px] text-center text-slate-400 mt-4 uppercase font-black tracking-widest">Atenção: O simulador usa o contexto e a base de conhecimento salvos acima.</p>
                </div>
            </main>
          </div>
        )}
      </div>

      {/* MODAL: NOVO ITEM DE CONHECIMENTO */}
      {showItemModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col">
                <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><Database size={24} className="text-indigo-600"/> {editingItem?.id ? 'Editar Bloco' : 'Novo Bloco de Dados'}</h3>
                    <button onClick={() => setShowItemModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título do Bloco (Resumo)</label>
                        <input 
                            type="text" 
                            className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white outline-none transition-all focus:border-indigo-500" 
                            placeholder="Ex: Política de Reembolso, Tabela de Preços SP..." 
                            value={editingItem?.title || ''}
                            onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Conteúdo (Informações para a IA)</label>
                        <textarea 
                            className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm h-64 focus:bg-white outline-none transition-all focus:border-indigo-500 leading-relaxed font-medium" 
                            placeholder="Descreva aqui as informações técnicas, comerciais ou regras que o robô deve conhecer..."
                            value={editingItem?.content || ''}
                            onChange={e => setEditingItem({...editingItem, content: e.target.value})}
                        />
                    </div>
                </div>
                <div className="px-8 py-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-[2.5rem]">
                    <button onClick={() => setShowItemModal(false)} className="px-6 py-3 text-slate-500 font-bold text-sm hover:underline">Cancelar</button>
                    <button 
                      onClick={handleSaveKnowledgeItem}
                      disabled={isSaving || !editingItem?.title || !editingItem?.content}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Salvar na Base
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};