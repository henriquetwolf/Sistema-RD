import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Search, ChevronLeft, X, CheckCircle, Clock, XCircle,
  ExternalLink, DollarSign, User, MapPin, Building2,
  FileText, Filter, RefreshCw, Save, AlertCircle, Database, AlertTriangle
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { CourseRental, CourseRentalReceipt } from '../types';
import clsx from 'clsx';

interface CourseRentalManagerProps {
  onBack: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={12} /> },
  aprovado: { label: 'Aprovado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle size={12} /> },
  rejeitado: { label: 'Rejeitado', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle size={12} /> },
};

const RENTAL_TYPE_LABELS: Record<string, string> = {
  aluguel: 'Apenas Aluguel',
  intervalo: 'Apenas Intervalo',
  aluguel_intervalo: 'Aluguel + Intervalo',
};

type DiagStatus = 'checking' | 'ok' | 'table_missing' | 'error';

export const CourseRentalManager: React.FC<CourseRentalManagerProps> = ({ onBack }) => {
  const [rentals, setRentals] = useState<CourseRental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [diagStatus, setDiagStatus] = useState<DiagStatus>('checking');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRental, setSelectedRental] = useState<CourseRental | null>(null);
  const [receipts, setReceipts] = useState<CourseRentalReceipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
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
        .from('crm_course_rentals')
        .select('id', { count: 'exact', head: true });

      if (result.error) {
        const msg = result.error.message || '';
        if (msg.includes('does not exist') || msg.includes('relation') || result.error.code === '42P01') {
          setDiagStatus('table_missing');
          setFetchError('A tabela crm_course_rentals não existe no banco de dados.');
        } else {
          setDiagStatus('error');
          setFetchError(`Erro do Supabase: ${msg}`);
        }
        setIsLoading(false);
        return;
      }

      setDiagStatus('ok');
      const data = await appBackend.fetchCourseRentals();
      setRentals(data);
    } catch (err: any) {
      setDiagStatus('error');
      setFetchError(err.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (rental: CourseRental) => {
    setSelectedRental(rental);
    setEditStatus(rental.status);
    setEditNotes(rental.admin_notes || '');
    setIsLoadingReceipts(true);
    try {
      const data = await appBackend.fetchCourseRentalReceipts(rental.id);
      setReceipts(data);
    } catch (err: any) {
      setReceipts([]);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedRental) return;
    setIsSaving(true);
    try {
      await appBackend.updateCourseRentalStatus(selectedRental.id, editStatus, editNotes);
      setRentals(prev => prev.map(r => r.id === selectedRental.id ? { ...r, status: editStatus as any, admin_notes: editNotes } : r));
      setSelectedRental(prev => prev ? { ...prev, status: editStatus as any, admin_notes: editNotes } : null);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (d: string) => {
    if (!d) return '--';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '--'; }
  };

  const filteredRentals = useMemo(() => {
    return rentals.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          r.responsible_name.toLowerCase().includes(term) ||
          r.studio_name.toLowerCase().includes(term) ||
          r.course_name.toLowerCase().includes(term) ||
          r.class_code.toLowerCase().includes(term) ||
          r.city.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [rentals, statusFilter, searchTerm]);

  const stats = useMemo(() => ({
    total: rentals.length,
    pendente: rentals.filter(r => r.status === 'pendente').length,
    aprovado: rentals.filter(r => r.status === 'aprovado').length,
    rejeitado: rentals.filter(r => r.status === 'rejeitado').length,
  }), [rentals]);

  if (diagStatus === 'table_missing') {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 mb-6">
          <ChevronLeft size={16} /> Voltar
        </button>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center">
          <Database size={48} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-black text-amber-800 mb-2">Tabela Não Encontrada</h2>
          <p className="text-sm text-amber-700 mb-6">
            Execute a migration <strong>037_course_rental.sql</strong> no SQL Editor do Supabase.
          </p>
          <button onClick={runDiagnosticAndFetch} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 mx-auto text-sm">
            <RefreshCw size={14} /> Verificar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Building2 size={28} className="text-teal-600" /> Aluguel de Curso
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {diagStatus === 'ok' && <span className="text-teal-600">Conectado</span>}
              {diagStatus === 'error' && <span className="text-red-500">Erro: {fetchError}</span>}
              {' '} — {stats.total} registro{stats.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={runDiagnosticAndFetch} disabled={isLoading} className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-800 bg-slate-50 border-slate-200' },
          { label: 'Pendentes', value: stats.pendente, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Aprovados', value: stats.aprovado, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Rejeitados', value: stats.rejeitado, color: 'text-red-700 bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={clsx("p-4 rounded-2xl border text-center", s.color)}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por studio, curso, cidade..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
          {['all', 'pendente', 'aprovado', 'rejeitado'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", statusFilter === s ? "bg-white shadow text-slate-800" : "text-slate-400 hover:text-slate-600")}
            >
              {s === 'all' ? 'Todos' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
      ) : filteredRentals.length === 0 ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-700">Nenhum aluguel encontrado</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 font-medium">
            Quando um Studio Parceiro enviar uma solicitação de aluguel, ela aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRentals.map(rental => {
            const sc = STATUS_CONFIG[rental.status] || STATUS_CONFIG.pendente;
            return (
              <div key={rental.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-sm font-black text-slate-800 truncate">{rental.studio_name}</h3>
                      <span className="text-[9px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">#{rental.class_code}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1"><User size={11} /> {rental.responsible_name}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} className="text-teal-500" /> {rental.city}</span>
                      <span>{rental.course_name}</span>
                      <span className="font-bold text-slate-700">{formatCurrency(Number(rental.rental_value))}</span>
                      <span className="text-slate-400">{formatDate(rental.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={clsx("text-[9px] font-black px-3 py-1.5 rounded-full border uppercase flex items-center gap-1", sc.color)}>
                      {sc.icon} {sc.label}
                    </span>
                    <button
                      onClick={() => handleViewDetails(rental)}
                      className="px-4 py-2 bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <ExternalLink size={12} /> Detalhes
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRental && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl my-8 animate-in zoom-in-95 overflow-hidden">
            <div className="px-8 py-6 border-b bg-gradient-to-r from-teal-600 to-cyan-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white">Detalhes do Aluguel</h2>
                <p className="text-teal-200 text-xs font-medium mt-1">
                  {selectedRental.studio_name} — {selectedRental.course_name} #{selectedRental.class_code}
                </p>
              </div>
              <button onClick={() => setSelectedRental(null)} className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Studio', value: selectedRental.studio_name },
                  { label: 'Responsável', value: selectedRental.responsible_name },
                  { label: 'CPF', value: selectedRental.cpf || '--' },
                  { label: 'Celular', value: selectedRental.phone || '--' },
                  { label: 'Razão Social', value: selectedRental.legal_name || '--' },
                  { label: 'CNPJ', value: selectedRental.cnpj || '--' },
                  { label: 'Curso', value: selectedRental.course_name },
                  { label: 'Turma', value: `#${selectedRental.class_code}` },
                  { label: 'Cidade', value: selectedRental.city },
                  { label: 'Tipo', value: RENTAL_TYPE_LABELS[selectedRental.rental_type] || selectedRental.rental_type },
                  { label: 'Valor', value: formatCurrency(Number(selectedRental.rental_value)) },
                  { label: 'Enviado em', value: formatDate(selectedRental.created_at) },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">{item.label}</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Receipts */}
              <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                  <FileText size={14} className="text-purple-600" /> Comprovantes / NFs
                </h3>
                {isLoadingReceipts ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-teal-600" size={20} /></div>
                ) : receipts.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400">Nenhum comprovante anexado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {receipts.map((rc, idx) => (
                      <a
                        key={rc.id}
                        href={rc.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
                      >
                        <FileText size={20} className="text-purple-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-purple-800">Comprovante {idx + 1}</p>
                          <p className="text-[10px] text-purple-500 truncate">{rc.receipt_url.split('/').pop()}</p>
                        </div>
                        <ExternalLink size={14} className="text-purple-400 shrink-0 ml-auto" />
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* Admin Actions */}
              <section className="space-y-3 bg-teal-50/50 rounded-2xl p-6 border border-teal-100">
                <h3 className="text-xs font-black text-teal-600 uppercase tracking-[0.15em] flex items-center gap-2">
                  <AlertCircle size={14} /> Gerenciar Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none"
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
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white resize-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveStatus}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50 active:scale-95"
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
