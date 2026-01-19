
import React, { useState, useEffect } from 'react';
import { 
  Wallet, RefreshCw, Loader2, Key, Check, Save, ShieldCheck, Unplug, AlertCircle,
  X, Info, Zap
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
        clientId: '', clientSecret: '', redirectUri: 'https://sistema-rd.vercel.app/', isConnected: false
    });
    
    const [receivableTotal, setReceivableTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [authCode, setAuthCode] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
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
            const data = await appBackend.getContaAzulConfig();
            if (data) setConfig({ ...data, redirectUri: 'https://sistema-rd.vercel.app/' });
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const callInternalProxy = async (path: string, options: any = {}) => {
        const url = `/api/contaazul?path=${encodeURIComponent(path)}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json'
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            data = { error: text || "Erro desconhecido na resposta" };
        }

        if (!response.ok) {
            if (data.error === 'not_connected') {
                setConfig(prev => ({ ...prev, isConnected: false }));
            }
            throw new Error(data.error || data.message || `Erro HTTP ${response.status}`);
        }
        return data;
    };

    const fetchFinancialData = async () => {
        setIsFetchingData(true);
        setErrorMsg(null);
        try {
            // Não enviamos mais Authorization aqui, o Proxy injeta do banco
            const query = `data_vencimento_inicio=2020-01-01&data_vencimento_fim=2030-12-31&situacao=ABERTO&itens_por_pagina=100`;
            const data = await callInternalProxy(`v1/financeiro/eventos-financeiros/contas-a-receber/buscar?${query}`);

            const items = data.items || data.content || [];
            const total = items.reduce((acc: number, curr: any) => acc + (curr.valor_total || curr.valor || 0), 0);
            setReceivableTotal(total);
            
            // O Proxy já atualiza o status de conexão no banco, mas atualizamos o UI
            if (!config.isConnected) setConfig(prev => ({ ...prev, isConnected: true }));
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally { setIsFetchingData(false); }
    };

    const handleConnect = async () => {
        try {
            // Salva as chaves para que o Proxy as encontre durante a troca do code
            await appBackend.saveContaAzulConfig({ ...config, isConnected: false });
            
            const baseUrl = "https://auth.contaazul.com/login";
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: config.clientId.trim(),
                redirect_uri: config.redirectUri,
                state: 'voll_erp',
                scope: 'openid profile'
            });
            window.location.href = `${baseUrl}?${params.toString()}`;
        } catch (e: any) {
            setErrorMsg("Erro ao iniciar conexão: " + e.message);
        }
    };

    const handleFinalizeIntegration = async () => {
        if (!authCode) return;
        setIsFetchingData(true);
        setErrorMsg(null);
        try {
            // A rota /oauth/token no proxy agora salva automaticamente no DB
            await callInternalProxy('oauth/token', {
                method: 'POST',
                body: {
                    grant_type: 'authorization_code',
                    code: authCode,
                    redirect_uri: config.redirectUri,
                    client_id: config.clientId.trim(),
                    client_secret: config.clientSecret.trim()
                }
            });

            setAuthCode(null);
            window.history.replaceState({}, document.title, window.location.pathname);
            
            alert("Conectado e tokens salvos com segurança no servidor!");
            loadConfig(); // Recarrega status do banco
            fetchFinancialData();
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally { setIsFetchingData(false); }
    };

    const handleClear = () => {
        setAuthCode(null);
        setErrorMsg(null);
        window.history.replaceState({}, document.title, window.location.pathname);
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Wallet className="text-teal-600"/> Financeiro</h2>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setActiveSubTab('overview')} className={clsx("px-6 py-2 rounded-lg text-xs font-bold transition-all", activeSubTab === 'overview' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>Visão Geral</button>
                    <button onClick={() => setActiveSubTab('integração')} className={clsx("px-6 py-2 rounded-lg text-xs font-bold transition-all", activeSubTab === 'integração' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>Configuração</button>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl flex items-start justify-between gap-3 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="shrink-0" />
                        <div>
                            <p className="text-sm font-bold">Erro na Integração</p>
                            <p className="text-xs opacity-80">{errorMsg}</p>
                        </div>
                    </div>
                    <button onClick={handleClear} className="p-1 hover:bg-red-100 rounded"><X size={16}/></button>
                </div>
            )}

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm group hover:border-teal-500 transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Receber (Conta Azul)</p>
                        <h3 className="text-3xl font-black text-slate-800">R$ {receivableTotal.toLocaleString('pt-BR')}</h3>
                        <button onClick={() => fetchFinancialData()} disabled={isFetchingData} className="mt-4 text-teal-600 text-xs font-bold flex items-center gap-1 hover:underline">
                            {isFetchingData ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} 
                            Sincronizar dados
                        </button>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className={clsx("w-16 h-16 rounded-3xl flex items-center justify-center mb-3", config.isConnected ? "bg-teal-50 text-teal-600" : "bg-slate-50 text-slate-300")}>
                            {config.isConnected ? <ShieldCheck size={32}/> : <Unplug size={32}/>}
                        </div>
                        <p className="text-xs font-black uppercase">{config.isConnected ? "Integração Ativa" : "Desconectado"}</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Gestão de Token em Servidor</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <h3 className="text-lg font-black text-slate-800 border-b pb-4">Credenciais da API</h3>
                        
                        {authCode ? (
                            <div className="p-6 bg-indigo-50 border-2 border-indigo-200 rounded-2xl text-center space-y-4 animate-in zoom-in-95">
                                <div className="p-3 bg-white rounded-full w-fit mx-auto shadow-sm">
                                    <Zap className="text-indigo-600" size={32} />
                                </div>
                                <p className="text-sm font-bold text-indigo-800 uppercase tracking-tighter">Autorização Concedida!</p>
                                <button onClick={handleFinalizeIntegration} disabled={isFetchingData} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                    {isFetchingData ? <Loader2 size={20} className="animate-spin" /> : <Check size={20}/>}
                                    Salvar Conexão no Servidor
                                </button>
                                <button onClick={handleClear} className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500">Reiniciar</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Client ID</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono" value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value.trim()})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Client Secret</label>
                                    <input type="password" title="Secret" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono" value={config.clientSecret} onChange={e => setConfig({...config, clientSecret: e.target.value.trim()})} />
                                </div>
                                <div className="pt-4 space-y-2">
                                    <button onClick={handleConnect} className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                        Conectar Conta Azul
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter"><Info size={20} className="text-blue-500"/> Segurança</h3>
                        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                            <p>Agora seus tokens são armazenados de forma criptografada no banco de dados e nunca ficam expostos no navegador.</p>
                            <p>O sistema gerencia automaticamente a renovação do acesso (refresh token), garantindo que sua integração nunca pare.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
