import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, Users, School, Store, Building2, MessageSquare, 
  Loader2, CheckCircle2, AlertCircle, Info, RefreshCw, X, Play, Pause, ChevronRight,
  Zap, History, Settings, Smartphone, Wifi, WifiOff, Save, Link2, Copy, Image as ImageIcon, Filter, Tag, ShoppingBag, Award, MapPin, Kanban, Target, UserX
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { whatsappService } from '../services/whatsappService';

type AudienceType = 'students' | 'teachers' | 'franchises' | 'studios' | 'leads';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  productType?: string;
  productName?: string;
  teacherLevel?: string;
  state?: string;
  pipeline?: string;
  stage?: string;
}

interface WAConfig {
  mode: 'evolution' | 'twilio';
  evolutionMethod: 'qr' | 'code';
  instanceUrl: string;
  instanceName: string;
  apiKey: string;
  pairingNumber: string;
  isConnected: boolean;
}

export const BulkWhatsAppSender: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'sender' | 'config'>('sender');
  const [selectedAudience, setSelectedAudience] = useState<AudienceType | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, error: 0 });
  const [logs, setLogs] = useState<{ name: string, status: 'success' | 'error', message: string }[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // Filter States for Students/Leads
  const [filterType, setFilterType] = useState<string>('');
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [filterPipeline, setFilterPipeline] = useState<string>('');
  const [filterStage, setFilterStage] = useState<string>('');
  
  // Filter States for Teachers
  const [filterTeacherLevel, setFilterTeacherLevel] = useState<string>('');

  // Filter States for Studios
  const [filterStudioState, setFilterStudioState] = useState<string>('');

  // Config States
  const [config, setConfig] = useState<WAConfig>({
      mode: 'evolution',
      evolutionMethod: 'qr',
      instanceUrl: '',
      instanceName: '',
      apiKey: '',
      pairingNumber: '',
      isConnected: false
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isGeneratingConnection, setIsGeneratingConnection] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingCodeValue, setPairingCodeValue] = useState<string | null>(null);
  const [connLogs, setConnLogs] = useState<string[]>([]);

  const audiences = [
    { id: 'students', label: 'Alunos Matriculados', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'leads', label: 'Leads (Não Comprados)', icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'teachers', label: 'Professores', icon: School, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'franchises', label: 'Franquias', icon: Store, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'studios', label: 'Studios Parceiros', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  useEffect(() => {
    if (selectedAudience && activeSubTab === 'sender') {
      setFilterType('');
      setFilterProduct('');
      setFilterPipeline('');
      setFilterStage('');
      setFilterTeacherLevel('');
      setFilterStudioState('');
      fetchContacts(selectedAudience);
    }
  }, [selectedAudience, activeSubTab]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const c = await appBackend.getWhatsAppConfig();
    if (c) {
        setConfig(prev => ({ ...prev, ...c }));
        checkRealStatus(c);
    }
  };

  const checkRealStatus = async (targetConfig?: any) => {
    const target = targetConfig || config;
    if (!target.instanceUrl || !target.instanceName) return;
    try {
        let baseUrl = target.instanceUrl.trim();
        if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
        baseUrl = baseUrl.replace(/\/$/, "");

        const response = await fetch(`${baseUrl}/instance/connectionState/${target.instanceName.trim()}`, {
            headers: { 'apikey': target.apiKey.trim() }
        });
        const data = await response.json();
        const state = data.instance?.state || data.state || 'closed';
        setConfig(prev => ({ ...prev, isConnected: state === 'open' }));
    } catch (e) {
        setConfig(prev => ({ ...prev, isConnected: false }));
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
        const sanitizedConfig = {
            ...config,
            instanceUrl: config.instanceUrl.trim().replace(/\/$/, ""),
            instanceName: config.instanceName.trim(),
            apiKey: config.apiKey.trim()
        };
        await appBackend.saveWhatsAppConfig(sanitizedConfig);
        setConfig(sanitizedConfig);
        alert("Configurações salvas com sucesso!");
        checkRealStatus(sanitizedConfig);
    } catch (e: any) { 
        alert(`Erro ao salvar: ${e.message}`); 
    } finally { 
        setIsSavingConfig(false); 
    }
  };

  const handleConnectEvolution = async () => {
    setIsGeneratingConnection(true);
    setQrCodeUrl(null);
    setPairingCodeValue(null);
    setConnLogs([`Iniciando tentativa de conexão...`]);
    try {
        if (!config.instanceUrl || !config.instanceName) throw new Error("Preencha os dados da instância.");
        
        let baseUrl = config.instanceUrl.trim();
        if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
        baseUrl = baseUrl.replace(/\/$/, "");

        if (config.evolutionMethod === 'code') {
            const cleanNumber = config.pairingNumber.replace(/\D/g, '');
            if (!cleanNumber) throw new Error("Número de pareamento é obrigatório para este método.");
            
            let response = await fetch(`${baseUrl}/instance/connect/pairing-code/${config.instanceName.trim()}?number=${cleanNumber}`, {
                headers: { 'apikey': config.apiKey.trim() }
            });
            
            if (!response.ok && response.status === 404) {
                response = await fetch(`${baseUrl}/instance/connect/pairingCode/${config.instanceName.trim()}?number=${cleanNumber}`, {
                    headers: { 'apikey': config.apiKey.trim() }
                });
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro no pareamento por código.");
            setPairingCodeValue(data.code || data.pairingCode);
        } else {
            const response = await fetch(`${baseUrl}/instance/connect/${config.instanceName.trim()}`, {
                headers: { 'apikey': config.apiKey.trim() }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro ao gerar QR Code.");
            const token = data.base64 || data.code;
            setQrCodeUrl(token.startsWith('data:image') ? token : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`);
        }
    } catch (err: any) { 
        setConnLogs(prev => [`[ERRO] ${err.message}`, ...prev]);
    } finally { setIsGeneratingConnection(false); }
  };

  const fetchContacts = async (type: AudienceType) => {
    setIsLoading(true);
    setContacts([]);
    setSelectedContacts([]);
    try {
      let data: any[] = [];
      let error: any = null;

      switch (type) {
        case 'students':
          const resS = await appBackend.client.from('crm_deals').select('id, contact_name, company_name, phone, email, product_type, product_name, pipeline, stage').eq('stage', 'closed').order('contact_name');
          data = resS.data || [];
          error = resS.error;
          break;
        case 'leads':
          const resL = await appBackend.client.from('crm_deals').select('id, contact_name, company_name, phone, email, product_type, product_name, pipeline, stage').neq('stage', 'closed').order('contact_name');
          data = resL.data || [];
          error = resL.error;
          break;
        case 'teachers':
          const resT = await appBackend.client.from('crm_teachers').select('id, full_name, phone, email, teacher_level').eq('is_active', true).order('full_name');
          data = resT.data || [];
          error = resT.error;
          break;
        case 'franchises':
          const resF = await appBackend.client.from('crm_franchises').select('id, franchisee_name, phone, email').order('franchisee_name');
          data = resF.data || [];
          error = resF.error;
          break;
        case 'studios':
          const resSt = await appBackend.client.from('crm_partner_studios').select('id, fantasy_name, phone, email, state').eq('status', 'active').order('fantasy_name');
          data = resSt.data || [];
          error = resSt.error;
          break;
      }

      if (error) throw error;

      const mapped: Contact[] = data.map((item: any) => ({
        id: item.id,
        name: item.full_name || item.contact_name || item.company_name || item.franchisee_name || item.fantasy_name || 'Sem Nome',
        phone: item.phone?.replace(/\D/g, '') || '',
        email: item.email || '',
        productType: item.product_type || '',
        productName: item.product_name || '',
        teacherLevel: item.teacher_level || '',
        state: item.state || '',
        pipeline: item.pipeline || '',
        stage: item.stage || ''
      })).filter(c => c.phone.length >= 10);

      setContacts(mapped);
      setSelectedContacts(mapped.map(c => c.id));
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar contatos.");
    } finally {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const filteredContactsList = useMemo(() => {
      return contacts.filter(c => {
          if (selectedAudience === 'students' || selectedAudience === 'leads') {
              const matchesType = !filterType || c.productType === filterType;
              const matchesProduct = !filterProduct || c.productName === filterProduct;
              const matchesPipeline = !filterPipeline || c.pipeline === filterPipeline;
              const matchesStage = !filterStage || c.stage === filterStage;
              return matchesType && matchesProduct && matchesPipeline && matchesStage;
          }
          if (selectedAudience === 'teachers') {
              const matchesLevel = !filterTeacherLevel || c.teacherLevel === filterTeacherLevel;
              return matchesLevel;
          }
          if (selectedAudience === 'studios') {
              const matchesState = !filterStudioState || c.state === filterStudioState;
              return matchesState;
          }
          return true;
      });
  }, [contacts, selectedAudience, filterType, filterProduct, filterPipeline, filterStage, filterTeacherLevel, filterStudioState]);

  const studentTypeOptions = useMemo(() => {
      if (selectedAudience !== 'students' && selectedAudience !== 'leads') return [];
      return Array.from(new Set(contacts.map(c => c.productType).filter(Boolean))).sort();
  }, [contacts, selectedAudience]);

  const studentProductOptions = useMemo(() => {
      if (selectedAudience !== 'students' && selectedAudience !== 'leads') return [];
      const filteredForOptions = filterType 
          ? contacts.filter(c => c.productType === filterType)
          : contacts;
      return Array.from(new Set(filteredForOptions.map(c => c.productName).filter(Boolean))).sort();
  }, [contacts, selectedAudience, filterType]);

  const pipelineOptions = useMemo(() => {
      if (selectedAudience !== 'students' && selectedAudience !== 'leads') return [];
      return Array.from(new Set(contacts.map(c => c.pipeline).filter(Boolean))).sort();
  }, [contacts, selectedAudience]);

  const stageOptions = useMemo(() => {
      if (selectedAudience !== 'students' && selectedAudience !== 'leads') return [];
      const filteredForOptions = filterPipeline 
          ? contacts.filter(c => c.pipeline === filterPipeline)
          : contacts;
      return Array.from(new Set(filteredForOptions.map(c => c.stage).filter(Boolean))).sort();
  }, [contacts, selectedAudience, filterPipeline]);

  const teacherLevelOptions = useMemo(() => {
      if (selectedAudience !== 'teachers') return [];
      return Array.from(new Set(contacts.map(c => c.teacherLevel).filter(Boolean))).sort();
  }, [contacts, selectedAudience]);

  const studioStateOptions = useMemo(() => {
      if (selectedAudience !== 'studios') return [];
      return Array.from(new Set(contacts.map(c => c.state).filter(Boolean))).sort();
  }, [contacts, selectedAudience]);

  const handleToggleSelect = (id: string) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContactsList.length) setSelectedContacts([]);
    else setSelectedContacts(filteredContactsList.map(c => c.id));
  };

  const addLog = (name: string, status: 'success' | 'error', msg: string) => {
    setLogs(prev => [{ name, status, message: msg }, ...prev].slice(0, 50));
  };

  const handleStartSending = async () => {
    if (!message.trim()) {
      alert("Escreva uma mensagem primeiro.");
      return;
    }
    if (selectedContacts.length === 0) {
      alert("Selecione ao menos um contato.");
      return;
    }

    if (!window.confirm(`Deseja iniciar o envio para ${selectedContacts.length} contatos?`)) return;

    setIsSending(true);
    setIsPaused(false);
    setProgress({ current: 0, total: selectedContacts.length, success: 0, error: 0 });
    setLogs([]);

    const targetContacts = filteredContactsList.filter(c => selectedContacts.includes(c.id));

    for (let i = 0; i < targetContacts.length; i++) {
      while (isPaused) {
        await new Promise(r => setTimeout(r, 1000));
      }

      const contact = targetContacts[i];
      try {
        await whatsappService.sendTextMessage({ 
            wa_id: contact.phone,
            contact_phone: contact.phone
        }, message);

        setProgress(prev => ({ ...prev, current: i + 1, success: prev.success + 1 }));
        addLog(contact.name, 'success', 'Enviado com sucesso');
      } catch (err: any) {
        setProgress(prev => ({ ...prev, current: i + 1, error: prev.error + 1 }));
        addLog(contact.name, 'error', err.message || 'Falha no envio');
      }

      if (i < targetContacts.length - 1) {
          const delay = Math.floor(Math.random() * (7000 - 3000 + 1) + 3000);
          await new Promise(r => setTimeout(r, delay));
      }
    }

    setIsSending(false);
    alert("Processo de envio em massa finalizado!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Send className="text-orange-600" /> Envio de WhatsApp em Massa
          </h2>
          <p className="text-sm text-slate-500 font-medium">Comunicação direta para grandes grupos segmentados.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner shrink-0">
            <button onClick={() => setActiveSubTab('sender')} className={clsx("px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", activeSubTab === 'sender' ? "bg-white text-orange-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>Disparador</button>
            <button onClick={() => setActiveSubTab('config')} className={clsx("px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", activeSubTab === 'config' ? "bg-white text-orange-700 shadow-md" : "text-slate-500 hover:text-slate-700")}>Configurações do WhatsApp</button>
        </div>
      </div>

      {activeSubTab === 'sender' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lado Esquerdo: Configuração do Público */}
          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={16} className="text-orange-500" /> 1. Escolha o Público Alvo
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {audiences.map(aud => (
                  <button
                    key={aud.id}
                    onClick={() => !isSending && setSelectedAudience(aud.id as AudienceType)}
                    disabled={isSending}
                    className={clsx(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 text-center",
                      selectedAudience === aud.id 
                        ? "bg-orange-50 border-orange-500 text-orange-700 shadow-md ring-4 ring-orange-50" 
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                    )}
                  >
                    <aud.icon size={24} className={selectedAudience === aud.id ? "text-orange-600" : aud.color} />
                    <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{aud.label}</span>
                  </button>
                ))}
              </div>

              {(selectedAudience === 'students' || selectedAudience === 'leads') && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Filter size={14} className="text-indigo-500"/> Filtros para {selectedAudience === 'students' ? 'Alunos' : 'Leads'}
                      </h4>
                      <div className="space-y-3">
                          <div className="relative">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                              <select 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                value={filterType}
                                onChange={e => { setFilterType(e.target.value); setFilterProduct(''); }}
                              >
                                  <option value="">Todos os Tipos</option>
                                  {studentTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                          <div className="relative">
                              <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                              <select 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                value={filterProduct}
                                onChange={e => setFilterProduct(e.target.value)}
                              >
                                  <option value="">Todos os Cursos/Produtos</option>
                                  {studentProductOptions.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                          </div>
                          <div className="relative">
                              <Kanban className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                              <select 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                value={filterPipeline}
                                onChange={e => { setFilterPipeline(e.target.value); setFilterStage(''); }}
                              >
                                  <option value="">Todos os Funis</option>
                                  {pipelineOptions.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                          </div>
                          <div className="relative">
                              <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                              <select 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                value={filterStage}
                                onChange={e => setFilterStage(e.target.value)}
                              >
                                  <option value="">Todas as Etapas</option>
                                  {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>
              )}

              {selectedAudience === 'teachers' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Filter size={14} className="text-indigo-500"/> Filtros para Professores
                      </h4>
                      <div className="space-y-3">
                          <div className="relative">
                              <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                              <select 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                value={filterTeacherLevel}
                                onChange={e => setFilterTeacherLevel(e.target.value)}
                              >
                                  <option value="">Todos os Níveis</option>
                                  {teacherLevelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>
              )}

              {selectedAudience === 'studios' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Filter size={14} className="text-indigo-500"/> Filtros para Studios
                      </h4>
                      <div className="space-y-3">
                          <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                              <select 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                value={filterStudioState}
                                onChange={e => setFilterStudioState(e.target.value)}
                              >
                                  <option value="">Todos os Estados</option>
                                  {studioStateOptions.map(st => <option key={st} value={st}>{st}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>
              )}
            </section>

            {selectedAudience && (
              <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={16} className="text-orange-500" /> 2. Redigir Mensagem
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">{message.length} caracteres</span>
                </div>
                <textarea
                  disabled={isSending}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Olá, gostaria de informar que..."
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-orange-500 outline-none transition-all h-48 resize-none font-medium leading-relaxed"
                />
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-[10px] text-blue-700">
                  <Info size={16} className="shrink-0" />
                  <p><strong>Dica:</strong> Evite mensagens muito longas ou com muitos links para reduzir riscos de bloqueio.</p>
                </div>

                {!isSending ? (
                    <button
                      onClick={handleStartSending}
                      disabled={selectedContacts.length === 0 || !message.trim()}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      <Send size={20} /> Disparar para {selectedContacts.length} contatos
                    </button>
                ) : (
                    <div className="flex gap-2">
                      <button
                          onClick={() => setIsPaused(!isPaused)}
                          className={clsx(
                              "flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3",
                              isPaused ? "bg-green-600 text-white hover:bg-green-700" : "bg-amber-50 text-white hover:bg-amber-600"
                          )}
                      >
                          {isPaused ? <><Play size={20}/> Continuar</> : <><Pause size={20}/> Pausar</>}
                      </button>
                      <button
                          onClick={() => { if(window.confirm("Deseja cancelar o envio?")) window.location.reload(); }}
                          className="p-4 bg-red-100 text-red-600 rounded-2xl hover:bg-red-200 transition-all active:scale-95"
                      >
                          <X size={24}/>
                      </button>
                    </div>
                )}
              </section>
            )}
          </div>

          {/* Lado Direito: Lista de Contatos e Progresso */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAudience ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden animate-in slide-in-from-right-4">
                <div className="px-8 py-6 border-b flex items-center justify-between bg-slate-50/50 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-orange-600">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 leading-tight">
                        Lista de Contatos: {audiences.find(a => a.id === selectedAudience)?.label}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {selectedContacts.length} de {filteredContactsList.length} exibidos selecionados
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <button onClick={handleSelectAll} disabled={isSending} className="text-[10px] font-black uppercase text-orange-600 hover:underline">
                          {selectedContacts.length === filteredContactsList.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </button>
                      <button onClick={() => fetchContacts(selectedAudience)} disabled={isSending} className="p-2 text-slate-400 hover:text-orange-600 transition-all hover:bg-white rounded-xl">
                          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""}/>
                      </button>
                  </div>
                </div>

                {isSending && (
                    <div className="p-8 bg-slate-900 text-white space-y-4 shrink-0 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={120}/></div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Progresso do Envio</p>
                                <h4 className="text-2xl font-black">{Math.round((progress.current / progress.total) * 100)}% <span className="text-sm font-normal text-slate-400">({progress.current}/{progress.total})</span></h4>
                            </div>
                            <div className="flex gap-4 text-right">
                                <div><p className="text-[9px] font-black text-green-400 uppercase">Sucessos</p><p className="font-bold">{progress.success}</p></div>
                                <div><p className="text-[9px] font-black text-red-400 uppercase">Falhas</p><p className="font-bold">{progress.error}</p></div>
                            </div>
                        </div>
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 transition-all duration-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]" 
                              style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                      <Loader2 size={48} className="animate-spin text-orange-600" />
                      <p className="font-black uppercase text-xs tracking-widest">Sincronizando Lista...</p>
                    </div>
                  ) : filteredContactsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 opacity-20 italic">
                      <Users size={64} />
                      <p>Nenhum contato ativo encontrado com os filtros atuais.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {filteredContactsList.map(c => {
                        const isSelected = selectedContacts.includes(c.id);
                        return (
                          <div 
                            key={c.id} 
                            onClick={() => !isSending && handleToggleSelect(c.id)}
                            className={clsx(
                              "px-8 py-4 flex items-center justify-between transition-all",
                              !isSending && "cursor-pointer hover:bg-slate-50",
                              isSelected ? "bg-orange-50/30" : "opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={clsx(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  isSelected ? "bg-orange-600 border-orange-600 text-white" : "border-slate-200"
                              )}>
                                {isSelected && <CheckCircle2 size={14} />}
                              </div>
                              <div className="min-w-0">
                                  <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{c.name}</p>
                                  <p className="text-[10px] font-mono text-slate-400">{c.phone}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-[9px] font-black text-slate-300 uppercase block truncate max-w-[150px]">{c.email}</span>
                                {(selectedAudience === 'students' || selectedAudience === 'leads') && c.productName && (
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block truncate max-w-[150px]">{c.productName}</span>
                                )}
                                {(selectedAudience === 'students' || selectedAudience === 'leads') && c.stage && (
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter block truncate max-w-[150px]">F: {c.pipeline} | E: {c.stage}</span>
                                )}
                                {selectedAudience === 'teachers' && c.teacherLevel && (
                                    <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest block truncate max-w-[150px]">{c.teacherLevel}</span>
                                )}
                                {selectedAudience === 'studios' && c.state && (
                                    <span className="text-[8px] font-black text-teal-500 uppercase tracking-widest block truncate max-w-[150px]">{c.state}</span>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center h-[700px] text-slate-400 text-center p-12">
                  <Send size={80} className="mb-6 opacity-10" />
                  <h3 className="text-xl font-black text-slate-600 mb-2">Aguardando Seleção de Público</h3>
                  <p className="text-sm max-w-xs font-medium">Selecione uma das categorias à esquerda para carregar os contatos e configurar sua mensagem.</p>
              </div>
            )}

            {isSending && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4 animate-in slide-in-from-bottom-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <History size={14}/> Logs de Atividade do Robô
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {logs.map((log, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-700 truncate max-w-[150px]">{log.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className={clsx("font-black uppercase", log.status === 'success' ? "text-green-600" : "text-red-500")}>
                                        {log.status === 'success' ? 'OK' : 'FALHA'}
                                    </span>
                                    <span className="text-slate-400 font-medium">{log.message}</span>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && <p className="text-xs text-slate-300 italic text-center py-4">Iniciando processamento...</p>}
                    </div>
                </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 border-b pb-6">
                        <Settings className="text-orange-600" size={24}/> Credenciais da Instância Evolution
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">URL Base da Evolution API</label>
                            <input 
                                type="text" 
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-orange-500 outline-none transition-all font-bold" 
                                value={config.instanceUrl} 
                                onChange={e => setConfig({...config, instanceUrl: e.target.value})} 
                                placeholder="https://api.evolution.sua-empresa.com" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome da Instância</label>
                            <input 
                                type="text" 
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-orange-500 outline-none transition-all font-bold" 
                                value={config.instanceName} 
                                onChange={e => setConfig({...config, instanceName: e.target.value})} 
                                placeholder="Ex: VOLL_MASSA" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">API Key Global</label>
                            <input 
                                type="password" 
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-orange-500 outline-none transition-all font-bold" 
                                value={config.apiKey} 
                                onChange={e => setConfig({...config, apiKey: e.target.value})} 
                                placeholder="Inserir Chave Global" 
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button 
                            onClick={handleSaveConfig} 
                            disabled={isSavingConfig}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar & Validar Conexão
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-4 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5"><Link2 size={120}/></div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-white/10 rounded-2xl text-orange-400"><Link2 size={24}/></div>
                        <h3 className="text-xl font-black uppercase tracking-widest">Integração Externa</h3>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-lg">Configurações para o serviço de mensageria em massa. As mesmas configurações são aplicadas globalmente para automações e atendimento.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-8 text-center">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center justify-center gap-3">
                        <Smartphone className="text-orange-600" size={20}/> Status do Dispositivo
                    </h3>
                    <div className={clsx("p-10 rounded-[2.5rem] border-4 flex flex-col items-center gap-6 transition-all", config.isConnected ? "bg-teal-50 border-teal-200" : "bg-red-50 border-red-200")}>
                        {config.isConnected ? <Wifi size={64} className="text-teal-500 animate-pulse"/> : <WifiOff size={64} className="text-red-400"/>}
                        <div className="space-y-1">
                            <span className={clsx("text-sm font-black uppercase tracking-widest", config.isConnected ? "text-teal-700" : "text-red-700")}>
                                {config.isConnected ? "Aparelho Online" : "Instância Offline"}
                            </span>
                            <p className="text-[10px] text-slate-400 font-bold">Último check: {new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleConnectEvolution} 
                        disabled={isGeneratingConnection || !config.instanceUrl} 
                        className="w-full py-5 bg-orange-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {isGeneratingConnection ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                        Gerar QR Code de Conexão
                    </button>
                    {qrCodeUrl && (
                        <div className="p-6 bg-white rounded-3xl shadow-inner border border-slate-100 animate-in zoom-in-95 mt-4">
                            <img src={qrCodeUrl} className="w-full h-auto rounded-xl" />
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">Escaneie com o WhatsApp</p>
                        </div>
                    )}
                    {pairingCodeValue && (
                        <div className="text-center pt-4 animate-in zoom-in-95"><div className="inline-block px-10 py-6 bg-white rounded-3xl shadow-xl border-2 border-orange-200 text-3xl font-black tracking-[0.5em] text-orange-600">{pairingCodeValue}</div><p className="text-xs text-orange-600 font-bold mt-4 uppercase">DIGITE NO SEU WHATSAPP</p></div>
                    )}
                    <div className="space-y-1">{connLogs.map((log, i) => (<p key={i} className="text-[10px] font-mono text-orange-400">{log}</p>))}</div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};