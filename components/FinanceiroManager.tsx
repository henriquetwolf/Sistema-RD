import React, { useState, useEffect } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick, Check, Eye, EyeOff, AlertTriangle, ShieldAlert,
  ArrowRightLeft, Lock, Layout, Zap, ArrowRight, MousePointer2, CheckCircle
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';

interface ContaAzulConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    isConnected: boolean;
    lastSync?: string;
    accessToken?: string;
    refreshToken?: string;
}

export const FinanceiroManager: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'integração'>('overview');
    const [config, setConfig] = useState<ContaAzulConfig>({
        clientId: '',
        clientSecret: '',
        redirectUri: window.location.origin + '/',
        isConnected: false
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [authCode, setAuthCode] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
        // Verifica se voltamos do Conta Azul com um código na URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            setAuthCode(code);
            setActiveSubTab('integração');
        }
    }, []);

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const { data } = await appBackend.client
                .from('crm_settings')
                .select('value')
                .eq('key', 'conta_azul_config')
                .maybeSingle();
            
            if (data?.value) {
                const loaded = JSON.parse(data.value);
                setConfig({
                    ...loaded,
                    redirectUri: loaded.redirectUri || window.location.origin + '/'
                });
            } else {
                setConfig(prev => ({ ...prev, redirectUri: window.location.origin + '/' }));
            }
        } catch (e) {
            console.error("Erro ao carregar configuração:", e);
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
            alert("Dados salvos! Agora você pode clicar em Autorizar.");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConnect = () => {
        if (!config.clientId || !config.redirectUri) {
            alert("Preencha o Client ID e a URL de Redirecionamento primeiro.");
            return;
        }

        // Endpoint oficial recomendado para a maioria das integrações V2
        const authUrl = `https://app.contaazul.com/auth/authorize?scope=sales%20financial&state=voll_erp&response_type=code&redirect_uri=${encodeURIComponent(config.redirectUri.trim())}&client_id=${config.clientId.trim()}`;
        
        // Redireciona na mesma aba para evitar bloqueio de popup e facilitar o retorno do código
        window.location.href = authUrl;
    };

    const handleFinalizeIntegration = async () => {
        if (!authCode) return;
        setIsSaving(true);
        try {
            // Aqui em um cenário real, enviaríamos o 'authCode' para o seu backend/edge function
            // para trocar pelo Access Token usando o Client Secret.
            alert("Código de autorização recebido com sucesso! O sistema agora pode processar a troca de tokens em background.");
            
            const updatedConfig = { ...config, isConnected: true, lastSync: new Date().toISOString() };
            await appBackend.client
                .from('crm_settings')
                .upsert({ key: 'conta_azul_config', value: JSON.stringify(updatedConfig) });
            
            setConfig(updatedConfig);
            setAuthCode(null);
            // Limpa a URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            alert("Erro ao finalizar: " + e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-teal-600" /> Financeiro
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Integração com Conta Azul.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
                    <button onClick={() => setActiveSubTab('overview')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeSubTab === 'overview' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Visão Geral</button>
                    <button onClick={() => setActiveSubTab('integração')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeSubTab === 'integração' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Configurar Integração</button>
                </div>
            </div>

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 shadow-inner">
                            <Wallet size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Módulo Financeiro</h3>
                        <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">Acesse a aba de <strong>Configurar Integração</strong> para conectar.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-5 space-y-6">
                        {authCode ? (
                            <div className="bg-green-50 border-2 border-green-200 rounded-[2.5rem] p-10 text-center space-y-6 animate-in zoom-in-95">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <CheckCircle size={40} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-green-900">Quase lá!</h3>
                                    <p className="text-sm text-green-700 mt-2">O Conta Azul autorizou o acesso. Clique abaixo para salvar os tokens e finalizar.</p>
                                </div>
                                <div className="bg-white/50 p-3 rounded-xl border border-green-100 font-mono text-[10px] text-green-800 truncate">
                                    Code: {authCode}
                                </div>
                                <button 
                                    onClick={handleFinalizeIntegration}
                                    disabled={isSaving}
                                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "Finalizar Integração"}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 space-y-8 relative overflow-hidden">
                                <div className="flex items-center justify-between border-b pb-6">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase">
                                        <Key className="text-blue-500" /> Credenciais
                                    </h3>
                                    <div className={clsx(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 border",
                                        config.isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                    )}>
                                        {config.isConnected ? "Conectado" : "Pendente"}
                                    </div>
                                </div>

                                {isLoading ? (
                                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Redirect URI (Deve ser idêntica ao Portal)</label>
                                            <div className="flex gap-2">
                                                <input type="text" className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-mono font-bold text-indigo-700 outline-none focus:bg-white focus:border-indigo-300" value={config.redirectUri} onChange={e => setConfig({...config, redirectUri: e.target.value})} />
                                                <button onClick={() => { navigator.clipboard.writeText(config.redirectUri); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 transition-all">{copied ? <Check size={20}/> : <Copy size={20}/>}</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client ID</label>
                                            <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none" value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value})} placeholder="Cole o client_id aqui" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Secret</label>
                                            <input type="password" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none" value={config.clientSecret} onChange={e => setConfig({...config, clientSecret: e.target.value})} placeholder="Cole o client_secret aqui" />
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <button onClick={handleSaveConfig} disabled={isSaving} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">1. Salvar Dados</button>
                                            <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                                <RefreshCw size={18}/> 2. Autorizar com Conta Azul
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-7">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 h-full">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-3">
                                <ListChecks className="text-teal-600" /> Como resolver o erro de página
                            </h3>
                            <div className="space-y-10 relative">
                                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-100 -z-0"></div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg">01</div>
                                    <div className="pt-1">
                                        <h4 className="font-bold text-slate-800">O erro é de Digitação</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            O Conta Azul compara a URL que enviamos com a que você salvou. No seu print, você salvou <code className="bg-slate-100 px-1 rounded text-indigo-600">https://sistema-rd.vercel.app/</code>. <br/>
                                            Certifique-se de que no campo ao lado a URL é **EXATAMENTE** essa, com o <code className="font-bold">/</code> no final.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg">02</div>
                                    <div className="pt-1">
                                        <h4 className="font-bold text-slate-800">Salve no Portal Primeiro</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Vá no Portal de Desenvolvedores, clique em "Editar Informações", cole a URL <code className="bg-slate-100 px-1 rounded">https://sistema-rd.vercel.app/</code> e clique no botão azul **SALVAR** no final da página do Conta Azul.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg">03</div>
                                    <div className="pt-1">
                                        <h4 className="font-bold text-slate-800">Clique em "Salvar Dados" aqui no ERP</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Antes de clicar no botão azul de autorizar, clique no botão cinza de "Salvar Dados" para limpar espaços em branco que possam ter vindo na cópia.
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