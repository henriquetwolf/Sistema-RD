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
import { TeachersManager } from './components/TeachersManager';
import { FormsManager } from './components/FormsManager';
import { FormViewer } from './components/FormViewer';
import { SupabaseConfig, FileData, AppStep, UploadStatus, SyncJob, FormModel } from './types';
import { parseCsvFile } from './utils/csvParser';
import { parseExcelFile } from './utils/excelParser';
import { createSupabaseClient, batchUploadData, clearTableData } from './services/supabaseService';
import { appBackend } from './services/appBackend';
import { 
  CheckCircle, AlertTriangle, Loader2, Database, LogOut, 
  Plus, Play, Pause, Trash2, ExternalLink, Activity, Clock, FileInput, HelpCircle, HardDrive,
  LayoutDashboard, Settings, BarChart3, ArrowRight, Table, Kanban,
  Users, GraduationCap, School, TrendingUp, Calendar, DollarSign, Filter, FileText
} from 'lucide-react';
import clsx from 'clsx';

function App() {
  // Public Form State (Before Auth Check)
  const [publicForm, setPublicForm] = useState<FormModel | null>(null);
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Dashboard State (Persisted Jobs)
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const jobsRef = useRef<SyncJob[]>([]); // Ref to access latest jobs inside interval without resetting it
  
  // Dashboard UI State
  // Extended types to include management tabs
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'settings' | 'tables' | 'crm' | 'collaborators' | 'classes' | 'teachers' | 'forms'>('overview');

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
        // 1. Check for Public URL Params (e.g. ?publicFormId=123)
        const params = new URLSearchParams(window.location.search);
        const publicFormId = params.get('publicFormId');

        if (publicFormId) {
            setIsPublicLoading(true);
            try {
                const form = await appBackend.getFormById(publicFormId);
                if (form) {
                    setPublicForm(form);
                    setIsPublicLoading(false);
                    // If public form found, stop here. No need for session or jobs.
                    return;
                } else {
                    console.error("Form not found");
                }
            } catch (e) {
                console.error("Error loading public form", e);
            }
            setIsPublicLoading(false);
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

        // 3. Check Auth
        appBackend.auth.getSession().then((s) => {
            setSession(s);
            setIsLoadingSession(false);
        });
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
    
    // FIX: Always save, even if empty array, to persist deletions correctly
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
      if (dashboardTab === 'overview' && !publicForm) {
          fetchSalesData();
      }
  }, [dashboardTab, salesDateRange, publicForm]);

  const fetchSalesData = async () => {
      setIsLoadingSales(true);
      try {
          // Add end of day time to the end date
          const endDateTime = new Date(salesDateRange.end);
          endDateTime.setHours(23, 59, 59, 999);

          // TENTATIVA 1: Tentar filtrar por 'closed_at' (preferencial)
          const { data, error } = await appBackend.client
              .from('crm_deals')
              .select('*')
              .eq('stage', 'closed')
              .gte('closed_at', salesDateRange.start)
              .lte('closed_at', endDateTime.toISOString())
              .order('closed_at', { ascending: false });

          if (error) {
              // ERRO 42703: Coluna não existe. Fallback para 'created_at'.
              if (error.code === '42703') {
                  console.warn("Coluna 'closed_at' não encontrada no banco. Usando 'created_at' como fallback.");
                  
                  const { data: fallbackData, error: fallbackError } = await appBackend.client
                      .from('crm_deals')
                      .select('*')
                      .eq('stage', 'closed')
                      .gte('created_at', salesDateRange.start)
                      .lte('created_at', endDateTime.toISOString())
                      .order('created_at', { ascending: false });

                  if (fallbackError) {
                      console.error('Erro ao buscar vendas (fallback):', fallbackError.message);
                      setSalesStats({ totalValue: 0, count: 0, deals: [] });
                  } else {
                      const deals = fallbackData || [];
                      const total = deals.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
                      setSalesStats({ totalValue: total, count: deals.length, deals });
                  }
              } else {
                  // Outros erros (ex: tabela não existe)
                  if (!error.message.includes('does not exist')) {
                      console.error('Erro ao buscar vendas:', error.message);
                  }
                  setSalesStats({ totalValue: 0, count: 0, deals: [] });
              }
          } else {
              // Sucesso com closed_at
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
        
        // If never synced, run now
        if (!j.lastSync) return true;

        // Calculate difference in minutes
        const diffMs = now.getTime() - new Date(j.lastSync).getTime();
        const diffMinutes = diffMs / (1000 * 60);

        return diffMinutes >= (j.intervalMinutes || 5);
    });

    jobsToRun.forEach(job => {
        performJobSync(job);
    });
  };

  const performJobSync = async (job: SyncJob) => {
    if (!job.sheetUrl) return;

    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'syncing', lastMessage: 'Iniciando ciclo...' } : j));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        // Cache Busting & Proxy logic
        const separator = job.sheetUrl.includes('?') ? '&' : '?';
        const fetchUrlWithCache = `${job.sheetUrl}${separator}_t=${Date.now()}`;
        
        let response;
        try {
            response = await fetch(fetchUrlWithCache, { signal: controller.signal });
            if (!response.ok) throw new Error('Direct fetch failed');
        } catch (directError) {
             console.log(`Direct sync failed for ${job.name}, retrying with proxy...`);
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
                     throw new Error("Conteúdo inválido (HTML detectado).");
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
        if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
            msg = "Erro: Registros duplicados detectados.";
        }
        
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

      if (parsedFiles.length > 1) {
          const normalize = (headers: string[]) => headers.map(h => h.trim().toLowerCase()).sort().join(',');
          const refHeaders = normalize(parsedFiles[0].headers);
          
          const inconsistentFile = parsedFiles.find(f => normalize(f.headers) !== refHeaders);
          if (inconsistentFile) {
              throw new Error(`Estrutura incompatível: O arquivo "${inconsistentFile.fileName}" possui colunas diferentes de "${parsedFiles[0].fileName}". Todos os arquivos devem ter a mesma formatação.`);
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
    await appBackend.auth.signOut();
  };

  const getIntervalLabel = (minutes: number) => {
      if (minutes >= 1440) return '24h';
      if (minutes >= 60) return `${Math.floor(minutes / 60)}h`;
      return `${minutes}min`;
  };

  // Helper formatting
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- RENDER ---
  
  // 1. Check for Public Mode FIRST
  if (isPublicLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  if (publicForm) return <div className="min-h-screen bg-slate-50"><FormViewer form={publicForm} isPublic={true} /></div>;

  // 2. Check for Auth Loading
  if (isLoadingSession) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  
  // 3. Check for Session
  if (!session) return <LoginPanel />;

  const isLocalMode = session?.user?.id === 'local-user';

  // Stats Calculation
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.active && j.sheetUrl).length;
  const errorJobs = jobs.filter(j => j.status === 'error').length;
  const lastSyncDate = jobs
    .map(j => j.lastSync)
    .filter(d => d !== null)
    .sort((a, b) => b!.getTime() - a!.getTime())[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      <IntegrationHelp isOpen={showHelp} onClose={() => setShowHelp(false)} config={config} />

      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(AppStep.DASHBOARD)}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
               <Database size={18} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Sincronizador VOLL</h1>
            {isLocalMode && (
                <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-mono rounded border border-slate-200 flex items-center gap-1">
                    <HardDrive size={10} /> Local Mode
                </span>
            )}
          </div>
          <div className="flex items-center gap-4">
             {step !== AppStep.DASHBOARD && (
                <button onClick={() => setStep(AppStep.DASHBOARD)} className="text-sm font-medium text-slate-600 hover:text-indigo-600">
                    Cancelar
                </button>
             )}
             
             <button 
                onClick={() => setShowHelp(true)}
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
             >
                <HelpCircle size={16} /> <span className="hidden sm:inline">Guia Power BI</span>
             </button>

             <div className="h-4 w-px bg-slate-200"></div>
             
             <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1">
                <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className={clsx("container mx-auto px-4", dashboardTab === 'crm' ? "max-w-full py-4" : "py-8")}>
        
        {/* DASHBOARD VIEW with SIDEBAR */}
        {step === AppStep.DASHBOARD && (
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 min-h-[500px]">
                
                {/* SIDEBAR NAVIGATION */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm sticky top-24">
                        <nav className="space-y-1">
                            <button
                                onClick={() => setDashboardTab('overview')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    (dashboardTab === 'overview' || ['collaborators', 'classes', 'teachers'].includes(dashboardTab))
                                        ? "bg-indigo-50 text-indigo-700" 
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <LayoutDashboard size={18} />
                                Visão Geral
                            </button>
                            <button
                                onClick={() => setDashboardTab('crm')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    dashboardTab === 'crm' 
                                        ? "bg-indigo-50 text-indigo-700" 
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Kanban size={18} />
                                CRM <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">NOVO</span>
                            </button>
                            <button
                                onClick={() => setDashboardTab('forms')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    dashboardTab === 'forms' 
                                        ? "bg-indigo-50 text-indigo-700" 
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <FileText size={18} />
                                Formulários
                            </button>
                            <button
                                onClick={() => setDashboardTab('tables')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    dashboardTab === 'tables' 
                                        ? "bg-indigo-50 text-indigo-700" 
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Table size={18} />
                                Tabelas
                            </button>
                            <button
                                onClick={() => setDashboardTab('settings')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    dashboardTab === 'settings' 
                                        ? "bg-indigo-50 text-indigo-700" 
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Settings size={18} />
                                Configurações
                            </button>
                        </nav>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100 px-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status do Sistema</p>
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-2 py-1.5 rounded">
                                <Activity size={14} />
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
                                <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
                                <p className="text-slate-500 text-sm">Resumo das suas integrações de dados.</p>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Database size={20} /></div>
                                    </div>
                                    <h3 className="text-3xl font-bold text-slate-800">{totalJobs}</h3>
                                    <p className="text-xs text-slate-500 font-medium">Conexões Totais</p>
                                </div>
                                
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-green-50 rounded-lg text-green-600"><Activity size={20} /></div>
                                    </div>
                                    <h3 className="text-3xl font-bold text-slate-800">{activeJobs}</h3>
                                    <p className="text-xs text-slate-500 font-medium">Sincronizações Ativas</p>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Clock size={20} /></div>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 mt-2">
                                        {lastSyncDate ? lastSyncDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">Última Atividade</p>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={clsx("p-2 rounded-lg", errorJobs > 0 ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-400")}>
                                            <AlertTriangle size={20} />
                                        </div>
                                    </div>
                                    <h3 className={clsx("text-3xl font-bold", errorJobs > 0 ? "text-red-600" : "text-slate-800")}>{errorJobs}</h3>
                                    <p className="text-xs text-slate-500 font-medium">Erros Recentes</p>
                                </div>
                             </div>

                             {/* --- WIDGET: VENDAS REALIZADAS --- */}
                             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">Vendas Realizadas</h3>
                                            <p className="text-xs text-slate-500">Negociações concluídas no período.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span className="font-semibold text-slate-500">De:</span>
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
                                            <span className="font-semibold text-slate-500">Até:</span>
                                            <input 
                                                type="date" 
                                                value={salesDateRange.end}
                                                onChange={e => setSalesDateRange({...salesDateRange, end: e.target.value})}
                                                className="outline-none text-slate-700 bg-transparent w-24"
                                            />
                                        </div>
                                        <button 
                                            onClick={fetchSalesData}
                                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded"
                                            title="Filtrar"
                                        >
                                            <Filter size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {isLoadingSales ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 size={32} className="animate-spin text-indigo-600" />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total em Vendas</p>
                                                        <p className="text-2xl font-bold text-emerald-900">{formatCurrency(salesStats.totalValue)}</p>
                                                    </div>
                                                    <DollarSign size={32} className="text-emerald-200" />
                                                </div>
                                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Quantidade de Negócios</p>
                                                        <p className="text-2xl font-bold text-blue-900">{salesStats.count}</p>
                                                    </div>
                                                    <CheckCircle size={32} className="text-blue-200" />
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

                             {/* --- SECTION: CADASTROS --- */}
                             <div className="pt-2">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Gestão Administrativa</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Card Colaboradores */}
                                    <div 
                                        onClick={() => setDashboardTab('collaborators')}
                                        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                                    >
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Users size={24} />
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-1 group-hover:text-blue-700">Cadastro de Colaboradores</h4>
                                        <p className="text-xs text-slate-500">Gerencie a equipe interna e acessos ao sistema.</p>
                                    </div>

                                    {/* Card Turmas */}
                                    <div 
                                        onClick={() => setDashboardTab('classes')}
                                        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
                                    >
                                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <GraduationCap size={24} />
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-1 group-hover:text-purple-700">Cadastro de Turmas</h4>
                                        <p className="text-xs text-slate-500">Organize cronogramas, alunos e períodos letivos.</p>
                                    </div>

                                    {/* Card Professores */}
                                    <div 
                                        onClick={() => setDashboardTab('teachers')}
                                        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group"
                                    >
                                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                            <School size={24} />
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-1 group-hover:text-orange-700">Cadastro de Professores</h4>
                                        <p className="text-xs text-slate-500">Administre o corpo docente e atribuições.</p>
                                    </div>
                                </div>
                             </div>

                             {/* Call to Action for Quick Access */}
                             <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold mb-1">CRM Integrado</h3>
                                    <p className="text-indigo-100 text-sm max-w-md">Gerencie suas oportunidades de vendas em um quadro visual.</p>
                                </div>
                                <button 
                                    onClick={() => setDashboardTab('crm')}
                                    className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                                >
                                    Acessar CRM <ArrowRight size={16} />
                                </button>
                             </div>
                        </div>
                    )}
                    
                    {/* SUB-MODULES */}
                    {dashboardTab === 'collaborators' && <CollaboratorsManager onBack={() => setDashboardTab('overview')} />}
                    {dashboardTab === 'classes' && <ClassesManager onBack={() => setDashboardTab('overview')} />}
                    {dashboardTab === 'teachers' && <TeachersManager onBack={() => setDashboardTab('overview')} />}
                    {dashboardTab === 'forms' && <FormsManager onBack={() => setDashboardTab('overview')} />}

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
                                <p className="text-slate-500 text-sm">Inspecione os dados sincronizados diretamente do Supabase.</p>
                            </div>
                            <TableViewer jobs={jobs} />
                        </div>
                    )}

                    {/* TAB: CONFIGURAÇÕES (JOBS LIST) */}
                    {dashboardTab === 'settings' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Conexões Configuradas</h2>
                                    <p className="text-slate-500 text-sm">Adicione, edite ou remova integrações.</p>
                                </div>
                                <button 
                                    onClick={handleStartWizard}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
                                >
                                    <Plus size={18} /> Nova Conexão
                                </button>
                            </div>

                            {jobs.length === 0 ? (
                                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <Database size={32} />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-700">Nenhuma configuração encontrada</h3>
                                    <p className="text-slate-500 mb-6 max-w-md mx-auto">Conecte uma planilha do Google Sheets ao Supabase para começar a sincronizar dados automaticamente.</p>
                                    <button onClick={handleStartWizard} className="text-indigo-600 font-medium hover:underline">
                                        Criar primeira conexão
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
                                                            <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded flex items-center gap-1" title="Upsert Ativado (Edições funcionam)">
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
                                                            {job.status === 'syncing' && <Loader2 size={14} className="animate-spin text-indigo-600" />}
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
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
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
        )}

      </main>
    </div>
  );
}

export default App;