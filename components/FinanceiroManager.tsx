import React, { useState, useEffect } from 'react';
import { 
  Wallet, Settings, RefreshCw, Save, Loader2, Link2, 
  AlertCircle, ShieldCheck, CheckCircle2, Cloud, Info, ExternalLink, Key, ListChecks,
  Copy, Globe, MousePointerClick
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
            alert("Preencha o Client ID e a URL de Redirecionamento para conectar.");
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
                    <p className="text-sm text-slate-500 font-medium">Gestão de receitas, despesas e integração com Conta Azul.</p>
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
                    <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 shadow-inner">
                            <Wallet size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Módulo Financeiro</h3>
                        <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">Clique na aba de <strong>Integração</strong> para configurar suas chaves de API e automatizar seu fluxo financeiro.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* FORMULÁRIO DE CONFIGURAÇÃO */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Cloud size={120}/></div>
                            <div className="flex items-center justify-between border-b pb-6 relative z-10">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                                    <Key className="text-blue-500" size={24}/> Configurações da API (OAuth 2.0)
                                </h3>
                                <div className={clsx(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border",
                                    config.isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                                )}>
                                    <div className={clsx("w-2 h-2 rounded-full", config.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                    {config.isConnected ? "Conectado" : "Aguardando Conexão"}
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                            ) : (
                                <div className="space-y-6 relative z-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Client ID</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono" 
                                                value={config.clientId} 
                                                onChange={e => setConfig({...config, clientId: e.target.value})}
                                                placeholder="Copiado do campo 'client_id' no portal do desenvolvedor"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Client Secret</label>
                                            <input 
                                                type="password" 
                                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono" 
                                                value={config.clientSecret} 
                                                onChange={e => setConfig({...config, clientSecret: e.target.value})}
                                                placeholder="Copiado do campo 'client_secret' no portal do desenvolvedor"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                                URL de Redirecionamento (Redirect URI)
                                                <div className="group relative">
                                                    <Info size={12} className="text-slate-300 cursor-help" />
                                                    <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-2xl z-20 leading-relaxed font-medium">
                                                        Este link deve ser IDÊNTICO ao que você cadastrou no campo "URL de redirecionamento" do portal Conta Azul.
                                                    </div>
                                                </div>
                                            </label>
                                            <div className="relative">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                                <input 
                                                    type="text" 
                                                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono text-blue-600" 
                                                    value={config.redirectUri} 
                                                    onChange={e => setConfig({...config, redirectUri: e.target.value})}
                                                    placeholder="https://seu-erp.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-50">
                                        <button 
                                            onClick={handleSaveConfig}
                                            disabled={isSaving}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save size={16}/> Salvar Configuração
                                        </button>
                                        <button 
                                            onClick={handleConnect}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <RefreshCw size={18}/> Autorizar Integração
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PASSO A PASSO TÉCNICO */}
                        <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><ListChecks size={24}/></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Guia de Configuração</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Siga estes passos para conectar o Conta Azul</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">01</div>
                                    <div className="space-y-1 pt-1">
                                        <p className="font-bold text-slate-800 flex items-center gap-2">Acesse o Portal de Desenvolvedores <ExternalLink size={14} className="text-slate-300" /></p>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">Faça login com sua conta em <a href="https://developers.contaazul.com" target="_blank" className="text-blue-600 hover:underline font-bold">developers.contaazul.com</a> e clique no card da sua aplicação em <strong>"Meus Apps"</strong>.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">02</div>
                                    <div className="space-y-3 pt-1 flex-1">
                                        <p className="font-bold text-slate-800 flex items-center gap-2">Ajuste a URL de Redirecionamento <MousePointerClick size={14} className="text-indigo-400"/></p>
                                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                                            <p className="text-xs text-slate-600 leading-relaxed font-medium">No portal do Conta Azul, clique em <strong>"Editar informações"</strong>. No campo <strong>"URL de redirecionamento"</strong>, apague o endereço atual (ex: <code>https://contaazul.com</code>) e cole o link do seu aplicativo onde você está agora.</p>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase bg-white px-3 py-1.5 rounded-lg border border-indigo-200 w-fit">
                                                <AlertCircle size={14} /> Importante: Ambos os campos devem ser idênticos.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">03</div>
                                    <div className="space-y-1 pt-1">
                                        <p className="font-bold text-slate-800">Transfira as Credenciais</p>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">Copie o <strong>client_id</strong> e o <strong>client_secret</strong> do portal e cole nos campos correspondentes do formulário acima aqui no ERP.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">04</div>
                                    <div className="space-y-1 pt-1">
                                        <p className="font-bold text-slate-800">Salve e Conecte</p>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">Clique em <strong>"Salvar Credenciais"</strong> e depois no botão azul <strong>"Autorizar Integração"</strong>. Você será levado para o Conta Azul para confirmar a permissão.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BARRA LATERAL DE APOIO */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ShieldCheck size={16} className="text-teal-600" /> Checklist de Validação
                            </h3>
                            <div className="space-y-4">
                                {[
                                    "App registrado no Portal Dev",
                                    "URL de Redirecionamento configurada",
                                    "URL do ERP idêntica à do Portal",
                                    "Permissões 'sales' e 'financial' ativas",
                                    "Secret Key salva e válida"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                        <CheckCircle2 size={16} className="text-teal-500 shrink-0"/>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5"><Link2 size={120}/></div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/10 rounded-xl text-indigo-400"><Info size={20}/></div>
                                <h3 className="text-sm font-black uppercase tracking-widest">Aviso de Segurança</h3>
                            </div>
                            <p className="text-xs text-indigo-100/70 leading-relaxed font-medium">
                                Nunca compartilhe seu <strong>Client Secret</strong> com terceiros. Ele é a chave mestre que permite ao sistema ler e escrever no seu financeiro do Conta Azul.
                            </p>
                        </div>

                        <div className="bg-amber-50 rounded-[2.5rem] border border-amber-200 p-8 flex gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={24}/>
                            <div>
                                <h4 className="text-sm font-black text-amber-900 uppercase">Dificuldade técnica?</h4>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed font-medium">
                                    Se ao clicar em "Autorizar" você receber um erro de <strong>"Redirect Mismatch"</strong>, revise o passo 2. O endereço deve ser exatamente igual, incluindo o <code>https://</code>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};