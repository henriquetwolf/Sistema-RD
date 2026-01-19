import React, { useState, useEffect } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick, Check, Eye, EyeOff, AlertTriangle, ShieldAlert,
  ArrowRightLeft, Lock, Layout, Zap, ArrowRight, MousePointer2
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
                redirectUri: window.location.origin + '/',
                isConnected: false
            };

            if (data?.value) {
                loadedConfig = JSON.parse(data.value);
            }
            
            setConfig(loadedConfig);
        } catch (e) {
            console.error("Erro ao carregar configuração Conta Azul:", e);
            setConfig(prev => ({ ...prev, redirectUri: window.location.origin + '/' }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
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
            alert("Configurações salvas com sucesso!");
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

    const isClientIdValid = config.clientId.trim().length >= 20;
    const hasTrailingSlash = config.redirectUri.endsWith('/');

    const handleConnect = () => {
        const cleanClientId = config.clientId.trim();
        const cleanRedirectUri = config.redirectUri.trim();

        if (cleanClientId.length < 10) {
            alert("O Client ID parece muito curto. Verifique no portal.");
            return;
        }

        if (!cleanRedirectUri) {
            alert("A URL de redirecionamento não pode estar vazia.");
            return;
        }

        // URL baseada na documentação e no print enviado
        const authUrl = `https://auth.contaazul.com/login?response_type=code&client_id=${cleanClientId}&redirect_uri=${encodeURIComponent(cleanRedirectUri)}&scope=sales%20financial&state=voll_erp`;
        window.open(authUrl, '_blank');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-teal-600" /> Financeiro
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Gestão de receitas e integração com Conta Azul.</p>
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
                        Configurar Integração
                    </button>
                </div>
            </div>

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 shadow-inner">
                            <Wallet size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Módulo Financeiro</h3>
                        <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">Acesse a aba de <strong>Configurar Integração</strong> para conectar seu Conta Azul.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* COLUNA 1: FORMULÁRIO */}
                    <div className="xl:col-span-5 space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 space-y-8 relative overflow-hidden">
                            <div className="flex items-center justify-between border-b pb-6">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase">
                                    <Key className="text-blue-500" /> Credenciais da API
                                </h3>
                                <div className={clsx(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 border",
                                    config.isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                )}>
                                    <div className={clsx("w-1.5 h-1.5 rounded-full", config.isConnected ? "bg-green-500" : "bg-red-500 animate-pulse")}></div>
                                    {config.isConnected ? "Conectado" : "Pendente"}
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                            ) : (
                                <div className="space-y-6">
                                    {/* CAMPO A: REDIRECT URI */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            A. URL de Redirecionamento (Conforme seu print)
                                        </label>
                                        <div className="relative group/uri">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 shrink-0" size={18}/>
                                            <input 
                                                type="text" 
                                                className={clsx(
                                                    "w-full pl-12 pr-24 py-3.5 border-2 rounded-2xl text-xs font-mono font-bold outline-none transition-all",
                                                    hasTrailingSlash ? "bg-indigo-50 border-indigo-100 text-indigo-700 focus:border-teal-500" : "bg-red-50 border-red-200 text-red-700"
                                                )}
                                                value={config.redirectUri} 
                                                onChange={e => setConfig({...config, redirectUri: e.target.value})}
                                                placeholder="https://sistema-rd.vercel.app/"
                                            />
                                            <button 
                                                onClick={handleCopyUri}
                                                className={clsx(
                                                    "absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 shadow-sm",
                                                    copied ? "bg-green-500 text-white" : "bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white"
                                                )}
                                            >
                                                {copied ? <Check size={14}/> : "Copiar"}
                                            </button>
                                        </div>
                                        {!hasTrailingSlash && (
                                            <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                                                <AlertTriangle size={12}/> Atenção: Seu print mostra uma barra "/" no final. Adicione-a!
                                            </p>
                                        )}
                                    </div>

                                    {/* CAMPO B: CLIENT ID */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            B. Cole o Client ID do Portal
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                className={clsx(
                                                    "w-full px-5 py-3.5 border-2 rounded-2xl text-sm font-mono outline-none transition-all",
                                                    isClientIdValid ? "bg-white border-slate-100 focus:border-teal-500" : "bg-slate-50 border-slate-100 focus:border-teal-500"
                                                )} 
                                                value={config.clientId} 
                                                onChange={e => setConfig({...config, clientId: e.target.value})}
                                                placeholder="Ex: 37pb47a0jqro..."
                                            />
                                            {isClientIdValid && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={18}/>}
                                        </div>
                                    </div>

                                    {/* CAMPO C: CLIENT SECRET */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            C. Cole o Client Secret do Portal
                                        </label>
                                        <input 
                                            type="password" 
                                            className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none transition-all" 
                                            value={config.clientSecret} 
                                            onChange={e => setConfig({...config, clientSecret: e.target.value})}
                                            placeholder="bdr9rt6tu4of..."
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 pt-4">
                                        <button 
                                            onClick={handleSaveConfig}
                                            disabled={isSaving}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save size={16}/> 1. Salvar Dados do Print
                                        </button>
                                        <button 
                                            onClick={handleConnect}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <RefreshCw size={18}/> 2. Autorizar Conexão
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 flex gap-4">
                            <ShieldAlert className="text-amber-600 shrink-0" size={24}/>
                            <div>
                                <h4 className="text-xs font-black text-amber-900 uppercase">Checklist Final</h4>
                                <ul className="text-[10px] text-amber-700 mt-2 space-y-1 font-medium">
                                    <li className="flex items-center gap-2"><div className={clsx("w-1.5 h-1.5 rounded-full", hasTrailingSlash ? "bg-green-500" : "bg-amber-400")}></div> Redirect URI idêntica ao print</li>
                                    <li className="flex items-center gap-2"><div className={clsx("w-1.5 h-1.5 rounded-full", isClientIdValid ? "bg-green-500" : "bg-amber-400")}></div> Client ID sem espaços extras</li>
                                    <li className="flex items-center gap-2"><div className={clsx("w-1.5 h-1.5 rounded-full", config.clientSecret.length > 20 ? "bg-green-500" : "bg-amber-400")}></div> Client Secret copiado do cadeado</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA 2: GUIA PASSO A PASSO */}
                    <div className="xl:col-span-7 space-y-6">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 h-full">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-3">
                                <ListChecks className="text-teal-600" /> Guia baseado no seu print
                            </h3>

                            <div className="space-y-10 relative">
                                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-100 -z-0"></div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-indigo-200">01</div>
                                    <div className="space-y-2 pt-1">
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2">Verifique o campo Redirect URL</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            No seu print, a URL é <code className="bg-slate-100 px-1 rounded text-indigo-600">https://sistema-rd.vercel.app/</code>. <br/>
                                            Certifique-se de que o campo <strong className="text-indigo-600">A</strong> ao lado tenha exatamente este texto.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-indigo-200">02</div>
                                    <div className="space-y-3 pt-1">
                                        <h4 className="font-bold text-slate-800">Use o Botão Azul de Cópia</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            No portal da Conta Azul (onde você tirou o print), clique no ícone de <strong className="text-blue-500">duas folhas azuis</strong> ao lado do client_id e cole no campo <strong className="text-indigo-600">B</strong> aqui do ERP.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-indigo-200">03</div>
                                    <div className="space-y-3 pt-1">
                                        <h4 className="font-bold text-slate-800">Repita para o Secret</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Faça o mesmo para o <strong className="text-slate-700">client_secret</strong> e cole no campo <strong className="text-indigo-600">C</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-indigo-200">04</div>
                                    <div className="space-y-2 pt-1">
                                        <h4 className="font-bold text-slate-800">Salve e Conecte</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Clique em <strong className="text-slate-700">"Salvar Dados do Print"</strong> primeiro. Depois, clique no botão azul <strong className="text-blue-600">"Autorizar Conexão"</strong> para ir à tela de login da Conta Azul.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-start gap-4">
                                <Info className="text-indigo-600 shrink-0" size={20}/>
                                <p className="text-[11px] text-indigo-900 leading-relaxed">
                                    <strong>Dica Pro:</strong> Ao clicar em autorizar, se você já estiver logado na Conta Azul no mesmo navegador, o sistema pedirá apenas um clique para confirmar a permissão.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};