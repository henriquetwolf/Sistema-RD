
import React, { useState, useEffect, useRef } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { ConfigPanel } from './components/ConfigPanel';
import { UploadPanel } from './components/UploadPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { LoginPanel } from './components/LoginPanel';
import { IntegrationHelp } from './components/IntegrationHelp';
import { TableViewer } from './components/TableViewer';
import { CrmBoard } from './components/CrmBoard'; 
import { CollaboratorsManager } from './components/CollaboratorsManager';
import { ClassesManager } from './components/ClassesManager';
import { TeachersManager, Teacher } from './components/TeachersManager';
import { FormsManager } from './components/FormsManager';
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
import { CertificateViewer } from './components/CertificateViewer'; 
import { EventsManager } from './components/EventsManager';
import { WhatsAppInbox } from './components/WhatsAppInbox'; 
import { SupabaseConfig, FileData, AppStep, UploadStatus, SyncJob, FormModel, Contract, StudentSession, CollaboratorSession } from './types';
import { parseCsvFile } from './utils/csvParser';
import { parseExcelFile } from './utils/excelParser';
import { createSupabaseClient, batchUploadData, clearTableData } from './services/supabaseService';
import { appBackend } from './services/appBackend';
import { 
  CheckCircle, AlertTriangle, Loader2, Database, LogOut, 
  Plus, Play, Pause, Trash2, ExternalLink, Activity, Clock, FileInput, HelpCircle, HardDrive,
  LayoutDashboard, Settings, BarChart3, ArrowRight, Table, Kanban,
  Users, GraduationCap, School, TrendingUp, Calendar, DollarSign, Filter, FileText, ArrowLeft, Cog, PieChart,
  FileSignature, ShoppingBag, Store, Award, Mic, MessageCircle, Briefcase
} from 'lucide-react';
import clsx from 'clsx';

function App() {
  // Public Form/Contract/Certificate State (Before Auth Check)
  const [publicForm, setPublicForm] = useState<FormModel | null>(null);
  const [publicContract, setPublicContract] = useState<Contract | null>(null);
  const [publicCertificateHash, setPublicCertificateHash] = useState<string | null>(null);
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  // App Settings State
  const DEFAULT_LOGO = "https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png";
  const [appLogo, setAppLogo] = useState<string>(DEFAULT_LOGO);

  // Wrapper to handle logo changes safely (handling nulls)
  const handleLogoChange = (newLogo: string | null) => {
      setAppLogo(newLogo || DEFAULT_LOGO);
  };

  // Auth State (Admin / Superuser)
  const [session, setSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  
  // Instructor Auth State
  const [currentInstructor, setCurrentInstructor] = useState<Teacher | null>(null);
  
  // Student Auth State
  const [currentStudent, setCurrentStudent] = useState<StudentSession | null>(null);

  // Collaborator Auth State (RBAC)
  const [currentCollaborator, setCurrentCollaborator] = useState<CollaboratorSession | null>(null);

  // Dashboard State (Persisted Jobs)
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const jobsRef = useRef<SyncJob[]>([]); // Ref to access latest jobs inside interval without resetting it
  
  // Dashboard UI State
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'settings' | 'tables' | 'crm' | 'analysis' | 'collaborators' | 'classes' | 'teachers' | 'forms' | 'contracts' | 'products' | 'franchises' | 'certificates' | 'students' | 'events' | 'global_settings' | 'whatsapp'>('overview');

  // Sales Widget State
  const [salesDateRange, setSalesDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // 1st of current month
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [salesStats, setSalesStats] = useState({ totalValue: 0, count: 0, deals: [] as any[] });
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // Wizard/Creation State
  const [step, setStep] = useState<AppStep>(AppStep.DASHBOARD);
  const [config, setConfig] = useState<SupabaseConfig>({ url: '', key: '', tableName: '', primaryKey: '', intervalMinutes: 5 });
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [tempSheetUrl, setTempSheetUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UI State
  const [showHelp, setShowHelp] = useState(false);

  // Sync Timer Ref
  const intervalRef = useRef<number | null>(null);
  // CHECK FREQUENCY: Run the check loop every 1 minute.
  const CHECK_INTERVAL_MS = 60 * 1000; 

  // --- INIT & AUTH ---
  useEffect(() => {
    const initApp = async () => {
        // Load Custom Logo
        const savedLogo = appBackend.getAppLogo();
        if (savedLogo) {
            setAppLogo(savedLogo);
        }

        // 1. Check for Public URL Params (Forms & Contracts)
        const params = new URLSearchParams(window.location.search);
        const publicFormId = params.get('publicFormId');
        const contractId = params.get('contractId');
        const certificateHash = params.get('certificateHash'); // New

        if (publicFormId || contractId || certificateHash) {
            setIsPublicLoading(true);
            try {
                if (publicFormId) {
                    const form = await appBackend.getFormById(publicFormId);
                    if (form) setPublicForm(form);
                } else if (contractId) {
                    const contract = await appBackend.getContractById(contractId);
                    if (contract) setPublicContract(contract);
                } else if (certificateHash) {
                    setPublicCertificateHash(certificateHash);
                }
            } catch (e) {
                console.error("Error loading public asset", e);
            }
            setIsPublicLoading(false);
            return; // Stop if public mode
        }

        // 2. Load Jobs from LocalStorage
        const savedJobs = localStorage.getItem('csv_syncer_jobs');
        if (savedJobs) {
            try {
                const parsed = JSON.parse(savedJobs);
                const fixed = parsed.map((j: any) => ({
                    ...j,
                    lastSync: j.lastSync ? new Date(j.lastSync) : null,
                    status: j.status === 'syncing' ? 'idle' : j.status,
                    lastMessage: j.status === 'syncing' ? 'Sincronização interrompida' : j.lastMessage,
                    intervalMinutes: j.intervalMinutes || 5 
                }));
                setJobs(fixed);
            } catch (e) {
                console.error("Failed to load saved jobs", e);
            }
        }

        // 3. Check Auth (Admin)
        appBackend.auth.getSession().then((s) => {
            setSession(s);
            setIsLoadingSession(false);
        });
        
        // 4. Check Auth (Instructor)
        const savedInstructor = sessionStorage.getItem('instructor_session');
        if (savedInstructor) {
            try {
                setCurrentInstructor(JSON.parse(savedInstructor));
            } catch (e) {}
        }

        // 5. Check Auth (Student)
        const savedStudent = sessionStorage.getItem('student_session');
        if (savedStudent) {
            try {
                setCurrentStudent(JSON.parse(savedStudent));
            } catch (e) {}
        }

        // 6. Check Auth (Collaborator)
        const savedCollaborator = sessionStorage.getItem('collaborator_session');
        if (savedCollaborator) {
            try {
                setCurrentCollaborator(JSON.parse(savedCollaborator));
            } catch (e) {}
        }
    };

    initApp();

    const { data: { subscription } } = appBackend.auth.onAuthStateChange((s) => {
      setSession(s);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- SAVE JOBS & UPDATE REF ---
  useEffect(() => {
    jobsRef.current = jobs; // Keep ref updated
    localStorage.setItem('csv_syncer_jobs', JSON.stringify(jobs));
  }, [jobs]);

  // --- GLOBAL SYNC LOOP ---
  useEffect(() => {
    // Clear existing
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Setup new loop - independent of 'jobs' state changes thanks to ref
    intervalRef.current = window.setInterval(() => {
       runAllActiveJobs();
    }, CHECK_INTERVAL_MS);

    return () => {
       if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // Run once on mount

  // --- FETCH SALES DATA (WIDGET) ---
  useEffect(() => {
      if (dashboardTab === 'overview' && !publicForm && !publicContract && !publicCertificateHash && !currentInstructor && !currentStudent) {
          fetchSalesData();
      }
  }, [dashboardTab, salesDateRange, publicForm, publicContract, publicCertificateHash, currentInstructor, currentStudent]);

  const fetchSalesData = async () => {
      setIsLoadingSales(true);
      try {
          // Add end of day time to the end date
          const endDateTime = new Date(salesDateRange.end);
          endDateTime.setHours(23, 59, 59, 999);

          const { data, error } = await appBackend.client
              .from('crm_deals')
              .select('*')
              .eq('stage', 'closed')
              .gte('closed_at', salesDateRange.start)
              .lte('closed_at', endDateTime.toISOString())
              .order('closed_at', { ascending: false });

          if (error) {
              // Fallback logic kept from original file
              if (error.code === '42703') {
                  const { data: fallbackData } = await appBackend.client
                      .from('crm_deals')
                      .select('*')
                      .eq('stage', 'closed')
                      .gte('created_at', salesDateRange.start)
                      .lte('created_at', endDateTime.toISOString())
                      .order('created_at', { ascending: false });

                   const deals = fallbackData || [];
                   const total = deals.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
                   setSalesStats({ totalValue: total, count: deals.length, deals });
              } else {
                  setSalesStats({ totalValue: 0, count: 0, deals: [] });
              }
          } else {
              const deals = data || [];
              const total = deals.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
              setSalesStats({ totalValue: total, count: deals.length, deals });
          }
      } catch (e: any) {
          console.error("Exceção ao buscar dados:", e.message);
      } finally {
          setIsLoadingSales(false);
      }
  };

  const runAllActiveJobs = () => {
    const currentJobs = jobsRef.current;
    const now = new Date();

    const jobsToRun = currentJobs.filter(j => {
        if (!j.active || !j.sheetUrl || j.status === 'syncing') return false;
        
        if (!j.lastSync) return true;

        const diffMs = now.getTime() - new Date(j.lastSync).getTime();
        const diffMinutes = diffMs / (1000 * 60);

        return diffMinutes >= (j.intervalMinutes || 5);
    });

    jobsToRun.forEach(job => {
        performJobSync(job);
    });
  };

  const performJobSync = async (job: SyncJob) => {
    // ... (Existing sync logic kept identical)
    // For brevity in this response, omitting detailed sync logic unless it changed
    // Assuming same implementation as original file
    if (!job.sheetUrl) return;

    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'syncing', lastMessage: 'Iniciando ciclo...' } : j));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const separator = job.sheetUrl.includes('?') ? '&' : '?';
        const fetchUrlWithCache = `${job.sheetUrl}${separator}_t=${Date.now()}`;
        
        let response;
        try {
            response = await fetch(fetchUrlWithCache, { signal: controller.signal });
            if (!response.ok) throw new Error('Direct fetch failed');
        } catch (directError) {
             const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fetchUrlWithCache)}`;
             response = await fetch(proxyUrl, { signal: controller.signal });
        }
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        if (blob.type.includes('text/html')) {
            throw new Error("O link retornou HTML/Login. Verifique permissões.");
        }

        let parsed: FileData;
        try {
            const file = new File([blob], "temp_sync.xlsx", { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            parsed = await parseExcelFile(file);
        } catch (excelError) {
            try {
                const text = await blob.text();
                if (text.trim().startsWith('<') || text.includes('<!DOCTYPE html')) {
                     throw new Error("Conteúdo inválido.");
                }
                const file = new File([text], "temp_sync.csv", { type: 'text/csv' });
                parsed = await parseCsvFile(file);
            } catch (csvError) {
                throw new Error("Falha ao processar arquivo: Não é um CSV nem um Excel válido.");
            }
        }

        const client = createSupabaseClient(job.config.url, job.config.key);

        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, lastMessage: 'Limpando tabela...' } : j));
        
        const targetColumn = job.config.primaryKey || (parsed.headers.length > 0 ? parsed.headers[0] : 'id');
        await clearTableData(client, job.config.tableName, targetColumn);

        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, lastMessage: 'Aguardando 60s...' } : j));
        
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        if (controller.signal.aborted) throw new Error("Tempo limite excedido.");

        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, lastMessage: 'Enviando dados...' } : j));
        await batchUploadData(client, job.config, parsed.data, () => {});

        clearTimeout(timeoutId);

        setJobs(prev => prev.map(j => j.id === job.id ? { 
            ...j, 
            status: 'success', 
            lastSync: new Date(),
            lastMessage: `Ciclo Completo: ${parsed.rowCount} linhas.`
        } : j));

    } catch (e: any) {
        console.error(`Job ${job.name} failed`, e);
        let msg = e.message || "Erro desconhecido";
        if (e.name === 'AbortError') msg = "Timeout (120s) excedido";
        
        setJobs(prev => prev.map(j => j.id === job.id ? { 
            ...j, 
            status: 'error', 
            lastSync: new Date(),
            lastMessage: msg
        } : j));
    }
  };


  // --- WIZARD HANDLERS ---
  const handleStartWizard = () => {
    setStep(AppStep.UPLOAD);
    setFilesData([]);
    setConfig({ url: '', key: '', tableName: '', primaryKey: '', intervalMinutes: 5 });
    setTempSheetUrl(null);
    setErrorMessage(null);
  };

  const handleFilesSelected = async (files: File[]) => {
    setStatus('parsing');
    try {
      const parsedFiles = await Promise.all(files.map(file => {
          if (file.name.endsWith('.xlsx')) {
              return parseExcelFile(file);
          } else {
              return parseCsvFile(file);
          }
      }));

      // Check for consistency in columns
      if (parsedFiles.length > 1) {
          const normalize = (headers: string[]) => headers.map(h => h.trim().toLowerCase()).sort().join(',');
          const refHeaders = normalize(parsedFiles[0].headers);
          
          const inconsistentFile = parsedFiles.find(f => normalize(f.headers) !== refHeaders);
          if (inconsistentFile) {
              throw new Error(`Erro de Formatação: O arquivo "${inconsistentFile.fileName}" tem colunas diferentes do primeiro arquivo. Para upload em lote, todos devem ter o mesmo cabeçalho.`);
          }
      }

      setFilesData(parsedFiles);
      
      if (!config.tableName && files.length > 0) {
          const suggestedName = files[0].name
            .replace(/\.(csv|xlsx)$/i, '')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .toLowerCase();
          setConfig(prev => ({ ...prev, tableName: suggestedName }));
      }
      setStep(AppStep.CONFIG);
      setStatus('idle');
    } catch (e: any) {
      setErrorMessage(e.message);
      setStatus('error');
    }
  };

  const handleCreateConnection = async () => {
      // ... (Existing implementation)
      const isAutoSync = !!tempSheetUrl;

      if (!isAutoSync) {
          setStatus('uploading');
          setErrorMessage(null);

          try {
             const client = createSupabaseClient(config.url, config.key);
             const allData = filesData.flatMap(f => f.data);
             
             if (allData.length > 0) {
                 await batchUploadData(client, config, allData, () => {});
             }
          } catch (e: any) {
              console.error(e);
              setErrorMessage(`Erro ao enviar dados: ${e.message}`);
              setStatus('error');
              return; 
          }
      }

      const rowCount = filesData.reduce((acc, f) => acc + f.rowCount, 0);

      const newJob: SyncJob = {
          id: crypto.randomUUID(),
          name: config.tableName || "Nova Conexão",
          sheetUrl: tempSheetUrl || "",
          config: { ...config },
          active: isAutoSync,
          status: isAutoSync ? 'idle' : 'success',
          lastSync: isAutoSync ? null : new Date(),
          lastMessage: isAutoSync ? 'Aguardando primeira sincronização...' : `Upload manual: ${rowCount} linhas.`,
          intervalMinutes: config.intervalMinutes || 5
      };

      setJobs(prev => [...prev, newJob]);
      setStep(AppStep.DASHBOARD);
      setDashboardTab('settings');
      setStatus('idle');
      
      if (isAutoSync) {
         setTimeout(() => performJobSync(newJob), 500);
      }
  };

  // --- JOB ACTIONS ---
  const toggleJob = (id: string) => {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, active: !j.active } : j));
  };

  const deleteJob = (id: string) => {
      const confirmed = window.confirm("Tem certeza que deseja remover esta conexão?");
      if(confirmed) {
          setJobs(prev => prev.filter(j => j.id !== id));
      }
  };

  const handleManualSync = (id: string) => {
      const job = jobs.find(j => j.id === id);
      if (job && job.sheetUrl) performJobSync(job);
  };

  const handleLogout = async () => {
    if (currentInstructor) {
        setCurrentInstructor(null);
        sessionStorage.removeItem('instructor_session');
    } else if (currentStudent) {
        setCurrentStudent(null);
        sessionStorage.removeItem('student_session');
    } else if (currentCollaborator) {
        setCurrentCollaborator(null);
        sessionStorage.removeItem('collaborator_session');
    } else {
        await appBackend.auth.signOut();
    }
  };

  const handleInstructorLogin = (teacher: Teacher) => {
      setCurrentInstructor(teacher);
      sessionStorage.setItem('instructor_session', JSON.stringify(teacher));
  };

  const handleStudentLogin = (student: StudentSession) => {
      setCurrentStudent(student);
      sessionStorage.setItem('student_session', JSON.stringify(student));
  };

  const handleCollaboratorLogin = (collab: CollaboratorSession) => {
      setCurrentCollaborator(collab);
      sessionStorage.setItem('collaborator_session', JSON.stringify(collab));
  };

  const getIntervalLabel = (minutes: number) => {
      if (minutes >= 1440) return '24h';
      if (minutes >= 60) return `${Math.floor(minutes / 60)}h`;
      return `${minutes}min`;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- ACCESS CONTROL CHECKER ---
  const canAccess = (module: string): boolean => {
      if (session) return true; // Super Admin has access to everything
      if (currentCollaborator) {
          // Check permissions JSON in role
          return !!currentCollaborator.role.permissions[module];
      }
      return false;
  };

  // --- RENDER ---
  
  // 1. Check for Public Mode FIRST
  if (isPublicLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-teal-600" size={40} /></div>;
  
  if (publicCertificateHash) return <CertificateViewer hash={publicCertificateHash} />;
  if (publicContract) return <ContractSigning contract={publicContract} />;
  if (publicForm) return <div className="min-h-screen bg-slate-50"><FormViewer form={publicForm} isPublic={true} /></div>;

  // 2. Check for Auth Loading
  if (isLoadingSession) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-teal-600" size={40} /></div>;
  
  // 3. Check for Session (Either Admin, Instructor, Student or Collaborator)
  if (!session && !currentInstructor && !currentStudent && !currentCollaborator) {
      return (
        <LoginPanel 
            onInstructorLogin={handleInstructorLogin} 
            onStudentLogin={handleStudentLogin}
            onCollaboratorLogin={handleCollaboratorLogin}
        />
      );
  }

  // 4. INSTRUCTOR AREA
  if (currentInstructor) {
      return <InstructorArea instructor={currentInstructor} onLogout={handleLogout} />;
  }

  // 5. STUDENT AREA
  if (currentStudent) {
      return <StudentArea student={currentStudent} onLogout={handleLogout} />;
  }

  // 6. ADMIN / COLLABORATOR AREA
  const isLocalMode = session?.user?.id === 'local-user';
  const currentUserTitle = currentCollaborator ? currentCollaborator.role.name : 'Super Admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      <IntegrationHelp isOpen={showHelp} onClose={() => setShowHelp(false)} config={config} />

      {/* RENDER STEP CONTENT (WIZARD) OR DASHBOARD */}
      {step !== AppStep.DASHBOARD ? (
        <div className="max-w-4xl mx-auto py-8 px-4">
             {/* ... (Wizard code same as before) ... */}
             <div className="flex items-center justify-between mb-8">
                <button onClick={() => setStep(AppStep.DASHBOARD)} className="text-slate-500 hover:text-teal-600 flex items-center gap-2 font-medium">
                    <ArrowLeft size={20} /> Cancelar e Voltar
                </button>
                <div className="flex items-center gap-2">
                    <img src={appLogo} alt="VOLL" className="h-8 max-w-[150px] object-contain" />
                </div>
             </div>

             <StepIndicator currentStep={step} />
             
             <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 min-h-[400px]">
                {step === AppStep.UPLOAD && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-800">Importação de Dados</h2>
                            <p className="text-slate-500">Faça upload de arquivos CSV ou Excel para sincronizar com o Supabase.</p>
                        </div>
                        {errorMessage && (
                            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-2 text-sm border border-red-100">
                                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold block mb-1">Erro na validação:</span>
                                    {errorMessage}
                                </div>
                            </div>
                        )}
                        <UploadPanel 
                            onFilesSelected={handleFilesSelected} 
                            onUrlConfirmed={(url) => setTempSheetUrl(url)}
                            isLoading={status === 'parsing'}
                        />
                    </div>
                )}

                {step === AppStep.CONFIG && (
                    <ConfigPanel 
                        config={config} 
                        setConfig={setConfig} 
                        onNext={() => setStep(AppStep.PREVIEW)}
                        onBack={() => setStep(AppStep.UPLOAD)}
                    />
                )}

                {step === AppStep.PREVIEW && (
                    <PreviewPanel 
                        files={filesData}
                        tableName={config.tableName}
                        config={config}
                        onUpdateFiles={setFilesData}
                        onUpdateConfig={setConfig}
                        onSync={handleCreateConnection}
                        onBack={() => setStep(AppStep.CONFIG)}
                        onClearTable={async () => {
                            const client = createSupabaseClient(config.url, config.key);
                            await clearTableData(client, config.tableName, config.primaryKey || 'id');
                        }}
                    />
                )}
             </div>

             {step === AppStep.PREVIEW && (
                 <div className="mt-6 flex justify-end">
                     <button
                        onClick={handleCreateConnection}
                        disabled={status === 'uploading'}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                     >
                        {status === 'uploading' ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
                        {tempSheetUrl ? 'Confirmar Integração Automática' : 'Enviar Dados para o Banco'}
                     </button>
                 </div>
             )}
        </div>
      ) : (
        <>
            {/* --- DASHBOARD HEADER --- */}
            <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-20 shadow-sm">
                <div className="container mx-auto px-4 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep(AppStep.DASHBOARD)}>
                    <img src={appLogo} alt="Logo" className="h-10 w-auto max-w-[180px] object-contain" />
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100 uppercase tracking-wide">
                        {currentUserTitle}
                    </span>
                    {isLocalMode && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-mono rounded border border-slate-200 flex items-center gap-1">
                            <HardDrive size={10} /> LOCAL
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowHelp(true)}
                        className="text-sm font-medium text-slate-500 hover:text-teal-600 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full hover:bg-teal-50 transition-colors"
                    >
                        <HelpCircle size={16} /> <span className="hidden sm:inline">Guia Power BI</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200"></div>
                    
                    <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1.5 font-medium transition-colors">
                        <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
                </div>
            </header>

            <main className={clsx("container mx-auto px-4", (dashboardTab === 'crm' || dashboardTab === 'whatsapp') ? "max-w-full py-4" : "py-8")}>
                
                {/* DASHBOARD LAYOUT */}
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 min-h-[500px]">
                    
                    {/* SIDEBAR NAVIGATION */}
                    <aside className={clsx("w-full md:w-64 flex-shrink-0", (dashboardTab === 'whatsapp') ? "hidden md:block" : "")}>
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm sticky top-24 flex flex-col h-full md:h-auto overflow-y-auto max-h-[85vh]">
                            <nav className="space-y-1">
                                {canAccess('overview') && (
                                    <button
                                        onClick={() => setDashboardTab('overview')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            (dashboardTab === 'overview') ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <LayoutDashboard size={18} />
                                        Visão Geral
                                    </button>
                                )}
                                {canAccess('crm') && (
                                    <button
                                        onClick={() => setDashboardTab('crm')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'crm' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Kanban size={18} />
                                        CRM Comercial
                                    </button>
                                )}
                                {canAccess('whatsapp') && (
                                    <button
                                        onClick={() => setDashboardTab('whatsapp')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'whatsapp' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <MessageCircle size={18} />
                                        Atendimento
                                    </button>
                                )}
                                {canAccess('analysis') && (
                                    <button
                                        onClick={() => setDashboardTab('analysis')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'analysis' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <PieChart size={18} />
                                        Análise de Vendas
                                    </button>
                                )}
                                {canAccess('forms') && (
                                    <button
                                        onClick={() => setDashboardTab('forms')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'forms' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <FileText size={18} />
                                        Formulários
                                    </button>
                                )}
                                {canAccess('contracts') && (
                                    <button
                                        onClick={() => setDashboardTab('contracts')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'contracts' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <FileSignature size={18} />
                                        Contratos
                                    </button>
                                )}
                                {canAccess('events') && (
                                    <button
                                        onClick={() => setDashboardTab('events')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'events' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Mic size={18} />
                                        Eventos
                                    </button>
                                )}
                                {canAccess('students') && (
                                    <button
                                        onClick={() => setDashboardTab('students')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'students' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Users size={18} />
                                        Alunos
                                    </button>
                                )}
                                {canAccess('certificates') && (
                                    <button
                                        onClick={() => setDashboardTab('certificates')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'certificates' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Award size={18} />
                                        Certificados
                                    </button>
                                )}
                                {canAccess('products') && (
                                    <button
                                        onClick={() => setDashboardTab('products')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'products' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <ShoppingBag size={18} />
                                        Produtos Digitais
                                    </button>
                                )}
                                {canAccess('franchises') && (
                                    <button
                                        onClick={() => setDashboardTab('franchises')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'franchises' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Store size={18} />
                                        Franquias
                                    </button>
                                )}
                                {canAccess('collaborators') && (
                                    <button
                                        onClick={() => setDashboardTab('collaborators')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'collaborators' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Briefcase size={18} />
                                        Colaboradores
                                    </button>
                                )}
                                {canAccess('classes') && (
                                    <button
                                        onClick={() => setDashboardTab('classes')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'classes' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <GraduationCap size={18} />
                                        Turmas
                                    </button>
                                )}
                                {canAccess('teachers') && (
                                    <button
                                        onClick={() => setDashboardTab('teachers')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'teachers' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <School size={18} />
                                        Professores
                                    </button>
                                )}
                                {canAccess('tables') && (
                                    <button
                                        onClick={() => setDashboardTab('tables')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'tables' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Table size={18} />
                                        Dados Brutos
                                    </button>
                                )}
                                {canAccess('settings') && (
                                    <button
                                        onClick={() => setDashboardTab('settings')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'settings' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Database size={18} />
                                        Conexões
                                    </button>
                                )}
                            </nav>
                            
                            {canAccess('global_settings') && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => setDashboardTab('global_settings')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            dashboardTab === 'global_settings' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Cog size={18} />
                                        Configurações
                                    </button>
                                </div>
                            )}

                            <div className="mt-2 pt-4 border-t border-slate-100 px-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status do Sistema</p>
                                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                                    <Activity size={12} />
                                    Operacional
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* CONTENT AREA */}
                    <div className="flex-1 min-w-0">
                        
                        {/* TAB: VISÃO GERAL (STATS) */}
                        {dashboardTab === 'overview' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>
                                    <p className="text-slate-500 text-sm">Bem-vindo, {currentUserTitle}.</p>
                                </div>

                                {/* --- WIDGET: VENDAS REALIZADAS --- */}
                                {(canAccess('crm') || canAccess('analysis')) && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800">Performance Comercial</h3>
                                                    <p className="text-xs text-slate-500">Vendas fechadas no período.</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <input 
                                                        type="date" 
                                                        value={salesDateRange.start}
                                                        onChange={e => setSalesDateRange({...salesDateRange, start: e.target.value})}
                                                        className="outline-none text-slate-700 bg-transparent w-24"
                                                    />
                                                </div>
                                                <span className="text-slate-300">-</span>
                                                <div className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <input 
                                                        type="date" 
                                                        value={salesDateRange.end}
                                                        onChange={e => setSalesDateRange({...salesDateRange, end: e.target.value})}
                                                        className="outline-none text-slate-700 bg-transparent w-24"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={fetchSalesData}
                                                    className="p-1.5 hover:bg-teal-50 text-teal-600 rounded"
                                                    title="Filtrar"
                                                >
                                                    <Filter size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            {isLoadingSales ? (
                                                <div className="flex justify-center py-8">
                                                    <Loader2 size={32} className="animate-spin text-teal-600" />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total em Vendas</p>
                                                                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(salesStats.totalValue)}</p>
                                                            </div>
                                                            <DollarSign size={32} className="text-emerald-200" />
                                                        </div>
                                                        <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Quantidade de Negócios</p>
                                                                <p className="text-2xl font-bold text-sky-900">{salesStats.count}</p>
                                                            </div>
                                                            <CheckCircle size={32} className="text-sky-200" />
                                                        </div>
                                                    </div>

                                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                                                                <tr>
                                                                    <th className="px-4 py-3">Data</th>
                                                                    <th className="px-4 py-3">Cliente</th>
                                                                    <th className="px-4 py-3">Oportunidade</th>
                                                                    <th className="px-4 py-3 text-right">Valor</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {salesStats.deals.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                                            Nenhuma venda encontrada neste período.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    salesStats.deals.map((deal, idx) => (
                                                                        <tr key={idx} className="hover:bg-slate-50">
                                                                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                                                                                {deal.closed_at ? new Date(deal.closed_at).toLocaleDateString() : new Date(deal.created_at).toLocaleDateString()}
                                                                            </td>
                                                                            <td className="px-4 py-3 font-medium text-slate-700">
                                                                                {deal.company_name}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={deal.title}>
                                                                                {deal.title}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                                                {formatCurrency(Number(deal.value))}
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* --- SECTION: CADASTROS (Filter based on permission) --- */}
                                <div className="pt-2">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Módulos Administrativos</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {/* Card Colaboradores */}
                                        {canAccess('collaborators') && (
                                            <div 
                                                onClick={() => setDashboardTab('collaborators')}
                                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group"
                                            >
                                                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                                    <Users size={24} />
                                                </div>
                                                <h4 className="font-bold text-slate-800 mb-1 group-hover:text-sky-700">Colaboradores</h4>
                                                <p className="text-xs text-slate-500">Gestão de equipe e acessos.</p>
                                            </div>
                                        )}

                                        {/* Card Turmas */}
                                        {canAccess('classes') && (
                                            <div 
                                                onClick={() => setDashboardTab('classes')}
                                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group"
                                            >
                                                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                    <GraduationCap size={24} />
                                                </div>
                                                <h4 className="font-bold text-slate-800 mb-1 group-hover:text-purple-700">Turmas</h4>
                                                <p className="text-xs text-slate-500">Gestão de cronogramas e alunos.</p>
                                            </div>
                                        )}

                                        {/* Card Professores */}
                                        {canAccess('teachers') && (
                                            <div 
                                                onClick={() => setDashboardTab('teachers')}
                                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group"
                                            >
                                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                                    <School size={24} />
                                                </div>
                                                <h4 className="font-bold text-slate-800 mb-1 group-hover:text-orange-700">Professores</h4>
                                                <p className="text-xs text-slate-500">Gestão do corpo docente.</p>
                                            </div>
                                        )}

                                        {/* Card Franquias */}
                                        {canAccess('franchises') && (
                                            <div 
                                                onClick={() => setDashboardTab('franchises')}
                                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group"
                                            >
                                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                    <Store size={24} />
                                                </div>
                                                <h4 className="font-bold text-slate-800 mb-1 group-hover:text-emerald-700">Franquias</h4>
                                                <p className="text-xs text-slate-500">Gestão de unidades e implantação.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Call to Action */}
                                <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">CRM VOLL</h3>
                                        <p className="text-teal-100 text-sm max-w-md">Gerencie oportunidades e funil de vendas em um só lugar.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {canAccess('whatsapp') && (
                                            <button 
                                                onClick={() => setDashboardTab('whatsapp')}
                                                className="bg-teal-700 hover:bg-teal-600 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 border border-teal-500"
                                            >
                                                <MessageCircle size={16} /> Atendimento
                                            </button>
                                        )}
                                        {canAccess('crm') && (
                                            <button 
                                                onClick={() => setDashboardTab('crm')}
                                                className="bg-white text-teal-700 hover:bg-teal-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                                            >
                                                Acessar CRM <ArrowRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* SUB-MODULES */}
                        {dashboardTab === 'collaborators' && <CollaboratorsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'classes' && <ClassesManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'teachers' && <TeachersManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'franchises' && <FranchisesManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'forms' && <FormsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'contracts' && <ContractsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'certificates' && <CertificatesManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'products' && <ProductsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'students' && <StudentsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'events' && <EventsManager onBack={() => setDashboardTab('overview')} />}
                        {dashboardTab === 'global_settings' && <SettingsManager onLogoChange={handleLogoChange} currentLogo={appLogo} />}
                        {dashboardTab === 'analysis' && <SalesAnalysis />}
                        {dashboardTab === 'whatsapp' && <WhatsAppInbox />}

                        {/* TAB: CRM */}
                        {dashboardTab === 'crm' && (
                            <div className="animate-in fade-in duration-300 h-full">
                            <CrmBoard />
                            </div>
                        )}

                        {/* TAB: TABELAS (VIEWER) */}
                        {dashboardTab === 'tables' && (
                            <div className="animate-in fade-in duration-300">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-slate-800">Visualizador de Tabelas</h2>
                                    <p className="text-slate-500 text-sm">Dados brutos sincronizados no Supabase.</p>
                                </div>
                                <TableViewer jobs={jobs} />
                            </div>
                        )}

                        {/* TAB: CONFIGURAÇÕES (JOBS LIST) */}
                        {dashboardTab === 'settings' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">Conexões de Dados</h2>
                                        <p className="text-slate-500 text-sm">Gerencie suas importações de planilhas.</p>
                                    </div>
                                    <button 
                                        onClick={handleStartWizard}
                                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
                                    >
                                        <Plus size={18} /> Nova Conexão
                                    </button>
                                </div>

                                {jobs.length === 0 ? (
                                    <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <Database size={32} />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-700">Nenhuma conexão ativa</h3>
                                        <p className="text-slate-500 mb-6 max-w-md mx-auto">Conecte planilhas Excel ou Google Sheets para alimentar o banco de dados.</p>
                                        <button onClick={handleStartWizard} className="text-teal-600 font-medium hover:underline">
                                            Configurar primeira importação
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {jobs.map(job => (
                                            <div key={job.id} className={clsx("bg-white rounded-xl border p-5 shadow-sm transition-all", job.active ? "border-slate-200" : "border-slate-100 opacity-75 bg-slate-50")}>
                                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                    
                                                    {/* Info Info */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="font-bold text-lg text-slate-800">{job.name}</h3>
                                                            
                                                            {/* Status Badge */}
                                                            {job.sheetUrl ? (
                                                                <span className={clsx("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide", job.active ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                                                                    {job.active ? `Link na Nuvem (${getIntervalLabel(job.intervalMinutes)})` : "Pausado"}
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                                                                    Upload Manual
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                                                            <span title="Tabela Supabase" className="flex items-center gap-1"><Database size={12}/> {job.config.tableName}</span>
                                                            {job.config.primaryKey ? (
                                                                <span className="text-teal-600 bg-teal-50 px-1.5 rounded flex items-center gap-1" title="Upsert Ativado (Edições funcionam)">
                                                                    PK: {job.config.primaryKey}
                                                                </span>
                                                            ) : (
                                                                <span className="text-amber-600 bg-amber-50 px-1.5 rounded flex items-center gap-1" title="Apenas Insert (Sem edição)">
                                                                    <AlertTriangle size={10} /> Insert Only
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Status & Time */}
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                                                {job.status === 'syncing' && <Loader2 size={14} className="animate-spin text-teal-600" />}
                                                                {job.status === 'success' && <CheckCircle size={14} className="text-green-500" />}
                                                                {job.status === 'error' && <AlertTriangle size={14} className="text-red-500" />}
                                                                <span className={clsx("text-sm font-medium", 
                                                                    job.status === 'success' ? 'text-green-700' : 
                                                                    job.status === 'error' ? 'text-red-700' : 'text-slate-600'
                                                                )}>
                                                                    {job.status === 'syncing' ? 'Sincronizando...' : job.status === 'idle' ? 'Aguardando' : job.status === 'success' ? 'Conexão OK' : 'Erro'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-400">
                                                                {job.lastSync ? `Última: ${job.lastSync.toLocaleTimeString()}` : 'Nunca executado'}
                                                            </p>
                                                            {job.lastMessage && (
                                                                <p className="text-[10px] text-slate-400 max-w-[150px] truncate" title={job.lastMessage}>{job.lastMessage}</p>
                                                            )}
                                                        </div>

                                                        {/* Controls */}
                                                        <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                                                            {job.sheetUrl ? (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleManualSync(job.id)}
                                                                        disabled={job.status === 'syncing' || !job.active}
                                                                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-30"
                                                                        title="Forçar sincronização agora"
                                                                    >
                                                                        <Clock size={18} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => toggleJob(job.id)}
                                                                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                                        title={job.active ? "Pausar" : "Retomar"}
                                                                    >
                                                                        {job.active ? <Pause size={18} /> : <Play size={18} />}
                                                                    </button>
                                                                    <a 
                                                                        href={job.sheetUrl} 
                                                                        target="_blank" 
                                                                        rel="noreferrer"
                                                                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                        title="Abrir planilha original"
                                                                    >
                                                                        <ExternalLink size={18} />
                                                                    </a>
                                                                </>
                                                            ) : (
                                                                <div className="px-2 text-slate-300 pointer-events-none">
                                                                    <FileInput size={18} />
                                                                </div>
                                                            )}
                                                            
                                                            <button 
                                                                onClick={() => deleteJob(job.id)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Excluir conexão"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </>
      )}
    </div>
  );
}

export default App;
