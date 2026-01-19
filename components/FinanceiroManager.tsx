import React, { useState, useEffect } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick, Check, Eye, EyeOff, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';

interface ContaAzulConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    isConnected: boolean;
    lastSync?: string;
}

export const FinanceiroManager: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'integração'>('overview');
    const [config, setConfig] = useState<ContaAzulConfig>({
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        isConnected: false
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showDebugUrl, setShowDebugUrl] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const { data } = await appBackend.client
                .from('crm_settings')
                .select('value')
                .eq('key', 'conta_azul_config')
                .maybeSingle();
            
            let loadedConfig: ContaAzulConfig = {
                clientId: '',
                clientSecret: '',
                redirectUri: window.location.origin,
                isConnected: false
            };

            if (data?.value) {
                loadedConfig = JSON.parse(data.value);
                if (!loadedConfig.redirectUri) {
                    loadedConfig.redirectUri = window.location.origin;
                }
            }
            
            setConfig(loadedConfig);
        } catch (e) {
            console.error("Erro ao carregar configuração Conta Azul:", e);
            setConfig(prev => ({ ...prev, redirectUri: window.location.origin }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            // Limpeza de espaços em branco acidentais
            const sanitizedConfig = {
                ...config,
                clientId: config.clientId.trim(),
                clientSecret: config.clientSecret.trim(),
                redirectUri: config.redirectUri.trim()
            };

            await appBackend.client
                .from('crm_settings')
                .upsert({ 
                    key: 'conta_azul_config', 
                    value: JSON.stringify(sanitizedConfig) 
                }, { onConflict: 'key' });
            
            setConfig(sanitizedConfig);
            alert("Configurações salvas e validadas com sucesso!");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyUri = () => {
        navigator.clipboard.writeText(config.redirectUri);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Gera a URL de autorização para o usuário conferir
    const generatedAuthUrl = `https://app.contaazul.com/auth/authorize?client_id=${config.clientId.trim()}&redirect_uri=${encodeURIComponent(config.redirectUri.trim())}&scope=sales%20financial&state=voll_erp`;

    const handleConnect = () => {
        if (!config.clientId || !config.redirectUri) {
            alert("Preencha o Client ID e a URL de Redirecionamento para conectar.");
            return;
        }
        window.open(generatedAuthUrl, '_blank');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-teal-600" /> Financeiro
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Gestão de receitas e integração ERP.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
                    <button 
                        onClick={() => setActiveSubTab('overview')} 
                        className={clsx(
                            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", 
                            activeSubTab === 'overview' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Visão Geral
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('integração')} 
                        className={clsx(
                            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", 
                            activeSubTab === 'integração' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Integração Conta Azul
                    </button>
                </div>
            </div>

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 shadow-inner">
                            <Wallet size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Financeiro</h3>
                        <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">Acesse a aba de <strong>Integração</strong> para configurar sua conexão com a Conta Azul.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* ALERT PARA ERRO 404 */}
                        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex gap-4 animate-in slide-in-from-top-4">
                            <div className="bg-red-500 text-white p-2 rounded-xl h-fit shadow-lg">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 className="text-red-800 font-black text-sm uppercase">Recebeu erro "Página não encontrada" (404)?</h4>
                                <p className="text-red-700 text-xs mt-1 leading-relaxed font-medium">
                                    Isso significa que o Conta Azul não localizou seu <strong>Client ID</strong>. <br/>
                                    1. Verifique se o seu aplicativo no Portal de Devs não está como "Rascunho". <br/>
                                    2. Certifique-se de que copiou o <strong>Client ID</strong> sem espaços extras no início ou fim.
                                </p>
                            </div>
                        </div>

                        {/* FORMULÁRIO DE CONFIGURAÇÃO */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Cloud size={120}/></div>
                            <div className="flex items-center justify-between border-b pb-6 relative z-10">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                                    <Key className="text-blue-500" size={24}/> Credenciais da API
                                </h3>
                                <div className={clsx(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border",
                                    config.isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                )}>
                                    <div className={clsx("w-2 h-2 rounded-full", config.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                    {config.isConnected ? "Conectado" : "Aguardando Conexão"}
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                            ) : (
                                <div className="space-y-6 relative z-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Client ID (Código da Aplicação)</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono" 
                                                value={config.clientId} 
                                                onChange={e => setConfig({...config, clientId: e.target.value})}
                                                placeholder="Copiado do portal do desenvolvedor"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Client Secret (Chave Secreta)</label>
                                            <input 
                                                type="password" 
                                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono" 
                                                value={config.clientSecret} 
                                                onChange={e => setConfig({...config, clientSecret: e.target.value})}
                                                placeholder="Chave secreta gerada no portal"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                                URL de Redirecionamento (Redirect URI)
                                                <Info size={12} className="text-slate-300" />
                                            </label>
                                            <div className="relative group/uri">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                                <input 
                                                    type="text" 
                                                    className="w-full pl-12 pr-24 py-3.5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono text-indigo-700 font-bold" 
                                                    value={config.redirectUri} 
                                                    onChange={e => setConfig({...config, redirectUri: e.target.value})}
                                                    placeholder="URL do sistema..."
                                                />
                                                <button 
                                                    onClick={handleCopyUri}
                                                    className={clsx(
                                                        "absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2",
                                                        copied ? "bg-green-500 text-white" : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                                                    )}
                                                >
                                                    {copied ? <Check size={12}/> : <Copy size={12}/>}
                                                    {copied ? "Pronto!" : "Copiar"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DEBUG URL TOGGLE */}
                                    <div className="pt-2">
                                        <button 
                                            onClick={() => setShowDebugUrl(!showDebugUrl)}
                                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:text-indigo-600 transition-colors"
                                        >
                                            {showDebugUrl ? <EyeOff size={14}/> : <Eye size={14}/>}
                                            {showDebugUrl ? "Ocultar URL de Diagnóstico" : "Ver URL de Diagnóstico (Caso tenha erro 404)"}
                                        </button>
                                        {showDebugUrl && (
                                            <div className="mt-3 p-4 bg-slate-900 rounded-2xl border border-slate-800 text-[10px] font-mono text-indigo-300 break-all animate-in slide-in-from-top-2">
                                                <p className="mb-2 text-slate-500 uppercase font-black">URL que o sistema está enviando:</p>
                                                {generatedAuthUrl}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-50">
                                        <button 
                                            onClick={handleSaveConfig}
                                            disabled={isSaving}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save size={16}/> 1. Salvar Dados
                                        </button>
                                        <button 
                                            onClick={handleConnect}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <RefreshCw size={18}/> 2. Autorizar Integração
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* GUIA TÉCNICO */}
                        <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><ListChecks size={24}/></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Guia Anti-Erros</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Como garantir que o Conta Azul aceite a conexão</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">01</div>
                                    <div className="space-y-1 pt-1 flex-1">
                                        <p className="font-bold text-slate-800 flex items-center gap-2">Verifique o Status do App</p>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">No <a href="https://developers.contaazul.com" target="_blank" className="text-blue-600 font-bold">Portal de Desenvolvedores</a>, verifique se seu aplicativo não está parado em rascunho. O erro 404 acontece quando o sistema deles não encontra o código do seu app.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">02</div>
                                    <div className="space-y-3 pt-1 flex-1">
                                        <p className="font-bold text-slate-800 flex items-center gap-2">URL de Redirecionamento <MousePointerClick size={14} className="text-indigo-400"/></p>
                                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                                            <p className="text-xs text-slate-600 leading-relaxed font-medium">O link azul destacado no formulário acima deve ser colado <strong>EXATAMENTE IGUAL</strong> no campo "URL de Redirecionamento" do portal deles. Se houver uma barra (/) a mais no final em um e não no outro, o erro ocorrerá.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">03</div>
                                    <div className="space-y-1 pt-1 flex-1">
                                        <p className="font-bold text-slate-800">Use uma Guia Anônima</p>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">Se o erro 404 persistir, tente clicar no botão de Autorizar usando uma guia anônima do navegador. Às vezes o cache do navegador "suja" a sessão de autenticação.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5"><Link2 size={120}/></div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/10 rounded-xl text-indigo-400"><Info size={20}/></div>
                                <h3 className="text-sm font-black uppercase tracking-widest">Suporte Técnico</h3>
                            </div>
                            <p className="text-xs text-indigo-100/70 leading-relaxed font-medium">
                                Se você revisou o <strong>Client ID</strong> e as <strong>URLs</strong> e o erro persiste, verifique se sua conta no Conta Azul possui permissão para utilizar a API (alguns planos básicos não permitem integração externa).
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};