
import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Database, FileText, Settings, MessageSquare, Users, 
  School, GraduationCap, Briefcase, Building2, Store, Package, 
  TrendingUp, Calendar, Award, MessageCircle, LogOut
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from './services/appBackend';
import { 
  AppStep, CollaboratorSession, StudentSession, PartnerStudioSession, 
  SyncJob, SupabaseConfig, FileData 
} from './types';

// Component Imports
import { StepIndicator } from './components/StepIndicator';
import { UploadPanel } from './components/UploadPanel';
import { ConfigPanel } from './components/ConfigPanel';
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
import { SettingsManager } from './components/SettingsManager';
import { WhatsAppInbox } from './components/WhatsAppInbox';
import { PartnerStudiosManager } from './components/PartnerStudiosManager';
import { InventoryManager } from './components/InventoryManager';
import { TwilioManager } from './components/TwilioManager';
import { SalesAnalysis } from './components/SalesAnalysis';
import { HrDashboard } from './components/HrDashboard';
import { InstructorArea } from './components/InstructorArea';
import { StudentArea } from './components/StudentArea';
import { PartnerStudioArea } from './components/PartnerStudioArea';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [user, setUser] = useState<any>(null);
  const [collaborator, setCollaborator] = useState<CollaboratorSession | null>(null);
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [studio, setStudio] = useState<PartnerStudioSession | null>(null);
  const [instructor, setInstructor] = useState<any | null>(null);
  
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'tables' | 'crm' | 'analysis' | 'hr' | 'classes' | 'teachers' | 'forms' | 'surveys' | 'contracts' | 'products' | 'franchises' | 'certificates' | 'students' | 'events' | 'global_settings' | 'whatsapp' | 'partner_studios' | 'inventory' | 'twilio'>('overview');

  const [files, setFiles] = useState<FileData[]>([]);
  const [config, setConfig] = useState<SupabaseConfig>({ url: '', key: '', tableName: '' });
  const [jobs, setJobs] = useState<SyncJob[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await appBackend.client.auth.getUser();
        setUser(user);
        if (user) setCurrentStep(AppStep.DASHBOARD);
      } catch (e) {
        console.warn("Autenticação inicial ignorada (Supabase não configurado)");
      }
    };
    checkUser();
  }, []);

  const canAccess = (module: string) => {
    if (user) return true; // Admin access
    if (collaborator && collaborator.role.permissions[module]) return true;
    return false;
  };

  const logout = () => {
    appBackend.auth.signOut();
    setUser(null);
    setCollaborator(null);
    setStudent(null);
    setStudio(null);
    setInstructor(null);
    setCurrentStep(AppStep.UPLOAD);
  };

  if (student) return <StudentArea student={student} onLogout={logout} />;
  if (instructor) return <InstructorArea instructor={instructor} onLogout={logout} />;
  if (studio) return <PartnerStudioArea studio={studio} onLogout={logout} />;

  if (!user && !collaborator) {
    return (
      <LoginPanel 
        onInstructorLogin={setInstructor} 
        onStudentLogin={setStudent} 
        onCollaboratorLogin={(c) => { setCollaborator(c); setCurrentStep(AppStep.DASHBOARD); }}
        onStudioLogin={setStudio}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8" />
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {canAccess('overview') && (
            <button onClick={() => setDashboardTab('overview')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'overview' ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50")}>
              <LayoutGrid size={18} /> Overview
            </button>
          )}
          {canAccess('crm') && (
            <button onClick={() => setDashboardTab('crm')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'crm' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50")}>
              <Briefcase size={18} /> CRM Comercial
            </button>
          )}
          {canAccess('analysis') && (
            <button onClick={() => setDashboardTab('analysis')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'analysis' ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50")}>
              <TrendingUp size={18} /> Análise Vendas
            </button>
          )}
          {canAccess('hr') && (
            <button onClick={() => setDashboardTab('hr')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'hr' ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}>
              <Users size={18} /> Recursos Humanos
            </button>
          )}
          {canAccess('classes') && (
            <button onClick={() => setDashboardTab('classes')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'classes' ? "bg-purple-50 text-purple-700" : "text-slate-600 hover:bg-slate-50")}>
              <GraduationCap size={18} /> Turmas
            </button>
          )}
          {canAccess('teachers') && (
            <button onClick={() => setDashboardTab('teachers')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'teachers' ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50")}>
              <School size={18} /> Professores
            </button>
          )}
          {canAccess('inventory') && (
            <button onClick={() => setDashboardTab('inventory')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'inventory' ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50")}>
              <Package size={18} /> Logística
            </button>
          )}
          {canAccess('twilio') && (
            <button onClick={() => setDashboardTab('twilio')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'twilio' ? "bg-red-50 text-red-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}>
              <MessageSquare size={18} /> Twilio WhatsApp
            </button>
          )}
          {canAccess('global_settings') && (
            <button onClick={() => setDashboardTab('global_settings')} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium", dashboardTab === 'global_settings' ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50")}>
              <Settings size={18} /> Configurações
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {dashboardTab === 'overview' && <SalesAnalysis />}
        {dashboardTab === 'crm' && <CrmBoard />}
        {dashboardTab === 'analysis' && <SalesAnalysis />}
        {dashboardTab === 'hr' && <HrDashboard collaborators={[]} onEditCollaborator={() => {}} />}
        {dashboardTab === 'classes' && <ClassesManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'teachers' && <TeachersManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'forms' && <FormsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'surveys' && <SurveyManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'contracts' && <ContractsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'products' && <ProductsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'franchises' && <FranchisesManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'certificates' && <CertificatesManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'students' && <StudentsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'events' && <EventsManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'whatsapp' && <WhatsAppInbox />}
        {dashboardTab === 'partner_studios' && <PartnerStudiosManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'inventory' && <InventoryManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'twilio' && <TwilioManager onBack={() => setDashboardTab('overview')} />}
        {dashboardTab === 'global_settings' && <SettingsManager onLogoChange={() => {}} currentLogo={null} jobs={jobs} onStartWizard={() => {}} onDeleteJob={() => {}} />}
      </main>
    </div>
  );
};

export default App;
