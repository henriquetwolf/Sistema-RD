
import React, { useState } from 'react';
import { Loader2, AlertCircle, School, ShieldCheck, GraduationCap, Briefcase } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { Teacher } from './TeachersManager';
import { StudentSession, CollaboratorSession } from '../types';
import clsx from 'clsx';

interface LoginPanelProps {
    onInstructorLogin?: (teacher: Teacher) => void;
    onStudentLogin?: (student: StudentSession) => void;
    onCollaboratorLogin?: (collab: CollaboratorSession) => void; // New callback
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ onInstructorLogin, onStudentLogin, onCollaboratorLogin }) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'collaborator' | 'instructor' | 'student'>('admin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
        if (activeTab === 'admin') {
            // ADMIN LOGIN (Supabase Auth - Superuser)
            await appBackend.auth.signIn(email, password);
        } else if (activeTab === 'collaborator') {
            // COLLABORATOR LOGIN (Custom Table)
            const { data, error } = await appBackend.client
                .from('crm_collaborators')
                .select('id, full_name, email, password, photo_url, role_id, status')
                .eq('email', email.trim())
                .eq('password', password.trim())
                .single();

            if (error || !data) {
                throw new Error('Credenciais inválidas ou colaborador não encontrado.');
            }

            if (data.status !== 'active') {
                throw new Error('Acesso bloqueado pelo administrador. Contate o suporte.');
            }

            if (!data.role_id) {
                throw new Error('Este usuário não tem permissão de acesso configurada.');
            }

            // Fetch Role Permissions
            const { data: roleData, error: roleError } = await appBackend.client
                .from('crm_roles')
                .select('*')
                .eq('id', data.role_id)
                .single();

            if (roleError || !roleData) {
                throw new Error('Erro ao carregar permissões do usuário.');
            }

            const session: CollaboratorSession = {
                id: data.id,
                name: data.full_name,
                email: data.email,
                photoUrl: data.photo_url,
                role: {
                    id: roleData.id,
                    name: roleData.name,
                    permissions: roleData.permissions || {}
                }
            };

            if (onCollaboratorLogin) onCollaboratorLogin(session);

        } else if (activeTab === 'instructor') {
            // INSTRUCTOR LOGIN (Custom Table Query)
            const { data, error } = await appBackend.client
                .from('crm_teachers')
                .select('*')
                .eq('email', email.trim())
                .eq('password', password.trim()) // Plain text match for simple requirement
                .single();

            if (error || !data) {
                throw new Error('Credenciais inválidas ou instrutor não encontrado.');
            }

            if (!data.is_active) {
                throw new Error('Acesso de instrutor inativo. Contate a administração.');
            }

            // Map DB to Teacher Interface
            const teacher: Teacher = {
                id: data.id,
                fullName: data.full_name,
                email: data.email,
                phone: data.phone,
                photoUrl: data.photo_url,
                // ... map other essential fields if needed
                rg: '', cpf: '', birthDate: '', maritalStatus: '', motherName: '',
                address: '', district: '', city: '', state: '', cep: '',
                emergencyContactName: '', emergencyContactPhone: '',
                profession: '', councilNumber: '', isCouncilActive: true, cnpj: '', companyName: '', hasCnpjActive: true,
                academicFormation: '', otherFormation: '', courseType: '', teacherLevel: '', isActive: true,
                bank: '', agency: '', accountNumber: '', accountDigit: '', hasPjAccount: true, pixKeyPj: '', pixKeyPf: '',
                regionAvailability: '', weekAvailability: '', shirtSize: '', hasNotebook: true, hasVehicle: true, hasStudio: false, studioAddress: '',
                additional1: '', valueAdditional1: '', dateAdditional1: '',
                additional2: '', valueAdditional2: '', dateAdditional2: '',
                additional3: '', valueAdditional3: '', dateAdditional3: ''
            };

            if (onInstructorLogin) onInstructorLogin(teacher);
        } else {
            // STUDENT LOGIN
            const cleanCpf = password.replace(/\D/g, '');
            
            const { data: deals, error } = await appBackend.client
                .from('crm_deals')
                .select('*')
                .eq('email', email.trim()); 

            if (error || !deals || deals.length === 0) {
                throw new Error('Aluno não encontrado com este e-mail.');
            }

            const studentDeals = deals.filter((d: any) => {
                const dbCpf = d.cpf ? d.cpf.replace(/\D/g, '') : '';
                return dbCpf === cleanCpf;
            });

            if (studentDeals.length === 0) {
                throw new Error('CPF incorreto.');
            }

            const hasAccess = studentDeals.some((d: any) => d.student_access_enabled !== false);

            if (!hasAccess) {
                throw new Error('Acesso à área do aluno está bloqueado. Contate o suporte.');
            }

            const studentInfo: StudentSession = {
                email: studentDeals[0].email,
                cpf: studentDeals[0].cpf,
                name: studentDeals[0].contact_name,
                deals: studentDeals
            };

            if (onStudentLogin) onStudentLogin(studentInfo);
        }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Invalid login credentials') {
        setError('Email ou senha incorretos.');
      } else if (err.message.includes('VITE_APP_SUPABASE')) {
        setError('Configuração do servidor ausente (VITE_APP_SUPABASE_URL).');
      } else {
         setError(err.message || 'Erro ao realizar login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-white p-8 pb-0 text-center">
          <div className="w-full flex justify-center mb-6">
            <img 
                src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" 
                alt="VOLL Pilates Group" 
                className="h-16 w-auto" 
            />
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6 overflow-x-auto">
              <button 
                onClick={() => { setActiveTab('admin'); setError(null); }}
                className={clsx("flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-2", activeTab === 'admin' ? "bg-white shadow text-teal-700" : "text-slate-500 hover:text-slate-700")}
              >
                  <ShieldCheck size={14} /> Admin
              </button>
              <button 
                onClick={() => { setActiveTab('collaborator'); setError(null); }}
                className={clsx("flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-2", activeTab === 'collaborator' ? "bg-white shadow text-blue-700" : "text-slate-500 hover:text-slate-700")}
              >
                  <Briefcase size={14} /> Equipe
              </button>
              <button 
                onClick={() => { setActiveTab('instructor'); setError(null); }}
                className={clsx("flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-2", activeTab === 'instructor' ? "bg-white shadow text-orange-600" : "text-slate-500 hover:text-slate-700")}
              >
                  <School size={14} /> Instrutor
              </button>
              <button 
                onClick={() => { setActiveTab('student'); setError(null); }}
                className={clsx("flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-2", activeTab === 'student' ? "bg-white shadow text-purple-600" : "text-slate-500 hover:text-slate-700")}
              >
                  <GraduationCap size={14} /> Aluno
              </button>
          </div>

          <h1 className="text-xl font-bold text-slate-800">
            {activeTab === 'admin' ? 'Super Admin' : activeTab === 'collaborator' ? 'Acesso Equipe' : activeTab === 'instructor' ? 'Portal do Instrutor' : 'Área do Aluno'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {activeTab === 'student' ? 'Entre com seu Email e CPF (somente números)' : 'Entre com suas credenciais para continuar'}
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={clsx(
                    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none transition-all focus:ring-2",
                    activeTab === 'admin' ? "focus:ring-teal-500 focus:border-teal-500" : activeTab === 'collaborator' ? "focus:ring-blue-500 focus:border-blue-500" : activeTab === 'instructor' ? "focus:ring-orange-500 focus:border-orange-500" : "focus:ring-purple-500 focus:border-purple-500"
                )}
                placeholder="seu.email@exemplo.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{activeTab === 'student' ? 'CPF (Senha)' : 'Senha'}</label>
              <input
                type={activeTab === 'student' ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={clsx(
                    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none transition-all focus:ring-2",
                    activeTab === 'admin' ? "focus:ring-teal-500 focus:border-teal-500" : activeTab === 'collaborator' ? "focus:ring-blue-500 focus:border-blue-500" : activeTab === 'instructor' ? "focus:ring-orange-500 focus:border-orange-500" : "focus:ring-purple-500 focus:border-purple-500"
                )}
                placeholder={activeTab === 'student' ? "Apenas números" : "••••••••"}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                  "w-full text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-70",
                  activeTab === 'admin' ? "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20" : activeTab === 'collaborator' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" : activeTab === 'instructor' ? "bg-orange-600 hover:bg-orange-700 shadow-orange-600/20" : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center pt-6 border-t border-slate-100">
             <p className="text-xs text-slate-400">
                VOLL Pilates Group &copy; {new Date().getFullYear()} <br/> Todos os direitos reservados.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
