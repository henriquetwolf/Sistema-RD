
import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { Teacher } from './TeachersManager';
import { StudentSession, CollaboratorSession, PartnerStudioSession } from '../types';

interface LoginPanelProps {
    onInstructorLogin?: (teacher: Teacher) => void;
    onStudentLogin?: (student: StudentSession) => void;
    onCollaboratorLogin?: (collab: CollaboratorSession) => void;
    onStudioLogin?: (studio: PartnerStudioSession) => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ 
    onInstructorLogin, 
    onStudentLogin, 
    onCollaboratorLogin,
    onStudioLogin
}) => {
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

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
        // 1. TENTAR SUPER ADMIN (Supabase Auth)
        try {
            const { data, error: authErr } = await appBackend.auth.signIn(cleanEmail, cleanPassword);
            if (data?.user && !authErr) {
                // Se o login foi bem sucedido, o onAuthStateChange no App.tsx cuidará da sessão
                return;
            }
        } catch (e) {
            // Ignora erro e tenta o próximo
        }

        // 2. TENTAR COLABORADOR (Equipe)
        const { data: collab } = await appBackend.client
            .from('crm_collaborators')
            .select('id, full_name, email, password, photo_url, role_id, status')
            .eq('email', cleanEmail)
            .eq('password', cleanPassword)
            .maybeSingle();

        if (collab && collab.status === 'active' && collab.role_id) {
            const { data: roleData } = await appBackend.client
                .from('crm_roles')
                .select('*')
                .eq('id', collab.role_id)
                .single();

            if (roleData) {
                const session: CollaboratorSession = {
                    id: collab.id,
                    name: collab.full_name,
                    email: collab.email,
                    photoUrl: collab.photo_url,
                    role: { id: roleData.id, name: roleData.name, permissions: roleData.permissions || {} }
                };
                if (onCollaboratorLogin) onCollaboratorLogin(session);
                return;
            }
        }

        // 3. TENTAR STUDIO PARCEIRO
        const { data: studio } = await appBackend.client
            .from('crm_partner_studios')
            .select('id, fantasy_name, responsible_name, email, cnpj, status, password')
            .eq('email', cleanEmail)
            .eq('password', cleanPassword)
            .maybeSingle();

        if (studio && studio.status === 'active') {
            const session: PartnerStudioSession = {
                id: studio.id,
                fantasyName: studio.fantasy_name,
                responsibleName: studio.responsible_name,
                email: studio.email,
                cnpj: studio.cnpj
            };
            if (onStudioLogin) onStudioLogin(session);
            return;
        }

        // 4. TENTAR INSTRUTOR
        const { data: instructor } = await appBackend.client
            .from('crm_teachers')
            .select('*')
            .eq('email', cleanEmail)
            .eq('password', cleanPassword)
            .maybeSingle();

        if (instructor && instructor.is_active) {
            const teacher: Teacher = {
                id: instructor.id, fullName: instructor.full_name, email: instructor.email, phone: instructor.phone, photoUrl: instructor.photo_url,
                rg: '', cpf: '', birthDate: '', maritalStatus: '', motherName: '', address: '', district: '', city: '', state: '', cep: '', emergencyContactName: '', emergencyContactPhone: '', profession: '', councilNumber: '', isCouncilActive: true, cnpj: '', companyName: '', hasCnpjActive: true, academicFormation: '', otherFormation: '', courseType: '', teacherLevel: '', levelHonorarium: Number(instructor.level_honorarium || 0), isActive: true, bank: '', agency: '', accountNumber: '', accountDigit: '', hasPjAccount: true, pixKeyPj: '', pixKeyPf: '', regionAvailability: '', weekAvailability: '', shirtSize: '', hasNotebook: true, hasVehicle: true, hasStudio: false, studioAddress: '', additional1: '', valueAdditional1: '', dateAdditional1: '', additional2: '', valueAdditional2: '', dateAdditional2: '', additional3: '', valueAdditional3: '', dateAdditional3: ''
            };
            if (onInstructorLogin) onInstructorLogin(teacher);
            return;
        }

        // 5. TENTAR ALUNO (O password aqui é o CPF limpo)
        const cleanCpf = cleanPassword.replace(/\D/g, '');
        const { data: deals } = await appBackend.client
            .from('crm_deals')
            .select('*')
            .eq('email', cleanEmail);

        if (deals && deals.length > 0) {
            const studentDeals = deals.filter((d: any) => (d.cpf ? d.cpf.replace(/\D/g, '') : '') === cleanCpf);
            if (studentDeals.length > 0 && studentDeals.some((d: any) => d.student_access_enabled !== false)) {
                const studentInfo: StudentSession = { 
                    email: studentDeals[0].email, 
                    cpf: studentDeals[0].cpf, 
                    name: studentDeals[0].contact_name, 
                    deals: studentDeals 
                };
                if (onStudentLogin) onStudentLogin(studentInfo);
                return;
            }
        }

        throw new Error('Credenciais não localizadas. Verifique seu e-mail e senha.');

    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-white p-10 pb-0 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">
            VOLL PILATES GROUP
          </h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">
            Sistema de Gestão Unificado
          </p>
        </div>

        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm flex items-start gap-2 animate-in shake duration-300">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none transition-all focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 font-medium" 
                placeholder="nome@exemplo.com" 
                disabled={isLoading} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Senha ou CPF</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none transition-all focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 font-medium" 
                placeholder="••••••••" 
                disabled={isLoading} 
              />
              <p className="text-[10px] text-slate-400 mt-2 px-1">
                Alunos devem utilizar o <strong>CPF</strong> (apenas números) como senha.
              </p>
            </div>

            <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 mt-4 shadow-xl shadow-teal-600/20 active:scale-95 disabled:opacity-70"
            >
              {isLoading ? <><Loader2 size={20} className="animate-spin" /> Identificando...</> : 'Acessar Sistema'}
            </button>
          </form>
          
          <div className="mt-12 text-center pt-8 border-t border-slate-50">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                VOLL Pilates Group &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
