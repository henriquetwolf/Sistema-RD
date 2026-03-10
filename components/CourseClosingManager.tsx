import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Search, ChevronLeft, X, CheckCircle, Clock, XCircle,
  ExternalLink, DollarSign, User, MapPin, Calendar, Landmark,
  FileText, Eye, Filter, RefreshCw, Save, AlertCircle, Database, AlertTriangle
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { CourseClosing, CourseClosingExpense } from '../types';
import clsx from 'clsx';

interface CourseClosingManagerProps {
  onBack: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={12} /> },
  aprovado: { label: 'Aprovado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle size={12} /> },
  rejeitado: { label: 'Rejeitado', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle size={12} /> },
};

type DiagStatus = 'checking' | 'ok' | 'table_missing' | 'error';

export const CourseClosingManager: React.FC<CourseClosingManagerProps> = ({ onBack }) => {
  const [closings, setClosings] = useState<CourseClosing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [diagStatus, setDiagStatus] = useState<DiagStatus>('checking');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClosing, setSelectedClosing] = useState<CourseClosing | null>(null);
  const [expenses, setExpenses] = useState<CourseClosingExpense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { runDiagnosticAndFetch(); }, []);

  const runDiagnosticAndFetch = async () => {
    setIsLoading(true);
    setFetchError('');
    setDiagStatus('checking');
    try {
      const result = await appBackend.client
        .from('crm_course_closings')
        .select('id', { count: 'exact', head: true });

      if (result.error) {
        const msg = result.error.message || '';
        console.error('[CourseClosingManager] Diagnostic error:', result.error);
        if (msg.includes('does not exist') || msg.includes('relation') || result.error.code === '42P01') {
          setDiagStatus('table_missing');
          setFetchError('A tabela crm_course_closings não existe no banco de dados.');
        } else {
          setDiagStatus('error');
          setFetchError(`Erro do Supabase: ${msg} (code: ${result.error.code})`);
        }
        setIsLoading(false);
        return;
      }

      setDiagStatus('ok');
      console.log(`[CourseClosingManager] Tabela OK. Total de registros: ${result.count}`);

      const { data, error } = await appBackend.client
        .from('crm_course_closings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(`Erro ao buscar dados: ${error.message}`);
      } else {
        setClosings(data || []);
        console.log(`[CourseClosingManager] Dados carregados: ${(data || []).length} fechamento(s)`);
      }
    } catch (err: any) {
      console.error('[CourseClosingManager] Erro inesperado:', err);
      setDiagStatus('error');
      setFetchError(err.message || 'Erro inesperado ao conectar com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (closing: CourseClosing) => {
    setSelectedClosing(closing);
    setEditStatus(closing.status);
    setEditNotes(closing.admin_notes || '');
    setIsLoadingExpenses(true);
    try {
      const data = await appBackend.fetchCourseClosingExpenses(closing.id);
      setExpenses(data);
    } catch (err: any) {
      console.error('[CourseClosingManager] Erro despesas:', err);
      setExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedClosing) return;
    setIsSaving(true);
    try {
      await appBackend.updateCourseClosingStatus(selectedClosing.id, editStatus, editNotes);
      setClosings(prev => prev.map(c => c.id === selectedClosing.id ? { ...c, status: editStatus as any, admin_notes: editNotes } : c));
      setSelectedClosing(prev => prev ? { ...prev, status: editStatus as any, admin_notes: editNotes } : null);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (d: string) => {
    if (!d) return '--';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const filtered = useMemo(() => {
    return closings.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          c.instructor_name.toLowerCase().includes(q) ||
          c.course_name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.class_code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [closings, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: closings.length,
    pendente: closings.filter(c => c.status === 'pendente').length,
    aprovado: closings.filter(c => c.status === 'aprovado').length,
    rejeitado: closings.filter(c => c.status === 'rejeitado').length,
  }), [closings]);

  const migrationSQL = `-- Execute este SQL no Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS crm_course_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id TEXT NOT NULL,
    instructor_name TEXT NOT NULL,
    instructor_email TEXT DEFAULT '',
    instructor_phone TEXT DEFAULT '',
    class_id TEXT NOT NULL,
    class_code TEXT DEFAULT '',
    course_name TEXT DEFAULT '',
    city TEXT DEFAULT '',
    class_number TEXT DEFAULT '',
    date_start DATE,
    date_end DATE,
    pix_key TEXT DEFAULT '',
    bank TEXT DEFAULT '',
    agency TEXT DEFAULT '',
    account TEXT DEFAULT '',
    account_holder TEXT DEFAULT '',
    status TEXT DEFAULT 'pendente',
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_course_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_course_closings" ON crm_course_closings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_course_closings"  ON crm_course_closings FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS crm_course_closing_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_id UUID NOT NULL REFERENCES crm_course_closings(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC(12,2) DEFAULT 0,
    receipt_url TEXT DEFAULT '',
    observation TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_closing_expenses ON crm_course_closing_expenses(closing_id);
ALTER TABLE crm_course_closing_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_closing_expenses" ON crm_course_closing_expenses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_closing_expenses"  ON crm_course_closing_expenses FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('course-closings', 'course-closings', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "course_closings_public_read" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'course-closings');
CREATE POLICY "course_closings_anon_insert" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'course-closings');
CREATE POLICY "course_closings_anon_update" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'course-closings');
CREATE POLICY "course_closings_anon_delete" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'course-closings');`;

  if (diagStatus === 'table_missing') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><ChevronLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Fechamento de Curso</h1>
            <p className="text-sm text-slate-400 font-medium">Configuração necessária</p>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Database size={28} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-800">Tabelas não encontradas</h2>
              <p className="text-amber-700 text-sm mt-1">
                As tabelas <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">crm_course_closings</code> e
                <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs ml-1">crm_course_closing_expenses</code> precisam ser criadas no Supabase.
              </p>
              <p className="text-amber-600 text-xs mt-3 font-bold">
                Siga os passos abaixo para configurar:
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm font-bold text-amber-800">
              <span className="w-7 h-7 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 font-black text-xs">1</span>
              Acesse o painel do Supabase do projeto
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-amber-800">
              <span className="w-7 h-7 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 font-black text-xs">2</span>
              Vá em <span className="bg-amber-200 px-2 py-0.5 rounded text-xs">SQL Editor</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-amber-800">
              <span className="w-7 h-7 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 font-black text-xs">3</span>
              Cole o SQL abaixo e clique em <span className="bg-amber-200 px-2 py-0.5 rounded text-xs">Run</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => { navigator.clipboard.writeText(migrationSQL); alert('SQL copiado para a área de transferência!'); }}
              className="absolute top-3 right-3 bg-amber-200 hover:bg-amber-300 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors z-10"
            >
              Copiar SQL
            </button>
            <pre className="bg-slate-900 text-green-400 p-5 rounded-xl text-xs overflow-x-auto max-h-[300px] overflow-y-auto font-mono leading-relaxed">
              {migrationSQL}
            </pre>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <span className="w-7 h-7 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 font-black text-xs">4</span>
              Após executar, clique:
            </div>
            <button
              onClick={runDiagnosticAndFetch}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm active:scale-95"
            >
              <RefreshCw size={14} /> Verificar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><ChevronLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Fechamento de Curso</h1>
            <p className="text-sm text-slate-400 font-medium">Informe de custos enviados pelos instrutores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {diagStatus === 'ok' && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle size={10} /> Conectado
            </span>
          )}
          {diagStatus === 'error' && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
              <AlertTriangle size={10} /> Erro
            </span>
          )}
          <button onClick={runDiagnosticAndFetch} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl transition-colors">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
          <p className="text-[10px] font-black text-amber-600 uppercase">Pendentes</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{stats.pendente}</p>
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
          <p className="text-[10px] font-black text-emerald-600 uppercase">Aprovados</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.aprovado}</p>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-200">
          <p className="text-[10px] font-black text-red-600 uppercase">Rejeitados</p>
          <p className="text-2xl font-black text-red-700 mt-1">{stats.rejeitado}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por instrutor, curso, cidade ou turma..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          {['all', 'pendente', 'aprovado', 'rejeitado'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                "px-3 py-2 rounded-lg text-xs font-bold border transition-all",
                statusFilter === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
              )}
            >
              {s === 'all' ? 'Todos' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {fetchError && diagStatus !== 'table_missing' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">Erro ao carregar dados</p>
            <p className="text-red-600 text-xs mt-1 font-mono">{fetchError}</p>
            <button onClick={runDiagnosticAndFetch} className="mt-3 text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1">
              <RefreshCw size={12} /> Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : fetchError ? null : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-700">Nenhum fechamento encontrado</h3>
          <p className="text-slate-400 text-sm mt-2">
            {searchTerm || statusFilter !== 'all' ? 'Tente ajustar os filtros.' : 'Os instrutores ainda não enviaram fechamentos.'}
          </p>
          {diagStatus === 'ok' && !searchTerm && statusFilter === 'all' && (
            <p className="text-emerald-500 text-xs mt-4 font-bold flex items-center justify-center gap-1">
              <CheckCircle size={12} /> Tabela conectada e pronta para receber dados
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Instrutor</th>
                  <th className="px-4 py-3 text-left">Curso / Turma</th>
                  <th className="px-4 py-3 text-left">Cidade</th>
                  <th className="px-4 py-3 text-center">Período</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Data Envio</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-700">{c.instructor_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.instructor_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-700 truncate max-w-[200px]">{c.course_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">#{c.class_code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">{c.city || '--'}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-600">
                      {formatDate(c.date_start)} — {formatDate(c.date_end)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx("inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full border uppercase", STATUS_CONFIG[c.status]?.color || 'bg-slate-50 text-slate-500 border-slate-200')}>
                        {STATUS_CONFIG[c.status]?.icon} {STATUS_CONFIG[c.status]?.label || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '--'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetails(c)}
                        className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t text-xs font-bold text-slate-500">
            {filtered.length} registro(s)
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedClosing && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 overflow-hidden">
            <div className="px-8 py-6 border-b bg-gradient-to-r from-indigo-600 to-purple-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white">Detalhes do Fechamento</h2>
                <p className="text-indigo-200 text-xs font-medium mt-1">
                  {selectedClosing.course_name} — #{selectedClosing.class_code}
                </p>
              </div>
              <button onClick={() => setSelectedClosing(null)} className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                  <User size={14} className="text-purple-600" /> Dados do Instrutor
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Nome</p>
                    <p className="text-sm font-bold text-slate-700">{selectedClosing.instructor_name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Email</p>
                    <p className="text-sm font-bold text-slate-700">{selectedClosing.instructor_email || '--'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Celular</p>
                    <p className="text-sm font-bold text-slate-700">{selectedClosing.instructor_phone || '--'}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-600" /> Dados do Curso
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cidade / Turma</p>
                    <p className="text-sm font-bold text-slate-700">{selectedClosing.city} #{selectedClosing.class_code}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Curso</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{selectedClosing.course_name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Início</p>
                    <p className="text-sm font-bold text-slate-700">{formatDate(selectedClosing.date_start)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Término</p>
                    <p className="text-sm font-bold text-slate-700">{formatDate(selectedClosing.date_end)}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                  <DollarSign size={14} className="text-emerald-600" /> Despesas
                </h3>
                {isLoadingExpenses ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400">Nenhuma despesa informada</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Categoria</th>
                          <th className="px-4 py-2.5 text-right">Valor</th>
                          <th className="px-4 py-2.5 text-left">Observação</th>
                          <th className="px-4 py-2.5 text-center">Comprovante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {expenses.map(ex => (
                          <tr key={ex.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-700">{ex.category}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(ex.amount)}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{ex.observation || '--'}</td>
                            <td className="px-4 py-3 text-center">
                              {ex.receipt_url ? (
                                <a href={ex.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                                  <ExternalLink size={12} /> Ver
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">--</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t">
                        <tr>
                          <td className="px-4 py-3 font-black text-xs text-slate-500 uppercase">Total</td>
                          <td className="px-4 py-3 text-right font-black text-slate-800">
                            {formatCurrency(expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                  <Landmark size={14} className="text-blue-600" /> Dados Bancários
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 md:col-span-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Chave PIX</p>
                    <p className="text-sm font-bold text-slate-700 break-all">{selectedClosing.pix_key || '--'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Banco</p>
                    <p className="text-sm font-bold text-slate-700">{selectedClosing.bank || '--'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Agência</p>
                    <p className="text-sm font-bold text-slate-700">{selectedClosing.agency || '--'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Conta</p>
                    <p className="text-sm font-bold text-slate-700">{selectedClosing.account || '--'}</p>
                  </div>
                </div>
                {selectedClosing.account_holder && (
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-500 uppercase mb-0.5">Titular (conta conjunta)</p>
                    <p className="text-sm font-bold text-blue-700">{selectedClosing.account_holder}</p>
                  </div>
                )}
              </section>

              <section className="space-y-3 bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.15em] flex items-center gap-2">
                  <AlertCircle size={14} /> Gerenciar Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="rejeitado">Rejeitado</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Observações do Admin</label>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      rows={2}
                      placeholder="Adicione observações..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveStatus}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50 active:scale-95"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar Alterações
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
