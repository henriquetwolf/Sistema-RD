
import React, { useMemo, useState } from 'react';
import { 
  Users, UserCheck, UserMinus, Clock, ShieldCheck, FileWarning, 
  Heart, Baby, BarChart3, PieChart, LayoutDashboard, ClipboardList,
  AlertCircle, Calendar, Briefcase, DollarSign, MapPin, Building,
  ArrowRight, CheckCircle2, XCircle, ChevronRight, TrendingUp, Info,
  Users2, UserPlus, Wallet, TrendingDown
} from 'lucide-react';
import { Collaborator, CollaboratorsManager } from './CollaboratorsManager';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart as RePie, Pie, Legend, LineChart, Line
} from 'recharts';
import clsx from 'clsx';

interface HrDashboardProps {
  collaborators: Collaborator[];
  onEditCollaborator: (c: Collaborator) => void;
}

export const HrDashboard: React.FC<HrDashboardProps> = ({ collaborators, onEditCollaborator }) => {
  const [activeSubTab, setActiveSubTab] = useState<'executivo' | 'operacional' | 'equipe'>('executivo');
  const [opSection, setOpSection] = useState<'contratos' | 'ferias' | 'beneficios' | 'compliance'>('contratos');
  const [targetCollaborator, setTargetCollaborator] = useState<Collaborator | null>(null);

  // Helper para converter salário (string ou number) em número processável
  const parseSalaryValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).trim();
    // Se for formato brasileiro 1.500,00
    if (str.includes(',') && str.includes('.')) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    // Se for apenas vírgula como decimal
    if (str.includes(',') && !str.includes('.')) {
        return parseFloat(str.replace(',', '.')) || 0;
    }
    // Fallback para número puro ou formato internacional
    return parseFloat(str.replace(/[^\d.-]/g, '')) || 0;
  };

  // --- CÁLCULOS DOS KPIS ---
  const stats = useMemo(() => {
    const total = collaborators.length;
    const active = collaborators.filter(c => c.status === 'active');
    const inactive = collaborators.filter(c => c.status === 'inactive');
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // 1. Admissões do Mês (Apenas Ativos que entraram no mês/ano atual)
    const admissionsMonth = active.filter(c => {
        if (!c.admissionDate) return false;
        const d = new Date(c.admissionDate);
        return !isNaN(d.getTime()) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    // 2. Tempo Médio de Casa (Apenas Ativos)
    let totalMonths = 0;
    let activeWithDate = 0;
    active.forEach(c => {
        if (c.admissionDate) {
            const start = new Date(c.admissionDate);
            if (!isNaN(start.getTime())) {
                // Cálculo em meses: (Data Atual - Data Admissão) / Milisegundos em um mês médio
                const diff = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
                totalMonths += diff;
                activeWithDate++;
            }
        }
    });
    const avgTenure = activeWithDate > 0 ? (totalMonths / activeWithDate).toFixed(1) : "0.0";

    // 3. Folha Salarial Total (Apenas Ativos)
    const totalSalary = active.reduce((acc, curr) => {
        return acc + parseSalaryValue(curr.salary);
    }, 0);

    return { total, activeCount: active.length, inactiveCount: inactive.length, admissionsMonth, avgTenure, totalSalary };
  }, [collaborators]);

  // --- ALERTAS CRÍTICOS ---
  const alerts = useMemo(() => {
      return {
          missingDocs: collaborators.filter(c => c.status === 'active' && (!c.cpf || !c.rg || !c.pisNumber)),
          noAdmission: collaborators.filter(c => c.status === 'active' && !c.admissionDate),
          noSuperior: collaborators.filter(c => c.status === 'active' && !c.superiorId && c.department !== 'Diretoria'),
          noEmergency: collaborators.filter(c => c.status === 'active' && (!c.emergencyName || !c.emergencyPhone)),
          depNoCpf: collaborators.filter(c => c.status === 'active' && c.hasDependents === 'Sim' && !c.dependentCpf)
      };
  }, [collaborators]);

  // --- DADOS PARA GRÁFICOS ---
  const deptData = useMemo(() => {
    const depts: Record<string, number> = {};
    collaborators.filter(c => c.status === 'active').forEach(c => {
        const d = c.department || 'Não Informado';
        depts[d] = (depts[d] || 0) + 1;
    });
    return Object.entries(depts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [collaborators]);

  const tenureDist = useMemo(() => {
      const dist = { '0-3 meses': 0, '3-12 meses': 0, '1-3 anos': 0, '3 anos+': 0 };
      const now = new Date();
      collaborators.filter(c => c.status === 'active').forEach(c => {
          if (!c.admissionDate) return;
          const start = new Date(c.admissionDate);
          if (isNaN(start.getTime())) return;
          const months = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          if (months <= 3) dist['0-3 meses']++;
          else if (months <= 12) dist['3-12 meses']++;
          else if (months <= 36) dist['1-3 anos']++;
          else dist['3 anos+']++;
      });
      return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [collaborators]);

  const probationAlerts = useMemo(() => {
      const now = new Date();
      return collaborators
        .filter(c => c.status === 'active' && c.admissionDate && c.hiringMode === 'CLT')
        .map(c => {
            const adm = new Date(c.admissionDate);
            const daysSince = Math.floor((now.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24));
            return { ...c, daysSince };
        })
        .filter(c => (c.daysSince >= 30 && c.daysSince <= 45) || (c.daysSince >= 75 && c.daysSince <= 90))
        .sort((a,b) => b.daysSince - a.daysSince);
  }, [collaborators]);

  const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

  const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const goToCollaborator = (c: Collaborator) => {
      setTargetCollaborator(c);
      setActiveSubTab('equipe');
  };

  if (activeSubTab === 'equipe') {
      return <CollaboratorsManager onBack={() => setActiveSubTab('executivo')} initialEditCollaborator={targetCollaborator} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Sub-Navigation */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
          <button onClick={() => setActiveSubTab('executivo')} className={clsx("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeSubTab === 'executivo' ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <LayoutDashboard size={18}/> Painel Executivo
          </button>
          <button onClick={() => setActiveSubTab('operacional')} className={clsx("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeSubTab === 'operacional' ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <ClipboardList size={18}/> Painel Operacional
          </button>
          <button onClick={() => { setTargetCollaborator(null); setActiveSubTab('equipe'); }} className={clsx("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", (activeSubTab as string) === 'equipe' ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <Users2 size={18}/> Gestão de Equipe
          </button>
      </div>

      {/* Cast activeSubTab to string in comparison below to bypass narrowed type error after the early return check */}
      {activeSubTab === 'executivo' ? (
          <div className="space-y-8">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={64} className="text-blue-600" /></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Headcount Total</p>
                      <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
                          <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{stats.activeCount} Ativos</span>
                          <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{stats.inactiveCount} Desligados</span>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={64} className="text-teal-600" /></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tempo Médio Casa</p>
                      <h3 className="text-3xl font-black text-slate-800">{stats.avgTenure} <span className="text-sm font-normal text-slate-400">meses</span></h3>
                      <div className="mt-2 text-[10px] font-bold text-teal-600 uppercase flex items-center gap-1"><TrendingUp size={12}/> ESTABILIDADE DE EQUIPE</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><UserPlus size={64} className="text-indigo-600" /></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Admissões no Mês</p>
                      <h3 className="text-3xl font-black text-slate-800">{stats.admissionsMonth}</h3>
                      <div className="mt-2 text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">Talentos integrados</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={64} className="text-emerald-600" /></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Folha Salarial Bruta</p>
                      <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalSalary)}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Investimento mensal estimado</p>
                  </div>
              </div>

              {/* GRÁFICOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2"><Briefcase size={16} className="text-blue-500"/> Distribuição por Departamento</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deptData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fontSize: 10, fontBold: true}} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                    {deptData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={16} className="text-teal-500"/> Tempo de Casa</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tenureDist}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontBold: true}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* BLOCO DE ATENÇÃO */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
                      <h3 className="text-red-700 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                          <FileWarning size={18}/> Alertas de Conformidade e Pendências
                      </h3>
                      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">Ação Requerida</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                      <div className="p-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Documentação Incompleta</p>
                          <div className="space-y-3">
                              {alerts.missingDocs.length > 0 ? (
                                  alerts.missingDocs.slice(0, 3).map(c => (
                                      <div key={c.id} className="flex items-center justify-between group cursor-pointer" onClick={() => goToCollaborator(c)}>
                                          <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-bold text-xs">{c.fullName.charAt(0)}</div>
                                              <span className="text-xs font-bold text-slate-700 group-hover:text-red-600 transition-colors truncate max-w-[120px]">{c.fullName}</span>
                                          </div>
                                          <span className="text-[9px] text-red-400 font-bold uppercase">CPF/RG/PIS</span>
                                      </div>
                                  ))
                              ) : <p className="text-xs text-green-600 flex items-center gap-1 font-bold"><CheckCircle2 size={14}/> Tudo em ordem</p>}
                              {alerts.missingDocs.length > 3 && <p className="text-[10px] text-slate-400 font-bold italic">+ {alerts.missingDocs.length - 3} outros</p>}
                          </div>
                      </div>
                      <div className="p-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Sem Superior / Admissão</p>
                          <div className="space-y-3">
                                {alerts.noSuperior.length > 0 && (
                                    <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                        <p className="text-[10px] text-amber-700 font-black flex items-center gap-1"><AlertCircle size={10}/> {alerts.noSuperior.length} colaboradores sem gestor</p>
                                    </div>
                                )}
                                {alerts.noAdmission.length > 0 && (
                                    <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                                        <p className="text-[10px] text-red-700 font-black flex items-center gap-1"><AlertCircle size={10}/> {alerts.noAdmission.length} sem data de admissão</p>
                                    </div>
                                )}
                                {alerts.noSuperior.length === 0 && alerts.noAdmission.length === 0 && <p className="text-xs text-green-600 flex items-center gap-1 font-bold"><CheckCircle2 size={14}/> Tudo em ordem</p>}
                          </div>
                      </div>
                      <div className="p-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Dados de Família / Emergência</p>
                          <div className="space-y-3">
                              {alerts.depNoCpf.length > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-600">Dependentes s/ CPF</span>
                                      <span className="font-black text-red-600">{alerts.depNoCpf.length}</span>
                                  </div>
                              )}
                              {alerts.noEmergency.length > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-600">Sem Contato Emergência</span>
                                      <span className="font-black text-red-600">{alerts.noEmergency.length}</span>
                                  </div>
                              )}
                              {alerts.depNoCpf.length === 0 && alerts.noEmergency.length === 0 && <p className="text-xs text-green-600 flex items-center gap-1 font-bold"><CheckCircle2 size={14}/> Tudo em ordem</p>}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      ) : (
          <div className="flex flex-col lg:flex-row gap-8">
              {/* OPERATIONAL SIDEBAR */}
              <aside className="w-full lg:w-64 space-y-2">
                  {[
                      { id: 'contratos', label: 'Admissão e Contrato', icon: Briefcase },
                      { id: 'ferias', label: 'Gestão de Férias', icon: Calendar },
                      { id: 'beneficios', label: 'Benefícios e Apoio', icon: Heart },
                      { id: 'compliance', label: 'Audit / Compliance', icon: ShieldCheck }
                  ].map(sec => (
                      <button 
                        key={sec.id} 
                        onClick={() => setOpSection(sec.id as any)}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                            opSection === sec.id ? "bg-indigo-600 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                          <sec.icon size={18} /> {sec.label}
                      </button>
                  ))}
              </aside>

              <main className="flex-1 min-w-0">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                      
                      {/* SECTION: CONTRATOS */}
                      {opSection === 'contratos' && (
                          <div className="p-8 space-y-8 animate-in slide-in-from-right-2">
                              <div>
                                  <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">Vencimento de Experiência</h3>
                                  <p className="text-xs text-slate-500 mb-6">Acompanhe contratos de 45 e 90 dias que vencem em breve.</p>
                                  <div className="space-y-3">
                                      {probationAlerts.length === 0 ? (
                                          <div className="p-10 text-center text-slate-400 border-2 border-dashed rounded-2xl">Nenhum contrato em período de renovação crítica.</div>
                                      ) : probationAlerts.map(c => (
                                          <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-indigo-300 transition-all">
                                              <div className="flex items-center gap-4">
                                                  <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center font-bold text-indigo-600">{c.fullName.charAt(0)}</div>
                                                  <div>
                                                      <p className="font-bold text-slate-800 text-sm">{c.fullName}</p>
                                                      <p className="text-[10px] text-slate-500 uppercase font-black">{c.department} • Adm: {new Date(c.admissionDate).toLocaleDateString()}</p>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <span className={clsx("text-xs font-black px-3 py-1 rounded-full uppercase", c.daysSince >= 85 || (c.daysSince >= 40 && c.daysSince <= 45) ? "bg-red-600 text-white" : "bg-amber-500 text-white")}>
                                                      {c.daysSince} dias de casa
                                                  </span>
                                                  <button onClick={() => goToCollaborator(c)} className="block mt-1 text-[10px] font-black text-indigo-600 hover:underline uppercase">Ver Ficha</button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="pt-8 border-t">
                                  <h3 className="text-lg font-black text-slate-800 mb-6">Mix de Contratação</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {['CLT', 'PJ', 'Estágio'].map(mode => {
                                          const count = collaborators.filter(c => c.hiringMode === mode && c.status === 'active').length;
                                          return (
                                              <div key={mode} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{mode}</p>
                                                  <p className="text-2xl font-black text-slate-800">{count}</p>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* SECTION: FÉRIAS */}
                      {opSection === 'ferias' && (
                          <div className="p-8 space-y-8 animate-in slide-in-from-right-2">
                               <div>
                                  <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">Calendário e Escalas</h3>
                                  <p className="text-xs text-slate-500 mb-6">Abaixo estão os períodos registrados nas observações dos colaboradores.</p>
                                  <div className="space-y-4">
                                      {collaborators.filter(c => c.vacationPeriods && c.status === 'active').map(c => (
                                          <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex gap-4">
                                              <div className="bg-white p-3 rounded-lg border flex flex-col items-center justify-center min-w-[80px]">
                                                  <Calendar className="text-blue-500 mb-1" size={20}/>
                                                  <span className="text-[10px] font-black uppercase text-slate-400">Escala</span>
                                              </div>
                                              <div>
                                                  <p className="font-bold text-slate-800">{c.fullName}</p>
                                                  <p className="text-xs text-slate-600 mt-1">{c.vacationPeriods}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* SECTION: BENEFICIOS */}
                      {opSection === 'beneficios' && (
                          <div className="p-8 space-y-10 animate-in slide-in-from-right-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="bg-slate-50 p-6 rounded-2xl border">
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Saúde e Odonto</h4>
                                      <div className="space-y-4">
                                          {[
                                              { label: 'Plano de Saúde', key: 'hasHealthPlan' },
                                              { label: 'Plano Dental', key: 'hasDentalPlan' }
                                          ].map(b => (
                                              <div key={b.key} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                                                  <span className="text-sm font-bold text-slate-700">{b.label}</span>
                                                  <span className="text-sm font-black text-blue-600">{collaborators.filter(c => (c as any)[b.key] === 'Sim' && c.status === 'active').length} usuários</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="bg-slate-50 p-6 rounded-2xl border">
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Alimentação e Auxílio</h4>
                                      <div className="space-y-4">
                                          {[
                                              { label: 'Vale Refeição', key: 'hasMealVoucher' },
                                              { label: 'Vale Alimentação', key: 'hasFoodVoucher' }
                                          ].map(b => (
                                              <div key={b.key} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                                                  <span className="text-sm font-bold text-slate-700">{b.label}</span>
                                                  <span className="text-sm font-black text-teal-600">{collaborators.filter(c => (c as any)[b.key] === 'Sim' && c.status === 'active').length} usuários</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>

                              <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign size={120}/></div>
                                  <h4 className="text-sm font-black uppercase tracking-widest mb-2 text-indigo-300">Resumo de Remuneração</h4>
                                  <p className="text-4xl font-black mb-4">
                                      {formatCurrency(stats.totalSalary)}
                                  </p>
                                  <p className="text-xs text-indigo-200">Folha salarial bruta estimada (apenas colaboradores ativos).</p>
                              </div>
                          </div>
                      )}

                      {/* SECTION: COMPLIANCE */}
                      {opSection === 'compliance' && (
                          <div className="p-0 animate-in slide-in-from-right-2">
                              <div className="px-8 py-6 border-b">
                                  <h3 className="text-lg font-black text-slate-800">Matriz de Saúde Cadastral</h3>
                                  <p className="text-xs text-slate-500">Verificação de preenchimento dos documentos legais obrigatórios.</p>
                              </div>
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                      <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 uppercase tracking-widest">
                                          <tr>
                                              <th className="p-4 border-b">Colaborador</th>
                                              <th className="p-4 border-b text-center">CPF</th>
                                              <th className="p-4 border-b text-center">RG</th>
                                              <th className="p-4 border-b text-center">PIS</th>
                                              <th className="p-4 border-b text-center">CTPS</th>
                                              <th className="p-4 border-b text-center">Conta</th>
                                              <th className="p-4 border-b text-right">Ação</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {collaborators.filter(c => c.status === 'active').slice(0, 20).map(c => {
                                              const check = (val: any) => val ? <CheckCircle2 size={16} className="text-green-500 mx-auto" /> : <XCircle size={16} className="text-red-400 mx-auto" />;
                                              return (
                                                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                      <td className="p-4">
                                                          <div className="flex items-center gap-3">
                                                              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">{c.fullName.charAt(0)}</div>
                                                              <span className="font-bold text-slate-700">{c.fullName}</span>
                                                          </div>
                                                      </td>
                                                      <td className="p-4">{check(c.cpf)}</td>
                                                      <td className="p-4">{check(c.rg)}</td>
                                                      <td className="p-4">{check(c.pisNumber)}</td>
                                                      <td className="p-4">{check(c.ctpsNumber)}</td>
                                                      <td className="p-4">{check(c.bankAccountInfo)}</td>
                                                      <td className="p-4 text-right">
                                                          <button onClick={() => goToCollaborator(c)} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200"><ArrowRight size={14}/></button>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                              <div className="p-4 bg-slate-50 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest border-t">Visualizando top 20 ativos por ordem alfabética</div>
                          </div>
                      )}
                  </div>
              </main>
          </div>
      )}
    </div>
  );
};
