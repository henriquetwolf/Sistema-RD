import React, { useState, useEffect } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks
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
            
            if (data?.value) {
                setConfig(JSON.parse(data.value));
            }
        } catch (e) {
            console.error("Erro ao carregar configuração Conta Azul:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            await appBackend.client
                .from('crm_settings')
                .upsert({ 
                    key: 'conta_azul_config', 
                    value: JSON.stringify(config) 
                }, { onConflict: 'key' });
            
            alert("Configurações do Conta Azul salvas com sucesso!");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConnect = () => {
        if (!config.clientId || !config.redirectUri) {
            alert("Preencha o Client ID e Redirect URI para conectar.");
            return;
        }
        const authUrl = `https://app.contaazul.com/auth/authorize?redirect_uri=${encodeURIComponent(config.redirectUri)}&client_id=${config.clientId}&scope=sales%20financial&state=voll_erp`;
        window.open(authUrl, '_blank');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-teal-600" /> Financeiro
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Gestão de receitas, despesas e integrações bancárias.</p>
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
                        Integração Conta Azul
                    </button>
                </div>
            </div>

            {activeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                            <Wallet size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Módulo Financeiro</h3>
                        <p className="text-sm text-slate-500 max-w-xs">Acesse a sub-aba de Integração para configurar seu ERP Conta Azul.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* FORMULÁRIO DE CONFIGURAÇÃO */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8">
                            <div className="flex items-center justify-between border-b pb-6">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                    <Cloud className="text-blue-500" size={24}/> API Conta Azul (OAuth 2.0)
                                </h3>
                                <div className={clsx(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border",
                                    config.isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                                )}>
                                    <div className={clsx("w-2 h-2 rounded-full", config.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                    {config.isConnected ? "Conectado" : "Desconectado"}
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Client ID</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono" 
                                                value={config.clientId} 
                                                onChange={e => setConfig({...config, clientId: e.target.value})}
                                                placeholder="Sua credencial do portal de desenvolvedores"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Client Secret</label>
                                            <input 
                                                type="password" 
                                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono" 
                                                value={config.clientSecret} 
                                                onChange={e => setConfig({...config, clientSecret: e.target.value})}
                                                placeholder="Sua chave secreta"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Redirect URI</label>
                                            <div className="relative">
                                                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                                <input 
                                                    type="text" 
                                                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono" 
                                                    value={config.redirectUri} 
                                                    onChange={e => setConfig({...config, redirectUri: e.target.value})}
                                                    placeholder="https://seu-erp.com/callback"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                                        <button 
                                            onClick={handleSaveConfig}
                                            disabled={isSaving}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                                        >
                                            <Save size={16}/> Salvar Credenciais
                                        </button>
                                        <button 
                                            onClick={handleConnect}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2"
                                        >
                                            <RefreshCw size={18}/> Autorizar Integração
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PASSO A PASSO DE CONFIGURAÇÃO */}
                        <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><ListChecks size={24}/></div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Como obter suas credenciais</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex gap-6 items-start group">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">1</div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-800">Acesse o Portal de Desenvolvedores</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">Vá para <a href="https://developers.contaazul.com" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold">developers.contaazul.com <ExternalLink size={12}/></a> e faça login com sua conta Conta Azul.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">2</div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-800">Crie um Novo Aplicativo</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">Clique em "Meus Apps" e depois em "Novo App". Dê um nome (ex: VOLL ERP) e salve para gerar as chaves.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">3</div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-800">Configure a URL de Retorno</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">Copie a <strong>Redirect URI</strong> informada acima no formulário e cole exatamente igual no campo "URL de Retorno" dentro do portal.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">4</div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-800">Copie o Client ID e Secret</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">Copie os campos <strong>Client ID</strong> e <strong>Client Secret</strong> do portal e cole nos campos correspondentes aqui no ERP.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">5</div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-800">Salve e Autorize</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">Clique em "Salvar Credenciais" e depois no botão azul <strong>"Autorizar Integração"</strong> para conectar as contas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ShieldCheck size={16} className="text-teal-600" /> Checklist de Segurança
                            </h3>
                            <div className="space-y-4">
                                {[
                                    "App registrado no Portal Dev",
                                    "Redirect URI configurada no ERP",
                                    "Escopos 'sales' e 'financial' ativos",
                                    "Secret Key válida e salva"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                        <CheckCircle2 size={16} className="text-teal-500 shrink-0"/>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5"><Link2 size={120}/></div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/10 rounded-xl text-indigo-400"><Info size={20}/></div>
                                <h3 className="text-sm font-black uppercase tracking-widest">Sobre o Conta Azul</h3>
                            </div>
                            <p className="text-xs text-indigo-100/70 leading-relaxed font-medium">
                                Ao conectar sua conta, o VOLL ERP poderá sincronizar automaticamente as vendas geradas no CRM, criar lançamentos financeiros e atualizar o status de recebimento em tempo real.
                            </p>
                        </div>

                        <div className="bg-amber-50 rounded-[2.5rem] border border-amber-200 p-8 flex gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={24}/>
                            <div>
                                <h4 className="text-sm font-black text-amber-900 uppercase">Atenção ao Webhook</h4>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    Certifique-se de configurar a URL de Webhook no Conta Azul para receber confirmações de pagamento instantâneas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};