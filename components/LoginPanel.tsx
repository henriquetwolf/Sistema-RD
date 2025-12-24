
import React, { useState } from 'react';
import { Loader2, AlertCircle, School, ShieldCheck, GraduationCap, Briefcase, Building2, UserCircle } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { Teacher } from './TeachersManager';
import { StudentSession, CollaboratorSession, PartnerStudioSession } from '../types';
import clsx from 'clsx';

interface LoginPanelProps {
    onInstructorLogin?: (teacher: Teacher) => void;
    onStudentLogin?: (student: StudentSession) => void;
    onCollaboratorLogin?: (collab: CollaboratorSession) => void;
    onStudioLogin?: (studio: PartnerStudioSession) => void;
    onGuestAccess: () => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ 
    onInstructorLogin, 
    onStudentLogin, 
    onCollaboratorLogin,
    onStudioLogin,
    onGuestAccess
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'collaborator' | 'instructor' | 'student' | 'studio'>('admin');
  
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
            await appBackend.auth.signIn(email, password);
        } else if (activeTab === 'collaborator') {
            const { data, error } = await appBackend.client
                .from('crm_collaborators')
                .select('id, full_name, email, password, photo_url, role_id, status')
                .eq('email', email.trim())
                .eq('password', password.trim())
                .single();

            if (error || !data) throw new Error('Credenciais inválidas ou colaborador não encontrado.');
            if (data.status !== 'active') throw new Error('Acesso bloqueado pelo administrador.');
            if (!data.role_id) throw new Error('Este usuário não tem permissão configurada.');

            const { data: roleData, error: roleError } = await appBackend.client
                .from('crm_roles')
                .select('*')
                .eq('id', data.role_id)
                .single();

            if (roleError || !roleData) throw new Error('Erro ao carregar permissões.');

            const session: CollaboratorSession = {
                id: data.id,
                name: data.full_name,
                email: data.email,
                photoUrl: data.photo_url,
                role: { id: roleData.id, name: roleData.name, permissions: roleData.permissions || {} }
            };
            if (onCollaboratorLogin) onCollaboratorLogin(session);

        } else if (activeTab === 'instructor') {
            const { data, error } = await appBackend.client
                .from('crm_teachers')
                .select('*')
                .eq('email', email.trim())
                .eq('password', password.trim())
                .single();

            if (error || !data) throw new Error('Credenciais inválidas.');
            if (!data.is_active) throw new Error('Acesso de instrutor inativo.');

            const teacher: Teacher = {
                id: data.id, fullName: data.full_name, email: data.email, phone: data.phone, photoUrl: data.photo_url,
                rg: '', cpf: '', birthDate: '', maritalStatus: '', motherName: '', address: '', district: '', city: '', state: '', cep: '', emergencyContactName: '', emergencyContactPhone: '', profession: '', councilNumber: '', isCouncilActive: true, cnpj: '', companyName: '', hasCnpjActive: true, academicFormation: '', otherFormation: '', courseType: '', teacherLevel: '', levelHonorarium: Number(data.level_honorarium || 0), isActive: true, bank: '', agency: '', accountNumber: '', accountDigit: '', hasPjAccount: true, pixKeyPj: '', pixKeyPf: '', regionAvailability: '', weekAvailability: '', shirtSize: '', hasNotebook: true, hasVehicle: true, hasStudio: false, studioAddress: '', additional1: '', valueAdditional1: '', dateAdditional1: '', additional2: '', valueAdditional2: '', dateAdditional2: '', additional3: '', valueAdditional3: '', dateAdditional3: ''
            };
            if (onInstructorLogin) onInstructorLogin(teacher);

        } else if (activeTab === 'student') {
            const cleanCpf = password.replace(/\D/g, '');
            const { data: deals, error } = await appBackend.client.from('crm_deals').select('*').eq('email', email.trim()); 
            if (error || !deals || deals.length === 0) throw new Error('Aluno não encontrado.');

            const studentDeals = deals.filter((d: any) => (d.cpf ? d.cpf.replace(/\D/g, '') : '') === cleanCpf);
            if (studentDeals.length === 0) throw new Error('CPF incorreto.');
            if (!studentDeals.some((d: any) => d.student_access_enabled !== false)) throw new Error('Acesso bloqueado.');

            const studentInfo: StudentSession = { email: studentDeals[0].email, cpf: studentDeals[0].cpf, name: studentDeals[0].contact_name, deals: studentDeals };
            if (onStudentLogin) onStudentLogin(studentInfo);

        } else if (activeTab === 'studio') {
            const { data, error } = await appBackend.client
                .from('crm_partner_studios')
                .select('id, fantasy_name, responsible_name, email, cnpj, status, password')
                .eq('email', email.trim())
                .eq('password', password.trim())
                .single();

            if (error || !data) throw new Error('E-mail ou Senha incorretos para este Studio.');
            if (data.status !== 'active') throw new Error('Este studio está inativo no sistema.');
            
            const session: PartnerStudioSession = {
                id: data.id,
                fantasyName: data.fantasy_name,
                responsibleName: data.responsible_name,
                email: data.email,
                cnpj: data.cnpj
            };
            if (onStudioLogin) onStudioLogin(session);
        }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-white p-8 pb-0 text-center">
          <div className="w-full flex justify-center mb-6">
            <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-16 w-auto" />
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6 overflow-x-auto no-scrollbar">
              <button onClick={() => { setActiveTab('admin'); setError(null); }} className={clsx("flex-1 py-2 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-3", activeTab === 'admin' ? "bg-white shadow text-teal-700" : "text-slate-500")}><ShieldCheck size={12} /> Admin</button>
              <button onClick={() => { setActiveTab('collaborator'); setError(null); }} className={clsx("flex-1 py-2 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-3", activeTab === 'collaborator' ? "bg-white shadow text-blue-700" : "text-slate-500")}><Briefcase size={12} /> Equipe</button>
              <button onClick={() => { setActiveTab('studio'); setError(null); }} className={clsx("flex-1 py-2 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-3", activeTab === 'studio' ? "bg-white shadow text-teal-600" : "text-slate-500")}><Building2 size={12} /> Studio</button>
              <button onClick={() => { setActiveTab('instructor'); setError(null); }} className={clsx("flex-1 py-2 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-3", activeTab === 'instructor' ? "bg-white shadow text-orange-600" : "text-slate-500")}><School size={12} /> Instrutor</button>
              <button onClick={() => { setActiveTab('student'); setError(null); }} className={clsx("flex-1 py-2 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap px-3", activeTab === 'student' ? "bg-white shadow text-purple-600" : "text-slate-500")}><GraduationCap size={12} /> Aluno</button>
          </div>

          <h1 className="text-xl font-bold text-slate-800">
            {activeTab === 'admin' ? 'Super Admin' : activeTab === 'collaborator' ? 'Acesso Equipe' : activeTab === 'instructor' ? 'Portal do Instrutor' : activeTab === 'studio' ? 'Portal do Studio' : 'Área do Aluno'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {activeTab === 'student' ? 'E-mail e CPF (números)' : 'Credenciais de acesso'}
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex flex-col gap-2">
                <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
                {error.includes("não configurado") && (
                    <div className="pt-2 border-t border-red-100">
                        <p className="text-[10px] uppercase font-bold text-red-400">Sugestão:</p>
                        <p className="text-xs text-slate-600">Se você quer apenas usar o <b>Importador de CSV</b> para sincronizar dados, clique no botão "Acessar como Convidado" abaixo.</p>
                    </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none transition-all focus:ring-2 focus:ring-teal-500" placeholder="seu.email@exemplo.com" disabled={isLoading} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {activeTab === 'student' ? 'CPF' : 'Senha'}
              </label>
              <input type={activeTab === 'student' ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none transition-all focus:ring-2 focus:ring-teal-500" placeholder={activeTab === 'student' ? "Apenas números" : "••••••••"} disabled={isLoading} />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-70">
              {isLoading ? <><Loader2 size={20} className="animate-spin" /> Verificando...</> : 'Entrar'}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
              <button 
                onClick={onGuestAccess}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
              >
                  <UserCircle size={16} /> Acessar como Convidado (Modo CSV)
              </button>
          </div>

          <div className="mt-8 text-center"><p className="text-xs text-slate-400">VOLL Pilates Group &copy; {new Date().getFullYear()}</p></div>
        </div>
      </div>
    </div>
  );
};
