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
            alert("Configurações salvas localmente!");
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

    const handleConnect = () => {
        const cleanClientId = config.clientId.trim();
        const cleanRedirectUri = config.redirectUri.trim();

        if (!cleanClientId || cleanClientId.length < 10) {
            alert("Preencha o Client ID corretamente.");
            return;
        }

        if (!cleanRedirectUri) {
            alert("A URL de redirecionamento não pode estar vazia.");
            return;
        }

        // Endpoint oficial da API v2
        const authUrl = `https://app.contaazul.com/auth/authorize?scope=sales%20financial&state=voll&response_type=code&redirect_uri=${encodeURIComponent(cleanRedirectUri)}&client_id=${cleanClientId}`;
        window.open(authUrl, '_blank');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-teal-600" /> Financeiro
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Integração Bancária com Conta Azul.</p>
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
                        Configurar
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
                        <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">Acesse a aba de <strong>Configurar</strong> para realizar a autorização.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* FORMULÁRIO */}
                    <div className="xl:col-span-5 space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 space-y-8 relative overflow-hidden">
                            <div className="flex items-center justify-between border-b pb-6">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase">
                                    <Key className="text-blue-500" /> Credenciais
                                </h3>
                                <div className={clsx(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 border",
                                    config.isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                )}>
                                    {config.isConnected ? "Conectado" : "Aguardando"}
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                            ) : (
                                <div className="space-y-6">
                                    {/* CAMPO A: REDIRECT URI EDITÁVEL */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            A. URL de Redirecionamento (Redirect URI)
                                        </label>
                                        <div className="relative group/uri">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 shrink-0" size={18}/>
                                            <input 
                                                type="text" 
                                                className="w-full pl-12 pr-24 py-3.5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-xs font-mono font-bold text-indigo-700 outline-none focus:bg-white focus:border-indigo-300 transition-all"
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
                                        <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg flex items-start gap-2">
                                            <AlertTriangle size={14} className="shrink-0" />
                                            Certifique-se que o link acima é IDÊNTICO ao do Portal (incluindo o "https://" e a barra "/" final).
                                        </p>
                                    </div>

                                    {/* CAMPO B: CLIENT ID */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            B. Client ID
                                        </label>
                                        <input 
                                            type="text" 
                                            className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:border-teal-500 outline-none transition-all" 
                                            value={config.clientId} 
                                            onChange={e => setConfig({...config, clientId: e.target.value})}
                                            placeholder="Cole o Client ID aqui"
                                        />
                                    </div>

                                    {/* CAMPO C: CLIENT SECRET */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            C. Client Secret
                                        </label>
                                        <input 
                                            type="password" 
                                            className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none transition-all" 
                                            value={config.clientSecret} 
                                            onChange={e => setConfig({...config, clientSecret: e.target.value})}
                                            placeholder="Cole o Secret aqui"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 pt-4">
                                        <button 
                                            onClick={handleSaveConfig}
                                            disabled={isSaving}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save size={16}/> 1. Salvar Dados
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
                    </div>

                    {/* GUIA */}
                    <div className="xl:col-span-7 space-y-6">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 h-full">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-3">
                                <ListChecks className="text-teal-600" /> Solução do Erro
                            </h3>

                            <div className="space-y-10 relative">
                                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-100 -z-0"></div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg">01</div>
                                    <div className="space-y-2 pt-1">
                                        <h4 className="font-bold text-slate-800">Bata os dados com o Portal</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            O Conta Azul só autoriza se o campo <strong className="text-indigo-600">A</strong> ao lado for exatamente igual ao campo <strong className="text-slate-700">"URL de redirecionamento"</strong> que você configurou no portal de desenvolvedores.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg">02</div>
                                    <div className="space-y-3 pt-1">
                                        <h4 className="font-bold text-slate-800">Remova espaços e caracteres extras</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Clique em "Salvar Dados" para que o sistema limpe automaticamente qualquer espaço invisível que possa ter vindo na cópia.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg">03</div>
                                    <div className="space-y-3 pt-1">
                                        <h4 className="font-bold text-slate-800">Novo Link de Autorização</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            O botão azul agora utiliza o servidor oficial de autorização. Clique nele novamente após salvar as informações.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};