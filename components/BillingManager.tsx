
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Search, Filter, Download, Loader2, RefreshCw, 
  TrendingUp, AlertCircle, Calendar, DollarSign, User, ArrowRight,
  CheckCircle2, XCircle, MoreHorizontal, Mail, Phone, Clock, Info
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { BillingRecord } from '../types';
import clsx from 'clsx';

export const BillingManager: React.FC = () => {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await appBackend.client
        .from('Conta_Azul_Receber')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (e) {
      console.error("Erro ao buscar dados de cobrança:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = 
        (r["Nome do cliente"] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r["Identificador do cliente"] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r["Código referência"] || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || r.Status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const totalValue = filteredRecords.reduce((acc, curr) => acc + (Number(curr.Valor) || 0), 0);
    const pending = filteredRecords.filter(r => r.Status === 'Pendente').length;
    const paid = filteredRecords.filter(r => r.Status === 'Pago').length;
    const overdue = filteredRecords.filter(r => r.Status === 'Atrasado').length;

    return { total, totalValue, pending, paid, overdue };
  }, [filteredRecords]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="text-teal-600" /> Gestão de Cobrança
          </h2>
          <p className="text-slate-500 text-sm">Controle de faturamento e contas a receber (Conta Azul).</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 text-slate-500 hover:text-teal-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors">
            <RefreshCw size={20} className={clsx(isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5"><DollarSign size={64} className="text-teal-600" /></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total a Receber</p>
          <h3 className="text-2xl font-black text-slate-800">{formatCurrency(stats.totalValue)}</h3>
          <p className="text-[10px] text-slate-500 mt-2">{stats.total} lançamentos filtrados</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5"><CheckCircle2 size={64} className="text-green-600" /></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Liquidados</p>
          <h3 className="text-2xl font-black text-green-600">{stats.paid}</h3>
          <p className="text-[10px] text-green-500 mt-2">Pagamentos confirmados</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5"><Clock size={64} className="text-amber-600" /></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pendentes</p>
          <h3 className="text-2xl font-black text-amber-600">{stats.pending}</h3>
          <p className="text-[10px] text-amber-500 mt-2">Aguardando vencimento</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5"><XCircle size={64} className="text-red-600" /></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Atrasados</p>
          <h3 className="text-2xl font-black text-red-600">{stats.overdue}</h3>
          <p className="text-[10px] text-red-500 mt-2">Urgente: Inadimplência</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, identificador ou referência..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">Todos os Status</option>
          <option value="Pago">Pago</option>
          <option value="Pendente">Pendente</option>
          <option value="Atrasado">Atrasado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-teal-600" size={40} /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <AlertCircle size={48} className="opacity-20 mb-2" />
            <p>Nenhum registro encontrado para os filtros atuais.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Referência</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Competência</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">#{record.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{record["Nome do cliente"]}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {record["Identificador do cliente"]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {record["Código referência"]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{record["Data de competência"]}</td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-xs">{record.Vencimento || '--/--/----'}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{formatCurrency(Number(record.Valor) || 0)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx(
                        "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter border",
                        record.Status === 'Pago' ? "bg-green-50 text-green-700 border-green-200" :
                        record.Status === 'Atrasado' ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {record.Status || 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-teal-600 rounded-lg transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-xs text-blue-800 shadow-sm">
        {/* Fixed: Added Info to imports from lucide-react to resolve "Cannot find name 'Info'" */}
        <Info className="text-blue-600 shrink-0" size={18} />
        <div>
          <strong>Sincronização Automática:</strong> Os dados desta aba são alimentados via integração com o ERP Conta Azul através do seu fluxo de arquivos configurado nas conexões globais. Certifique-se de que a tabela <code>Conta_Azul_Receber</code> está sendo atualizada regularmente.
        </div>
      </div>
    </div>
  );
};
