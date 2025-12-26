
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CreditCard, Search, Filter, Download, Loader2, RefreshCw, 
  TrendingUp, AlertCircle, Calendar, DollarSign, User, ArrowRight,
  CheckCircle2, XCircle, MoreHorizontal, Mail, Phone, Clock, Info,
  Copy, ExternalLink, FileText, X, Hash, Tag, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { BillingRecord } from '../types';
import clsx from 'clsx';

export const BillingManager: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<any | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (event: MouseEvent) => {
      // Se o clique for fora do menu E fora de um botão de gatilho de menu
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const isMenuButton = (event.target as HTMLElement).closest('.menu-trigger');
        if (!isMenuButton) {
          setActiveMenuId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Helper para buscar campo de forma flexível (suporta variação com (R$) e espaços)
  const getFlexibleField = (obj: any, variations: string[]) => {
    const keys = Object.keys(obj);
    
    // 1. Tenta correspondência exata ou normalizada
    for (const variation of variations) {
      const found = keys.find(k => {
        const normalizedKey = k.toLowerCase().trim();
        const normalizedVar = variation.toLowerCase().trim();
        return normalizedKey === normalizedVar || normalizedKey === `${normalizedVar} (r$)`;
      });
      if (found) return obj[found];
    }

    // 2. Tenta busca parcial se a exata falhar
    for (const variation of variations) {
      const found = keys.find(k => k.toLowerCase().includes(variation.toLowerCase().trim()));
      if (found) return obj[found];
    }
    
    return null;
  };

  const parseToNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val)
      .replace('R$', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const processedRecords = useMemo(() => {
    return records.map(r => ({
      ...r,
      _display_name: getFlexibleField(r, ['Nome do cliente', 'Cliente', 'Nome']),
      _display_id_cliente: getFlexibleField(r, ['Identificador do cliente', 'Identificador', 'ID Cliente']),
      _display_ref: getFlexibleField(r, ['Código referência', 'Referência', 'Ref']),
      _display_comp: getFlexibleField(r, ['Data de competência', 'Competência']),
      _display_venc: getFlexibleField(r, ['Vencimento', 'Data de vencimento', 'Vencimento original']),
      _display_valor_original: parseToNumber(getFlexibleField(r, ['Valor original da parcela', 'Valor original', 'Valor nominal'])),
      _display_valor_recebido: parseToNumber(getFlexibleField(r, ['Valor recebido da parcela', 'Valor recebido', 'Valor pago'])),
      _display_status: getFlexibleField(r, ['Status', 'Situação']) || 'Pendente'
    }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return processedRecords.filter(r => {
      const name = String(r._display_name || '').toLowerCase();
      const id = String(r._display_id_cliente || '').toLowerCase();
      const ref = String(r._display_ref || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = name.includes(search) || id.includes(search) || ref.includes(search);
      const matchesStatus = statusFilter === 'all' || r._display_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [processedRecords, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const totalValueOriginal = filteredRecords.reduce((acc, curr) => acc + curr._display_valor_original, 0);
    const totalRecebido = filteredRecords.reduce((acc, curr) => acc + curr._display_valor_recebido, 0);
    const paidCount = filteredRecords.filter(r => r._display_status === 'Pago' || r._display_status === 'Liquidado').length;
    const overdueCount = filteredRecords.filter(r => r._display_status === 'Atrasado' || r._display_status === 'Vencido').length;

    return { 
      total: filteredRecords.length, 
      totalOriginal: totalValueOriginal, 
      totalRecebido: totalRecebido, 
      paid: paidCount, 
      overdue: overdueCount,
      pending: filteredRecords.length - paidCount - overdueCount
    };
  }, [filteredRecords]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    alert("ID do cliente copiado!");
    setActiveMenuId(null);
  };

  const openDetails = (record: any) => {
    setSelectedDetailRecord(record);
    setActiveMenuId(null);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="text-teal-600" /> Gestão de Cobrança
          </h2>
          <p className="text-slate-500 text-sm">Controle de faturamento e recebimentos conciliados.</p>
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
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
          <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalRecebido)}</h3>
          <p className="text-[10px] text-slate-500 mt-2">De um total original de {formatCurrency(stats.totalOriginal)}</p>
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
          <p className="text-[10px] text-green-500 mt-2">Aguardando vencimento</p>
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
          <div className="overflow-x-auto overflow-visible">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Valor Original</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Valor Recebido</th>
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
                        <span className="font-bold text-slate-800">{record._display_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ref: {record._display_ref || '--'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-xs">{record._display_venc || '--/--/----'}</td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-right">{formatCurrency(record._display_valor_original)}</td>
                    <td className="px-6 py-4 font-black text-emerald-600 text-right">{formatCurrency(record._display_valor_recebido)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx(
                        "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter border",
                        (record._display_status === 'Pago' || record._display_status === 'Liquidado') ? "bg-green-50 text-green-700 border-green-200" :
                        (record._display_status === 'Atrasado' || record._display_status === 'Vencido') ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {record._display_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === record.id ? null : record.id);
                        }}
                        className="menu-trigger p-2 text-slate-400 hover:text-teal-600 rounded-lg transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      
                      {activeMenuId === record.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-10 top-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button 
                            onClick={() => handleCopyId(record._display_id_cliente || '')}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Copy size={14} /> Copiar ID Cliente
                          </button>
                          <button 
                            onClick={() => openDetails(record)}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileText size={14} /> Ver Detalhes
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button 
                            onClick={() => setActiveMenuId(null)}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <X size={14} /> Fechar Menu
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes Funcional */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Detalhes do Recebimento</h3>
                  <p className="text-xs text-slate-500">ID Lançamento: #{selectedDetailRecord.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDetailRecord(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center text-teal-600 shadow-sm">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg leading-tight">{selectedDetailRecord._display_name}</h4>
                    <p className="text-xs text-slate-500 font-mono">ID Cliente: {selectedDetailRecord._display_id_cliente || '--'}</p>
                  </div>
                </div>
                <div className={clsx(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit",
                  (selectedDetailRecord._display_status === 'Pago' || selectedDetailRecord._display_status === 'Liquidado') ? "bg-green-50 text-green-700 border-green-200" :
                  (selectedDetailRecord._display_status === 'Atrasado' || selectedDetailRecord._display_status === 'Vencido') ? "bg-red-50 text-red-700 border-red-200" :
                  "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {selectedDetailRecord._display_status}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                    <Tag size={12} /> Dados do Título
                  </h5>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold uppercase">Referência</span>
                      <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{selectedDetailRecord._display_ref || '--'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold uppercase">Competência</span>
                      <span className="text-sm font-bold text-slate-800">{selectedDetailRecord._display_comp || '--'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold uppercase">Data Vencimento</span>
                      <span className="text-sm font-bold text-red-600">{selectedDetailRecord._display_venc || '--'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                    <DollarSign size={12} /> Comparativo de Valores
                  </h5>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-400 font-black uppercase">Valor Faturado</span>
                        <ArrowUpRight size={14} className="text-slate-300" />
                      </div>
                      <p className="text-xl font-black text-slate-700">{formatCurrency(selectedDetailRecord._display_valor_original)}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-emerald-600 font-black uppercase">Valor Recebido (Líquido)</span>
                        <ArrowDownRight size={14} className="text-emerald-500" />
                      </div>
                      <p className="text-xl font-black text-emerald-700">{formatCurrency(selectedDetailRecord._display_valor_recebido)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                  <Hash size={12} /> Metadados Completos
                </h5>
                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-[10px] text-teal-400 font-mono leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(selectedDetailRecord).filter(([k]) => !k.startsWith('_'))
                      ), 
                      null, 2
                    )}
                  </pre>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => handleCopyId(selectedDetailRecord._display_id_cliente || '')}
                className="px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
              >
                <Copy size={16} /> Copiar ID
              </button>
              <button 
                onClick={() => setSelectedDetailRecord(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-xs text-blue-800 shadow-sm">
        <Info className="text-blue-600 shrink-0" size={18} />
        <div>
          <strong>Gestão Financeira:</strong> O <strong>Valor Original</strong> representa o que foi faturado, enquanto o <strong>Valor Recebido</strong> mostra o que foi efetivamente conciliado no banco via Conta Azul.
          <br/>Use o botão de menu ao lado de cada linha para acessar ações rápidas sobre o cliente.
        </div>
      </div>
    </div>
  );
};
