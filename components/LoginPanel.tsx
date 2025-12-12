import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { appBackend } from '../services/appBackend';

export const LoginPanel: React.FC = () => {
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
      await appBackend.auth.signIn(email, password);
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
          <h1 className="text-xl font-bold text-slate-800">
            Acesso ao Sistema
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Entre com suas credenciais para continuar
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                placeholder="seu.nome@voll.com.br"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-70 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-teal-600/20"
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