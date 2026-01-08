
import React, { useState, useEffect, useRef } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { ConfigPanel } from './components/ConfigPanel';
import { UploadPanel } from './components/UploadPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { LoginPanel } from './components/LoginPanel';
import { TableViewer } from './components/TableViewer';
import { CrmBoard } from './components/CrmBoard'; 
import { CollaboratorsManager } from './components/CollaboratorsManager';
import { HrDashboard } from './components/HrDashboard';
import { ClassesManager } from './components/ClassesManager';
import { TeachersManager, Teacher } from './components/TeachersManager';
import { FormsManager } from './components/FormsManager';
import { SurveyManager } from './components/SurveyManager';
import { FormViewer } from './components/FormViewer';
import { SettingsManager } from './components/SettingsManager';
import { SalesAnalysis } from './components/SalesAnalysis';
import { ContractsManager } from './components/ContractsManager';
import { ContractSigning } from './components/ContractSigning';
import { ProductsManager } from './components/ProductsManager';
import { InstructorArea } from './components/InstructorArea';
import { FranchisesManager } from './components/FranchisesManager';
import { CertificatesManager } from './components/CertificatesManager';
import { StudentsManager } from './components/StudentsManager';
import { StudentArea } from './components/StudentArea';
import { PartnerStudioArea } from './components/PartnerStudioArea';
import { CertificateViewer } from './components/CertificateViewer'; 
import { EventsManager } from './components/EventsManager';
import { WhatsAppInbox } from './components/WhatsAppInbox'; 
import { PartnerStudiosManager } from './components/PartnerStudiosManager';
import { InventoryManager } from './components/InventoryManager';
import { BillingManager } from './components/BillingManager';
import { SupportChannel } from './components/SupportChannel';
import { SupabaseConfig, FileData, AppStep, UploadStatus, SyncJob, FormModel, Contract, StudentSession, CollaboratorSession, PartnerStudioSession, EntityImportType } from './types';
import { parseCsvFile } from './utils/csvParser';
import { parseExcelFile } from './utils/excelParser';
import { createSupabaseClient, batchUploadData, clearTableData } from './services/supabaseService';
import { appBackend } from './services/appBackend';
import { 
  CheckCircle, AlertTriangle, Loader2, Database, LogOut, 
  Plus, Play, Pause, Trash2, ExternalLink, Activity, Clock, FileInput, HardDrive,
  /* Added missing imports LayoutGrid and ChevronRight */
  LayoutDashboard, Settings, BarChart3, ArrowRight, Table, Kanban, LayoutGrid, ChevronRight,
  Users, GraduationCap, School, TrendingUp, Calendar, DollarSign, Filter, FileText, ArrowLeft, Cog, PieChart,
  FileSignature, ShoppingBag, Store, Award, Mic, MessageCircle, Briefcase, Building2, Package, Target, TrendingDown, History, XCircle, Home, AlertCircle, Info, Sparkles, Heart, CreditCard, LifeBuoy, CircleDot
} from 'lucide-react';
import clsx from 'clsx';

function App() {
  const [publicForm, setPublicForm] = useState<FormModel | null>(null);
  const [publicContract, setPublicContract] = useState<Contract | null>(null);
  const [publicCertificateHash, setPublicCertificateHash] = useState<string | null>(null);
  const [isPublicLoading, setIsPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  const DEFAULT_LOGO = "https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png";
  const [appLogo, setAppLogo] = useState<string>(DEFAULT_LOGO);

  const handleLogoChange = (newLogo: string | null) => {
      setAppLogo(newLogo || DEFAULT_LOGO);
  };

  const [session, setSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  
  const [currentInstructor, setCurrentInstructor] = useState<Teacher | null>(null);
  const [currentStudent, setCurrentStudent] = useState<StudentSession | null>(null);
  const [currentCollaborator, setCurrentCollaborator] = useState<CollaboratorSession | null>(null);
  const [currentStudio, setCurrentStudio] = useState<PartnerStudioSession | null>(null);

  const [jobs, setJobs] = useState<SyncJob[]>([]);
  
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'support' | 'hr' | 'crm' | 'billing' | 'inventory' | 'whatsapp' | 'analysis' | 'forms' | 'surveys' | 'contracts' | 'events' | 'students' | 'certificates' | 'global_settings'>('overview');

  const [overviewStats, setOverviewStats] = useState({
      leadsToday: 0,
      salesToday: 0,
      revenueToday: 0,
      leadsWeek: 0,
      salesWeek: 0,
      revenueWeek: 0
  });
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  const [step, setStep] = useState<AppStep>(AppStep.DASHBOARD);
  const [config, setConfig] = useState<SupabaseConfig>({ url: '', key: '', tableName: '', primaryKey: '', intervalMinutes: 5 });
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [tempSheetUrl, setTempSheetUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<EntityImportType>('generic');

  const [allCollaborators, setAllCollaborators] = useState<any[]>([]);

  useEffect(() => {
    const initApp = async () => {
        const savedLogo = await appBackend.getAppLogo();
        if (savedLogo) setAppLogo(savedLogo);

        const params = new URLSearchParams(window.location.search);
        const publicFormId = params.get('publicFormId');
        const contractId = params.get('contractId');
        const certificateHash = params.get('certificateHash');

        if (publicFormId || contractId || certificateHash) {
            setIsPublicLoading(true);
            setPublicError(null);
            try {
                if (publicFormId) {
                    const form = await appBackend.getFormById(publicFormId);
                    if (form) setPublicForm(form);
                    else setPublicError("O formulário solicitado não existe ou foi removido.");
                } else if (contractId) {
                    /* Fixed missing method name */
                    const contract = await appBackend.getContractById(contractId);
                    if (contract) setPublicContract(contract);
                    else setPublicError("O contrato solicitado não foi localizado.");
                } else if (certificateHash) {
                    setPublicCertificateHash(certificateHash);
                }
            } catch (e) {
                setPublicError("Ocorreu um erro ao tentar carregar o recurso. Verifique sua conexão.");
            } finally {
                setIsPublicLoading(false);
            }
            return;
        }

        try {
            const data = await appBackend.getSyncJobs();
            setJobs(data);
        } catch (e) {}

        appBackend.auth.getSession().then((s) => {
            setSession(s);
            setIsLoadingSession(false);
        });
        
        const savedInstructor = sessionStorage.getItem('instructor_session');
        if (savedInstructor) { try { setCurrentInstructor(JSON.parse(savedInstructor)); } catch (e) {} }

        const savedStudent = sessionStorage.getItem('student_session');
        if (savedStudent) { try { setCurrentStudent(JSON.parse(savedStudent)); } catch (e) {} }

        const savedCollaborator = sessionStorage.getItem('collaborator_session');
        if (savedCollaborator) { try { setCurrentCollaborator(JSON.parse(savedCollaborator)); } catch (e) {} }

        const savedStudio = sessionStorage.getItem('studio_session');
        if (savedStudio) { try { setCurrentStudio(JSON.parse(savedStudio)); } catch (e) {} }
    };
    initApp();

    const { data: { subscription } } = appBackend.auth.onAuthStateChange((s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (dashboardTab === 'overview' && (session || currentCollaborator)) {
        fetchOverviewData();
    }
  }, [dashboardTab, session, currentCollaborator]);

  const fetchOverviewData = async () => {
    setIsOverviewLoading(true);
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: dealsToday } = await appBackend.client
            .from('crm_deals')
            .select('value, stage, created_at, closed_at')
            .or(`created_at.gte.${startOfToday},closed_at.gte.${startOfToday}`);

        const leadsT = (dealsToday || []).filter(d => d.created_at >= startOfToday).length;
        const salesT = (dealsToday || []).filter(d => d.stage === 'closed' && d.closed_at >= startOfToday);
        const revenueT = salesT.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

        const { data: dealsWeek } = await appBackend.client
            .from('crm_deals')
            .select('value, stage, created_at, closed_at')
            .or(`created_at.gte.${sevenDaysAgo},closed_at.gte.${sevenDaysAgo}`);

        const leadsW = (dealsWeek || []).filter(d => d.created_at >= sevenDaysAgo).length;
        const salesW = (dealsWeek || []).filter(d => d.stage === 'closed' && d.closed_at >= sevenDaysAgo);
        const revenueW = salesW.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

        setOverviewStats({
            leadsToday: leadsT, salesToday: salesT.length, revenueToday: revenueT,
            leadsWeek: leadsW, salesWeek: salesW.length, revenueWeek: revenueW
        });
    } catch (e) {
        console.error(e);
    } finally {
        setIsOverviewLoading(false);
    }
  };

  const handleStartWizard = () => {
    setStep(AppStep.UPLOAD);
    setFilesData([]);
    setConfig({ url: '', key: '', tableName: '', primaryKey: '', intervalMinutes: 5 });
    setTempSheetUrl(null);
    setErrorMessage(null);
    setSelectedEntity('generic');
    setStatus('idle');
  };

  const handleFilesSelected = async (files: File[]) => {
    setStatus('parsing');
    setErrorMessage(null);
    try {
      const parsedFiles = await Promise.all(files.map(file => file.name.endsWith('.xlsx') ? parseExcelFile(file) : parseCsvFile(file)));
      setFilesData(parsedFiles);
      setStep(AppStep.CONFIG);
      setStatus('idle');
    } catch (e: any) { 
        setErrorMessage(e.message); 
        setStatus('error'); 
    }
  };

  const handleCreateConnection = async () => {
      setErrorMessage(null);
      try {
          setStatus('uploading');
          const client = createSupabaseClient(config.url, config.key);
          const allData = filesData.flatMap(f => f.data);
          if (allData.length > 0) {
              await batchUploadData(client, config, allData, () => {});
          }
          const newJob: SyncJob = { 
              id: crypto.randomUUID(), 
              name: config.tableName || "Nova Conexão", 
              sheetUrl: tempSheetUrl || "", 
              config: { ...config }, 
              active: !!tempSheetUrl, 
              status: tempSheetUrl ? 'idle' : 'success', 
              lastSync: tempSheetUrl ? null : new Date().toISOString(), 
              lastMessage: tempSheetUrl ? 'Aguardando sincronização...' : `Upload manual completo.`, 
              intervalMinutes: config.intervalMinutes || 5,
              createdBy: currentCollaborator ? currentCollaborator.name : 'Super Admin',
              createdAt: new Date().toISOString()
          };
          await appBackend.saveSyncJob(newJob);
          setStep(AppStep.DASHBOARD);
          setStatus('idle');
      } catch (e: any) { 
          setErrorMessage(`Falha no processamento: ${e.message}`); 
          setStatus('error'); 
      }
  };

  const handleLogout = async () => {
    if (currentInstructor) { setCurrentInstructor(null); sessionStorage.removeItem('instructor_session'); }
    else if (currentStudent) { setCurrentStudent(null); sessionStorage.removeItem('student_session'); }
    else if (currentCollaborator) { setCurrentCollaborator(null); sessionStorage.removeItem('collaborator_session'); }
    else if (currentStudio) { setCurrentStudio(null); sessionStorage.removeItem('studio_session'); }
    else await appBackend.auth.signOut();
  };

  const canAccess = (module: string): boolean => {
      if (session) return true;
      if (currentCollaborator) return !!currentCollaborator.role.permissions[module];
      return false;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (isPublicLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-teal-600" size={40} /></div>;

  if (publicError) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full animate-in zoom-in-95">
              <XCircle className="text-red-500 mx-auto mb-4" size={64} />
              <h1 className="text-2xl font-black text-slate-800 mb-2">Ops! Algo deu errado</h1>
              <p className="text-slate-500 mb-8 leading-relaxed">{publicError}</p>
              <button 
                onClick={() => window.location.href = window.location.origin} 
                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-all"
              >
                  <Home size={18} /> Ir para o Início
              </button>
          </div>
      </div>
  );

  if (publicCertificateHash) return <CertificateViewer hash={publicCertificateHash} />;
  if (publicContract) return <ContractSigning contract={publicContract} />;
  if (publicForm) return <div className="min-h-screen bg-slate-50"><FormViewer form={publicForm} isPublic={true} /></div>;
  
  if (isLoadingSession) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-teal-600" size={40} /></div>;

  if (!session && !currentInstructor && !currentStudent && !currentCollaborator && !currentStudio) {
      return <LoginPanel 
        onInstructorLogin={onInstructorLogin} 
        onStudentLogin={onStudentLogin} 
        onCollaboratorLogin={onCollaboratorLogin}
        onStudioLogin={onStudioLogin}
      />;
  }
  if (currentInstructor) return <InstructorArea instructor={currentInstructor} onLogout={handleLogout} />;
  if (currentStudent) return <StudentArea student={currentStudent} onLogout={handleLogout} />;
  if (currentStudio) return <PartnerStudioArea studio={currentStudio} onLogout={handleLogout} />;

  const currentUserName = currentCollaborator 
    ? currentCollaborator.name 
    : (session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Super Admin');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {step !== AppStep.DASHBOARD ? (
        <div className="max-w-4xl mx-auto py-8 px-4">
             <div className="flex items-center justify-between mb-8">
                <button onClick={() => setStep(AppStep.DASHBOARD)} className="text-slate-500 hover:text-teal-600 flex items-center gap-2 font-medium">
                    <ArrowLeft size={20} /> Voltar
                </button>
                <img src={appLogo} alt="VOLL" className="h-8 max-w-[150px] object-contain" />
             </div>
             <StepIndicator currentStep={step} />
             <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 min-h-[400px]">
                {step === AppStep.UPLOAD && <UploadPanel onFilesSelected={handleFilesSelected} onUrlConfirmed={setTempSheetUrl} onEntitySelected={setSelectedEntity} isLoading={status === 'parsing'} />}
                {step === AppStep.CONFIG && <ConfigPanel config={config} setConfig={setConfig} onNext={() => setStep(AppStep.PREVIEW)} onBack={() => setStep(AppStep.UPLOAD)} currentCreatorName={currentUserName} />}
                {step === AppStep.PREVIEW && <PreviewPanel files={filesData} tableName={config.tableName} config={config} onUpdateFiles={setFilesData} onUpdateConfig={setConfig} onSync={handleCreateConnection} onBack={() => setStep(AppStep.CONFIG)} onClearTable={async () => { const client = createSupabaseClient(config.url, config.key); await clearTableData(client, config.tableName, config.primaryKey || 'id'); }} />}
             </div>
        </div>
      ) : (
        <>
            <header className="bg-white border-b border-slate-200 py-3 sticky top-0 z-20 shadow-sm">
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[11px] font-black rounded border border-blue-200 uppercase tracking-widest">
                            {currentCollaborator ? currentCollaborator.role.name : 'Super Admin'}
                        </span>
                    </div>
                    <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1.5 font-bold transition-colors">
                        <LogOut size={18} /> Sair
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
                    <aside className="w-full md:w-72 flex-shrink-0">
                        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm sticky top-24">
                            <nav className="space-y-1">
                                {[
                                    { id: 'overview', label: 'Visão Geral', icon: LayoutGrid },
                                    { id: 'support', label: 'Suporte Interno', icon: LifeBuoy },
                                    { id: 'hr', label: 'Recursos Humanos', icon: Heart },
                                    { id: 'crm', label: 'CRM Comercial', icon: BarChart3 },
                                    { id: 'billing', label: 'Cobrança', icon: CreditCard },
                                    { id: 'inventory', label: 'Controle de Estoque', icon: Package },
                                    { id: 'whatsapp', label: 'Atendimento', icon: MessageCircle },
                                    { id: 'analysis', label: 'Análise de Vendas', icon: PieChart },
                                    { id: 'forms', label: 'Formulários', icon: FileText },
                                    { id: 'surveys', label: 'Pesquisas', icon: CircleDot },
                                    { id: 'contracts', label: 'Contratos', icon: FileSignature },
                                    { id: 'events', label: 'Eventos', icon: Mic },
                                    { id: 'students', label: 'Alunos', icon: Users },
                                    { id: 'certificates', label: 'Certificados', icon: Award },
                                ].map(item => (
                                    canAccess(item.id) && (
                                        <button 
                                            key={item.id} 
                                            onClick={() => setDashboardTab(item.id as any)} 
                                            className={clsx(
                                                "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                                dashboardTab === item.id 
                                                    ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100" 
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={18} className={dashboardTab === item.id ? "text-teal-600" : "text-slate-400"} />
                                                {item.label}
                                            </div>
                                            {dashboardTab === item.id && <ChevronRight size={14} />}
                                        </button>
                                    )
                                ))}
                            </nav>
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <button onClick={() => setDashboardTab('global_settings')} className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold", dashboardTab === 'global_settings' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-500 hover:bg-slate-50")}>
                                    <Cog size={18} /> Configurações
                                </button>
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1 min-w-0">
                        {dashboardTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <section className="bg-gradient-to-r from-teal-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/30">
                                                <Sparkles size={24} className="text-teal-100" />
                                            </div>
                                            <span className="text-teal-100 text-[10px] font-black uppercase tracking-[0.3em]">Painel de Controle</span>
                                        </div>
                                        <h2 className="text-4xl font-black tracking-tight mb-4">
                                            Bem-vindo, <span className="text-emerald-400">{currentUserName}</span>!
                                        </h2>
                                        <p className="text-teal-50/80 text-lg max-w-xl leading-relaxed font-medium">
                                            Seu centro de comando está pronto. Visualize leads, gerencie turmas e acompanhe o crescimento da VOLL em tempo real.
                                        </p>
                                    </div>
                                </section>

                                {isOverviewLoading ? (
                                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                                ) : (
                                    <>
                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Target size={14} /> Desempenho de Hoje
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform"><Target size={40} className="text-indigo-200" /></div>
                                                    <p className="text-sm font-bold text-slate-500 mb-2">Novos Leads (Dia)</p>
                                                    <h4 className="text-4xl font-black text-slate-800">{overviewStats.leadsToday}</h4>
                                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest"><Clock size={12} /> Atualizado Agora</div>
                                                </div>
                                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-green-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform"><CheckCircle size={40} className="text-green-200" /></div>
                                                    <p className="text-sm font-bold text-slate-500 mb-2">Vendas Fechadas (Dia)</p>
                                                    <h4 className="text-4xl font-black text-slate-800">{overviewStats.salesToday}</h4>
                                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest"><TrendingUp size={12} /> Batendo Meta</div>
                                                </div>
                                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform"><DollarSign size={40} className="text-emerald-200" /></div>
                                                    <p className="text-sm font-bold text-slate-500 mb-2">Faturamento (Dia)</p>
                                                    <h4 className="text-4xl font-black text-emerald-600">{formatCurrency(overviewStats.revenueToday)}</h4>
                                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest"><Activity size={12} /> Em Tempo Real</div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <BarChart3 size={14} /> Resumo da Semana
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="bg-slate-800 p-8 rounded-3xl shadow-xl relative overflow-hidden group text-white">
                                                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/5 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform"><Target size={40} className="text-white/20" /></div>
                                                    <p className="text-sm font-bold text-slate-400 mb-2">Total de Leads (7d)</p>
                                                    <h4 className="text-4xl font-black">{overviewStats.leadsWeek}</h4>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-4 uppercase tracking-widest">Últimos 7 dias corridos</p>
                                                </div>
                                                <div className="bg-slate-800 p-8 rounded-3xl shadow-xl relative overflow-hidden group text-white">
                                                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/5 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform"><CheckCircle size={40} className="text-white/20" /></div>
                                                    <p className="text-sm font-bold text-slate-400 mb-2">Vendas Fechadas (7d)</p>
                                                    <h4 className="text-4xl font-black">{overviewStats.salesWeek}</h4>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-4 uppercase tracking-widest">Volume de Conversão</p>
                                                </div>
                                                <div className="bg-teal-600 p-8 rounded-3xl shadow-xl relative overflow-hidden group text-white">
                                                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/10 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform"><DollarSign size={40} className="text-white/20" /></div>
                                                    <p className="text-sm font-bold text-teal-100 mb-2">Faturamento Total (7d)</p>
                                                    <h4 className="text-4xl font-black">{formatCurrency(overviewStats.revenueWeek)}</h4>
                                                    <p className="text-[10px] font-bold text-teal-200 mt-4 uppercase tracking-widest">Total Consolidado</p>
                                                </div>
                                            </div>
                                        </section>
                                    </>
                                )}
                            </div>
                        )}
                        {dashboardTab === 'support' && <SupportChannel isAdmin={true} />}
                        {dashboardTab === 'hr' && <HrDashboard collaborators={allCollaborators} onEditCollaborator={() => {}} />}
                        {dashboardTab === 'crm' && <CrmBoard />}
                        {dashboardTab === 'billing' && <BillingManager />}
                        {dashboardTab === 'inventory' && <InventoryManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'whatsapp' && <WhatsAppInbox />}
                        {dashboardTab === 'analysis' && <SalesAnalysis />}
                        {dashboardTab === 'forms' && <FormsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'surveys' && <SurveyManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'contracts' && <ContractsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'events' && <EventsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'students' && <StudentsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'certificates' && <CertificatesManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'global_settings' && <SettingsManager onLogoChange={handleLogoChange} currentLogo={appLogo} jobs={jobs} onStartWizard={handleStartWizard} onDeleteJob={() => {}} />}
                    </div>
                </div>
            </main>
        </>
      )}
    </div>
  );
}

// Helpers que estavam faltando no arquivo anterior por brevidade
function onInstructorLogin(t: any) { sessionStorage.setItem('instructor_session', JSON.stringify(t)); window.location.reload(); }
function onStudentLogin(s: any) { sessionStorage.setItem('student_session', JSON.stringify(s)); window.location.reload(); }
function onCollaboratorLogin(c: any) { sessionStorage.setItem('collaborator_session', JSON.stringify(c)); window.location.reload(); }
function onStudioLogin(s: any) { sessionStorage.setItem('studio_session', JSON.stringify(s)); window.location.reload(); }

export default App;
