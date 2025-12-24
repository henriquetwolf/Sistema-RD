
import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Database, Upload, FileText, Settings as SettingsIcon, 
    LogOut, BarChart3, Users, GraduationCap, School, FileSignature, 
    ShoppingBag, Store, Award, Calendar, MessageCircle, Building2, Package, MessageSquare, Briefcase, Table as TableIcon,
    PieChart, XCircle
} from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { ConfigPanel } from './components/ConfigPanel';
import { UploadPanel } from './components/UploadPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { LoginPanel } from './components/LoginPanel';
import { CrmBoard } from './components/CrmBoard';
import { CollaboratorsManager } from './components/CollaboratorsManager';
import { ClassesManager } from './components/ClassesManager';
import { TeachersManager } from './components/TeachersManager';
import { FormsManager } from './components/FormsManager';
import { SurveyManager } from './components/SurveyManager';
import { ContractsManager } from './components/ContractsManager';
import { ProductsManager } from './components/ProductsManager';
import { FranchisesManager } from './components/FranchisesManager';
import { CertificatesManager } from './components/CertificatesManager';
import { StudentsManager } from './components/StudentsManager';
import { EventsManager } from './components/EventsManager';
import { WhatsAppInbox } from './components/WhatsAppInbox';
import { PartnerStudiosManager } from './components/PartnerStudiosManager';
import { InventoryManager } from './components/InventoryManager';
import { SalesAnalysis } from './components/SalesAnalysis';
import { SettingsManager } from './components/SettingsManager';
import { TableViewer } from './components/TableViewer';
import { TwilioManager } from './components/TwilioManager';
import { InstructorArea } from './components/InstructorArea';
import { StudentArea } from './components/StudentArea';
import { PartnerStudioArea } from './components/PartnerStudioArea';
import { CertificateViewer } from './components/CertificateViewer';
import { ContractSigning } from './components/ContractSigning';
import { HrDashboard } from './components/HrDashboard';
import { 
    AppStep, SupabaseConfig, FileData, SyncJob, 
    StudentSession, CollaboratorSession, PartnerStudioSession, 
    Contract, Role
} from './types';
import { appBackend } from './services/appBackend';
import { clearTableData, batchUploadData, createSupabaseClient } from './services/supabaseService';
import { parseCsvFile } from './utils/csvParser';
import { parseExcelFile } from './utils/excelParser';
import clsx from 'clsx';

type DashboardTab = 'overview' | 'tables' | 'crm' | 'analysis' | 'hr' | 'classes' | 'teachers' | 'forms' | 'surveys' | 'contracts' | 'products' | 'franchises' | 'certificates' | 'students' | 'events' | 'global_settings' | 'whatsapp' | 'partner_studios' | 'inventory' | 'twilio';

function App() {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [instructorSession, setInstructorSession] = useState<any | null>(null);
  const [studioSession, setStudioSession] = useState<PartnerStudioSession | null>(null);
  const [viewingCertificateHash, setViewingCertificateHash] = useState<string | null>(null);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);

  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  
  const [files, setFiles] = useState<FileData[]>([]);
  const [config, setConfig] = useState<SupabaseConfig>({ url: '', key: '', tableName: '', primaryKey: '', intervalMinutes: 5 });
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const certHash = params.get('certificateHash');
        if (certHash) setViewingCertificateHash(certHash);

        const contractId = params.get('contractId');
        if (contractId) {
            appBackend.getContracts().then(list => {
                const found = list.find(c => c.id === contractId);
                if (found) setSigningContract(found);
            }).catch(() => {});
        }

        // Tenta buscar sessão inicial de forma segura
        if (appBackend.client && appBackend.client.auth) {
          const { data: { session } } = await appBackend.client.auth.getSession();
          setSession(session);
          if (session) loadUserRole(session.user.id);

          appBackend.client.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) loadUserRole(session.user.id);
            else setUserRole(null);
          });
        }

        appBackend.getAppLogo().then(setAppLogo).catch(() => {});
      } catch (err: any) {
        console.error("Erro na inicialização do App:", err);
        setAppError(err.message);
      }
    };

    initializeApp();
  }, []);

  const loadUserRole = async (userId: string) => {
      try {
          const { data: userData } = await appBackend.client.from('crm_collaborators').select('role_id').eq('user_id', userId).maybeSingle();
          if (userData?.role_id) {
              const { data: role } = await appBackend.client.from('crm_roles').select('*').eq('id', userData.role_id).single();
              if (role) setUserRole(role);
          }
      } catch (e) {}
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    setIsLoading(true);
    try {
      const parsedFiles = await Promise.all(
        selectedFiles.map(file => file.name.endsWith('.csv') ? parseCsvFile(file) : parseExcelFile(file))
      );
      setFiles(parsedFiles);
      setStep(AppStep.CONFIG);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const client = createSupabaseClient(config.url, config.key);
      const allData = files.flatMap(f => f.data);
      await batchUploadData(client, config, allData, (p) => console.log(`Progress: ${p}%`));
      alert('Sincronização concluída com sucesso!');
      setStep(AppStep.DASHBOARD);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTable = async () => {
      try {
        const client = createSupabaseClient(config.url, config.key);
        await clearTableData(client, config.tableName, config.primaryKey);
      } catch (e: any) {
        alert(e.message);
      }
  };

  const canAccess = (tab: DashboardTab) => {
      if (!session) return false;
      if (!userRole) return true; // Default to allow if no role defined but authenticated
      return !!userRole.permissions[tab];
  };

  const logout = async () => {
    try {
      await appBackend.auth.signOut();
    } catch (e) {}
    setSession(null);
    setStudentSession(null);
    setInstructorSession(null);
    setStudioSession(null);
    setUserRole(null);
    setStep(AppStep.UPLOAD);
  };

  if (appError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
      <div className="bg-white p-12 rounded-3xl shadow-xl max-w-md border border-red-100">
        {/* Fix: use XCircle correctly after importing it */}
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-slate-800 mb-2">Erro Crítico</h2>
        <p className="text-slate-500 mb-6">{appError}</p>
        <button onClick={() => window.location.reload()} className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold">Recarregar App</button>
      </div>
    </div>
  );

  if (viewingCertificateHash) return <CertificateViewer hash={viewingCertificateHash} />;
  if (signingContract) return <ContractSigning contract={signingContract} />;
  if (studentSession) return <StudentArea student={studentSession} onLogout={logout} />;
  if (instructorSession) return <InstructorArea instructor={instructorSession} onLogout={logout} />;
  if (studioSession) return <PartnerStudioArea studio={studioSession} onLogout={logout} />;
  
  if (!session) return (
      <LoginPanel 
        onStudentLogin={setStudentSession} 
        onInstructorLogin={setInstructorSession} 
        onStudioLogin={setStudioSession}
        onCollaboratorLogin={(c) => { setSession({ user: { id: c.id, email: c.email } }); setUserRole(c.role); }}
      />
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 flex flex-col items-center">
          {appLogo ? <img src={appLogo} alt="Logo" className="h-10 mb-4 object-contain" /> : <div className="text-white font-black text-2xl mb-4">VOLL</div>}
          <div className="h-px w-full bg-slate-800 mb-6"></div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => setDashboardTab('overview')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'overview' ? "bg-teal-600 text-white shadow-lg" : "hover:bg-slate-800")}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          {canAccess('crm') && (
            <button onClick={() => setDashboardTab('crm')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'crm' ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-slate-800")}>
              <Briefcase size={18} /> CRM Comercial
            </button>
          )}
          {canAccess('classes') && (
            <button onClick={() => setDashboardTab('classes')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'classes' ? "bg-purple-600 text-white shadow-lg" : "hover:bg-slate-800")}>
              <GraduationCap size={18} /> Turmas
            </button>
          )}
          {canAccess('teachers') && (
            <button onClick={() => setDashboardTab('teachers')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'teachers' ? "bg-orange-600 text-white shadow-lg" : "hover:bg-slate-800")}>
              <School size={18} /> Professores
            </button>
          )}
          {canAccess('inventory') && (
            <button onClick={() => setDashboardTab('inventory')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'inventory' ? "bg-emerald-600 text-white shadow-lg" : "hover:bg-slate-800")}>
              <Package size={18} /> Estoque
            </button>
          )}
          {canAccess('analysis') && (
            <button onClick={() => setDashboardTab('analysis')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'analysis' ? "bg-teal-600 text-white shadow-lg" : "hover:bg-slate-800")}>
              <BarChart3 size={18} /> Análise de Vendas
            </button>
          )}
          {canAccess('whatsapp') && (
            <button onClick={() => setDashboardTab('whatsapp')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'whatsapp' ? "bg-teal-500 text-white shadow-lg" : "hover:bg-slate-800")}>
              <MessageCircle size={18} /> WhatsApp
            </button>
          )}
          {canAccess('twilio') && (
            <button onClick={() => setDashboardTab('twilio')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'twilio' ? "bg-red-600 text-white shadow-lg" : "hover:bg-slate-800")}>
              <MessageSquare size={18} /> Twilio
            </button>
          )}
          {canAccess('global_settings') && (
            <button onClick={() => setDashboardTab('global_settings')} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", dashboardTab === 'global_settings' ? "bg-slate-700 text-white shadow-lg" : "hover:bg-slate-800")}>
              <SettingsIcon size={18} /> Configurações
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <LogOut size={18} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8 custom-scrollbar">
        {dashboardTab === 'overview' && (
            <div className="max-w-6xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-black text-slate-800">Painel Geral</h1>
                    <p className="text-slate-500">Bem-vindo ao centro de comando VOLL.</p>
                </header>

                <StepIndicator currentStep={step} />

                {step === AppStep.UPLOAD && (
                    <UploadPanel 
                        onFilesSelected={handleFilesSelected} 
                        isLoading={isLoading} 
                    />
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
                        files={files} 
                        tableName={config.tableName} 
                        config={config}
                        onUpdateFiles={setFiles}
                        onUpdateConfig={setConfig}
                        onSync={handleSync} 
                        onBack={() => setStep(AppStep.CONFIG)}
                        onClearTable={handleClearTable}
                    />
                )}
            </div>
        )}

        {dashboardTab === 'crm' && <CrmBoard />}
        {dashboardTab === 'classes' && <ClassesManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'teachers' && <TeachersManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'inventory' && <InventoryManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'analysis' && <SalesAnalysis />}
        {dashboardTab === 'whatsapp' && <WhatsAppInbox />}
        {dashboardTab === 'twilio' && <TwilioManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'global_settings' && (
            <SettingsManager 
                onLogoChange={setAppLogo} 
                currentLogo={appLogo} 
                jobs={jobs} 
                onStartWizard={() => setStep(AppStep.UPLOAD)} 
                onDeleteJob={(id) => setJobs(prev => prev.filter(j => j.id !== id))}
            />
        )}
        {dashboardTab === 'hr' && (
            <HrDashboard 
                collaborators={[]} 
                onEditCollaborator={() => {}} 
            />
        )}
        {dashboardTab === 'students' && <StudentsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'certificates' && <CertificatesManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'products' && <ProductsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'franchises' && <FranchisesManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'events' && <EventsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'surveys' && <SurveyManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'forms' && <FormsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'partner_studios' && <PartnerStudiosManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'tables' && <TableViewer jobs={jobs} />}
      </main>
    </div>
  );
}

export default App;
