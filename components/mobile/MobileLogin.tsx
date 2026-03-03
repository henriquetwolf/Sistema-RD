import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Fingerprint, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { appBackend } from '../../services/appBackend';
import { biometricService } from '../../services/biometricService';
import { platformService } from '../../services/platformService';
import { Teacher } from '../TeachersManager';
import { StudentSession } from '../../types';
import { VOLL_LOGO_BASE64 } from '../../utils/constants';

interface MobileLoginProps {
  onInstructorLogin: (teacher: Teacher) => void;
  onStudentLogin: (student: StudentSession) => void;
  logoUrl?: string;
}

export const MobileLogin: React.FC<MobileLoginProps> = ({
  onInstructorLogin,
  onStudentLogin,
  logoUrl,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometria');
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const available = await biometricService.isAvailable();
    setBiometricAvailable(available);
    if (available) {
      const type = await biometricService.getBiometryType();
      setBiometricType(type);
      const creds = await biometricService.getCredentials();
      if (creds) {
        handleBiometricLogin();
      }
    }
  };

  const handleBiometricLogin = async () => {
    const authenticated = await biometricService.authenticate();
    if (!authenticated) return;

    const creds = await biometricService.getCredentials();
    if (!creds) return;

    setEmail(creds.email);
    setPassword(creds.password);
    await doLogin(creds.email, creds.password);
  };

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setIsLoading(true);
    setError(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    try {
      const { data: instructorData } = await appBackend.client
        .from('crm_teachers')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password', cleanPassword)
        .maybeSingle();

      if (instructorData) {
        const teacher: Teacher = {
          id: instructorData.id,
          fullName: instructorData.full_name || '',
          socialName: instructorData.social_name || '',
          email: instructorData.email || '',
          phone: instructorData.phone || '',
          cpf: instructorData.cpf || '',
          rg: instructorData.rg || '',
          birthDate: instructorData.birth_date || '',
          address: instructorData.address || '',
          cep: instructorData.cep || '',
          city: instructorData.city || '',
          state: instructorData.state || '',
          specialty: instructorData.specialty || '',
          crefito: instructorData.crefito || '',
          levelId: instructorData.level_id || '',
          status: instructorData.status || 'active',
          photoUrl: instructorData.photo_url || '',
          password: '',
        };

        if (biometricAvailable && !await biometricService.getCredentials()) {
          setPendingCredentials({ email: cleanEmail, password: cleanPassword });
          setShowBiometricPrompt(true);
          sessionStorage.setItem('instructor_session', JSON.stringify(teacher));
          setTimeout(() => {
            onInstructorLogin(teacher);
          }, 100);
          return;
        }

        sessionStorage.setItem('instructor_session', JSON.stringify(teacher));
        onInstructorLogin(teacher);
        return;
      }

      const { data: studentDeals } = await appBackend.client
        .from('crm_deals')
        .select('*')
        .eq('email', cleanEmail);

      if (studentDeals && studentDeals.length > 0) {
        const firstDeal = studentDeals[0];
        const storedPassword = firstDeal.password || firstDeal.cpf?.replace(/\D/g, '') || '';

        if (cleanPassword === storedPassword || cleanPassword === firstDeal.cpf?.replace(/\D/g, '')) {
          const session: StudentSession = {
            name: firstDeal.contact_name || firstDeal.company_name || 'Aluno',
            email: cleanEmail,
            deals: studentDeals,
          };

          if (biometricAvailable && !await biometricService.getCredentials()) {
            setPendingCredentials({ email: cleanEmail, password: cleanPassword });
            setShowBiometricPrompt(true);
            sessionStorage.setItem('student_session', JSON.stringify(session));
            setTimeout(() => {
              onStudentLogin(session);
            }, 100);
            return;
          }

          sessionStorage.setItem('student_session', JSON.stringify(session));
          onStudentLogin(session);
          return;
        }
      }

      setError('Email ou senha incorretos. Verifique e tente novamente.');
    } catch (e: any) {
      setError('Erro ao conectar. Verifique sua conexão com a internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    await doLogin(email, password);
  };

  const handleSaveBiometric = async () => {
    if (pendingCredentials) {
      await biometricService.saveCredentials(pendingCredentials.email, pendingCredentials.password);
    }
    setShowBiometricPrompt(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-600 to-indigo-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src={logoUrl || VOLL_LOGO_BASE64}
            alt="VOLL Pilates"
            className="h-16 mx-auto mb-4 brightness-0 invert"
          />
          <p className="text-teal-100 text-sm">Acesse sua conta</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                Senha
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {biometricAvailable && (
            <button
              onClick={handleBiometricLogin}
              className="w-full mt-3 bg-slate-50 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 active:bg-slate-100"
            >
              <Fingerprint size={20} className="text-teal-600" />
              Entrar com {biometricType}
            </button>
          )}
        </div>
      </div>

      {showBiometricPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10 animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fingerprint size={32} className="text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Ativar {biometricType}?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Na próxima vez, entre sem digitar senha
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleSaveBiometric}
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl active:bg-teal-700"
              >
                Ativar {biometricType}
              </button>
              <button
                onClick={() => setShowBiometricPrompt(false)}
                className="w-full text-slate-500 font-medium py-3 rounded-xl active:bg-slate-50"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
