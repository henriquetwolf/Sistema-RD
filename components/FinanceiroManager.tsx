import React, { useState, useEffect } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick, Check, Eye, EyeOff, AlertTriangle, ShieldAlert
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
            alert("Configurações salvas!");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyUri = () => {
        navigator.clipboard.writeText(config.redirectUri);
        setCopied(true);
        setTimeout(() => setCopied(null), 2000);
    };

    // Validação se o Client ID parece um UUID (padrão da API do Conta Azul)
    const isClientIdValid = config.clientId.includes('-') && config.clientId.length > 20;

    // A URL de autorização correta SEMPRE deve ser app.contaazul.com
    const generatedAuthUrl = `https://app.contaazul.com/auth/authorize?client_id=${config.clientId.trim()}&redirect_uri=${encodeURIComponent(config.redirectUri.trim())}&scope=sales%20financial&state=voll_erp`;

    const handleConnect = () => {
        if (!isClientIdValid) {
            alert("O seu Client ID parece estar incorreto. Ele deve ser um código no formato 00000000-0000-0000-0000-000000000000 disponível no Portal de Desenvolvedores.");
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
                    {/* Fixed: changed activeTab to activeSubTab */}
                    <button onClick={() => setActiveSubTab('overview')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeSubTab === 'overview' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>Visão Geral</button>
                    {/* Fixed: changed activeTab to activeSubTab */}
                    <button onClick={() => setActiveSubTab('integração')} className={clsx("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeSubTab === 'integração' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>Integração Conta Azul</button>
                </div>
            </div>

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 shadow-inner"><Wallet size={40} /></div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Financeiro</h3>
                        <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">Acesse a aba de <strong>Integração</strong> para configurar sua conexão.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* ALERTA DE ERRO DE CHAVE */}
                        {!isClientIdValid && config.clientId.length > 0 && (
                            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[2rem] flex gap-4 animate-in shake duration-500">
                                <div className="bg-red-500 text-white p-2 rounded-xl h-fit shadow-lg"><ShieldAlert size={24} /></div>
                                <div>
                                    <h4 className="text-red-800 font-black text-sm uppercase">Chave Inválida Detectada!</h4>
                                    <p className="text-red-700 text-xs mt-1 leading-relaxed font-medium">
                                        O <strong>Client ID</strong> que você colou (`{config.clientId.substring(0,8)}...`) parece ser um código de login interno (AWS/Cognito). <br/>
                                        <strong>As chaves da API do Conta Azul são sempre UUIDs</strong> (ex: <code>8a7f23...-432a...</code>). <br/>
                                        Você deve criar o App em <a href="https://developers.contaazul.com" target="_blank" className="underline font-black">developers.contaazul.com</a> para obter o código correto.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* FORMULÁRIO */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8 relative overflow-hidden">
                            <div className="flex items-center justify-between border-b pb-6">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase"><Key className="text-blue-500" /> Credenciais Oficiais da API</h3>
                                <div className={clsx("px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border", config.isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200")}><div className={clsx("w-2 h-2 rounded-full", config.isConnected ? "bg-green-500" : "bg-red-500")}></div>{config.isConnected ? "Conectado" : "Offline"}</div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Client ID (Deve ser um código com hifens)</label>
                                        <input type="text" className={clsx("w-full px-5 py-3.5 border-2 rounded-2xl text-sm font-mono outline-none transition-all", isClientIdValid ? "bg-white border-slate-100 focus:border-blue-500" : "bg-red-50 border-red-100 focus:border-red-500")} value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value})} placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Client Secret</label>
                                        <input type="password" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-mono focus:bg-white focus:border-blue-500 outline-none transition-all" value={config.clientSecret} onChange={e => setConfig({...config, clientSecret: e.target.value})} placeholder="Sua chave secreta da API" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Redirect URI (Copie para o Portal Conta Azul)</label>
                                        <div className="relative group/uri">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                            <input type="text" readOnly className="w-full pl-12 pr-24 py-3.5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-sm font-mono text-indigo-700 font-bold" value={config.redirectUri} />
                                            <button onClick={handleCopyUri} className={clsx("absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all", copied ? "bg-green-500 text-white" : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white")}>{copied ? <Check size={12}/> : <Copy size={12}/>}{copied ? "Pronto!" : "Copiar"}</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                                    <button onClick={handleSaveConfig} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"><Save size={16}/> 1. Salvar Dados</button>
                                    <button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"><RefreshCw size={18}/> 2. Autorizar Integração</button>
                                </div>
                            </div>
                        </div>

                        {/* GUIA TÉCNICO REFORMULADO */}
                        <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><ListChecks size={24}/></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase">Onde pegar as chaves corretas</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Não use a URL do seu navegador para a integração</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">01</div>
                                    <div className="space-y-1 pt-1 flex-1">
                                        <p className="font-bold text-slate-800">Acesse o Portal de DEVS</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">Vá em <a href="https://developers.contaazul.com" target="_blank" className="text-blue-600 font-bold underline">developers.contaazul.com</a> (é diferente do site normal). Se não tiver um App, clique em <strong>"Criar novo App"</strong>.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">02</div>
                                    <div className="space-y-1 pt-1 flex-1">
                                        <p className="font-bold text-slate-800">Configure a URL de Redirecionamento</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">Dentro das configurações do seu App no portal, localize <strong>"URL de redirecionamento"</strong> e cole o link azul destacado no formulário acima (`{config.redirectUri}`).</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">03</div>
                                    <div className="space-y-1 pt-1 flex-1">
                                        <p className="font-bold text-slate-800">Copie o Client ID (UUID)</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">O Client ID correto deve ser parecido com isto: <code className="bg-slate-200 px-1 rounded text-slate-700">62d3a2b1-55c2-4e92-9112-000000000000</code>. Se for uma sopa de letrinhas sem hifens, está errado.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5"><Link2 size={120}/></div>
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Info size={16}/> Nota Técnica</h3>
                            <p className="text-xs text-indigo-100/70 leading-relaxed font-medium">A URL que você mencionou com `openid`, `profile` e `cognito` é para autenticação de usuários humanos no site deles. Para sistemas falarem entre si (APIs), o padrão é o <strong>OAuth 2.0</strong> disponível apenas no portal de desenvolvedores.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};