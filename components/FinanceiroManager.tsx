import React, { useState, useEffect } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick, Check, Eye, EyeOff, AlertTriangle, ShieldAlert,
  ArrowRightLeft, Lock, Layout, Zap, ArrowRight, MousePointer2, CheckCircle,
  FileSpreadsheet, TrendingUp, DollarSign, History
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
        redirectUri: 'https://sistema-rd.vercel.app/',
        isConnected: false
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [authCode, setAuthCode] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
        // Captura o código da URL caso o Conta Azul tenha redirecionado de volta
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
                    redirectUri: 'https://sistema-rd.vercel.app/'
                });
            } else {
                setConfig(prev => ({ ...prev, redirectUri: 'https://sistema-rd.vercel.app/' }));
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
                redirectUri: 'https://sistema-rd.vercel.app/'
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

    const handleConnect = () => {
        if (!config.clientId) {
            alert("Preencha o Client ID primeiro.");
            return;
        }
        
        const baseUrl = "https://auth.contaazul.com/login";
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId.trim(),
            redirect_uri: 'https://sistema-rd.vercel.app/',
            state: 'voll_erp',
            scope: 'openid profile aws.cognito.signin.user.admin'
        });

        window.location.href = `${baseUrl}?${params.toString()}`;
    };

    const handleFinalizeIntegration = async () => {
        if (!authCode) return;
        setIsSaving(true);
        try {
            const cleanId = config.clientId.trim();
            const cleanSecret = config.clientSecret.trim();
            const fixedRedirect = 'https://sistema-rd.vercel.app/';

            // Algumas instâncias da API token do Conta Azul aceitam JSON e 
            // as credenciais no corpo para evitar problemas com headers via Proxy
            const body = {
                grant_type: 'authorization_code',
                client_id: cleanId,
                client_secret: cleanSecret,
                code: authCode.trim(),
                redirect_uri: fixedRedirect
            };

            const proxyUrl = "https://corsproxy.io/?";
            const targetUrl = "https://api.contaazul.com/oauth2/token";

            console.log("Solicitando troca de token (JSON Mode)...");

            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Erro Conta Azul:", data);
                const errorMsg = data.error_description || data.message || data.error || "Erro desconhecido";
                
                if (response.status === 401) {
                    throw new Error(`Erro 401 (Não Autorizado): ${errorMsg}. Verifique se o Secret no Conta Azul é o mesmo que você colou aqui.`);
                }
                if (response.status === 400) {
                    throw new Error(`Erro 400 (Bad Request): ${errorMsg}. Isso geralmente ocorre se a URL de redirecionamento no portal do Conta Azul for diferente de ${fixedRedirect}`);
                }
                throw new Error(`Erro ${response.status}: ${errorMsg}`);
            }

            const updatedConfig: ContaAzulConfig = { 
                ...config, 
                isConnected: true, 
                lastSync: new Date().toISOString(),
                accessToken: data.access_token,
                refreshToken: data.refresh_token
            };

            await appBackend.client
                .from('crm_settings')
                .upsert({ key: 'conta_azul_config', value: JSON.stringify(updatedConfig) });
            
            setConfig(updatedConfig);
            setAuthCode(null);
            alert("Conta Azul conectada com sucesso!");
            
            window.history.replaceState({}, document.title, window.location.pathname);
            setActiveSubTab('overview');
        } catch (e: any) {
            console.error("Erro na finalização:", e);
            alert(e.message);
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
                    <p className="text-sm text-slate-500 font-medium">Gestão Integrada Conta Azul.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
                    <button onClick={() => setActiveSubTab('overview')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeSubTab === 'overview' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Visão Geral</button>
                    <button onClick={() => setActiveSubTab('integração')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeSubTab === 'integração' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Configuração</button>
                </div>
            </div>

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {config.isConnected ? (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 shadow-inner">
                                <ShieldCheck size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Conexão Ativa</h3>
                            <p className="text-xs text-slate-500">Sua conta está integrada e sincronizada.</p>
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                                <Wallet size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Aguardando Conexão</h3>
                            <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">Acesse a aba de <strong>Configuração</strong> para conectar.</p>
                        </div>
                    )}

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col space-y-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14}/> Atividades</h4>
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 italic text-xs">
                            Sem transações recentes.
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col space-y-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Saldo</h4>
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 italic text-xs">
                            Conecte a API para visualizar.
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-5 space-y-6">
                        {authCode ? (
                            <div className="bg-white border-4 border-indigo-500 rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
                                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <Zap size={40} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Autorização Recebida</h3>
                                    <p className="text-sm text-indigo-700 mt-2 font-medium">Clique no botão abaixo para concluir a integração.</p>
                                </div>
                                <button 
                                    onClick={handleFinalizeIntegration}
                                    disabled={isSaving}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18}/> 3. Finalizar Conexão</>}
                                </button>
                                <button onClick={() => { setAuthCode(null); window.history.replaceState({}, document.title, window.location.pathname); }} className="text-[10px] font-black text-slate-400 uppercase hover:text-red-500">Recomeçar processo</button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 space-y-8 relative overflow-hidden">
                                <div className="flex items-center justify-between border-b pb-6">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase">
                                        <Key className="text-blue-500" /> Credenciais API
                                    </h3>
                                    <div className={clsx(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 border",
                                        config.isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                    )}>
                                        {config.isConnected ? "Conectado" : "Não Integrado"}
                                    </div>
                                </div>

                                {isLoading ? (
                                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">1. URL de Redirecionamento (Copiar p/ Portal)</label>
                                            <div className="flex gap-2">
                                                <input readOnly type="text" className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-mono font-bold text-indigo-700 outline-none" value={config.redirectUri} />
                                                <button onClick={() => { navigator.clipboard.writeText(config.redirectUri); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 transition-all" title="Copiar URL">{copied ? <Check size={20}/> : <Copy size={20}/>}</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">2. Client ID</label>
                                            <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none" value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value.trim()})} placeholder="Cole o client_id aqui" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">3. Client Secret (Visível)</label>
                                            <input type="text" title="Secret" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none" value={config.clientSecret} onChange={e => setConfig({...config, clientSecret: e.target.value.trim()})} placeholder="Cole o client_secret aqui" />
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <button onClick={handleSaveConfig} disabled={isSaving} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                                                1. Salvar Dados
                                            </button>
                                            <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                                <RefreshCw size={18}/> 2. Autorizar Conexão
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
                                <AlertTriangle className="text-amber-500" /> Checklist de Suporte
                            </h3>
                            <div className="space-y-6">
                                <div className="p-5 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl">
                                    <h4 className="font-bold text-indigo-800 text-sm">Resolução de Erros 401/400</h4>
                                    <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                        As credenciais estão sendo enviadas agora no corpo da requisição JSON para evitar bloqueios de proxy. Se o erro persistir, o motivo será exibido detalhadamente no aviso de erro.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-lg">01</div>
                                        <p className="text-sm text-slate-600 leading-relaxed font-bold">
                                            Certifique-se de que no Portal do Conta Azul a URL cadastrada termina exatamente com barra:<br/>
                                            <code className="bg-slate-100 px-2 py-1 rounded text-red-600">https://sistema-rd.vercel.app/</code>
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">02</div>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Se houver erro de "código expirado", basta clicar em <strong>2. Autorizar Conexão</strong> novamente e refazer o passo 3.
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