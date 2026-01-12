
import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Smartphone, Loader2, Wifi, 
  WifiOff, RefreshCw, Link2, AlertCircle, Copy, Zap, Info, Plus, 
  Trash2, Edit2, CheckCircle2, XCircle, ShoppingBag, MessageSquare, X
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { WAAutomationRule, Product } from '../types';

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
    loadProducts();
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

  const loadProducts = async () => {
      try {
          const { data } = await appBackend.client.from('crm_products').select('*').order('name');
          if (data) setProducts(data);
      } catch (e) { console.error(e); }
  };

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
                // Fixed: used config instead of non-existent variable 'target'
                headers: { 'apikey': config.apiKey.trim() }
            });
            
            if (!response.ok && response.status === 404) {
                response = await fetch(`${baseUrl}/instance/connect/pairingCode/${config.instanceName.trim()}?number=${cleanNumber}`, {
                    // Fixed: used config instead of non-existent variable 'target'
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
      if (!editingRule?.name || !editingRule?.productId || !editingRule?.messageTemplate) {
          alert("Preencha todos os campos da automação.");
          return;
      }
      setIsSavingConfig(true);
      try {
          await appBackend.saveWAAutomationRule({
              ...editingRule,
              triggerType: 'deal_closed',
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <Zap className="text-indigo-600" /> Automação de Whatsapp
                </h2>
                <p className="text-sm text-slate-500 font-medium">Configure robôs e mensagens automáticas para sua rede.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
                <button onClick={() => setActiveTab('automations')} className={clsx("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", activeTab === 'automations' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500")}>Automações</button>
                <button onClick={() => setActiveTab('config')} className={clsx("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", activeTab === 'config' ? "bg-white text-indigo-700 shadow-md" : "text-slate-500")}>Conexão</button>
            </div>
        </div>

        {activeTab === 'config' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 space-y-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-4">
                            <Settings className="text-indigo-600" size={20}/> Credenciais da Instância
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">URL da Evolution API</label>
                                <input 
                                    type="text" 
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                                    value={config.instanceUrl} 
                                    onChange={e => setConfig({...config, instanceUrl: e.target.value})} 
                                    placeholder="https://api.sua-instancia.com" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Instância</label>
                                <input 
                                    type="text" 
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                                    value={config.instanceName} 
                                    onChange={e => setConfig({...config, instanceName: e.target.value})} 
                                    placeholder="Ex: Atendimento_Voll" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">API Key Global</label>
                                <input 
                                    type="password" 
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                                    value={config.apiKey} 
                                    onChange={e => setConfig({...config, apiKey: e.target.value})} 
                                    placeholder="Sua chave de segurança" 
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={handleSaveConfig} 
                                disabled={isSavingConfig}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Salvar Configurações
                            </button>
                        </div>
                    </div>

                    <div className="bg-indigo-900 rounded-[2rem] p-8 text-white space-y-4 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl text-indigo-300"><Link2 size={24}/></div>
                            <h3 className="text-lg font-black uppercase tracking-widest">Webhook de Integração</h3>
                        </div>
                        <p className="text-sm text-indigo-200 leading-relaxed font-medium">Use a URL abaixo nas configurações de Webhook da sua instância na Evolution para sincronizar mensagens com este painel.</p>
                        <div className="flex gap-2">
                            <input type="text" readOnly className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-mono text-indigo-300 outline-none" value={webhookUrlDisplay} />
                            <button onClick={() => { navigator.clipboard.writeText(webhookUrlDisplay); alert("Webhook copiado!"); }} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all active:scale-95" title="Copiar URL"><Copy size={20}/></button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 space-y-6 text-center">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center justify-center gap-2">
                            <Smartphone className="text-teal-600" size={18}/> Status de Conexão
                        </h3>
                        <div className={clsx("p-6 rounded-3xl border-4 flex flex-col items-center gap-4 transition-all", config.isConnected ? "bg-teal-50 border-teal-100" : "bg-red-50 border-red-100")}>
                            {config.isConnected ? <Wifi size={48} className="text-teal-500 animate-pulse"/> : <WifiOff size={48} className="text-red-400"/>}
                            <span className={clsx("text-xs font-black uppercase tracking-widest", config.isConnected ? "text-teal-700" : "text-red-700")}>
                                {config.isConnected ? "Aparelho Conectado" : "Desconectado"}
                            </span>
                        </div>
                        <button 
                            onClick={handleConnectEvolution} 
                            disabled={isGeneratingConnection || !config.instanceUrl} 
                            className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-600/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isGeneratingConnection ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                            Gerar Novo QR Code
                        </button>
                        {qrCodeUrl && (
                            <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-100 animate-in zoom-in-95">
                                <img src={qrCodeUrl} className="w-full h-auto" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Regras de Disparo Automático</h3>
                        <p className="text-slate-500 font-medium max-w-lg leading-relaxed">Crie gatilhos baseados no estágio do CRM. Quando uma venda for fechada, o sistema enviará a mensagem definida para o cliente.</p>
                    </div>
                    <button 
                        onClick={() => { setEditingRule({ name: '', triggerType: 'deal_closed', isActive: true, productId: '', messageTemplate: '' }); setShowRuleModal(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 shrink-0"
                    >
                        <Plus size={20}/> Nova Automação
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoadingRules ? (
                        <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
                    ) : rules.length === 0 ? (
                        <div className="col-span-full text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400">
                            <MessageSquare size={64} className="mx-auto mb-4 opacity-10"/>
                            <p className="font-bold text-lg">Nenhuma automação ativa</p>
                            <p className="text-sm">Clique em "+ Nova Automação" para começar.</p>
                        </div>
                    ) : rules.map(rule => {
                        const product = products.find(p => p.id === rule.productId);
                        return (
                            <div key={rule.id} className={clsx("bg-white rounded-[2rem] border-2 p-8 shadow-sm transition-all hover:shadow-xl group", rule.isActive ? "border-indigo-100" : "border-slate-100 opacity-60")}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className={clsx("p-3 rounded-2xl", rule.isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400")}>
                                        <Zap size={24}/>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingRule(rule); setShowRuleModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h4 className="font-black text-slate-800 text-lg mb-1">{rule.name}</h4>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 mb-4"><ShoppingBag size={10}/> {product?.name || 'Produto Não Localizado'}</p>
                                
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Mensagem do Robô:</p>
                                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-medium">"{rule.messageTemplate}"</p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <span className={clsx("text-[9px] font-black uppercase px-2 py-1 rounded-full", rule.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                                        {rule.isActive ? 'Ativa' : 'Pausada'}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-300">Gatilho: Venda Concluída</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* MODAL: NOVA REGRA DE AUTOMAÇÃO */}
        {showRuleModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20"><Zap size={20}/></div>
                            <h3 className="text-lg font-black text-slate-800">Configurar Automação WhatsApp</h3>
                        </div>
                        <button onClick={() => setShowRuleModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Identificador da Regra</label>
                                <input type="text" className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editingRule?.name} onChange={e => setEditingRule(prev => prev ? {...prev, name: e.target.value} : null)} placeholder="Ex: Boas Vindas - Formação Pilates" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Produto / Curso de Origem</label>
                                <select className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer transition-all" value={editingRule?.productId} onChange={e => setEditingRule(prev => prev ? {...prev, productId: e.target.value} : null)}>
                                    <option value="">Selecione o produto comercial...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Gatilho de Disparo</label>
                                <div className="px-5 py-3 border-2 border-slate-100 bg-slate-100 rounded-2xl text-sm font-bold text-slate-500 flex items-center gap-2 cursor-not-allowed">
                                    <CheckCircle2 size={16}/> Venda Concluída (Closed)
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex justify-between items-center mb-1.5 ml-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto da Mensagem (Template)</label>
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">Variáveis: {"{{nome_cliente}}"}, {"{{curso}}"}</span>
                                </div>
                                <textarea className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-2xl text-sm h-32 resize-none outline-none leading-relaxed transition-all" value={editingRule?.messageTemplate} onChange={e => setEditingRule(prev => prev ? {...prev, messageTemplate: e.target.value} : null)} placeholder="Olá {{nome_cliente}}, parabéns pela compra do curso {{curso}}! ..." />
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:border-indigo-200 transition-all">
                                    <input type="checkbox" className="w-5 h-5 rounded text-indigo-600" checked={editingRule?.isActive} onChange={e => setEditingRule(prev => prev ? {...prev, isActive: e.target.checked} : null)} />
                                    <div><span className="font-black text-slate-800 text-xs uppercase tracking-widest">Automação Ativa</span><p className="text-[10px] text-slate-400 font-medium">Os robôs só enviarão mensagens enquanto esta regra estiver ativa.</p></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-[2.5rem] shrink-0">
                        <button onClick={() => setShowRuleModal(false)} className="px-6 py-2.5 text-slate-500 font-black text-xs uppercase tracking-widest">Cancelar</button>
                        <button onClick={handleSaveRule} disabled={isSavingConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2 transition-all">
                            {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Automação
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
