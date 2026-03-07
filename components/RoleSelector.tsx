import React from 'react';
import { 
  GraduationCap, BookOpen, Store, Building2, Users, Shield,
  ArrowRight, Sparkles 
} from 'lucide-react';
import { AuthenticatedUser, UserRole, USER_ROLE_LABELS } from '../types';

interface RoleSelectorProps {
  user: AuthenticatedUser;
  onSelect: (role: UserRole) => void;
  onLogout: () => void;
  logoUrl?: string;
}

const ROLE_CONFIG: Record<UserRole, { icon: React.ElementType; color: string; bg: string; border: string; description: string }> = {
  admin: {
    icon: Shield,
    color: 'text-slate-700',
    bg: 'bg-slate-50 hover:bg-slate-100',
    border: 'border-slate-200 hover:border-slate-400',
    description: 'Acesso total ao painel administrativo',
  },
  collaborator: {
    icon: Users,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 hover:bg-indigo-100',
    border: 'border-indigo-200 hover:border-indigo-400',
    description: 'Módulos conforme seu perfil de acesso',
  },
  instructor: {
    icon: GraduationCap,
    color: 'text-teal-600',
    bg: 'bg-teal-50 hover:bg-teal-100',
    border: 'border-teal-200 hover:border-teal-400',
    description: 'Turmas, contratos e canal de atendimento',
  },
  student: {
    icon: BookOpen,
    color: 'text-amber-600',
    bg: 'bg-amber-50 hover:bg-amber-100',
    border: 'border-amber-200 hover:border-amber-400',
    description: 'Cursos, certificados, eventos e tutor IA',
  },
  franchisee: {
    icon: Store,
    color: 'text-purple-600',
    bg: 'bg-purple-50 hover:bg-purple-100',
    border: 'border-purple-200 hover:border-purple-400',
    description: 'Dashboard da franquia e indicadores',
  },
  partner_studio: {
    icon: Building2,
    color: 'text-rose-600',
    bg: 'bg-rose-50 hover:bg-rose-100',
    border: 'border-rose-200 hover:border-rose-400',
    description: 'Estoque, turmas e contratos do studio',
  },
};

export const RoleSelector: React.FC<RoleSelectorProps> = ({ user, onSelect, onLogout, logoUrl }) => {
  const activeRoles = user.roles.filter(r => r.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {logoUrl && (
          <div className="flex justify-center mb-8">
            <img src={logoUrl} alt="Logo" className="h-12 max-w-[200px] object-contain" />
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold mb-4">
              <Sparkles size={12} /> {activeRoles.length} {activeRoles.length === 1 ? 'perfil disponível' : 'perfis disponíveis'}
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-1">
              Olá, {user.profile.full_name?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="text-sm text-slate-500">
              Escolha como deseja acessar o sistema
            </p>
          </div>

          <div className="space-y-3">
            {activeRoles.map(roleEntry => {
              const config = ROLE_CONFIG[roleEntry.role];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <button
                  key={roleEntry.id}
                  onClick={() => onSelect(roleEntry.role)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 group ${config.bg} ${config.border}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color} bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-slate-800">
                      {USER_ROLE_LABELS[roleEntry.role]}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
                    {roleEntry.permission_role_name && (
                      <span className="inline-block mt-1 text-[10px] font-bold bg-white/80 text-slate-500 px-2 py-0.5 rounded">
                        Perfil: {roleEntry.permission_role_name}
                      </span>
                    )}
                  </div>
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors"
            >
              Sair da conta
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-300 mt-6">
          CPF: {user.profile.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
        </p>
      </div>
    </div>
  );
};
