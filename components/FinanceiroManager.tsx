
import React, { useState, useEffect } from 'react';
import { 
  Wallet, RefreshCw, Loader2, Key, Copy, Check, Save, ShieldCheck, Unplug, Eraser, AlertCircle
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
        clientId: '', clientSecret: '', redirectUri: 'https://sistema-rd.vercel.app/', isConnected: false
    });
    
    const [receivableTotal, setReceivableTotal] = useState(0);
    const [payableTotal, setPayableTotal] = useState(0);
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
            }
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || errData.message || "Erro na API Interna");
        }
        return response.json();
    };

    const fetchFinancialData = async (tokenOverride?: string) => {
        const token = tokenOverride || config.accessToken;
        if (!token) return;
        setIsFetchingData(true);
        setErrorMsg(null);
        try {
            const query = `data_vencimento_inicio=2020-01-01&data_vencimento_fim=2030-12-31&situacao=ABERTO&itens_por_pagina=100`;
            
            const data = await callInternalProxy(`v1/financeiro/eventos-financeiros/contas-a-receber/buscar?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const items = data.items || data.content || [];
            const total = items.reduce((acc: number, curr: any) => acc + (curr.valor_total || curr.valor || 0), 0);
            setReceivableTotal(total);

            const updatedConfig = { ...config, lastSync: new Date().toISOString(), isConnected: true };
            await appBackend.saveContaAzulConfig(updatedConfig);
            setConfig(updatedConfig);
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally { setIsFetchingData(false); }
    };

    const handleConnect = () => {
        const baseUrl = "https://auth.contaazul.com/login";
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId.trim(),
            redirect_uri: config.redirectUri,
            state: 'voll_erp',
            scope: 'openid profile'
        });
        window.location.href = `${baseUrl}?${params.toString()}`;
    };

    const handleFinalizeIntegration = async () => {
        if (!authCode) return;
        setIsFetchingData(true);
        try {
            const data = await callInternalProxy('oauth/token', {
                method: 'POST',
                body: {
                    grant_type: 'authorization_code',
                    code: authCode,
                    redirect_uri: config.redirectUri
                }
            });

            const updatedConfig = {
                ...config,
                isConnected: true,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                lastSync: new Date().toISOString()
            };

            await appBackend.saveContaAzulConfig(updatedConfig);
            setConfig(updatedConfig);
            setAuthCode(null);
            window.history.replaceState({}, document.title, "/financeiro");
            alert("Conectado com sucesso!");
            fetchFinancialData(data.access_token);
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally { setIsFetchingData(false); }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Wallet/> Financeiro</h2>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setActiveSubTab('overview')} className={clsx("px-6 py-2 rounded-lg text-xs font-bold", activeSubTab === 'overview' ? "bg-white shadow" : "text-slate-50")}>Visão Geral</button>
                    <button onClick={() => setActiveSubTab('integração')} className={clsx("px-6 py-2 rounded-lg text-xs font-bold", activeSubTab === 'integração' ? "bg-white shadow" : "text-slate-50")}>Configuração</button>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle/> <p className="text-sm font-bold">{errorMsg}</p>
                </div>
            )}

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase">Total a Receber</p>
                        <h3 className="text-3xl font-black text-slate-800">R$ {receivableTotal.toLocaleString('pt-BR')}</h3>
                        <button onClick={() => fetchFinancialData()} className="mt-4 text-teal-600 text-xs font-bold flex items-center gap-1"><RefreshCw size={12}/> Atualizar</button>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col items-center justify-center">
                        {config.isConnected ? <ShieldCheck className="text-teal-600" size={48}/> : <Unplug className="text-slate-300" size={48}/>}
                        <p className="text-xs font-black uppercase mt-2">{config.isConnected ? "Conectado" : "Desconectado"}</p>
                    </div>
                </div>
            ) : (
                <div className="max-w-md bg-white p-8 rounded-3xl border shadow-sm space-y-4">
                    {authCode ? (
                        <button onClick={handleFinalizeIntegration} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold">Finalizar Integração</button>
                    ) : (
                        <>
                            <input type="text" placeholder="Client ID" className="w-full p-3 border rounded-xl" value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value})} />
                            <input type="password" placeholder="Client Secret" className="w-full p-3 border rounded-xl" value={config.clientSecret} onChange={e => setConfig({...config, clientSecret: e.target.value})} />
                            <button onClick={handleConnect} className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold">Autorizar Conta Azul</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
