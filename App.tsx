
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
import { TwilioInbox } from './components/TwilioInbox';
import { PartnerStudiosManager } from './components/PartnerStudiosManager';
import { InventoryManager } from './components/InventoryManager';
import { SupabaseConfig, FileData, AppStep, UploadStatus, SyncJob, FormModel, Contract, StudentSession, CollaboratorSession, PartnerStudioSession, EntityImportType } from './types';
import { parseCsvFile } from './utils/csvParser';
import { parseExcelFile } from './utils/excelParser';
import { createSupabaseClient, batchUploadData, clearTableData } from './services/supabaseService';
import { appBackend } from './services/appBackend';
import { 
  CheckCircle, AlertTriangle, Loader2, Database, LogOut, 
  Plus, Play, Pause, Trash2, ExternalLink, Activity, Clock, FileInput, HardDrive,
  LayoutDashboard, Settings, BarChart3, ArrowRight, Table, Kanban,
  Users, GraduationCap, School, TrendingUp, Calendar, DollarSign, Filter, FileText, ArrowLeft, Cog, PieChart,
  FileSignature, ShoppingBag, Store, Award, Mic, MessageCircle, Briefcase, Building2, Package, Target, TrendingDown, History, XCircle, Home, AlertCircle, Info, Sparkles, Heart,
  // Added missing MessageSquare import
  MessageSquare
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
  const jobsRef = useRef<SyncJob[]>([]); 
  
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'tables' | 'crm' | 'analysis' | 'hr' | 'classes' | 'teachers' | 'forms' | 'surveys' | 'contracts' | 'products' | 'franchises' | 'certificates' | 'students' | 'events' | 'global_settings' | 'whatsapp' | 'twilio' | 'partner_studios' | 'inventory'>('overview');

  // Overview Stats State
  const [overviewStats, setOverviewStats] = useState({
      leadsToday: 0,
      salesToday: 0,
      revenueToday: 0,
      leadsWeek: 0,
      salesWeek: 0,
      revenueWeek: 0
  });
  const [recentChanges, setRecentChanges] = useState<any[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  const [step, setStep] = useState<AppStep>(AppStep.DASHBOARD);
  const [config, setConfig] = useState<SupabaseConfig>({ url: '', key: '', tableName: '', primaryKey: '', intervalMinutes: 5 });
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [tempSheetUrl, setTempSheetUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<EntityImportType>('generic');

  // RH Data Integration
  const [allCollaborators, setAllCollaborators] = useState<any[]>([]);
  const [isHrLoading, setIsHrLoading] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const CHECK_INTERVAL_MS = 60 * 1000; 

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

        // CARREGA JOBS DO BANCO
        try {
            const data = await appBackend.getSyncJobs();
            setJobs(data);
        } catch (e) {
            console.error("Erro ao carregar conexões do banco de dados:", e);
        }

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
    if (dashboardTab === 'hr' && (session || currentCollaborator)) {
        fetchHrData();
    }
  }, [dashboardTab, session, currentCollaborator]);

  const fetchHrData = async () => {
      setIsHrLoading(true);
      try {
          const { data, error } = await appBackend.client.from('crm_collaborators').select('*').order('full_name');
          if (data) {
              setAllCollaborators(data.map((d: any) => ({
                id: d.id, fullName: d.full_name || '', socialName: d.social_name || '', birthDate: d.birth_date || '', maritalStatus: d.marital_status || '', spouseName: d.spouse_name || '', fatherName: d.father_name || '', motherName: d.mother_name || '', genderIdentity: d.gender_identity || '', racialIdentity: d.racial_identity || '', educationLevel: d.education_level || '', photoUrl: d.photo_url || '', email: d.email || '', phone: d.phone || '', cellphone: d.cellphone || '', corporatePhone: d.corporate_phone || '', operator: d.operator || '', address: d.address || '', cep: d.cep || '', complement: d.complement || '', birthState: d.birth_state || '', birthCity: d.birth_city || '', state: d.state || '', currentCity: d.current_city || '', emergencyName: d.emergency_name || '', emergencyPhone: d.emergency_phone || '', status: d.status || 'active', contractType: d.contract_type || '', cpf: d.cpf || '', rg: d.rg || '', rgIssuer: d.rg_issuer || '', rgIssueDate: d.rg_issue_date || '', rgState: d.rg_state || '', ctpsNumber: d.ctps_number || '', ctpsSeries: d.ctps_series || '', ctpsState: d.ctps_state || '', ctpsIssueDate: d.ctps_issue_date || '', pisNumber: d.pis_number || '', reservistNumber: d.reservist_number || '', docsFolderLink: d.docs_folder_link || '', legalAuth: !!d.legal_auth, bankAccountInfo: d.bank_account_info || '', hasInsalubrity: d.has_insalubrity || 'Não', insalubrityPercent: d.insalubrity_percent || '', hasDangerPay: d.has_danger_pay || 'Não', transportVoucherInfo: d.transport_voucher_info || '', busLineHomeWork: d.bus_line_home_work || '', busQtyHomeWork: d.bus_qty_home_work || '', busLineWorkHome: d.bus_line_work_home || '', busQtyWorkHome: d.bus_qty_work_home || '', ticketValue: d.ticket_value || '', fuelVoucherValue: d.fuel_voucher_value || '', hasMealVoucher: d.has_meal_voucher || 'Não', hasFoodVoucher: d.has_food_voucher || 'Não', hasHomeOfficeAid: d.has_home_office_aid || 'Não', hasHealthPlan: d.has_health_plan || 'Não', hasDentalPlan: d.has_dental_plan || 'Não', bonusInfo: d.bonus_info || '', bonusValue: d.bonus_value || '', commissionInfo: d.commission_info || '', commissionPercent: d.commission_percent || '', hasDependents: d.has_dependents || 'Não', dependentName: d.dependent_name || '', dependentDob: d.dependent_dob || '', dependentKinship: d.dependent_kinship || '', dependentCpf: d.dependent_cpf || '', resignationDate: d.resignation_date || '', demissionReason: d.demission_reason || '', demissionDocs: d.demission_docs || '', vacationPeriods: d.vacation_periods || '', observations: d.observations || '',
                admissionDate: d.admission_date || '', role: d.role || '', department: d.department || '', salary: d.salary || '', hiringMode: d.hiring_mode || '', superiorId: d.superior_id || ''
              })));
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsHrLoading(false);
      }
  };

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

        const [teachers, studios, dealsData] = await Promise.all([
            appBackend.client.from('crm_teachers').select('full_name, created_at').order('created_at', { ascending: false }).limit(3),
            appBackend.client.from('crm_partner_studios').select('fantasy_name, created_at').order('created_at', { ascending: false }).limit(3),
            appBackend.client.from('crm_deals').select('company_name, contact_name, created_at').order('created_at', { ascending: false }).limit(5)
        ]);

        const activities: any[] = [];
        teachers.data?.forEach(t => activities.push({ type: 'teacher', name: t.full_name, date: t.created_at }));
        studios.data?.forEach(s => activities.push({ type: 'studio', name: s.fantasy_name, date: s.created_at }));
        dealsData.data?.forEach(d => activities.push({ type: 'deal', name: d.company_name || d.contact_name, date: d.created_at }));
        setRecentChanges(activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8));

    } catch (e) {
        console.error(e);
    } finally {
        setIsOverviewLoading(false);
    }
  };

  useEffect(() => {
    jobsRef.current = jobs; 
  }, [jobs]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => runAllActiveJobs(), CHECK_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); 

  const runAllActiveJobs = () => {
    const currentJobs = jobsRef.current;
    const now = new Date();
    const jobsToRun = currentJobs.filter(j => {
        if (!j.active || !j.sheetUrl || j.status === 'syncing') return false;
        if (!j.lastSync) return true;
        const diffMs = now.getTime() - new Date(j.lastSync).getTime();
        return (diffMs / (1000 * 60)) >= (j.intervalMinutes || 5);
    });
    jobsToRun.forEach(job => performJobSync(job));
  };

  const performJobSync = async (job: SyncJob) => {
    if (!job.sheetUrl) return;
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'syncing', lastMessage: 'Iniciando ciclo...' } : j));
    try {
        const controller = new AbortController();
        const separator = job.sheetUrl.includes('?') ? '&' : '?';
        const fetchUrlWithCache = `${job.sheetUrl}${separator}_t=${Date.now()}`;
        const response = await fetch(fetchUrlWithCache, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        let parsed: FileData;
        try {
            const file = new File([blob], "temp_sync.xlsx", { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            parsed = await parseExcelFile(file);
        } catch (excelError) {
            const text = await blob.text();
            const file = new File([text], "temp_sync.csv", { type: 'text/csv' });
            parsed = await parseCsvFile(file);
        }
        const client = createSupabaseClient(job.config.url, job.config.key);
        await clearTableData(client, job.config.tableName, job.config.primaryKey || 'id');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await batchUploadData(client, job.config, parsed.data, () => {});
        
        // ATUALIZA NO BANCO
        const lastSync = new Date().toISOString();
        const lastMsg = `Ciclo Completo: ${parsed.rowCount} linhas.`;
        await appBackend.updateJobStatus(job.id, 'success', lastSync, lastMsg);

        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'success', lastSync: lastSync, lastMessage: lastMsg } : j));
    } catch (e: any) {
        const lastSync = new Date().toISOString();
        await appBackend.updateJobStatus(job.id, 'error', lastSync, e.message);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'error', lastSync: lastSync, lastMessage: e.message } : j));
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
      
      if (selectedEntity !== 'generic') {
          const mapping: Record<string, { table: string, pk: string }> = {
              collaborators: { table: 'crm_collaborators', pk: 'email' },
              instructors: { table: 'crm_teachers', pk: 'email' },
              students: { table: 'crm_deals', pk: 'email' },
              franchises: { table: 'crm_franchises', pk: 'cnpj' },
              studios: { table: 'crm_partner_studios', pk: 'email' },
          };
          const info = mapping[selectedEntity];
          if (info) {
              setConfig(prev => ({
                  ...prev,
                  tableName: info.table,
                  primaryKey: info.pk
              }));
          }
      } else if (!config.tableName && files.length > 0) {
          setConfig(prev => ({ 
              ...prev, 
              tableName: files[0].name.replace(/\.(csv|xlsx)$/i, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() 
          }));
      }

      setStep(AppStep.CONFIG);
      setStatus('idle');
    } catch (e: any) { 
        setErrorMessage(e.message); 
        setStatus('error'); 
    }
  };

  const handleCreateConnection = async () => {
      setErrorMessage(null);
      const isAutoSync = !!tempSheetUrl;
      const creator = currentCollaborator ? currentCollaborator.name : (session?.user?.email || 'Super Admin');
      
      try {
          if (!isAutoSync) {
              setStatus('uploading');
              const client = createSupabaseClient(config.url, config.key);
              const allData = filesData.flatMap(f => f.data);
              if (allData.length > 0) {
                  await batchUploadData(client, config, allData, () => {});
              }
          }
          
          const newJob: SyncJob = { 
              id: crypto.randomUUID(), 
              name: config.tableName || "Nova Conexão", 
              sheetUrl: tempSheetUrl || "", 
              config: { ...config }, 
              active: isAutoSync, 
              status: isAutoSync ? 'idle' : 'success', 
              lastSync: isAutoSync ? null : new Date().toISOString(), 
              lastMessage: isAutoSync ? 'Aguardando sincronização...' : `Upload manual completo.`, 
              intervalMinutes: config.intervalMinutes || 5,
              createdBy: creator,
              createdAt: new Date().toISOString()
          };

          // SALVA NO BANCO
          await appBackend.saveSyncJob(newJob);
          
          setJobs(prev => [...prev, newJob]);
          setStep(AppStep.DASHBOARD);
          setDashboardTab('global_settings'); // Redireciona para onde as conexões agora vivem
          setStatus('idle');
          if (isAutoSync) setTimeout(() => performJobSync(newJob), 500);
      } catch (e: any) { 
          console.error("Erro no processo de conexão:", e);
          setErrorMessage(`Falha no processamento: ${e.message}`); 
          setStatus('error'); 
          // Scroll to top to show error
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleDeleteJob = async (id: string) => {
      if (window.confirm("Excluir esta conexão do banco de dados?")) {
          await appBackend.deleteSyncJob(id);
          setJobs(prev => prev.filter(j => j.id !== id));
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
          <div className="mt-8 opacity-20"><img src={DEFAULT_LOGO} alt="VOLL" className="h-8 grayscale" /></div>
      </div>
  );

  if (publicCertificateHash) return <CertificateViewer hash={publicCertificateHash} />;
  if (publicContract) return <ContractSigning contract={publicContract} />;
  if (publicForm) return <div className="min-h-screen bg-slate-50"><FormViewer form={publicForm} isPublic={true} /></div>;
  
  if (isLoadingSession) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-teal-600" size={40} /></div>;

  if (!session && !currentInstructor && !currentStudent && !currentCollaborator && !currentStudio) {
      return <LoginPanel 
        onInstructorLogin={s => {setCurrentInstructor(s); sessionStorage.setItem('instructor_session', JSON.stringify(s));}} 
        onStudentLogin={s => {setCurrentStudent(s); sessionStorage.setItem('student_session', JSON.stringify(s));}} 
        onCollaboratorLogin={s => {setCurrentCollaborator(s); sessionStorage.setItem('collaborator_session', JSON.stringify(s));}}
        onStudioLogin={s => {setCurrentStudio(s); sessionStorage.setItem('studio_session', JSON.stringify(s));}}
      />;
  }
  if (currentInstructor) return <InstructorArea instructor={currentInstructor} onLogout={handleLogout} />;
  if (currentStudent) return <StudentArea student={currentStudent} onLogout={handleLogout} />;
  if (currentStudio) return <PartnerStudioArea studio={currentStudio} onLogout={handleLogout} />;

  const currentUserName = currentCollaborator ? currentCollaborator.name : (session?.user?.email || 'Super Admin');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {step !== AppStep.DASHBOARD ? (
        <div className="max-w-4xl mx-auto py-8 px-4">
             <div className="flex items-center justify-between mb-8">
                <button onClick={() => setStep(AppStep.DASHBOARD)} className="text-slate-500 hover:text-teal-600 flex items-center gap-2 font-medium">
                    <ArrowLeft size={20} /> Cancelar e Voltar
                </button>
                <img src={appLogo} alt="VOLL" className="h-8 max-w-[150px] object-contain" />
             </div>
             <StepIndicator currentStep={step} />

             {errorMessage && (
                <div className="mb-6 animate-in slide-in-from-top-2">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-800">Erro na Operação</p>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">{errorMessage}</p>
                            <div className="mt-3 flex items-center gap-4">
                                <button onClick={() => setErrorMessage(null)} className="text-[10px] font-black uppercase text-red-600 hover:underline">Dispensar</button>
                                <button onClick={() => { setErrorMessage(null); handleCreateConnection(); }} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">Tentar Novamente</button>
                            </div>
                        </div>
                    </div>
                </div>
             )}

             <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 min-h-[400px]">
                {step === AppStep.UPLOAD && <UploadPanel onFilesSelected={handleFilesSelected} onUrlConfirmed={setTempSheetUrl} onEntitySelected={setSelectedEntity} isLoading={status === 'parsing'} />}
                {step === AppStep.CONFIG && <ConfigPanel config={config} setConfig={setConfig} onNext={() => setStep(AppStep.PREVIEW)} onBack={() => setStep(AppStep.UPLOAD)} currentCreatorName={currentUserName} />}
                {step === AppStep.PREVIEW && <PreviewPanel files={filesData} tableName={config.tableName} config={config} onUpdateFiles={setFilesData} onUpdateConfig={setConfig} onSync={handleCreateConnection} onBack={() => setStep(AppStep.CONFIG)} onClearTable={async () => { const client = createSupabaseClient(config.url, config.key); await clearTableData(client, config.tableName, config.primaryKey || 'id'); }} />}
             </div>
             {step === AppStep.PREVIEW && (
                 <div className="mt-6 flex justify-end">
                     <button onClick={handleCreateConnection} disabled={status === 'uploading'} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all flex items-center gap-2">
                        {status === 'uploading' ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
                        {tempSheetUrl ? 'Confirmar Integração Automática' : 'Enviar Dados para o Banco'}
                     </button>
                 </div>
             )}
        </div>
      ) : (
        <>
            <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-20 shadow-sm">
                <div className="container mx-auto px-4 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setDashboardTab('overview')}>
                    <img src={appLogo} alt="Logo" className="h-10 w-auto max-w-[180px] object-contain" />
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100 uppercase tracking-wide">{currentCollaborator ? currentCollaborator.role.name : 'Super Admin'}</span>
                </div>
                <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1.5 font-medium transition-colors"><LogOut size={16} /> Sair</button>
                </div>
            </header>

            <main className={clsx("container mx-auto px-4 py-8", (dashboardTab === 'crm' || dashboardTab === 'whatsapp' || dashboardTab === 'twilio') && "max-w-full")}>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 min-h-[500px]">
                    <aside className="w-full md:w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm sticky top-24 flex flex-col h-full md:h-auto overflow-y-auto max-h-[85vh]">
                            <nav className="space-y-1">
                                {canAccess('overview') && <button onClick={() => setDashboardTab('overview')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'overview' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><LayoutDashboard size={18} /> Visão Geral</button>}
                                {canAccess('hr') && <button onClick={() => setDashboardTab('hr')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'hr' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Heart size={18} /> Recursos Humanos</button>}
                                {canAccess('crm') && <button onClick={() => setDashboardTab('crm')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'crm' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Kanban size={18} /> CRM Comercial</button>}
                                {canAccess('inventory') && <button onClick={() => setDashboardTab('inventory')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'inventory' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Package size={18} /> Controle de Estoque</button>}
                                {canAccess('twilio') && <button onClick={() => setDashboardTab('twilio')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'twilio' ? "bg-red-50 text-red-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><MessageSquare size={18} /> Twilio WhatsApp</button>}
                                {canAccess('whatsapp') && <button onClick={() => setDashboardTab('whatsapp')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'whatsapp' ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50")}><MessageCircle size={18} /> Atendimento (Meta)</button>}
                                {canAccess('analysis') && <button onClick={() => setDashboardTab('analysis')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'analysis' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><PieChart size={18} /> Análise de Vendas</button>}
                                {canAccess('forms') && <button onClick={() => setDashboardTab('forms')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'forms' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><FileText size={18} /> Formulários</button>}
                                {canAccess('surveys') && <button onClick={() => setDashboardTab('surveys')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'surveys' ? "bg-amber-50 text-amber-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><PieChart size={18} /> Pesquisas</button>}
                                {canAccess('contracts') && <button onClick={() => setDashboardTab('contracts')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'contracts' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><FileSignature size={18} /> Contratos</button>}
                                {canAccess('events') && <button onClick={() => setDashboardTab('events')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'events' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Mic size={18} /> Eventos</button>}
                                {canAccess('students') && <button onClick={() => setDashboardTab('students')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'students' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Users size={18} /> Alunos</button>}
                                {canAccess('certificates') && <button onClick={() => setDashboardTab('certificates')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'certificates' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Award size={18} /> Certificados</button>}
                                {canAccess('products') && <button onClick={() => setDashboardTab('products')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'products' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><ShoppingBag size={18} /> Produtos Digitais</button>}
                                {canAccess('franchises') && <button onClick={() => setDashboardTab('franchises')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'franchises' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Store size={18} /> Franquias</button>}
                                {canAccess('partner_studios') && <button onClick={() => setDashboardTab('partner_studios')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'partner_studios' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Building2 size={18} /> Studios Parceiros</button>}
                                {canAccess('classes') && <button onClick={() => setDashboardTab('classes')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'classes' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><GraduationCap size={18} /> Turmas</button>}
                                {canAccess('teachers') && <button onClick={() => setDashboardTab('teachers')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'teachers' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><School size={18} /> Professores</button>}
                            </nav>
                            {canAccess('global_settings') && <div className="mt-4 pt-4 border-t border-slate-100"><button onClick={() => setDashboardTab('global_settings')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", dashboardTab === 'global_settings' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}><Cog size={18} /> Configurações</button></div>}
                        </div>
                    </aside>

                    <div className="flex-1 min-w-0">
                        {dashboardTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <section className="bg-gradient-to-r from-teal-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-teal-900/20 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/30">
                                                <Sparkles size={24} className="text-teal-100" />
                                            </div>
                                            <span className="text-teal-100 text-xs font-black uppercase tracking-[0.2em]">Painel de Controle</span>
                                        </div>
                                        <h2 className="text-4xl font-black tracking-tight mb-2">
                                            Bem-vindo, <span className="text-teal-200">{currentUserName.split(' ')[0]}</span>!
                                        </h2>
                                        <p className="text-teal-50/80 text-lg max-w-xl leading-relaxed">
                                            Seu centro de comando está pronto. Visualize leads, gerencie turmas e acompanhe o crescimento da <strong>VOLL</strong> em tempo real.
                                        </p>
                                    </div>
                                </section>

                                {isOverviewLoading ? (
                                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                                ) : (
                                    <>
                                        <section className="space-y-4">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={14} /> Desempenho de Hoje</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={64} className="text-indigo-600" /></div>
                                                    <p className="text-sm font-medium text-slate-500 mb-1">Novos Leads (Dia)</p>
                                                    <h4 className="text-3xl font-black text-slate-800">{overviewStats.leadsToday}</h4>
                                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase"><Clock size={10} /> Atualizado agora</div>
                                                </div>
                                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle size={64} className="text-green-600" /></div>
                                                    <p className="text-sm font-medium text-slate-500 mb-1">Vendas Fechadas (Dia)</p>
                                                    <h4 className="text-3xl font-black text-slate-800">{overviewStats.salesToday}</h4>
                                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase"><TrendingUp size={10} /> Batendo meta</div>
                                                </div>
                                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={64} className="text-emerald-600" /></div>
                                                    <p className="text-sm font-medium text-slate-500 mb-1">Faturamento (Dia)</p>
                                                    <h4 className="text-3xl font-black text-emerald-600">{formatCurrency(overviewStats.revenueToday)}</h4>
                                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase"><Activity size={10} /> Em tempo real</div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={14} /> Resumo da Semana</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
                                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={64} className="text-white" /></div>
                                                    <p className="text-sm font-medium text-slate-400 mb-1">Total de Leads (7d)</p>
                                                    <h4 className="text-3xl font-black text-white">{overviewStats.leadsWeek}</h4>
                                                    <p className="text-xs text-slate-500 mt-2">Últimos 7 dias corridos</p>
                                                </div>
                                                <div className="bg-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
                                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle size={64} className="text-white" /></div>
                                                    <p className="text-sm font-medium text-slate-400 mb-1">Vendas Fechadas (7d)</p>
                                                    <h4 className="text-3xl font-black text-white">{overviewStats.salesWeek}</h4>
                                                    <p className="text-xs text-slate-500 mt-2">Volume de conversão</p>
                                                </div>
                                                <div className="bg-teal-600 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
                                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={64} className="text-white" /></div>
                                                    <p className="text-sm font-medium text-teal-100 mb-1">Faturamento Total (7d)</p>
                                                    <h4 className="text-3xl font-black text-white">{formatCurrency(overviewStats.revenueWeek)}</h4>
                                                    <p className="text-xs text-teal-200 mt-2">Total consolidado</p>
                                                </div>
                                            </div>
                                        </section>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <section className="space-y-4">
                                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14} /> Últimas Alterações</h3>
                                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                    {recentChanges.length === 0 ? (
                                                        <div className="p-10 text-center text-slate-400 text-sm">Sem atividades recentes.</div>
                                                    ) : (
                                                        <div className="divide-y divide-slate-100">
                                                            {recentChanges.map((activity, idx) => (
                                                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border", activity.type === 'teacher' ? "bg-orange-50 border-orange-100 text-orange-600" : activity.type === 'studio' ? "bg-teal-50 border-teal-100 text-teal-600" : "bg-indigo-50 border-indigo-100 text-indigo-600")}>{activity.type === 'teacher' ? <School size={18} /> : activity.type === 'studio' ? <Building2 size={18} /> : <Target size={18} />}</div>
                                                                        <div><p className="text-sm font-bold text-slate-800">{activity.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Novo {activity.type === 'teacher' ? 'Instrutor' : activity.type === 'studio' ? 'Studio' : 'Lead'} Cadastrado</p></div>
                                                                    </div>
                                                                    <div className="text-right shrink-0"><p className="text-xs font-medium text-slate-500">{new Date(activity.date).toLocaleDateString()}</p><p className="text-[10px] text-slate-400">{new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="p-3 bg-slate-50 text-center border-t border-slate-100"><button onClick={() => setDashboardTab('crm')} className="text-xs font-bold text-indigo-600 hover:underline">Ver todas as atividades do CRM</button></div>
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard size={14} /> Atalhos Rápidos</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div onClick={() => setDashboardTab('crm')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Kanban size={24} /></div><h4 className="font-bold text-slate-800 mb-1">CRM</h4><p className="text-xs text-slate-500">Gestão Comercial.</p></div>
                                                    <div onClick={() => setDashboardTab('inventory')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group"><div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors"><Package size={24} /></div><h4 className="font-bold text-slate-800 mb-1">Estoque</h4><p className="text-xs text-slate-500">Materiais e Logística.</p></div>
                                                    <div onClick={() => setDashboardTab('hr')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group"><div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-600 group-hover:text-white transition-colors"><Heart size={24} /></div><h4 className="font-bold text-slate-800 mb-1">RH</h4><p className="text-xs text-slate-500">Painel Executivo.</p></div>
                                                    <div onClick={() => setDashboardTab('teachers')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group"><div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors"><School size={24} /></div><h4 className="font-bold text-slate-800 mb-1">Instrutores</h4><p className="text-xs text-slate-500">Gestão docente.</p></div>
                                                </div>
                                            </section>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {dashboardTab === 'hr' && <HrDashboard collaborators={allCollaborators} onEditCollaborator={(c) => { setDashboardTab('hr'); /* Isso agora será tratado internamente pelo HrDashboard */ }} />}
                        {dashboardTab === 'inventory' && <InventoryManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'crm' && <div className="h-full"><CrmBoard /></div>}
                        {dashboardTab === 'classes' && <ClassesManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'teachers' && <TeachersManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'franchises' && <FranchisesManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'partner_studios' && <PartnerStudiosManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'forms' && <FormsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'surveys' && <SurveyManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'contracts' && <ContractsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'certificates' && <CertificatesManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'products' && <ProductsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'students' && <StudentsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'events' && <EventsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'global_settings' && <SettingsManager onLogoChange={handleLogoChange} currentLogo={appLogo} jobs={jobs} onStartWizard={handleStartWizard} onDeleteJob={handleDeleteJob} />}
                        {dashboardTab === 'analysis' && <SalesAnalysis />}
                        {dashboardTab === 'whatsapp' && <WhatsAppInbox />}
                        {dashboardTab === 'twilio' && <TwilioInbox />}
                    </div>
                </div>
            </main>
        </>
      )}
    </div>
  );
}

export default App;
