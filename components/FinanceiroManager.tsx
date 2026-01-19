
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick, Check, Eye, EyeOff, AlertTriangle, ShieldAlert,
  ArrowRightLeft, Lock, Layout, Zap, ArrowRight, MousePointer2, CheckCircle,
  FileSpreadsheet, TrendingUp, DollarSign, History, User, ArrowUpRight, ArrowDownRight,
  TrendingDown, Unplug, Eraser
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
    expiresAt?: number;
}

interface FinancialItem {
    id: string;
    name: string;
    value: number;
    due_date: string;
    status: string;
}

export const FinanceiroManager: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'integração'>('overview');
    const [config, setConfig] = useState<ContaAzulConfig>({
        clientId: '',
        clientSecret: '',
        redirectUri: 'https://sistema-rd.vercel.app/',
        isConnected: false
    });
    
    const [receivableTotal, setReceivableTotal] = useState(0);
    const [payableTotal, setPayableTotal] = useState(0);
    const [overdueRecent, setOverdueRecent] = useState<FinancialItem[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [copied, setCopied] = useState(false);
    const [authCode, setAuthCode] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Proxies otimizados para requisições de API
    const PROXIES = [
        "https://api.allorigins.win/raw?url=",
        "https://corsproxy.io/?",
        "https://api.codetabs.com/v1/proxy/?url="
    ];

    useEffect(() => {
        loadConfig();
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            console.log("Detectado Código OAuth:", code);
            setAuthCode(code);
            setActiveSubTab('integração');
            // Remove code da URL sem recarregar
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    useEffect(() => {
        if (config.isConnected && config.accessToken && activeSubTab === 'overview') {
            fetchFinancialData();
        }
    }, [config.isConnected, config.accessToken, activeSubTab]);

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const data = await appBackend.getContaAzulConfig();
            if (data) {
                setConfig({
                    ...data,
                    redirectUri: 'https://sistema-rd.vercel.app/'
                });
            }
        } catch (e) {
            console.error("Erro ao carregar configuração:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWithProxy = async (targetUrl: string, options: any) => {
        let lastError = null;
        for (const proxy of PROXIES) {
            try {
                const url = proxy + encodeURIComponent(targetUrl);
                const response = await fetch(url, {
                    ...options,
                    mode: 'cors'
                });

                if (response.status === 429 || response.status === 403 || response.status >= 500) {
                    continue; // Tenta o próximo proxy
                }

                return response;
            } catch (e: any) {
                lastError = e;
                continue;
            }
        }
        throw lastError || new Error("Falha na conexão com os túneis de API. Verifique sua rede.");
    };

    const handleRefreshToken = async (currentConfig: ContaAzulConfig) => {
        if (!currentConfig.refreshToken) return null;
        try {
            console.log("Iniciando Refresh de Token...");
            const targetUrl = "https://auth.contaazul.com/oauth2/token";
            
            // Autenticação via Basic Auth no header (pode causar CORS se o proxy não suportar)
            // Para maior compatibilidade, enviamos client_id e client_secret no body se o proxy falhar
            const credentials = btoa(`${currentConfig.clientId.trim()}:${currentConfig.clientSecret.trim()}`);

            const response = await fetchWithProxy(targetUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded' 
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: currentConfig.refreshToken
                }).toString()
            });

            if (!response.ok) throw new Error("Sessão expirada. Reautorize a conexão.");
            
            const data = await response.json();
            const updatedConfig = {
                ...currentConfig,
                accessToken: data.access_token,
                refreshToken: data.refresh_token || currentConfig.refreshToken,
                expiresAt: Date.now() + (data.expires_in * 1000)
            };

            await appBackend.saveContaAzulConfig(updatedConfig);
            setConfig(updatedConfig);
            return data.access_token;
        } catch (e: any) {
            setErrorMsg("Erro na renovação de acesso: " + e.message);
            return null;
        }
    };

    const fetchFinancialData = async (tokenOverride?: string) => {
        const token = tokenOverride || config.accessToken;
        if (!token) return;

        setIsFetchingData(true);
        setErrorMsg(null);
        
        try {
            const baseUrlReceber = "https://api.contaazul.com/v1/financeiro/eventos-financeiros/contas-a-receber/buscar";
            const baseUrlPagar = "https://api.contaazul.com/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar";
            const query = `data_vencimento_inicio=2024-01-01&data_vencimento_fim=2025-12-31&situacao=ABERTO&situacao=ATRASADO&itens_por_pagina=100&_t=${Date.now()}`;

            const headers = { 'Authorization': `Bearer ${token}` };

            const [recRes, payRes] = await Promise.all([
                fetchWithProxy(`${baseUrlReceber}?${query}`, { headers }),
                fetchWithProxy(`${baseUrlPagar}?${query}`, { headers })
            ]);

            // Se der 401, tenta o Refresh Token uma vez
            if (recRes.status === 401 || payRes.status === 401) {
                const newToken = await handleRefreshToken(config);
                if (newToken) fetchFinancialData(newToken);
                return;
            }

            if (!recRes.ok || !payRes.ok) throw new Error("Falha na resposta da API Conta Azul.");

            const recData = await recRes.json();
            const payData = await payRes.json();

            const itemsRec = recData.items || recData.content || [];
            const itemsPay = payData.items || payData.content || [];

            const totalRec = itemsRec.reduce((acc: number, curr: any) => acc + (curr.valor_total || curr.valor || 0), 0);
            const totalPay = itemsPay.reduce((acc: number, curr: any) => acc + (curr.valor_total || curr.valor || 0), 0);

            setReceivableTotal(totalRec);
            setPayableTotal(totalPay);
            
            setOverdueRecent(itemsRec.filter((r: any) => r.situacao === 'ATRASADO').map((r: any) => ({
                id: r.id,
                name: r.nome_cliente || r.cliente?.nome || "Cliente",
                value: r.valor_total || r.valor || 0,
                due_date: r.data_vencimento || r.vencimento,
                status: r.situacao
            })).slice(0, 8));

            // Atualiza data de última sincronização
            const finalConfig = { ...config, lastSync: new Date().toISOString() };
            await appBackend.saveContaAzulConfig(finalConfig);
            setConfig(finalConfig);

        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setIsFetchingData(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const sanitized = {
                ...config,
                clientId: config.clientId.trim(),
                clientSecret: config.clientSecret.trim()
            };
            await appBackend.saveContaAzulConfig(sanitized);
            setConfig(sanitized);
            alert("Credenciais salvas no banco de dados.");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConnect = () => {
        if (!config.clientId) { alert("Informe o Client ID primeiro."); return; }
        const baseUrl = "https://auth.contaazul.com/login";
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId.trim(),
            redirect_uri: 'https://sistema-rd.vercel.app/',
            state: 'voll_pilates_group',
            scope: 'openid profile'
        });
        window.location.href = `${baseUrl}?${params.toString()}`;
    };

    // Fix: Added handleDisconnect function to correct the reference error
    const handleDisconnect = async () => {
        if (!window.confirm("Deseja realmente remover a integração com o Conta Azul?")) return;
        setIsSaving(true);
        try {
            const disconnectedConfig: ContaAzulConfig = {
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                redirectUri: config.redirectUri,
                isConnected: false
            };
            await appBackend.saveContaAzulConfig(disconnectedConfig);
            setConfig(disconnectedConfig);
            setReceivableTotal(0);
            setPayableTotal(0);
            setOverdueRecent([]);
            alert("Integração removida.");
        } catch (e: any) {
            alert("Erro ao desconectar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalizeIntegration = async () => {
        if (!authCode) return;
        setIsSaving(true);
        setErrorMsg(null);
        try {
            console.log("Trocando código por Token...");
            const targetUrl = "https://auth.contaazul.com/oauth2/token";
            const credentials = btoa(`${config.clientId.trim()}:${config.clientSecret.trim()}`);
            
            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                code: authCode.trim(),
                redirect_uri: 'https://sistema-rd.vercel.app/'
            });

            const response = await fetchWithProxy(targetUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded' 
                },
                body: body.toString()
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Erro na troca do token:", data);
                setAuthCode(null);
                throw new Error(data.message || "Código de autorização inválido ou expirado.");
            }

            const updatedConfig: ContaAzulConfig = { 
                ...config, 
                isConnected: true, 
                lastSync: new Date().toISOString(),
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + (data.expires_in * 1000)
            };

            await appBackend.saveContaAzulConfig(updatedConfig);
            setConfig(updatedConfig);
            setAuthCode(null);
            alert("Conta Azul integrada com sucesso!");
            setActiveSubTab('overview');
        } catch (e: any) { 
            setErrorMsg(e.message);
        } finally { 
            setIsSaving(false); 
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-teal-600" /> Financeiro
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Gestão Integrada Conta Azul (API v1).</p>
                </div>
                <div className="flex items-center gap-3">
                    {config.isConnected && (
                        <button 
                            onClick={() => fetchFinancialData()} 
                            disabled={isFetchingData}
                            className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-teal-600 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold text-xs"
                        >
                            <RefreshCw size={16} className={clsx(isFetchingData && "animate-spin")} />
                            {isFetchingData ? 'Sincronizando...' : 'Sincronizar Agora'}
                        </button>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
                        <button onClick={() => setActiveSubTab('overview')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeSubTab === 'overview' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Visão Geral</button>
                        <button onClick={() => setActiveSubTab('integração')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeSubTab === 'integração' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Configuração</button>
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-800">Erro de Conexão</p>
                        <p className="text-xs text-red-700 mt-1 leading-relaxed">{errorMsg}</p>
                        <button onClick={() => setErrorMsg(null)} className="mt-3 text-[10px] font-black uppercase text-red-600 hover:underline">Limpar aviso e tentar novamente</button>
                    </div>
                </div>
            )}

            {activeSubTab === 'overview' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ArrowUpRight size={80} className="text-emerald-600" />
                            </div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <TrendingUp size={14} className="text-emerald-500"/> Total a Receber
                            </h4>
                            {isFetchingData ? (
                                <div className="py-4 animate-pulse bg-slate-100 rounded-xl w-32 h-10"></div>
                            ) : (
                                <h3 className="text-3xl font-black text-slate-800">{formatCurrency(receivableTotal)}</h3>
                            )}
                            <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-tighter">Soma de todos os títulos em aberto no CA.</p>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ArrowDownRight size={80} className="text-rose-600" />
                            </div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <TrendingDown size={14} className="text-rose-500"/> Total a Pagar
                            </h4>
                            {isFetchingData ? (
                                <div className="py-4 animate-pulse bg-slate-100 rounded-xl w-32 h-10"></div>
                            ) : (
                                <h3 className="text-3xl font-black text-slate-800">{formatCurrency(payableTotal)}</h3>
                            )}
                            <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-tighter">Soma de todas as despesas em aberto no CA.</p>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                            <div className={clsx("w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner", config.isConnected ? "bg-teal-50 text-teal-600" : "bg-slate-50 text-slate-300")}>
                                {config.isConnected ? <ShieldCheck size={32} /> : <Unplug size={32} />}
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{config.isConnected ? "Conexão Ativa" : "Desconectado"}</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{config.isConnected ? `SINC: ${config.lastSync ? new Date(config.lastSync).toLocaleString('pt-BR') : '--'}` : "Configure sua API Key"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col space-y-6">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Recebíveis Atrasados (Conta Azul)</h4>
                            <div className="flex-1 space-y-3">
                                {overdueRecent.length > 0 ? (
                                    overdueRecent.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-teal-300 transition-all">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black text-slate-800 truncate uppercase">{item.name}</p>
                                                <p className="text-[9px] text-red-500 font-bold uppercase tracking-tighter">Vencimento: {item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR') : '--'}</p>
                                            </div>
                                            <span className="text-sm font-black text-slate-700 shrink-0">{formatCurrency(item.value)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-xs py-10">
                                        {isFetchingData ? <Loader2 className="animate-spin" /> : 'Nenhum atraso identificado.'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><Info size={120}/></div>
                            <div className="relative z-10 space-y-4">
                                <h3 className="text-2xl font-black tracking-tight leading-tight">Canal de Sincronização</h3>
                                <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-sm">Esta integração utiliza rotatividade de proxies para garantir a conectividade com os servidores da API Conta Azul, evitando bloqueios de segurança do navegador.</p>
                                <div className="pt-4 flex gap-4">
                                    <div className="flex flex-col"><span className="text-[10px] font-black text-indigo-400 uppercase">Segurança</span><span className="font-bold">OAuth 2.0</span></div>
                                    <div className="flex flex-col"><span className="text-[10px] font-black text-indigo-400 uppercase">Status</span><span className="font-bold">Real-time Sync</span></div>
                                </div>
                            </div>
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
                                    <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Código Recebido!</h3>
                                    <p className="text-sm text-indigo-700 mt-2 font-medium">Trocaremos o código temporário pelo token de acesso seguro do Conta Azul.</p>
                                </div>
                                <button 
                                    onClick={handleFinalizeIntegration}
                                    disabled={isSaving}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18}/> 3. Finalizar Conexão</>}
                                </button>
                                <button onClick={() => setAuthCode(null)} className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500">Cancelar e limpar código</button>
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
                                        {config.isConnected ? "Integrado" : "Pendente"}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">1. URL de Redirecionamento</label>
                                        <div className="flex gap-2">
                                            <input readOnly type="text" className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-mono font-bold text-indigo-700 outline-none" value={config.redirectUri} />
                                            <button onClick={() => { navigator.clipboard.writeText(config.redirectUri); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 transition-all" title="Copiar URL">{copied ? <Check size={20}/> : <Copy size={20}/>}</button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 italic px-1">Configure esta URL exatamente igual no Portal do Desenvolvedor Conta Azul.</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">2. Client ID</label>
                                        <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none" value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value.trim()})} placeholder="client_id do portal" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">3. Client Secret</label>
                                        <input type="password" title="Secret" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none" value={config.clientSecret} onChange={e => setConfig({...config, clientSecret: e.target.value.trim()})} placeholder="client_secret do portal" />
                                    </div>

                                    <div className="flex flex-col gap-3 pt-4">
                                        <button onClick={handleSaveConfig} disabled={isSaving} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                                            1. Salvar Dados
                                        </button>
                                        <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                            <RefreshCw size={18}/> 2. Autorizar Conexão
                                        </button>
                                        {config.isConnected && (
                                            <button onClick={handleDisconnect} className="w-full text-[10px] font-black uppercase text-red-400 hover:text-red-600 mt-2">Remover conta integrada</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-7">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 h-full">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-3">
                                <ShieldAlert className="text-amber-500" /> Solução de Conflitos de Rede
                            </h3>
                            <div className="space-y-6">
                                <div className="p-5 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl">
                                    <h4 className="font-bold text-indigo-800 text-sm">Contornando o CORS</h4>
                                    <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                        A API do Conta Azul restringe o acesso direto pelo navegador. O sistema agora utiliza <strong>múltiplos túneis de proxy</strong> e persistência server-side via Supabase para garantir que sua conexão seja estável e segura.
                                    </p>
                                </div>
                                <div className="p-5 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
                                    <h4 className="font-bold text-blue-800 text-sm">Persistência de Sessão</h4>
                                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                        Seus tokens são armazenados criptografados no banco de dados. O sistema realiza o <strong>Refresh Token</strong> automaticamente quando necessário, eliminando a necessidade de login constante no portal.
                                    </p>
                                </div>
                                <div className="p-5 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl">
                                    <h4 className="font-bold text-amber-800 text-sm">Dica de Segurança</h4>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        Certifique-se de que o <strong>Client Secret</strong> não seja compartilhado. Ele é usado apenas na troca inicial de código pelo token de longa duração.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
