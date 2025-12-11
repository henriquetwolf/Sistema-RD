import React, { useState } from 'react';
import { LogIn, Loader2, AlertCircle, Settings } from 'lucide-react';
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
      // App.tsx auth listener will handle the redirection
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
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 text-white">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Bem-vindo
          </h1>
          <p className="text-indigo-100 mt-2 text-sm">
            Faça login para acessar o sincronizador
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="seu@email.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
             <p className="text-xs text-slate-400">
                Este app requer VITE_APP_SUPABASE_URL e VITE_APP_SUPABASE_ANON_KEY configurados no ambiente.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};