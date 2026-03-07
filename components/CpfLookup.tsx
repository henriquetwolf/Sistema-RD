import React, { useState } from 'react';
import { 
  Search, Loader2, User, GraduationCap, BookOpen, Store, Building2, 
  Users, CreditCard, Award, Brain, Mail, Phone, MapPin, Calendar,
  DollarSign, ChevronDown, ChevronUp, Hash, Fingerprint, Copy, Check,
  ShieldCheck, Package, FileText, AlertCircle, ArrowLeft
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { CpfLookupResult, USER_ROLE_LABELS } from '../types';
import clsx from 'clsx';

interface CpfLookupProps {
  onBack?: () => void;
}

const formatCPF = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (val: string | null) => val ? new Date(val).toLocaleDateString('pt-BR') : '—';

interface SectionProps {
  title: string;
  icon: React.ElementType;
  color: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon: Icon, color, count, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <span className="font-bold text-slate-800 text-sm flex-1 text-left">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
        )}
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-100 p-4">{children}</div>}
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: any; icon?: React.ElementType }> = ({ label, value, icon: Icon }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />}
      <span className="text-[10px] font-bold text-slate-400 uppercase w-28 shrink-0">{label}</span>
      <span className="text-sm text-slate-700 font-medium break-all">{String(value)}</span>
    </div>
  );
};

export const CpfLookup: React.FC<CpfLookupProps> = ({ onBack }) => {
  const [cpfInput, setCpfInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CpfLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cpfInput.replace(/\D/g, '');
    if (clean.length < 11) { setError('CPF deve ter 11 dígitos.'); return; }

    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await appBackend.lookupCpfGlobal(clean);
      if (!data) { setError('Erro ao consultar. Tente novamente.'); return; }
      if (data.error) { setError(data.error); return; }
      setResult(data as CpfLookupResult);
    } catch (e: any) {
      setError(e.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(cpfInput.replace(/\D/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasData = (val: any) => val && (Array.isArray(val) ? val.length > 0 : true);

  const roleColorMap: Record<string, string> = {
    admin: 'bg-slate-100 text-slate-700',
    collaborator: 'bg-indigo-100 text-indigo-700',
    instructor: 'bg-teal-100 text-teal-700',
    student: 'bg-amber-100 text-amber-700',
    franchisee: 'bg-purple-100 text-purple-700',
    partner_studio: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {onBack && (
        <button onClick={onBack} className="text-slate-500 hover:text-teal-600 flex items-center gap-2 font-medium text-sm">
          <ArrowLeft size={18} /> Voltar
        </button>
      )}

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
              <Fingerprint size={24} className="text-slate-200" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Busca por CPF</h2>
              <p className="text-slate-400 text-sm">Raio-X completo de uma pessoa no sistema</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpfInput}
                onChange={e => setCpfInput(formatCPF(e.target.value))}
                className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-400 font-mono text-lg tracking-wider"
                maxLength={14}
              />
              {cpfInput && (
                <button type="button" onClick={handleCopy} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || cpfInput.replace(/\D/g, '').length < 11}
              className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold px-6 rounded-xl flex items-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
              Buscar
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Resumo no topo */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                {result.profile?.photo_url ? (
                  <img src={result.profile.photo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <User size={32} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-800">
                  {result.profile?.full_name || result.collaborator?.full_name || result.instructor?.full_name || result.student?.full_name || result.partner_studio?.responsible_name || result.franchise?.franchisee_name || 'Não identificado'}
                </h3>
                <p className="text-sm text-slate-500 font-mono">{formatCPF(result.cpf)}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(result.roles || []).map((r: any) => (
                    <span key={r.id} className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColorMap[r.role] || 'bg-slate-100 text-slate-600'}`}>
                      {(USER_ROLE_LABELS as any)[r.role] || r.role}
                    </span>
                  ))}
                  {(!result.roles || result.roles.length === 0) && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Sem perfil unificado</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Perfil Unificado */}
          {hasData(result.profile) && (
            <Section title="Perfil Unificado" icon={ShieldCheck} color="bg-teal-50 text-teal-600" defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Nome" value={result.profile.full_name} icon={User} />
                <InfoRow label="Email" value={result.profile.email} icon={Mail} />
                <InfoRow label="Telefone" value={result.profile.phone} icon={Phone} />
                <InfoRow label="Criado em" value={formatDate(result.profile.created_at)} icon={Calendar} />
              </div>
            </Section>
          )}

          {/* Colaborador */}
          {hasData(result.collaborator) && (
            <Section title="Colaborador (RH)" icon={Users} color="bg-indigo-50 text-indigo-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Nome" value={result.collaborator.full_name} icon={User} />
                <InfoRow label="Email" value={result.collaborator.email} icon={Mail} />
                <InfoRow label="Telefone" value={result.collaborator.phone} icon={Phone} />
                <InfoRow label="Cargo" value={result.collaborator.role} />
                <InfoRow label="Departamento" value={result.collaborator.department} />
                <InfoRow label="Status" value={result.collaborator.status} />
                <InfoRow label="Admissão" value={formatDate(result.collaborator.admission_date)} icon={Calendar} />
                <InfoRow label="Sede" value={result.collaborator.headquarters} icon={MapPin} />
              </div>
            </Section>
          )}

          {/* Instrutor */}
          {hasData(result.instructor) && (
            <Section title="Instrutor" icon={GraduationCap} color="bg-teal-50 text-teal-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Nome" value={result.instructor.full_name} icon={User} />
                <InfoRow label="Email" value={result.instructor.email} icon={Mail} />
                <InfoRow label="Telefone" value={result.instructor.phone} icon={Phone} />
                <InfoRow label="Nível" value={result.instructor.teacher_level} />
                <InfoRow label="Honorário" value={result.instructor.level_honorarium ? formatCurrency(result.instructor.level_honorarium) : null} icon={DollarSign} />
                <InfoRow label="Formação" value={result.instructor.academic_formation} />
                <InfoRow label="Tipo Curso" value={result.instructor.course_type} />
                <InfoRow label="CNPJ" value={result.instructor.cnpj} />
                <InfoRow label="Empresa" value={result.instructor.company_name} />
                <InfoRow label="Região" value={result.instructor.region_availability} icon={MapPin} />
              </div>
            </Section>
          )}

          {/* Aluno */}
          {hasData(result.student) && (
            <Section title="Aluno (Cadastro)" icon={BookOpen} color="bg-amber-50 text-amber-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Nome" value={result.student.full_name} icon={User} />
                <InfoRow label="Telefone" value={result.student.phone} icon={Phone} />
                <InfoRow label="Nascimento" value={formatDate(result.student.birth_date)} icon={Calendar} />
                <InfoRow label="Cidade" value={result.student.city} icon={MapPin} />
                <InfoRow label="Estado" value={result.student.state} />
                <InfoRow label="Endereço" value={result.student.address} />
                <InfoRow label="CEP" value={result.student.zip_code} />
              </div>
              {(result.student_emails || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Emails vinculados</p>
                  <div className="flex flex-wrap gap-2">
                    {result.student_emails.map((e: any) => (
                      <span key={e.id} className={clsx("text-xs font-medium px-2.5 py-1 rounded-lg", e.is_primary ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                        <Mail size={10} className="inline mr-1" />{e.email} {e.is_primary && '(principal)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Deals/Compras */}
          {hasData(result.deals) && (
            <Section title="Compras / Deals" icon={CreditCard} color="bg-green-50 text-green-600" count={result.deals.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="pb-2 pr-4">Produto</th>
                      <th className="pb-2 pr-4">Valor</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.deals.map((d: any) => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium text-slate-700">{d.product || d.company_name || '—'}</td>
                        <td className="py-2 pr-4 text-green-700 font-bold">{d.value ? formatCurrency(Number(d.value)) : '—'}</td>
                        <td className="py-2 pr-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{d.stage_id || '—'}</span>
                        </td>
                        <td className="py-2 text-slate-500">{formatDate(d.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Studio Parceiro */}
          {hasData(result.partner_studio) && (
            <Section title="Studio Parceiro" icon={Building2} color="bg-rose-50 text-rose-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Nome Fantasia" value={result.partner_studio.fantasy_name} icon={Building2} />
                <InfoRow label="Razão Social" value={result.partner_studio.legal_name} />
                <InfoRow label="CNPJ" value={result.partner_studio.cnpj} />
                <InfoRow label="Responsável" value={result.partner_studio.responsible_name} icon={User} />
                <InfoRow label="Email" value={result.partner_studio.email} icon={Mail} />
                <InfoRow label="Telefone" value={result.partner_studio.phone} icon={Phone} />
                <InfoRow label="Cidade" value={result.partner_studio.city} icon={MapPin} />
                <InfoRow label="Tipo" value={result.partner_studio.studio_type} />
                <InfoRow label="Status" value={result.partner_studio.status} />
              </div>
            </Section>
          )}

          {/* Franquia */}
          {hasData(result.franchise) && (
            <Section title="Franquia" icon={Store} color="bg-purple-50 text-purple-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Franqueado" value={result.franchise.franchisee_name} icon={User} />
                <InfoRow label="Empresa" value={result.franchise.company_name} icon={Building2} />
                <InfoRow label="CNPJ" value={result.franchise.cnpj} />
                <InfoRow label="Email" value={result.franchise.email} icon={Mail} />
                <InfoRow label="Telefone" value={result.franchise.phone} icon={Phone} />
                <InfoRow label="Consultor" value={result.franchise.sales_consultant} />
              </div>
            </Section>
          )}

          {/* Conta Azul - Receber */}
          {hasData(result.conta_azul_receber) && (
            <Section title="Conta Azul — Contas a Receber" icon={DollarSign} color="bg-blue-50 text-blue-600" count={result.conta_azul_receber.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="pb-2 pr-4">Descrição</th>
                      <th className="pb-2 pr-4">Valor</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Vencimento</th>
                      <th className="pb-2">Categoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.conta_azul_receber.map((r: any) => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium text-slate-700">{r.descricao || '—'}</td>
                        <td className="py-2 pr-4 text-blue-700 font-bold">{r.valor ? formatCurrency(Number(r.valor)) : '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full",
                            r.status === 'PAGO' ? "bg-green-100 text-green-700" :
                            r.status === 'PENDENTE' ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          )}>{r.status}</span>
                        </td>
                        <td className="py-2 pr-4 text-slate-500">{formatDate(r.data_vencimento)}</td>
                        <td className="py-2 text-slate-500">{r.categoria_nome || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Conta Azul - Pagar */}
          {hasData(result.conta_azul_pagar) && (
            <Section title="Conta Azul — Contas a Pagar" icon={Package} color="bg-orange-50 text-orange-600" count={result.conta_azul_pagar.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="pb-2 pr-4">Descrição</th>
                      <th className="pb-2 pr-4">Valor</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Vencimento</th>
                      <th className="pb-2">Fornecedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.conta_azul_pagar.map((p: any) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium text-slate-700">{p.descricao || '—'}</td>
                        <td className="py-2 pr-4 text-orange-700 font-bold">{p.valor ? formatCurrency(Number(p.valor)) : '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full",
                            p.status === 'PAGO' ? "bg-green-100 text-green-700" :
                            p.status === 'PENDENTE' ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          )}>{p.status}</span>
                        </td>
                        <td className="py-2 pr-4 text-slate-500">{formatDate(p.data_vencimento)}</td>
                        <td className="py-2 text-slate-500">{p.fornecedor_nome || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* PagBank */}
          {hasData(result.pagbank_orders) && (
            <Section title="Pagamentos PagBank" icon={CreditCard} color="bg-green-50 text-green-600" count={result.pagbank_orders.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="pb-2 pr-4">Curso</th>
                      <th className="pb-2 pr-4">Valor</th>
                      <th className="pb-2 pr-4">Método</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.pagbank_orders.map((o: any) => (
                      <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium text-slate-700">{o.course_title || '—'}</td>
                        <td className="py-2 pr-4 text-green-700 font-bold">{o.amount ? formatCurrency(o.amount / 100) : '—'}</td>
                        <td className="py-2 pr-4 text-slate-500">{o.payment_method || '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full",
                            o.status === 'PAID' ? "bg-green-100 text-green-700" :
                            o.status === 'PENDING' ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          )}>{o.status}</span>
                        </td>
                        <td className="py-2 text-slate-500">{formatDate(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Certificados */}
          {hasData(result.certificates) && (
            <Section title="Certificados Emitidos" icon={Award} color="bg-yellow-50 text-yellow-600" count={result.certificates.length}>
              <div className="grid gap-2">
                {result.certificates.map((c: any) => (
                  <div key={c.certificate_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Award size={18} className="text-yellow-500" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">Hash: {c.hash}</p>
                      <p className="text-xs text-slate-500">Emitido em {formatDate(c.issued_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Base de conhecimento IA */}
          {hasData(result.knowledge_base) && (
            <Section title="Perfil de Aprendizagem (IA)" icon={Brain} color="bg-violet-50 text-violet-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoRow label="Nível" value={result.knowledge_base.experience_level} />
                <InfoRow label="Estilo" value={result.knowledge_base.learning_style} />
                <InfoRow label="Horas/semana" value={result.knowledge_base.available_hours_per_week} />
                <InfoRow label="Formação" value={result.knowledge_base.academic_background} />
                <InfoRow label="Objetivos" value={result.knowledge_base.objectives} />
                <InfoRow label="Especialidades" value={result.knowledge_base.specialties} />
              </div>
            </Section>
          )}

          {/* Nada encontrado */}
          {!hasData(result.profile) && !hasData(result.collaborator) && !hasData(result.instructor) &&
           !hasData(result.student) && !hasData(result.deals) && !hasData(result.partner_studio) &&
           !hasData(result.franchise) && !hasData(result.conta_azul_receber) && !hasData(result.pagbank_orders) && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <Fingerprint className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500 font-medium">Nenhum registro encontrado para este CPF.</p>
              <p className="text-xs text-slate-400 mt-1">Verifique se o CPF está correto e tente novamente.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
