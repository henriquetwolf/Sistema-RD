import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick, Check, Eye, EyeOff, AlertTriangle, ShieldAlert,
  ArrowRightLeft, Lock, Layout, Zap, ArrowRight, MousePointer2, CheckCircle,
  FileSpreadsheet, TrendingUp, DollarSign, History, User, ArrowUpRight, ArrowDownRight,
  TrendingDown, Unplug
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
    
    // Estados de Dados Financeiros
    const [receivableTotal, setReceivableTotal] = useState(0);
    const [payableTotal, setPayableTotal] = useState(0);
    const [overdueRecent, setOverdueRecent] = useState<FinancialItem[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [copied, setCopied] = useState(false);
    const [authCode, setAuthCode] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Proxy mais robusto para OAuth
    const PRIMARY_PROXY = "https://corsproxy.io/?";

    useEffect(() => {
        loadConfig();
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            setAuthCode(code);
            setActiveSubTab('integração');
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

    const handleDisconnect = async () => {
        if (!window.confirm("Deseja desconectar a integração com o Conta Azul?")) return;
        const resetConfig = { ...config, isConnected: false, accessToken: '', refreshToken: '' };
        await appBackend.client.from('crm_settings').upsert({ key: 'conta_azul_config', value: JSON.stringify(resetConfig) });
        setConfig(resetConfig);
        setReceivableTotal(0);
        setPayableTotal(0);
        setOverdueRecent([]);
    };

    const handleRefreshToken = async () => {
        if (!config.refreshToken) return null;
        try {
            console.log("Financeiro: Renovando Token via Body Auth...");
            const targetUrl = "https://auth.contaazul.com/oauth2/token";

            const body = new URLSearchParams();
            body.append('grant_type', 'refresh_token');
            body.append('refresh_token', config.refreshToken);
            // Enviando no body para evitar bloqueio de header 'Authorization' pelo Proxy
            body.append('client_id', config.clientId.trim());
            body.append('client_secret', config.clientSecret.trim());

            const response = await fetch(PRIMARY_PROXY + encodeURIComponent(targetUrl), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: body.toString()
            });

            if (!response.ok) {
                if (response.status === 429) throw new Error("Muitas tentativas. Aguarde 1 minuto.");
                throw new Error("Sessão expirada. Re-autorize o acesso.");
            }

            const data = await response.json();
            const updatedConfig = {
                ...config,
                isConnected: true,
                accessToken: data.access_token,
                refreshToken: data.refresh_token || config.refreshToken
            };

            await appBackend.client
                .from('crm_settings')
                .upsert({ key: 'conta_azul_config', value: JSON.stringify(updatedConfig) });
            
            setConfig(updatedConfig);
            return data.access_token;
        } catch (e: any) {
            setErrorMsg(e.message);
            setConfig(prev => ({ ...prev, isConnected: false }));
            return null;
        }
    };

    const parseValue = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const clean = String(val).replace('R$', '').replace(/\s/g, '');
        const normalized = clean.includes(',') && clean.includes('.') 
            ? clean.replace(/\./g, '').replace(',', '.') 
            : clean.replace(',', '.');
        return parseFloat(normalized) || 0;
    };

    const fetchFinancialData = async (tokenOverride?: string) => {
        const token = tokenOverride || config.accessToken;
        if (!token) return;

        setIsFetchingData(true);
        setErrorMsg(null);
        
        try {
            const baseUrlReceber = "https://api.contaazul.com/v1/financeiro/eventos-financeiros/contas-a-receber/buscar";
            const baseUrlPagar = "https://api.contaazul.com/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar";
            
            const params = new URLSearchParams();
            params.append('data_vencimento_inicio', '2020-01-01');
            params.append('data_vencimento_fim', '2030-12-31');
            params.append('situacao', 'ABERTO');
            params.append('situacao', 'ATRASADO');
            params.append('itens_por_pagina', '100');

            const headers = { 
                'Authorization': `Bearer ${token}`, 
                'Accept': 'application/json'
            };

            const [recRes, payRes] = await Promise.all([
                fetch(PRIMARY_PROXY + encodeURIComponent(`${baseUrlReceber}?${params.toString()}`), { headers }),
                fetch(PRIMARY_PROXY + encodeURIComponent(`${baseUrlPagar}?${params.toString()}`), { headers })
            ]);

            if (recRes.status === 429) {
                throw new Error("Limite de requisições atingido no proxy. Tente novamente em 60 segundos.");
            }

            if (recRes.status === 401 || payRes.status === 401) {
                const newToken = await handleRefreshToken();
                if (newToken) fetchFinancialData(newToken);
                return;
            }

            if (!recRes.ok || !payRes.ok) throw new Error("Falha ao buscar dados financeiros.");

            const recData = await recRes.json();
            const payData = await payRes.json();

            const recItems = recData.items || recData.content || [];
            const payItems = payData.items || payData.content || [];

            const recSum = recItems.reduce((acc: number, curr: any) => acc + parseValue(curr.valor_total || curr.valor), 0);
            const paySum = payItems.reduce((acc: number, curr: any) => acc + parseValue(curr.valor_total || curr.valor), 0);

            const overdue = recItems
                .filter((r: any) => r.situacao === 'ATRASADO')
                .map((r: any) => ({
                    id: r.id,
                    name: r.nome_cliente || r.cliente?.nome || "Cliente",
                    value: parseValue(r.valor_total || r.valor),
                    due_date: r.data_vencimento || r.vencimento,
                    status: r.situacao
                }));

            setReceivableTotal(recSum);
            setPayableTotal(paySum);
            setOverdueRecent(overdue.slice(0, 5));

            const updatedConfig = { ...config, lastSync: new Date().toISOString(), isConnected: true };
            await appBackend.client
                .from('crm_settings')
                .upsert({ key: 'conta_azul_config', value: JSON.stringify(updatedConfig) });
            setConfig(updatedConfig);

        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setIsFetchingData(false);
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
            await appBackend.client.from('crm_settings').upsert({ key: 'conta_azul_config', value: JSON.stringify(sanitizedConfig) }, { onConflict: 'key' });
            setConfig(sanitizedConfig);
            alert("Credenciais salvas com sucesso!");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConnect = () => {
        if (!config.clientId) { alert("Preencha o Client ID."); return; }
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
        console.log("Finalizando integração via Body Params...");
        try {
            const targetUrl = "https://auth.contaazul.com/oauth2/token";
            const body = new URLSearchParams();
            body.append('grant_type', 'authorization_code');
            body.append('code', authCode.trim());
            body.append('redirect_uri', 'https://sistema-rd.vercel.app/');
            // Injetando credenciais no corpo para evitar erro de Header do Proxy
            body.append('client_id', config.clientId.trim());
            body.append('client_secret', config.clientSecret.trim());

            const response = await fetch(PRIMARY_PROXY + encodeURIComponent(targetUrl), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: body.toString()
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Falha na troca de tokens.");

            const updatedConfig: ContaAzulConfig = { 
                ...config, 
                isConnected: true, 
                lastSync: new Date().toISOString(),
                accessToken: data.access_token,
                refreshToken: data.refresh_token
            };

            await appBackend.client.from('crm_settings').upsert({ key: 'conta_azul_config', value: JSON.stringify(updatedConfig) });
            setConfig(updatedConfig);
            setAuthCode(null);
            alert("Integração concluída com sucesso!");
            window.history.replaceState({}, document.title, window.location.pathname);
            setActiveSubTab('overview');
        } catch (e: any) { 
            alert("Erro na finalização: " + e.message); 
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
                    <p className="text-sm text-slate-500 font-medium">Gestão Integrada Conta Azul (v1 API).</p>
                </div>
                <div className="flex items-center gap-3">
                    {config.isConnected && (
                        <button 
                            onClick={() => fetchFinancialData()} 
                            disabled={isFetchingData}
                            className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-teal-600 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold text-xs"
                        >
                            <RefreshCw size={16} className={clsx(isFetchingData && "animate-spin")} />
                            {isFetchingData ? 'Sincronizando...' : 'Sincronizar'}
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
                        <p className="text-sm font-bold text-red-800">Atenção Necessária</p>
                        <p className="text-xs text-red-700 mt-1">{errorMsg}</p>
                        <p className="text-[10px] text-red-400 mt-2 font-bold uppercase">Aguarde um momento ou tente re-autorizar a conexão se persistir.</p>
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
                            <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-tighter">Soma de todos os títulos em aberto.</p>
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
                            <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-tighter">Soma de todas as despesas em aberto.</p>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                            <div className={clsx("w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner", config.isConnected ? "bg-teal-50 text-teal-600" : "bg-slate-50 text-slate-300")}>
                                {config.isConnected ? <ShieldCheck size={32} /> : <Unplug size={32} />}
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{config.isConnected ? "Conectado via Proxy" : "Desconectado"}</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{config.isConnected ? `Sinc: ${config.lastSync ? new Date(config.lastSync).toLocaleString('pt-BR') : '--'}` : "Configure as credenciais"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col space-y-6">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Recebíveis Atrasados</h4>
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
                                <h3 className="text-2xl font-black tracking-tight leading-tight">Painel de Controle Financeiro</h3>
                                <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-sm">Esta integração utiliza métodos de segurança que minimizam bloqueios de rede. Mantenha seus dados atualizados no portal para precisão total.</p>
                                <div className="pt-4 flex gap-4">
                                    <div className="flex flex-col"><span className="text-[10px] font-black text-indigo-400 uppercase">Tecnologia</span><span className="font-bold">OAuth Body Auth</span></div>
                                    <div className="flex flex-col"><span className="text-[10px] font-black text-indigo-400 uppercase">Segurança</span><span className="font-bold">CORS Tunnel</span></div>
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
                                    <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Autorização Confirmada</h3>
                                    <p className="text-sm text-indigo-700 mt-2 font-medium">Clique no botão para finalizar a integração.</p>
                                </div>
                                <button 
                                    onClick={handleFinalizeIntegration}
                                    disabled={isSaving}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18}/> 3. Finalizar Conexão</>}
                                </button>
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
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">1. URL de Redirecionamento</label>
                                            <div className="flex gap-2">
                                                <input readOnly type="text" className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-mono font-bold text-indigo-700 outline-none" value={config.redirectUri} />
                                                <button onClick={() => { navigator.clipboard.writeText(config.redirectUri); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 transition-all" title="Copiar URL">{copied ? <Check size={20}/> : <Copy size={20}/>}</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">2. Client ID</label>
                                            <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none" value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value.trim()})} placeholder="client_id do portal conta azul" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">3. Client Secret</label>
                                            <input type="text" title="Secret" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-teal-500 outline-none" value={config.clientSecret} onChange={e => setConfig({...config, clientSecret: e.target.value.trim()})} placeholder="client_secret do portal" />
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <button onClick={handleSaveConfig} disabled={isSaving} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                                                1. Salvar Dados
                                            </button>
                                            <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                                <RefreshCw size={18}/> 2. Autorizar Conexão
                                            </button>
                                            {config.isConnected && (
                                                <button onClick={handleDisconnect} className="w-full text-[10px] font-black uppercase text-red-400 hover:text-red-600 mt-2">Desconectar conta</button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-7">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 h-full">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-3">
                                <ShieldAlert className="text-amber-500" /> Resolução de Conectividade
                            </h3>
                            <div className="space-y-6">
                                <div className="p-5 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl">
                                    <h4 className="font-bold text-indigo-800 text-sm">Problemas com Proxy</h4>
                                    <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                        Ao utilizar proxies públicos, alguns cabeçalhos de segurança podem ser bloqueados. O sistema agora envia as credenciais de forma otimizada para garantir a troca de tokens mesmo através desses túneis.
                                    </p>
                                </div>
                                <div className="p-5 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl">
                                    <h4 className="font-bold text-amber-800 text-sm">Credenciais Inválidas</h4>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        Ao alterar o Client ID ou Secret, os tokens anteriores tornam-se inválidos. Sempre clique em "Salvar Dados" e depois em "Autorizar Conexão" para renovar o acesso.
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