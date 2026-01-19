import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick, Check, Eye, EyeOff, AlertTriangle, ShieldAlert,
  ArrowRightLeft, Lock, Layout, Zap, ArrowRight, MousePointer2, CheckCircle,
  FileSpreadsheet, TrendingUp, DollarSign, History, User
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

interface ReceivableItem {
    id: string;
    customer_name: string;
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
    const [overdueTotal, setOverdueTotal] = useState(0);
    const [overdueCount, setOverdueCount] = useState(0);
    const [recentOverdue, setRecentOverdue] = useState<ReceivableItem[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [copied, setCopied] = useState(false);
    const [authCode, setAuthCode] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            setAuthCode(code);
            setActiveSubTab('integração');
        }
    }, []);

    // Busca dados sempre que a configuração mudar ou o tab de visão geral for ativado
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

    const handleRefreshToken = async () => {
        if (!config.refreshToken) return null;
        
        try {
            const cleanId = config.clientId.trim();
            const cleanSecret = config.clientSecret.trim();
            const credentials = btoa(`${cleanId}:${cleanSecret}`);
            const proxyUrl = "https://corsproxy.io/?";
            const targetUrl = "https://auth.contaazul.com/oauth2/token";

            const body = new URLSearchParams();
            body.append('grant_type', 'refresh_token');
            body.append('refresh_token', config.refreshToken);

            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: body.toString()
            });

            if (!response.ok) throw new Error("Falha ao renovar token");

            const data = await response.json();
            const updatedConfig = {
                ...config,
                accessToken: data.access_token,
                refreshToken: data.refresh_token || config.refreshToken
            };

            await appBackend.client
                .from('crm_settings')
                .upsert({ key: 'conta_azul_config', value: JSON.stringify(updatedConfig) });
            
            setConfig(updatedConfig);
            return data.access_token;
        } catch (e) {
            console.error("Erro ao renovar token:", e);
            return null;
        }
    };

    const fetchFinancialData = async (tokenOverride?: string) => {
        const token = tokenOverride || config.accessToken;
        if (!token) return;

        setIsFetchingData(true);
        console.log("Financeiro: Buscando títulos vencidos...");
        
        try {
            const proxyUrl = "https://corsproxy.io/?";
            // Aumentamos o size para garantir que pegamos todos os vencidos importantes
            const targetUrl = "https://api.contaazul.com/v1/receivables?status=OVERDUE&size=100";

            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                console.warn("Token expirado, tentando renovar...");
                const newToken = await handleRefreshToken();
                if (newToken) {
                    fetchFinancialData(newToken);
                }
                return;
            }

            if (!response.ok) {
                const errData = await response.json();
                console.error("Erro na API de Recebíveis:", errData);
                throw new Error("Erro ao buscar recebíveis");
            }

            const data = await response.json();
            console.log("Dados brutos recebidos do Conta Azul:", data);

            // A API do Conta Azul pode retornar uma lista direta ou dentro de um campo "items" ou "content"
            const rawItems = Array.isArray(data) ? data : (data.items || data.content || []);
            
            if (rawItems.length === 0) {
                console.log("Nenhum título vencido retornado pela API.");
                setOverdueTotal(0);
                setOverdueCount(0);
                setRecentOverdue([]);
                return;
            }

            // Processa os dados de forma resiliente
            const items: ReceivableItem[] = rawItems.map((r: any) => ({
                id: r.id,
                customer_name: r.customer?.name || r.customer_name || "Cliente não identificado",
                value: Number(r.value || 0),
                due_date: r.due_date,
                status: r.status
            }));

            const total = items.reduce((acc, curr) => acc + curr.value, 0);
            
            console.log(`Sucesso: ${items.length} títulos somando ${total}`);
            
            setOverdueTotal(total);
            setOverdueCount(items.length);
            setRecentOverdue(items.slice(0, 5)); 

        } catch (e) {
            console.error("Erro técnico no fluxo financeiro:", e);
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
            const credentials = btoa(`${cleanId}:${cleanSecret}`);
            const targetUrl = "https://auth.contaazul.com/oauth2/token";
            const proxyUrl = "https://corsproxy.io/?";

            const body = new URLSearchParams();
            body.append('grant_type', 'authorization_code');
            body.append('code', authCode.trim());
            body.append('redirect_uri', fixedRedirect);

            const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: body.toString()
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error_description || data.message || data.error || "Erro desconhecido";
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
            alert(e.message);
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
                    <p className="text-sm text-slate-500 font-medium">Gestão Integrada Conta Azul.</p>
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

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {config.isConnected ? (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 shadow-inner">
                                <ShieldCheck size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Conexão Ativa</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizado via Conta Azul</p>
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
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Últimos Vencidos</h4>
                        <div className="flex-1 space-y-3">
                            {recentOverdue.length > 0 ? (
                                recentOverdue.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black text-slate-800 truncate">{item.customer_name}</p>
                                            <p className="text-[9px] text-red-500 font-bold uppercase tracking-tighter">Venceu em {new Date(item.due_date).toLocaleDateString()}</p>
                                        </div>
                                        <span className="text-xs font-black text-slate-700 shrink-0">{formatCurrency(item.value)}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-xs">
                                    {isFetchingData ? <Loader2 className="animate-spin" /> : 'Sem inadimplência recente.'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col space-y-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Inadimplência Total</h4>
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
                            {config.isConnected ? (
                                <>
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{overdueCount} Títulos Vencidos</p>
                                    <h3 className="text-4xl font-black text-slate-800">{formatCurrency(overdueTotal)}</h3>
                                    <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                                        <AlertCircle className="text-red-500" size={20} />
                                        <p className="text-[10px] text-red-700 font-bold uppercase leading-tight text-left">Valor total aguardando recebimento na API.</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-slate-300 italic text-xs text-center px-6">
                                    Conecte a API para visualizar os valores vencidos em tempo real.
                                </div>
                            )}
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
                                    <p className="text-sm text-indigo-700 mt-2 font-medium">Clique no botão para receber o Token de acesso.</p>
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
                                <AlertTriangle className="text-amber-500" /> Solução para Erro 401
                            </h3>
                            <div className="space-y-6">
                                <div className="p-5 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl">
                                    <h4 className="font-bold text-indigo-800 text-sm">O que o sistema busca?</h4>
                                    <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                        Assim que conectado, o ERP consulta automaticamente a lista de <strong>Recebíveis</strong> (Contas a Receber) com o status de vencido. O valor exibido na tela inicial é a soma total de todos os títulos em atraso no seu Conta Azul.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-lg">01</div>
                                        <p className="text-sm text-slate-600 leading-relaxed font-bold">
                                            Certifique-se de que o App cadastrado no Conta Azul tem permissões para ler "Recebíveis".
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">02</div>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            A sincronização é automática, mas você pode usar o botão <strong>Sincronizar</strong> no topo da tela para forçar uma atualização manual.
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