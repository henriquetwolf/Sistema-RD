import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Save, Smartphone, Loader2, Wifi, 
  WifiOff, RefreshCw, Link2, AlertCircle, Copy, Zap, Info, Plus, 
  Trash2, Edit2, CheckCircle2, XCircle, ShoppingBag, MessageSquare, X, Filter, Target, Package, ChevronRight,
  LayoutGrid
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend, Pipeline } from '../services/appBackend';
import { WAAutomationRule, Product, EventModel } from '../types';

interface WAConfig {
  mode: 'evolution' | 'twilio';
  evolutionMethod: 'qr' | 'code';
  instanceUrl: string;
  instanceName: string;
  apiKey: string;
  pairingNumber: string;
  isConnected: boolean;
}

export const WhatsAppAutomation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'automations'>('automations');
  const [config, setConfig] = useState<WAConfig>({
      mode: 'evolution',
      evolutionMethod: 'qr',
      instanceUrl: '',
      instanceName: '',
      apiKey: '',
      pairingNumber: '',
      isConnected: false
  });
  
  const [rules, setRules] = useState<WAAutomationRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<WAAutomationRule> | null>(null);

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isGeneratingConnection, setIsGeneratingConnection] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingCodeValue, setPairingCodeValue] = useState<string | null>(null);
  const [connLogs, setConnLogs] = useState<string[]>([]);

  const webhookUrlDisplay = "https://wfrzsnwisypmgsbeccfj.supabase.co/functions/v1/rapid-service";

  useEffect(() => {
    loadConfig();
    loadRules();
    loadCrmMetadata();
  }, []);

  const loadConfig = async () => {
    const c = await appBackend.getWhatsAppConfig();
    if (c) {
        setConfig(prev => ({ ...prev, ...c }));
        checkRealStatus(c);
    }
  };

  const loadRules = async () => {
      setIsLoadingRules(true);
      try {
          const data = await appBackend.getWAAutomationRules();
          setRules(data);
      } catch (e) { console.error(e); } finally { setIsLoadingRules(false); }
  };

  const loadCrmMetadata = async () => {
      try {
          const [prodsRes, pipesRes, evtsRes] = await Promise.all([
              appBackend.client.from('crm_products').select('*').order('name'),
              appBackend.getPipelines(),
              appBackend.getEvents()
          ]);
          if (prodsRes.data) setProducts(prodsRes.data);
          if (pipesRes) setPipelines(pipesRes);
          if (evtsRes) setEvents(evtsRes);
      } catch (e) { console.error(e); }
  };

  const productOptions = useMemo(() => {
      if (!editingRule?.productType) return products.map(p => p.name).sort();
      if (editingRule.productType === 'Digital') return products.filter(p => p.category === 'Curso Online' || p.category === 'E-book').map(p => p.name).sort();
      if (editingRule.productType === 'Evento') return events.map(e => e.name).sort();
      if (editingRule.productType === 'Presencial') return products.filter(p => p.category === 'Presencial').map(p => p.name).sort();
      return [];
  }, [editingRule?.productType, products, events]);

  const currentPipelineStages = useMemo(() => {
      if (!editingRule?.pipelineName) return [];
      return pipelines.find(p => p.name === editingRule.pipelineName)?.stages || [];
  }, [editingRule?.pipelineName, pipelines]);

  const checkRealStatus = async (targetConfig?: any) => {
    const target = targetConfig || config;
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
        setConfig(prev => ({ ...prev, isConnected: state === 'open' }));
    } catch (e) {
        setConfig(prev => ({ ...prev, isConnected: false }));
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
        alert("Configurações salvas com sucesso!");
        checkRealStatus(sanitizedConfig);
    } catch (e: any) { 
        alert(`Erro ao salvar: ${e.message}`); 
    } finally { 
        setIsSavingConfig(false); 
    }
  };

  const handleConnectEvolution = async () => {
    setIsGeneratingConnection(true);
    setQrCodeUrl(null);
    setPairingCodeValue(null);
    setConnLogs([`Iniciando tentativa de conexão...`]);
    try {
        if (!config.instanceUrl || !config.instanceName) throw new Error("Preencha os dados da instância.");
        
        let baseUrl = config.instanceUrl.trim();
        if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
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
    } catch (err: any) { 
        setConnLogs(prev => [`[ERRO] ${err.message}`, ...prev]);
    } finally { setIsGeneratingConnection(false); }
  };

  const handleSaveRule = async () => {
      if (!editingRule?.name || !editingRule?.pipelineName || !editingRule?.stageId || !editingRule?.messageTemplate) {
          alert("Preencha os campos obrigatórios (Nome, Funil, Etapa e Mensagem).");
          return;
      }
      setIsSavingConfig(true);
      try {
          await appBackend.saveWAAutomationRule({
              ...editingRule,
              triggerType: 'crm_stage_reached',
              isActive: editingRule.isActive ?? true
          } as WAAutomationRule);
          await loadRules();
          setShowRuleModal(false);
          setEditingRule(null);
      } catch (e: any) {
          alert("Erro ao salvar automação: " + e.message);
      } finally {
          setIsSavingConfig(false);
      }
  };

  const handleDeleteRule = async (id: string) => {
      if (!window.confirm("Deseja excluir esta automação?")) return;
      try {
          await appBackend.deleteWAAutomationRule(id);
          setRules(prev => prev.filter(r => r.id !== id));
      } catch (e) { alert("Erro ao excluir."); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <Zap className="text-indigo-600" /> Automação de Whatsapp
                </h2>
                <p className="text-sm text-slate-500 font-medium">Configure robôs e gatilhos baseados nas ações do CRM Comercial.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
                <button onClick={() => setActiveTab('automations')} className={clsx("px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", activeTab === 'automations' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>Automações</button>
                <button onClick={() => setActiveTab('config')} className={clsx("px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", activeTab === 'config' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>Config. Instância</button>
            </div>
        </div>

        {activeTab === 'config' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 border-b pb-6">
                            <Settings className="text-indigo-600" size={24}/> Credenciais da Instância Evolution
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">URL Base da Evolution API</label>
                                <input 
                                    type="text" 
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" 
                                    value={config.instanceUrl} 
                                    onChange={e => setConfig({...config, instanceUrl: e.target.value})} 
                                    placeholder="https://api.evolution.sua-empresa.com" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome da Instância</label>
                                <input 
                                    type="text" 
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" 
                                    value={config.instanceName} 
                                    onChange={e => setConfig({...config, instanceName: e.target.value})} 
                                    placeholder="Ex: VOLL_ATENDIMENTO" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">API Key Global</label>
                                <input 
                                    type="password" 
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" 
                                    value={config.apiKey} 
                                    onChange={e => setConfig({...config, apiKey: e.target.value})} 
                                    placeholder="Inserir Chave Global" 
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <button 
                                onClick={handleSaveConfig} 
                                disabled={isSavingConfig}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Salvar & Validar Conexão
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-4 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5"><Link2 size={120}/></div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-white/10 rounded-2xl text-indigo-400"><Link2 size={24}/></div>
                            <h3 className="text-xl font-black uppercase tracking-widest">Sincronização via Webhook</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-lg">Para que este painel receba o status das mensagens enviadas pelos robôs, copie a URL abaixo e cole no campo "Webhook" da sua instância.</p>
                        <div className="flex gap-3 pt-2">
                            <input type="text" readOnly className="flex-1 px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-mono text-indigo-300 outline-none" value={webhookUrlDisplay} />
                            <button onClick={() => { navigator.clipboard.writeText(webhookUrlDisplay); alert("Webhook copiado!"); }} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all active:scale-95" title="Copiar URL"><Copy size={20}/></button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8 text-center">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center justify-center gap-3">
                            <Smartphone className="text-teal-600" size={20}/> Status do Dispositivo
                        </h3>
                        <div className={clsx("p-10 rounded-[2.5rem] border-4 flex flex-col items-center gap-6 transition-all", config.isConnected ? "bg-teal-50 border-teal-200" : "bg-red-50 border-red-200")}>
                            {config.isConnected ? <Wifi size={64} className="text-teal-500 animate-pulse"/> : <WifiOff size={64} className="text-red-400"/>}
                            <div className="space-y-1">
                                <span className={clsx("text-sm font-black uppercase tracking-widest", config.isConnected ? "text-teal-700" : "text-red-700")}>
                                    {config.isConnected ? "Aparelho Online" : "Instância Offline"}
                                </span>
                                <p className="text-[10px] text-slate-400 font-bold">Último check: {new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleConnectEvolution} 
                            disabled={isGeneratingConnection || !config.instanceUrl} 
                            className="w-full py-5 bg-teal-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-600/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isGeneratingConnection ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                            Gerar QR Code de Conexão
                        </button>
                        {qrCodeUrl && (
                            <div className="p-6 bg-white rounded-3xl shadow-inner border border-slate-100 animate-in zoom-in-95 mt-4">
                                <img src={qrCodeUrl} className="w-full h-auto rounded-xl" />
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">Escaneie com o WhatsApp</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative z-10 flex-1">
                        <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mb-4 border border-indigo-100 flex items-center gap-2 animate-pulse"><Zap size={12}/> Automação Inteligente</div>
                        <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Gatilhos do CRM Comercial</h3>
                        <p className="text-slate-500 font-medium max-w-xl leading-relaxed">Automatize o envio de mensagens baseando-se no avanço do funil. Quando o aluno atingir uma etapa específica, o robô enviará as orientações por WhatsApp instantaneamente.</p>
                    </div>
                    <button 
                        onClick={() => { setEditingRule({ name: '', triggerType: 'crm_stage_reached', isActive: true, productId: '', pipelineName: 'Padrão', stageId: 'closed', productType: '', messageTemplate: '' }); setShowRuleModal(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-3 shrink-0"
                    >
                        <Plus size={24}/> Criar Novo Gatilho
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {isLoadingRules ? (
                        <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>
                    ) : rules.length === 0 ? (
                        <div className="col-span-full text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-400">
                            <MessageSquare size={80} className="mx-auto mb-6 opacity-10"/>
                            <p className="font-black text-xl text-slate-600">Nenhum gatilho ativo</p>
                            <p className="text-sm font-medium">Clique em "Criar Novo Gatilho" para iniciar uma jornada automática.</p>
                        </div>
                    ) : rules.map(rule => {
                        const product = products.find(p => p.id === rule.productId) || { name: rule.productId || 'Todos os Produtos' };
                        return (
                            <div key={rule.id} className={clsx("bg-white rounded-[2.5rem] border-2 p-10 shadow-sm transition-all hover:shadow-2xl group flex flex-col", rule.isActive ? "border-indigo-50" : "border-slate-50 opacity-60")}>
                                <div className="flex justify-between items-start mb-8">
                                    <div className={clsx("p-4 rounded-2xl shadow-sm", rule.isActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400")}>
                                        <Zap size={24}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingRule(rule); setShowRuleModal(true); }} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"><Edit2 size={18}/></button>
                                        <button onClick={() => handleDeleteRule(rule.id)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                                
                                <h4 className="font-black text-slate-800 text-xl mb-2 tracking-tight line-clamp-1">{rule.name}</h4>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-slate-100 flex items-center gap-1"><Filter size={10}/> {rule.pipelineName}</span>
                                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-indigo-100 flex items-center gap-1"><Target size={10}/> {rule.stageId}</span>
                                    {rule.productType && <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-teal-100 flex items-center gap-1"><Package size={10}/> {rule.productType}</span>}
                                </div>

                                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 mb-8 flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><MessageSquare size={12}/> Mensagem Automática:</p>
                                    <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed font-medium italic">"{rule.messageTemplate}"</p>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto">
                                    <div className="flex items-center gap-2">
                                        <div className={clsx("w-2 h-2 rounded-full", rule.isActive ? "bg-green-500 animate-pulse" : "bg-slate-300")}></div>
                                        <span className={clsx("text-[10px] font-black uppercase tracking-widest", rule.isActive ? "text-green-700" : "text-slate-500")}>
                                            {rule.isActive ? 'Gatilho Ativo' : 'Pausado'}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400">Criado em {new Date(rule.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* MODAL: NOVA REGRA DE AUTOMAÇÃO (DASHBOARD STYLE) */}
        {showRuleModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh]">
                    <div className="px-10 py-8 border-b flex justify-between items-center bg-slate-50 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/30"><Zap size={24}/></div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Configurar Automação WhatsApp</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gatilho Baseado em Estágios do CRM Comercial</p>
                            </div>
                        </div>
                        <button onClick={() => setShowRuleModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32}/></button>
                    </div>

                    <div className="p-10 overflow-y-auto custom-scrollbar space-y-10 flex-1">
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Nome Identificador da Regra</label>
                                <input type="text" className="w-full px-6 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[1.5rem] text-base font-bold outline-none transition-all" value={editingRule?.name} onChange={e => setEditingRule(prev => prev ? {...prev, name: e.target.value} : null)} placeholder="Ex: Boas Vindas - Formação Pilates" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Funil de Vendas (Pipeline)</label>
                                    <div className="relative group">
                                        <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                        <select className="w-full pl-14 pr-10 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[1.5rem] text-sm font-bold outline-none appearance-none cursor-pointer transition-all" value={editingRule?.pipelineName} onChange={e => setEditingRule(prev => prev ? {...prev, pipelineName: e.target.value, stageId: ''} : null)}>
                                            {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={20}/>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Etapa de Gatilho (Trigger)</label>
                                    <div className="relative group">
                                        <Target className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                        <select className="w-full pl-14 pr-10 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[1.5rem] text-sm font-bold outline-none appearance-none cursor-pointer transition-all disabled:opacity-50" value={editingRule?.stageId} onChange={e => setEditingRule(prev => prev ? {...prev, stageId: e.target.value} : null)} disabled={!editingRule?.pipelineName}>
                                            <option value="">Selecione a etapa...</option>
                                            {currentPipelineStages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={20}/>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Tipo de Produto (Filtro)</label>
                                    <div className="relative group">
                                        <LayoutGrid className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                        <select className="w-full pl-14 pr-10 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[1.5rem] text-sm font-bold outline-none appearance-none cursor-pointer transition-all" value={editingRule?.productType} onChange={e => setEditingRule(prev => prev ? {...prev, productType: e.target.value as any, productId: ''} : null)}>
                                            <option value="">Qualquer tipo de produto</option>
                                            <option value="Digital">Digital (Online)</option>
                                            <option value="Presencial">Presencial (Turmas)</option>
                                            <option value="Evento">Evento (Workshops)</option>
                                        </select>
                                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={20}/>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Produto / Curso de Origem</label>
                                    <div className="relative group">
                                        <ShoppingBag className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                        <select className="w-full pl-14 pr-10 py-4 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[1.5rem] text-sm font-bold outline-none appearance-none cursor-pointer transition-all" value={editingRule?.productId} onChange={e => setEditingRule(prev => prev ? {...prev, productId: e.target.value} : null)}>
                                            <option value="">Qualquer produto comercial...</option>
                                            {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={20}/>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3 ml-1">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Texto da Mensagem (Template)</label>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">Tags: {"{{nome_cliente}}"}, {"{{curso}}"}</span>
                                </div>
                                <textarea className="w-full px-6 py-5 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[2rem] text-sm font-medium h-48 resize-none outline-none leading-relaxed transition-all" value={editingRule?.messageTemplate} onChange={e => setEditingRule(prev => prev ? {...prev, messageTemplate: e.target.value} : null)} placeholder="Olá {{nome_cliente}}, parabéns pela compra do curso {{curso}}! ..." />
                                <div className="mt-4 flex items-start gap-3 px-2">
                                    <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">As variáveis entre chaves serão substituídas pelos dados reais do cliente no momento do disparo.</p>
                                </div>
                            </div>

                            <label className="flex items-center gap-4 p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 cursor-pointer hover:border-indigo-200 transition-all shadow-inner">
                                <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all", editingRule?.isActive ? "bg-green-600 text-white" : "bg-white text-slate-300")}>
                                    {editingRule?.isActive ? <CheckCircle2 size={24}/> : <XCircle size={24}/>}
                                </div>
                                <div className="flex-1">
                                    <span className="font-black text-slate-800 text-sm uppercase tracking-widest">Automação Ativa</span>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">O robô disparará as mensagens enquanto o status for ATIVO.</p>
                                </div>
                                <input type="checkbox" className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-offset-0 focus:ring-0 border-2" checked={editingRule?.isActive} onChange={e => setEditingRule(prev => prev ? {...prev, isActive: e.target.checked} : null)} />
                            </label>
                        </div>
                    </div>

                    <div className="px-10 py-8 bg-slate-50 border-t flex justify-end gap-4 shrink-0">
                        <button onClick={() => setShowRuleModal(false)} className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 rounded-2xl transition-all">Cancelar</button>
                        <button onClick={handleSaveRule} disabled={isSavingConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 active:scale-95 flex items-center gap-3 transition-all">
                            {isSavingConfig ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />} Salvar Automação
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
