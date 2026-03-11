import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { Teacher } from './TeachersManager';
import { StudentSession, CollaboratorSession, PartnerStudioSession, UserRole } from '../types';
import { InstallPrompt } from './InstallPrompt';

interface DetectedMultiRole {
    cpf: string;
    name: string;
    email: string;
    roles: UserRole[];
}

interface LoginPanelProps {
    onInstructorLogin?: (teacher: Teacher) => void;
    onStudentLogin?: (student: StudentSession) => void;
    onCollaboratorLogin?: (collab: CollaboratorSession) => void;
    onStudioLogin?: (studio: PartnerStudioSession) => void;
    onMultiRoleLogin?: (data: DetectedMultiRole) => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ 
    onInstructorLogin, 
    onStudentLogin, 
    onCollaboratorLogin,
    onStudioLogin,
    onMultiRoleLogin
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectRolesByCpf = async (cpf: string): Promise<UserRole[]> => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length < 11) return [];
    const formatted = `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9,11)}`;
    const cpfOr = `cpf.eq.${clean},cpf.eq.${formatted}`;
    const roles: UserRole[] = [];

    const [instrRes, alunoRes, collabRes, studioRes, franchiseRes] = await Promise.all([
      appBackend.client.from('crm_teachers').select('id').or(cpfOr).eq('is_active', true).limit(1),
      appBackend.client.from('crm_alunos').select('id').or(cpfOr).limit(1),
      appBackend.client.from('crm_collaborators').select('id').or(cpfOr).eq('status', 'active').limit(1),
      appBackend.client.from('crm_partner_studios').select('id').or(cpfOr).in('status', ['active', 'Ativo']).limit(1),
      appBackend.client.from('crm_franchises').select('id').or(cpfOr).limit(1),
    ]);

    if (instrRes.data && instrRes.data.length > 0) roles.push('instructor');
    if (alunoRes.data && alunoRes.data.length > 0) roles.push('student');
    if (collabRes.data && collabRes.data.length > 0) roles.push('collaborator');
    if (studioRes.data && studioRes.data.length > 0) roles.push('partner_studio');
    if (franchiseRes.data && franchiseRes.data.length > 0) roles.push('franchisee');

    return roles;
  };

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
                return;
            }
        } catch (e) {}

        // 2. TENTAR COLABORADOR (Equipe)
        const { data: collab } = await appBackend.client
            .from('crm_collaborators')
            .select('id, full_name, email, password, photo_url, cpf, role_id, status')
            .eq('email', cleanEmail)
            .eq('password', cleanPassword)
            .maybeSingle();

        if (collab && collab.status === 'active' && collab.role_id) {
            const cpf = (collab.cpf || '').replace(/\D/g, '');
            if (cpf.length >= 11 && onMultiRoleLogin) {
                const allRoles = await detectRolesByCpf(cpf);
                if (allRoles.length > 1) {
                    onMultiRoleLogin({ cpf, name: collab.full_name, email: collab.email, roles: allRoles });
                    return;
                }
            }
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

        // 3. TENTAR STUDIO PARCEIRO (email + CPF)
        const inputCpf = cleanPassword.replace(/\D/g, '');

        const { data: studio } = await appBackend.client
            .from('crm_partner_studios')
            .select('id, fantasy_name, responsible_name, email, cnpj, cpf, status')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (studio && (studio.status === 'active' || studio.status === 'Ativo')) {
            const studioCpf = (studio.cpf || '').replace(/\D/g, '');
            if (studioCpf && studioCpf === inputCpf) {
                if (studioCpf.length >= 11 && onMultiRoleLogin) {
                    const allRoles = await detectRolesByCpf(studioCpf);
                    if (allRoles.length > 1) {
                        onMultiRoleLogin({ cpf: studioCpf, name: studio.responsible_name, email: studio.email, roles: allRoles });
                        return;
                    }
                }
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
        }

        // 4. TENTAR INSTRUTOR (email + CPF)
        const { data: instr } = await appBackend.client
            .from('crm_teachers')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (instr && instr.is_active) {
            const instrCpf = (instr.cpf || '').replace(/\D/g, '');
            if (instrCpf && instrCpf === inputCpf) {
                if (instrCpf.length >= 11 && onMultiRoleLogin) {
                    const allRoles = await detectRolesByCpf(instrCpf);
                    if (allRoles.length > 1) {
                        onMultiRoleLogin({ cpf: instrCpf, name: instr.full_name, email: instr.email, roles: allRoles });
                        return;
                    }
                }
                const teacher: Teacher = {
                    id: instr.id, 
                    fullName: instr.full_name, 
                    email: instr.email, 
                    phone: instr.phone, 
                    photoUrl: instr.photo_url,
                    rg: instr.rg || '', 
                    cpf: instr.cpf || '', 
                    birthDate: instr.birth_date || '', 
                    maritalStatus: instr.marital_status || '', 
                    motherName: instr.mother_name || '', 
                    address: instr.address || '', 
                    district: instr.district || '', 
                    city: instr.city || '', 
                    state: instr.state || '', 
                    cep: instr.cep || '', 
                    emergencyContactName: instr.emergency_contact_name || '', 
                    emergencyContactPhone: instr.emergency_contact_phone || '', 
                    profession: instr.profession || '', 
                    councilNumber: instr.council_number || '', 
                    isCouncilActive: !!instr.is_council_active, 
                    cnpj: instr.cnpj || '', 
                    companyName: instr.company_name || '', 
                    hasCnpjActive: !!instr.has_cnpj_active, 
                    academicFormation: instr.academic_formation || '', 
                    otherFormation: instr.other_formation || '', 
                    courseType: instr.course_type || '', 
                    teacherLevel: instr.teacher_level || '', 
                    levelHonorarium: Number(instr.level_honorarium || 0), 
                    isActive: !!instr.is_active, 
                    bank: instr.bank || '', 
                    agency: instr.agency || '', 
                    accountNumber: instr.account_number || '', 
                    accountDigit: instr.account_digit || '', 
                    hasPjAccount: !!instr.has_pj_account, 
                    pixKeyPj: instr.pix_key_pj || '', 
                    pixKeyPf: instr.pix_key_pf || '', 
                    regionAvailability: instr.region_availability || '', 
                    weekAvailability: instr.week_availability || '', 
                    shirtSize: instr.shirt_size || '', 
                    hasNotebook: !!instr.has_notebook, 
                    hasVehicle: !!instr.has_vehicle, 
                    hasStudio: !!instr.has_studio, 
                    studioAddress: instr.studio_address || '', 
                    additional1: instr.additional_1 || '', 
                    valueAdditional1: instr.value_additional_1 || '', 
                    dateAdditional1: instr.date_additional_1 || '', 
                    additional2: instr.additional_2 || '', 
                    valueAdditional2: instr.value_additional_2 || '', 
                    dateAdditional2: instr.date_additional_2 || '', 
                    additional3: instr.additional_3 || '', 
                    valueAdditional3: instr.value_additional_3 || '', 
                    dateAdditional3: instr.date_additional_3 || '',
                    password: instr.password
                };
                if (onInstructorLogin) onInstructorLogin(teacher);
                return;
            }
        }

        // 5. TENTAR ALUNO (email + CPF)
        const cleanCpf = inputCpf;
        const { data: deals } = await appBackend.client
            .from('crm_deals')
            .select('*')
            .eq('email', cleanEmail);

        if (deals && deals.length > 0) {
            const studentDeals = deals.filter((d: any) => (d.cpf ? d.cpf.replace(/\D/g, '') : '') === cleanCpf);
            if (studentDeals.length > 0 && studentDeals.some((d: any) => d.student_access_enabled !== false)) {
                const bestName = studentDeals[0].company_name || studentDeals[0].contact_name || 'Aluno';
                const cpf = cleanCpf;

                if (cpf.length >= 11 && onMultiRoleLogin) {
                    const allRoles = await detectRolesByCpf(cpf);
                    if (allRoles.length > 1) {
                        onMultiRoleLogin({ cpf, name: bestName, email: studentDeals[0].email, roles: allRoles });
                        return;
                    }
                }

                const studentInfo: StudentSession = { 
                    email: studentDeals[0].email, 
                    cpf: studentDeals[0].cpf, 
                    name: bestName, 
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
                Utilize seu <strong>CPF</strong> (apenas números) como senha. Colaboradores utilizam a senha cadastrada.
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
          
          <InstallPrompt />

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