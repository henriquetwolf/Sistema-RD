import React, { useState, useEffect, useRef } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { ConfigPanel } from './components/ConfigPanel';
import { UploadPanel } from './components/UploadPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { LoginPanel } from './components/LoginPanel';
import { IntegrationHelp } from './components/IntegrationHelp';
import { SupabaseConfig, FileData, AppStep, UploadStatus, SyncJob } from './types';
import { parseCsvFile } from './utils/csvParser';
import { createSupabaseClient, batchUploadData, clearTableData } from './services/supabaseService';
import { appBackend } from './services/appBackend';
import { 
  CheckCircle, AlertTriangle, Loader2, Database, LogOut, 
  Plus, Play, Pause, Trash2, ExternalLink, Activity, Clock, FileInput, HelpCircle, HardDrive
} from 'lucide-react';
import clsx from 'clsx';

function App() {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Dashboard State (Persisted Jobs)
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const jobsRef = useRef<SyncJob[]>([]); // Ref to access latest jobs inside interval without resetting it
  
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
  // We don't sync every minute, we just CHECK if the specific job interval has passed.
  const CHECK_INTERVAL_MS = 60 * 1000; 

  // --- INIT & AUTH ---
  useEffect(() => {
    // Load Jobs from LocalStorage
    const savedJobs = localStorage.getItem('csv_syncer_jobs');
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        // Fix Date objects lost in JSON and reset stuck 'syncing' states
        const fixed = parsed.map((j: any) => ({
          ...j,
          lastSync: j.lastSync ? new Date(j.lastSync) : null,
          status: j.status === 'syncing' ? 'idle' : j.status, // Reset stuck jobs
          lastMessage: j.status === 'syncing' ? 'Sincronização interrompida' : j.lastMessage,
          // BACKWARD COMPATIBILITY: If intervalMinutes is missing, default to 5
          intervalMinutes: j.intervalMinutes || 5 
        }));
        setJobs(fixed);
      } catch (e) {
        console.error("Failed to load saved jobs", e);
      }
    }

    // Check Auth
    appBackend.auth.getSession().then((s) => {
      setSession(s);
      setIsLoadingSession(false);
    });

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

  const runAllActiveJobs = () => {
    const currentJobs = jobsRef.current;
    const now = new Date();

    // Only run jobs that are active AND have a sheetUrl (Auto-Sync jobs)
    // AND meet their time interval criteria
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
    // Safety check
    if (!job.sheetUrl) return;

    // 1. Set Status to Syncing
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'syncing', lastMessage: 'Iniciando ciclo...' } : j));

    try {
        // Setup Timeout (120 seconds for clear + wait + sync)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        // --- STEP 1: Fetch CSV (Download first to ensure safety) ---
        const response = await fetch(job.sheetUrl, { signal: controller.signal });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        
        if (text.trim().startsWith('<') || text.includes('<!DOCTYPE html')) {
             throw new Error("O link retornou HTML/Login. Verifique se está publicado como CSV.");
        }

        const file = new File([text], "sync.csv", { type: 'text/csv' });
        const parsed = await parseCsvFile(file);

        const client = createSupabaseClient(job.config.url, job.config.key);

        // --- STEP 2: Clear Table ---
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, lastMessage: 'Limpando tabela...' } : j));
        
        // Determine target column for deletion
        const targetColumn = job.config.primaryKey || (parsed.headers.length > 0 ? parsed.headers[0] : 'id');
        await clearTableData(client, job.config.tableName, targetColumn);

        // --- STEP 3: Wait 60 Seconds ---
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, lastMessage: 'Aguardando 60s...' } : j));
        
        // Wait promise
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // --- STEP 4: Upload New Data ---
        // Check if aborted during wait
        if (controller.signal.aborted) throw new Error("Tempo limite excedido.");

        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, lastMessage: 'Enviando dados...' } : j));
        await batchUploadData(client, job.config, parsed.data, () => {});

        clearTimeout(timeoutId);

        // --- FINISH: Update Success State ---
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
        
        // Update Error State
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
    // Default interval to 5 min
    setConfig({ url: '', key: '', tableName: '', primaryKey: '', intervalMinutes: 5 });
    setTempSheetUrl(null);
    setErrorMessage(null);
  };

  const handleFilesSelected = async (files: File[]) => {
    setStatus('parsing');
    try {
      const parsedFiles = await Promise.all(files.map(parseCsvFile));

      // VALIDATION: Ensure all files have the same headers
      if (parsedFiles.length > 1) {
          const normalize = (headers: string[]) => headers.map(h => h.trim().toLowerCase()).sort().join(',');
          const refHeaders = normalize(parsedFiles[0].headers);
          
          const inconsistentFile = parsedFiles.find(f => normalize(f.headers) !== refHeaders);
          if (inconsistentFile) {
              throw new Error(`Estrutura incompatível: O arquivo "${inconsistentFile.fileName}" possui colunas diferentes de "${parsedFiles[0].fileName}". Todos os arquivos devem ter a mesma formatação.`);
          }
      }

      setFilesData(parsedFiles);
      
      // Suggest Table Name
      if (!config.tableName && files.length > 0) {
          const suggestedName = files[0].name.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
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

      // Se for upload manual (não tem URL de Sheet), precisamos fazer o upload agora
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
              return; // Aborta e mantém na tela para o usuário tentar novamente
          }
      }

      const rowCount = filesData.reduce((acc, f) => acc + f.rowCount, 0);

      const newJob: SyncJob = {
          id: crypto.randomUUID(),
          name: config.tableName || "Nova Conexão",
          sheetUrl: tempSheetUrl || "", // Store empty string if manual
          config: { ...config },
          active: isAutoSync, // Only active if it has a URL
          status: isAutoSync ? 'idle' : 'success', // Static starts as success (assumed manual upload done)
          lastSync: isAutoSync ? null : new Date(),
          lastMessage: isAutoSync ? 'Aguardando primeira sincronização...' : `Upload manual: ${rowCount} linhas.`,
          intervalMinutes: config.intervalMinutes || 5
      };

      setJobs(prev => [...prev, newJob]);
      setStep(AppStep.DASHBOARD);
      setStatus('idle');
      
      // Trigger immediate sync ONLY for Auto-Sync jobs
      if (isAutoSync) {
         setTimeout(() => performJobSync(newJob), 500);
      }
  };

  // --- JOB ACTIONS ---
  const toggleJob = (id: string) => {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, active: !j.active } : j));
  };

  const deleteJob = (id: string) => {
      // Use window.confirm to ensure the user really wants to delete
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

  // --- RENDER ---
  if (isLoadingSession) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  if (!session) return <LoginPanel />;

  const isLocalMode = session?.user?.id === 'local-user';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Helper Modal */}
      <IntegrationHelp isOpen={showHelp} onClose={() => setShowHelp(false)} config={config} />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 mb-8 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(AppStep.DASHBOARD)}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
               <Database size={18} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Supabase Syncer</h1>
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

      <main className="container mx-auto px-4">
        
        {/* DASHBOARD VIEW */}
        {step === AppStep.DASHBOARD && (
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Painel de Conexões</h2>
                        <p className="text-slate-500 text-sm mt-1">Gerencie suas sincronizações automáticas</p>
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
                            <Activity size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-700">Nenhuma conexão ativa</h3>
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
                                                    {job.active ? `Auto-Sync (${getIntervalLabel(job.intervalMinutes)})` : "Pausado"}
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

      </main>
    </div>
  );
}

export default App;