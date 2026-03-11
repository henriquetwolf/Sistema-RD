import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw, 
  Award, Eye, Download, ExternalLink, CheckCircle, Trash2, Wand2, Calendar, BookOpen, X, MonitorPlay, Zap, ChevronRight, Check, Save, FileText, ShoppingBag, CreditCard,
  List, DollarSign, XCircle, Tag, MapPin, Building, User, Briefcase, Hash, Info, Map, FileSpreadsheet, RotateCcw,
  Clock, Star, Ticket, GraduationCap, Edit2, Plus, MessageCircle, Activity, Landmark
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { OnlineCourse, Pipeline, Aluno, AlunoEmail, TimelineEvent, TimelineEventType } from '../types';
import clsx from 'clsx';

declare const XLSX: any;

interface StudentsManagerProps {
  onBack: () => void;
}

interface StudentDeal {
    id: string;
    deal_number?: number;
    contact_name: string;
    company_name: string;
    cpf: string;
    email: string;
    phone: string;
    product_name: string;
    product_type?: string;
    status: string;
    stage: string;
    pipeline?: string;
    value: number;
    payment_method: string;
    created_at: string;
    student_access_enabled: boolean;
    class_mod_1?: string;
    class_mod_2?: string;
    // Campos adicionais do CRM
    source?: string;
    campaign?: string;
    entry_value?: number;
    installments?: number;
    installment_value?: number;
    first_due_date?: string;
    receipt_link?: string;
    transaction_code?: string;
    zip_code?: string;
    address?: string;
    address_number?: string;
    registration_data?: string;
    observation?: string;
    course_state?: string;
    course_city?: string;
    billing_cnpj?: string;
    billing_company_name?: string;
}

interface ItemRef {
    id: string;
    name: string;
    isCrm: boolean;
}

interface GroupedStudent {
    cpf: string;
    email: string;
    name: string;
    deals: StudentDeal[];
    presential: ItemRef[];
    digital: ItemRef[];
    events: ItemRef[];
}

interface CertStatus {
    hash: string;
    issuedAt: string;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'cpf_search' | 'exclusions'>('list');
  const [deals, setDeals] = useState<StudentDeal[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [onlineCourses, setOnlineCourses] = useState<OnlineCourse[]>([]);
  const [courseAccessMap, setCourseAccessMap] = useState<Record<string, string[]>>({});
  const [certificates, setCertificates] = useState<Record<string, CertStatus>>({});
  const [productTemplates, setProductTemplates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // CPF Search State
  const [cpfSearchQuery, setCpfSearchQuery] = useState('');
  const [searchResultDeals, setSearchResultDeals] = useState<StudentDeal[]>([]);
  const [isSearchingCpf, setIsLoadingCpf] = useState(false);

  // Unlock Modal State
  const [unlockModalStudent, setUnlockModalStudent] = useState<GroupedStudent | null>(null);
  const [studentAccessedIds, setStudentAccessedIds] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // View Only Deal State
  const [viewingDeal, setViewingDeal] = useState<StudentDeal | null>(null);

  // Student Profile State
  const [selectedProfile, setSelectedProfile] = useState<GroupedStudent | null>(null);
  const [profileAluno, setProfileAluno] = useState<Aluno | null>(null);
  const [profileEmails, setProfileEmails] = useState<AlunoEmail[]>([]);
  const [profileTimeline, setProfileTimeline] = useState<TimelineEvent[]>([]);
  const [profileOrders, setProfileOrders] = useState<any[]>([]);
  const [profileCertificates, setProfileCertificates] = useState<any[]>([]);
  const [profileClasses, setProfileClasses] = useState<any[]>([]);
  const [profileEvents, setProfileEvents] = useState<any[]>([]);
  const [profileTickets, setProfileTickets] = useState<any[]>([]);
  const [profileCourseAccess, setProfileCourseAccess] = useState<any[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<'timeline' | 'courses' | 'financial' | 'certificates' | 'notes' | 'conta_azul'>('timeline');
  const [profileReceivables, setProfileReceivables] = useState<any[]>([]);
  const [profilePayables, setProfilePayables] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Aluno>>({});
  const [newEmail, setNewEmail] = useState('');
  const [profileNotes, setProfileNotes] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [dealsRes, pipesRes] = await Promise.all([
            appBackend.client.from('crm_deals').select('*').order('contact_name', { ascending: true }),
            appBackend.getPipelines()
        ]);
        
        if (dealsRes.error) throw dealsRes.error;
        
        const mappedDeals = dealsRes.data.map((s: any) => ({ ...s, student_access_enabled: s.student_access_enabled !== false }));
        setDeals(mappedDeals);
        setPipelines(pipesRes || []);

        if (mappedDeals.length > 0) {
            const [issuedCertsRes, prodsRes, coursesRes, accessesRes] = await Promise.all([
                appBackend.client.from('crm_student_certificates').select('student_deal_id, hash, issued_at').in('student_deal_id', mappedDeals.map(d => d.id)),
                appBackend.client.from('crm_products').select('name, certificate_template_id').not('certificate_template_id', 'is', null),
                appBackend.getOnlineCourses(),
                appBackend.client.from('crm_student_course_access').select('student_deal_id, course_id').in('student_deal_id', mappedDeals.map(d => d.id))
            ]);

            const certMap: Record<string, CertStatus> = {};
            issuedCertsRes.data?.forEach((c: any) => { certMap[c.student_deal_id] = { hash: c.hash, issuedAt: c.issued_at }; });
            setCertificates(certMap);

            const templateMap: Record<string, string> = {};
            prodsRes.data?.forEach((p: any) => { templateMap[p.name] = p.certificate_template_id; });
            setProductTemplates(templateMap);

            const courses = coursesRes || [];
            setOnlineCourses(courses);

            const accMap: Record<string, string[]> = {};
            accessesRes.data?.forEach((acc: any) => {
                const course = courses.find(c => c.id === acc.course_id);
                if (course) {
                    if (!accMap[acc.student_deal_id]) accMap[acc.student_deal_id] = [];
                    accMap[acc.student_deal_id].push(course.title);
                }
            });
            setCourseAccessMap(accMap);
        }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const getGroupedStudents = (filteredDeals: StudentDeal[]) => {
      const groups: Record<string, GroupedStudent> = {};

      filteredDeals.forEach(deal => {
          const cleanCpf = deal.cpf ? deal.cpf.replace(/\D/g, '') : null;
          const key = cleanCpf || deal.email?.toLowerCase().trim() || deal.id;

          if (!groups[key]) {
              groups[key] = {
                  cpf: deal.cpf || '',
                  email: deal.email || '',
                  name: deal.company_name || deal.contact_name || 'Sem Nome',
                  deals: [],
                  presential: [],
                  digital: [],
                  events: []
              };
          }
          
          groups[key].deals.push(deal);
          
          const prodName = deal.product_name || 'Produto Indefinido';
          const itemRef: ItemRef = { id: deal.id, name: prodName, isCrm: true };

          if (deal.product_type === 'Presencial') {
              groups[key].presential.push(itemRef);
          } else if (deal.product_type === 'Digital') {
              groups[key].digital.push(itemRef);
          } else if (deal.product_type === 'Evento') {
              groups[key].events.push(itemRef);
          } else {
              groups[key].digital.push(itemRef);
          }
      });

      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  };

  const groupedStudents = useMemo(() => {
    const activeDeals = deals.filter(d => {
        if (d.status === 'excluido') return false;
        return d.student_access_enabled !== false;
    });
    return getGroupedStudents(activeDeals);
  }, [deals]);

  const excludedGroupedStudents = useMemo(() => {
    const excludedDeals = deals.filter(d => d.status === 'excluido');
    return getGroupedStudents(excludedDeals);
  }, [deals]);

  const currentGroupedList = activeSubTab === 'exclusions' ? excludedGroupedStudents : groupedStudents;

  const filtered = currentGroupedList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cpf.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
  );

  const formatCPF = (val: string) => {
      if (!val) return '';
      const numbers = val.replace(/\D/g, '');
      return numbers
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleDeleteItem = async (dealId: string, itemName: string) => {
      if (!window.confirm(`Deseja realmente excluir "${itemName}"? Ele será movido para a aba de Exclusões.`)) return;
      
      try {
          // Soft delete: muda o status para 'excluido'
          const { error } = await appBackend.client
            .from('crm_deals')
            .update({ status: 'excluido' })
            .eq('id', dealId);

          if (error) throw error;
          fetchData();
      } catch (e: any) {
          alert("Erro ao excluir item: " + e.message);
      }
  };

  const handleRestoreItem = async (dealId: string, itemName: string) => {
      if (!window.confirm(`Deseja restaurar "${itemName}"?`)) return;
      
      try {
          const { error } = await appBackend.client
            .from('crm_deals')
            .update({ status: 'active' }) // Ou outro status padrão apropriado
            .eq('id', dealId);

          if (error) throw error;
          fetchData();
      } catch (e: any) {
          alert("Erro ao restaurar item: " + e.message);
      }
  };

  const handlePermanentDelete = async (dealId: string, itemName: string) => {
      if (!window.confirm(`ATENÇÃO: Deseja excluir PERMANENTEMENTE "${itemName}"? Esta ação não pode ser desfeita.`)) return;
      
      try {
          const { error } = await appBackend.client.from('crm_deals').delete().eq('id', dealId);
          if (error) throw error;
          fetchData();
      } catch (e: any) {
          alert("Erro ao excluir permanentemente: " + e.message);
      }
  };

  const handleDeleteStudent = async (student: GroupedStudent) => {
      if (!window.confirm(`Deseja excluir o aluno ${student.name} e todos os seus itens? Eles serão movidos para Exclusões.`)) return;
      
      try {
          const dealIds = student.deals.map(d => d.id);
          const { error } = await appBackend.client
            .from('crm_deals')
            .update({ status: 'excluido' })
            .in('id', dealIds);

          if (error) throw error;
          fetchData();
      } catch (e: any) {
          alert("Erro ao excluir aluno: " + e.message);
      }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCPF(e.target.value);
      if (formatted.length <= 14) {
          setCpfSearchQuery(formatted);
      }
  };

  const handleCpfSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanCpf = cpfSearchQuery.replace(/\D/g, '');
      if (cleanCpf.length < 3) return;

      setIsLoadingCpf(true);
      try {
          const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
          const { data, error } = await appBackend.client
              .from('crm_deals')
              .select('*')
              .or(`cpf.ilike.%${cleanCpf}%,cpf.ilike.%${formattedCpf}%`)
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          setSearchResultDeals(data || []);
      } catch (e) {
          console.error("Erro na busca por CPF:", e);
      } finally {
          setIsLoadingCpf(false);
      }
  };

  const handleIssueCertificate = async (dealId: string, contactName: string, productName: string) => {
      const templateId = productTemplates[productName];
      if (!templateId) {
          alert("Este produto não possui um modelo de certificado vinculado.");
          return;
      }
      if (!window.confirm(`Deseja emitir agora o certificado para ${contactName}?`)) return;
      try {
          const hash = await appBackend.issueCertificate(dealId, templateId);
          setCertificates(prev => ({ ...prev, [dealId]: { hash, issuedAt: new Date().toISOString() } }));
          alert("Certificado emitido com sucesso!");
      } catch (e: any) { alert(e.message); }
  };

  const handleViewDealDetails = (dealId: string) => {
      const deal = deals.find(d => d.id === dealId) || searchResultDeals.find(d => d.id === dealId);
      if (deal) setViewingDeal(deal);
  };

  const exportToExcel = () => {
    if (filtered.length === 0) return;

    const dataToExport = filtered.map(s => ({
        'Nome': s.name,
        'E-mail': s.email,
        'CPF': formatCPF(s.cpf),
        'Produtos Presenciais': s.presential.map(p => p.name).join(', '),
        'Produtos Digitais': s.digital.map(p => p.name).join(', '),
        'Eventos': s.events.map(p => p.name).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
    XLSX.writeFile(workbook, `Lista_Alunos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const openStudentProfile = async (student: GroupedStudent) => {
      setSelectedProfile(student);
      setProfileTab('timeline');
      setIsEditingProfile(false);
      setIsLoadingProfile(true);

      const cleanCpf = student.cpf?.replace(/\D/g, '') || '';
      const dealIds = student.deals.map(d => d.id);
      const studentEmails = [...new Set(student.deals.map(d => d.email?.toLowerCase().trim()).filter(Boolean))];

      try {
          const [alunoRes, emailsRes, ordersRes, certsRes, classesRes, eventsRes, ticketsRes, courseAccessRes] = await Promise.all([
              cleanCpf ? appBackend.client.from('crm_alunos').select('*').eq('cpf', cleanCpf).maybeSingle() : { data: null },
              cleanCpf ? appBackend.client.from('crm_aluno_emails').select('*').eq('aluno_id', (await appBackend.client.from('crm_alunos').select('id').eq('cpf', cleanCpf).maybeSingle()).data?.id || '00000000-0000-0000-0000-000000000000').order('is_primary', { ascending: false }) : { data: [] },
              studentEmails.length > 0 ? appBackend.client.from('pagbank_orders').select('*').in('student_email', studentEmails).order('created_at', { ascending: false }) : { data: [] },
              dealIds.length > 0 ? appBackend.client.from('crm_student_certificates').select('*').in('student_deal_id', dealIds) : { data: [] },
              appBackend.client.from('crm_classes').select('*'),
              dealIds.length > 0 ? appBackend.client.from('crm_event_registrations').select('*').in('student_id', dealIds) : { data: [] },
              dealIds.length > 0 ? appBackend.client.from('crm_support_tickets').select('*').in('sender_id', dealIds).order('created_at', { ascending: false }) : { data: [] },
              dealIds.length > 0 ? appBackend.client.from('crm_student_course_access').select('*').in('student_deal_id', dealIds) : { data: [] },
          ]);

          const aluno = alunoRes?.data || null;
          setProfileAluno(aluno);
          setProfileEmails(emailsRes?.data || []);
          setProfileNotes(aluno?.observation || '');
          setEditForm(aluno ? { ...aluno } : { full_name: student.name, phone: student.deals[0]?.phone || '', cpf: cleanCpf });
          setProfileOrders(ordersRes?.data || []);
          setProfileCertificates(certsRes?.data || []);
          setProfileEvents(eventsRes?.data || []);
          setProfileTickets(ticketsRes?.data || []);
          setProfileCourseAccess(courseAccessRes?.data || []);

          const studentClassesRaw = classesRes?.data || [];
          const enrolledClasses = studentClassesRaw.filter((c: any) => {
              const ids: string[] = c.student_ids || [];
              return ids.some(sid => dealIds.includes(sid));
          });
          setProfileClasses(enrolledClasses);

          const timeline = buildTimeline(student.deals, ordersRes?.data || [], certsRes?.data || [], enrolledClasses, eventsRes?.data || [], ticketsRes?.data || [], courseAccessRes?.data || []);
          setProfileTimeline(timeline);

          const contactNames = [...new Set(student.deals.map(d => d.company_name || d.contact_name).filter(Boolean))];
          if (contactNames.length > 0) {
              const receivePromises = contactNames.map(name =>
                  appBackend.client.from('conta_azul_contas_receber').select('*').ilike('contato_nome', `%${name}%`).order('data_vencimento', { ascending: false })
              );
              const payPromises = contactNames.map(name =>
                  appBackend.client.from('conta_azul_contas_pagar').select('*').ilike('fornecedor_nome', `%${name}%`).order('data_vencimento', { ascending: false })
              );
              const [receiveResults, payResults] = await Promise.all([
                  Promise.all(receivePromises),
                  Promise.all(payPromises),
              ]);
              const allReceivables = receiveResults.flatMap(r => r.data || []);
              const allPayables = payResults.flatMap(r => r.data || []);
              const uniqueReceivables = Array.from(new Map(allReceivables.map(r => [r.id, r])).values());
              const uniquePayables = Array.from(new Map(allPayables.map(p => [p.id, p])).values());
              setProfileReceivables(uniqueReceivables);
              setProfilePayables(uniquePayables);
          } else {
              setProfileReceivables([]);
              setProfilePayables([]);
          }
      } catch (err) {
          console.error('Erro ao carregar perfil do aluno:', err);
      } finally {
          setIsLoadingProfile(false);
      }
  };

  const buildTimeline = (
      dealsList: StudentDeal[], orders: any[], certs: any[],
      classes: any[], events: any[], tickets: any[], courseAccess: any[]
  ): TimelineEvent[] => {
      const items: TimelineEvent[] = [];

      dealsList.forEach(d => {
          const pipe = pipelines.find(p => p.name === d.pipeline);
          const lastStageId = pipe?.stages?.[pipe.stages.length - 1]?.id;
          const isClosed = d.stage === lastStageId || d.stage === 'closed';

          items.push({
              id: `deal-lead-${d.id}`,
              type: 'lead_created',
              date: d.created_at,
              title: 'Lead criado no CRM',
              description: `${d.product_name || 'Produto não identificado'} — Pipeline: ${d.pipeline || 'Padrão'}`,
              value: d.value,
              status: d.stage,
          });

          if (!isClosed && d.stage !== 'new') {
              items.push({
                  id: `deal-interest-${d.id}`,
                  type: 'interest',
                  date: d.created_at,
                  title: `Interesse em ${d.product_name || 'produto'}`,
                  description: `Etapa: ${d.stage} — ${d.product_type || 'Tipo não definido'}`,
                  status: d.stage,
              });
          }

          if (isClosed) {
              items.push({
                  id: `deal-purchase-${d.id}`,
                  type: 'purchase',
                  date: d.created_at,
                  title: `Compra: ${d.product_name || 'produto'}`,
                  description: `${d.payment_method || 'Forma pagto. N/A'} — ${d.product_type || ''}`,
                  value: d.value,
                  status: 'closed',
              });
          }
      });

      orders.forEach(o => {
          items.push({
              id: `order-${o.id}`,
              type: 'purchase',
              date: o.created_at,
              title: `Pedido PagBank: ${o.course_title || 'Curso Online'}`,
              description: `Status: ${o.status} — ${o.payment_method || ''}`,
              value: o.amount / 100,
              status: o.status,
          });
      });

      courseAccess.forEach(ca => {
          const course = onlineCourses.find(c => c.id === ca.course_id);
          items.push({
              id: `access-${ca.id}`,
              type: 'course_access',
              date: ca.unlocked_at || ca.created_at,
              title: `Acesso liberado: ${course?.title || 'Curso Online'}`,
              description: 'Curso online desbloqueado',
              status: 'active',
          });
      });

      certs.forEach(c => {
          items.push({
              id: `cert-${c.id}`,
              type: 'certificate',
              date: c.issued_at,
              title: 'Certificado emitido',
              description: `Hash: ${c.hash?.substring(0, 12)}...`,
              status: 'issued',
              meta: { hash: c.hash },
          });
      });

      classes.forEach(cl => {
          items.push({
              id: `class-${cl.id}`,
              type: 'class_enrolled',
              date: cl.date_mod_1 || cl.created_at,
              title: `Turma: ${cl.class_code || cl.course || 'Turma'}`,
              description: `${cl.city || ''} ${cl.state || ''} — ${cl.course || ''}`.trim(),
              status: cl.status,
          });
      });

      events.forEach(ev => {
          items.push({
              id: `event-${ev.id}`,
              type: 'event_registration',
              date: ev.registered_at || ev.created_at,
              title: `Inscrição em evento`,
              description: `${ev.student_name || ''} — Workshop ID: ${ev.workshop_id || 'N/A'}`,
              status: 'registered',
          });
      });

      tickets.forEach(t => {
          items.push({
              id: `ticket-${t.id}`,
              type: 'support_ticket',
              date: t.created_at,
              title: `Suporte: ${t.subject || 'Ticket'}`,
              description: `Status: ${t.status} — Tag: ${t.tag || 'N/A'}`,
              status: t.status,
          });
      });

      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const timelineConfig: Record<TimelineEventType, { icon: any; color: string; bg: string; border: string }> = {
      lead_created: { icon: User, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      interest: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
      purchase: { icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      course_access: { icon: MonitorPlay, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
      certificate: { icon: Award, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      event_registration: { icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
      class_enrolled: { icon: GraduationCap, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
      support_ticket: { icon: MessageCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  };

  const handleSaveProfile = async () => {
      if (!profileAluno?.id) return;
      setIsSavingProfile(true);
      try {
          await appBackend.client.from('crm_alunos').update({
              full_name: editForm.full_name,
              phone: editForm.phone,
              birth_date: editForm.birth_date || null,
              zip_code: editForm.zip_code,
              address: editForm.address,
              address_number: editForm.address_number,
              neighborhood: editForm.neighborhood,
              city: editForm.city,
              state: editForm.state,
              observation: profileNotes,
          }).eq('id', profileAluno.id);

          setProfileAluno(prev => prev ? { ...prev, ...editForm, observation: profileNotes } : prev);
          setIsEditingProfile(false);
      } catch (err) {
          console.error('Erro ao salvar perfil:', err);
          alert('Erro ao salvar dados do perfil.');
      } finally {
          setIsSavingProfile(false);
      }
  };

  const handleAddEmail = async () => {
      if (!newEmail.trim() || !profileAluno?.id) return;
      try {
          const emailLower = newEmail.trim().toLowerCase();
          const { error } = await appBackend.client.from('crm_aluno_emails').insert({ aluno_id: profileAluno.id, email: emailLower, is_primary: profileEmails.length === 0 });
          if (error) throw error;
          const { data } = await appBackend.client.from('crm_aluno_emails').select('*').eq('aluno_id', profileAluno.id).order('is_primary', { ascending: false });
          setProfileEmails(data || []);
          setNewEmail('');
      } catch (err: any) {
          alert(err.message?.includes('duplicate') ? 'Este email já está cadastrado.' : 'Erro ao adicionar email.');
      }
  };

  const handleRemoveEmail = async (emailId: string) => {
      if (!window.confirm('Remover este email?')) return;
      try {
          await appBackend.client.from('crm_aluno_emails').delete().eq('id', emailId);
          setProfileEmails(prev => prev.filter(e => e.id !== emailId));
      } catch { alert('Erro ao remover email.'); }
  };

  const handleSetPrimaryEmail = async (emailId: string) => {
      if (!profileAluno?.id) return;
      try {
          await appBackend.client.from('crm_aluno_emails').update({ is_primary: false }).eq('aluno_id', profileAluno.id);
          await appBackend.client.from('crm_aluno_emails').update({ is_primary: true }).eq('id', emailId);
          setProfileEmails(prev => prev.map(e => ({ ...e, is_primary: e.id === emailId })));
      } catch { alert('Erro ao definir email principal.'); }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-teal-600" /> Alunos</h2><p className="text-slate-500 text-sm">Liberação de cursos e certificados.</p></div>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                <button 
                    onClick={() => setActiveSubTab('list')}
                    className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeSubTab === 'list' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <List size={14}/> Lista Geral (Alunos)
                </button>
                <button 
                    onClick={() => setActiveSubTab('cpf_search')}
                    className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeSubTab === 'cpf_search' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <Search size={14}/> Compras por CPF
                </button>
                <button 
                    onClick={() => setActiveSubTab('exclusions')}
                    className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeSubTab === 'exclusions' ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <Trash2 size={14}/> Exclusões
                </button>
            </div>
        </div>

        {(activeSubTab === 'list' || activeSubTab === 'exclusions') ? (
            <>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar aluno pelo nome, e-mail ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm font-medium" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={exportToExcel}
                            disabled={filtered.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                        >
                            <FileSpreadsheet size={16} /> Exportar Excel
                        </button>
                        <button onClick={fetchData} className="p-2 text-slate-400 hover:text-teal-600 transition-all"><RefreshCw size={20} className={clsx(isLoading && "animate-spin")} /></button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto min-h-[400px]">
                    {isLoading ? <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-teal-600" /></div> : (
                        <table className="w-full text-left text-sm text-slate-600 border-collapse">
                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Nome do Aluno</th>
                                    <th className="px-6 py-4">CPF</th>
                                    <th className="px-6 py-4">Curso Presencial</th>
                                    <th className="px-6 py-4">Produtos Digitais</th>
                                    <th className="px-6 py-4">Eventos</th>
                                    <th className="px-6 py-4 text-center">Certificados</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(s => (
                                    <tr key={s.cpf || s.email || s.name} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col cursor-pointer" onClick={() => openStudentProfile(s)}>
                                                <span className="font-bold text-slate-800 hover:text-teal-600 transition-colors">{s.name}</span>
                                                <span className="text-[10px] text-slate-400">{s.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-700 whitespace-nowrap">{formatCPF(s.cpf) || '--'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.presential.map(p => (
                                                    <button 
                                                        key={p.id} 
                                                        onClick={() => p.isCrm && handleViewDealDetails(p.id)}
                                                        className={clsx(
                                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase border transition-all",
                                                            activeSubTab === 'exclusions' ? "bg-red-50 text-red-700 border-red-100" : "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 hover:border-purple-300"
                                                        )}
                                                    >
                                                        {p.isCrm && <span className={clsx("px-1 rounded-[2px] text-[7px] mr-0.5", activeSubTab === 'exclusions' ? "bg-red-600 text-white" : "bg-purple-600 text-white")}>CRM</span>}
                                                        {p.name}
                                                        {activeSubTab === 'exclusions' ? (
                                                            <div className="flex gap-1 ml-1">
                                                                <RotateCcw size={10} onClick={(e) => { e.stopPropagation(); handleRestoreItem(p.id, p.name); }} className="hover:text-green-600" />
                                                                <X size={10} onClick={(e) => { e.stopPropagation(); handlePermanentDelete(p.id, p.name); }} className="hover:text-red-900" />
                                                            </div>
                                                        ) : (
                                                            <X size={10} onClick={(e) => { e.stopPropagation(); handleDeleteItem(p.id, p.name); }} className="hover:text-red-600 ml-1" />
                                                        )}
                                                    </button>
                                                ))}
                                                {s.presential.length === 0 && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.digital.map(p => (
                                                    <button 
                                                        key={p.id} 
                                                        onClick={() => p.isCrm && handleViewDealDetails(p.id)}
                                                        className={clsx(
                                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase border transition-all",
                                                            activeSubTab === 'exclusions' ? "bg-red-50 text-red-700 border-red-100" : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-300"
                                                        )}
                                                    >
                                                        {p.isCrm && <span className={clsx("px-1 rounded-[2px] text-[7px] mr-0.5", activeSubTab === 'exclusions' ? "bg-red-600 text-white" : "bg-indigo-600 text-white")}>CRM</span>}
                                                        {p.name}
                                                        {activeSubTab === 'exclusions' ? (
                                                            <div className="flex gap-1 ml-1">
                                                                <RotateCcw size={10} onClick={(e) => { e.stopPropagation(); handleRestoreItem(p.id, p.name); }} className="hover:text-green-600" />
                                                                <X size={10} onClick={(e) => { e.stopPropagation(); handlePermanentDelete(p.id, p.name); }} className="hover:text-red-900" />
                                                            </div>
                                                        ) : (
                                                            <X size={10} onClick={(e) => { e.stopPropagation(); handleDeleteItem(p.id, p.name); }} className="hover:text-red-600 ml-1" />
                                                        )}
                                                    </button>
                                                ))}
                                                {s.digital.length === 0 && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.events.map(p => (
                                                    <button 
                                                        key={p.id} 
                                                        onClick={() => p.isCrm && handleViewDealDetails(p.id)}
                                                        className={clsx(
                                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase border transition-all",
                                                            activeSubTab === 'exclusions' ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 hover:border-amber-300"
                                                        )}
                                                    >
                                                        {p.isCrm && <span className={clsx("px-1 rounded-[2px] text-[7px] mr-0.5", activeSubTab === 'exclusions' ? "bg-red-600 text-white" : "bg-amber-600 text-white")}>CRM</span>}
                                                        {p.name}
                                                        {activeSubTab === 'exclusions' ? (
                                                            <div className="flex gap-1 ml-1">
                                                                <RotateCcw size={10} onClick={(e) => { e.stopPropagation(); handleRestoreItem(p.id, p.name); }} className="hover:text-green-600" />
                                                                <X size={10} onClick={(e) => { e.stopPropagation(); handlePermanentDelete(p.id, p.name); }} className="hover:text-red-900" />
                                                            </div>
                                                        ) : (
                                                            <X size={10} onClick={(e) => { e.stopPropagation(); handleDeleteItem(p.id, p.name); }} className="hover:text-red-600 ml-1" />
                                                        )}
                                                    </button>
                                                ))}
                                                {s.events.length === 0 && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2 items-center justify-center">
                                                {s.deals.filter(d => !!productTemplates[d.product_name]).map(d => {
                                                    const cert = certificates[d.id];
                                                    return (
                                                        <div key={d.id} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 w-full max-w-[200px]">
                                                            <span className="text-[8px] font-bold text-slate-500 truncate flex-1">{d.product_name}</span>
                                                            {cert ? (
                                                                <div className="flex gap-1">
                                                                    <a href={`/?certificateHash=${cert.hash}`} target="_blank" className="p-1 bg-white border border-slate-200 rounded text-slate-500 hover:text-teal-600 transition-colors shadow-sm" title="Visualizar"><Eye size={12}/></a>
                                                                    <button 
                                                                        onClick={() => { 
                                                                            navigator.clipboard.writeText(`${window.location.origin}/?certificateHash=${cert.hash}`); 
                                                                            setCopiedLink(cert.hash); 
                                                                            setTimeout(() => setCopiedLink(null), 2000); 
                                                                        }} 
                                                                        className={clsx("p-1 border rounded transition-all shadow-sm", copiedLink === cert.hash ? "bg-green-50 text-green-600 border-green-200" : "bg-white text-slate-500 border-slate-200 hover:bg-teal-50")}
                                                                    >
                                                                        {copiedLink === cert.hash ? <CheckCircle size={12}/> : <ExternalLink size={12}/>}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => handleIssueCertificate(d.id, s.name, d.product_name)}
                                                                    className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black uppercase rounded border border-amber-100 hover:bg-amber-100"
                                                                >
                                                                    Liberar
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {s.deals.every(d => !productTemplates[d.product_name]) && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleDeleteStudent(s)} className="p-1.5 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all" title="Excluir Aluno"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </>
        ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 mb-4">
                            <ShoppingBag size={32}/>
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Histórico de Compras</h3>
                        <p className="text-sm text-slate-500 mt-2">Insira o CPF do aluno abaixo para listar todos os produtos, eventos e cursos adquiridos.</p>
                    </div>

                    <form onSubmit={handleCpfSearch} className="max-w-md mx-auto flex gap-2">
                        <div className="relative flex-1">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="000.000.000-00" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                                value={cpfSearchQuery}
                                onChange={handleCpfChange}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSearchingCpf}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSearchingCpf ? <Loader2 size={18} className="animate-spin" /> : <Search size={18}/>}
                            Buscar
                        </button>
                    </form>
                </div>

                <div className="space-y-4">
                    {searchResultDeals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResultDeals.map(deal => (
                                <div key={deal.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col group border-l-4 border-l-teal-500">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                                            <ShoppingBag size={20}/>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={clsx(
                                                "text-[8px] font-black px-2 py-0.5 rounded-full uppercase border flex items-center gap-1",
                                                deal.product_type === 'Evento' ? "bg-amber-50 text-amber-700 border-amber-200" : 
                                                deal.product_type === 'Digital' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                                "bg-teal-50 text-teal-700 border-teal-200"
                                            )}>
                                                <span className="bg-indigo-600 text-white px-1 rounded-[2px] text-[7px]">CRM</span>
                                                {deal.product_type || 'Produto'}
                                            </span>
                                            <span className={clsx(
                                                "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border",
                                                deal.stage === 'closed' ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                            )}>
                                                {deal.stage === 'closed' ? 'Matriculado' : 'Lead'}
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className="font-black text-slate-800 text-lg leading-tight mb-2 cursor-pointer hover:text-teal-600" onClick={() => handleViewDealDetails(deal.id)}>{deal.product_name || 'Produto Não Identificado'}</h4>
                                    <div className="space-y-1.5 mb-6 flex-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Calendar size={14} className="text-slate-300"/> Adquirido em: {new Date(deal.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <DollarSign size={14} className="text-slate-300"/> Valor: {formatCurrency(deal.value)}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <CreditCard size={14} className="text-slate-300"/> Pagamento: {deal.payment_method || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 border-t pt-4">
                                        <button onClick={() => handleDeleteItem(deal.id, deal.product_name)} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-400 rounded-xl transition-all" title="Excluir Compra"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !isSearchingCpf && cpfSearchQuery.length > 0 ? (
                        <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
                            <XCircle size={48} className="opacity-10 mb-4"/>
                            <p className="font-bold">Nenhum registro localizado</p>
                            <p className="text-xs">O CPF informado não possui compras registradas no CRM.</p>
                        </div>
                    ) : null}
                </div>
            </div>
        )}

        {/* STUDENT PROFILE PANEL */}
        {selectedProfile && (
            <div className="fixed inset-0 z-[100] flex items-stretch bg-slate-900/40 backdrop-blur-sm overflow-hidden">
                <div className="bg-white w-full max-w-5xl mx-auto my-4 rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 overflow-hidden">
                    {/* HEADER */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-8 py-6 text-white shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black backdrop-blur-sm">
                                    {(profileAluno?.full_name || selectedProfile.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight">{profileAluno?.full_name || selectedProfile.name}</h2>
                                    <div className="flex items-center gap-3 mt-1 text-teal-100 text-xs font-medium">
                                        <span className="flex items-center gap-1"><Hash size={12}/> CPF: {formatCPF(profileAluno?.cpf || selectedProfile.cpf)}</span>
                                        {profileAluno?.phone && <span className="flex items-center gap-1"><Phone size={12}/> {profileAluno.phone}</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {profileEmails.map(em => (
                                            <span key={em.id} className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1", em.is_primary ? "bg-white/30 text-white" : "bg-white/10 text-teal-100")}>
                                                <Mail size={10}/> {em.email} {em.is_primary && <CheckCircle size={10}/>}
                                            </span>
                                        ))}
                                        {profileEmails.length === 0 && <span className="text-teal-200 text-[10px] italic">Nenhum email cadastrado</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setIsEditingProfile(!isEditingProfile); setProfileTab('notes'); }} className="p-2 hover:bg-white/20 rounded-xl transition-all" title="Editar"><Edit2 size={18}/></button>
                                <button onClick={() => setSelectedProfile(null)} className="p-2 hover:bg-white/20 rounded-xl transition-all"><X size={20}/></button>
                            </div>
                        </div>
                        {profileAluno && (profileAluno.city || profileAluno.state) && (
                            <div className="mt-3 text-teal-100 text-xs flex items-center gap-1"><MapPin size={12}/> {[profileAluno.address, profileAluno.address_number, profileAluno.neighborhood, profileAluno.city, profileAluno.state].filter(Boolean).join(', ')}</div>
                        )}
                    </div>

                    {/* TABS */}
                    <div className="border-b border-slate-200 px-8 bg-slate-50 shrink-0">
                        <div className="flex gap-1 -mb-px overflow-x-auto">
                            {([
                                { key: 'timeline' as const, label: 'Timeline', icon: Activity },
                                { key: 'courses' as const, label: 'Cursos / Produtos', icon: BookOpen },
                                { key: 'financial' as const, label: 'Financeiro', icon: DollarSign },
                                { key: 'certificates' as const, label: 'Certificados', icon: Award },
                                { key: 'conta_azul' as const, label: 'Conta Azul', icon: Landmark },
                                { key: 'notes' as const, label: 'Dados & Notas', icon: FileText },
                            ]).map(tab => (
                                <button key={tab.key} onClick={() => setProfileTab(tab.key)}
                                    className={clsx("px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap",
                                        profileTab === tab.key ? "border-teal-600 text-teal-700 bg-white" : "border-transparent text-slate-400 hover:text-slate-600"
                                    )}>
                                    <tab.icon size={14}/> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {isLoadingProfile ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-teal-600" size={32}/></div>
                        ) : (
                            <>
                                {/* TIMELINE TAB */}
                                {profileTab === 'timeline' && (
                                    <div className="max-w-3xl mx-auto">
                                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={16}/> Histórico Completo</h3>
                                        {profileTimeline.length === 0 ? (
                                            <div className="text-center py-16 text-slate-400"><Activity size={48} className="mx-auto opacity-20 mb-4"/><p className="font-bold">Nenhum evento registrado</p></div>
                                        ) : (
                                            <div className="relative">
                                                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                                                <div className="space-y-4">
                                                    {profileTimeline.map(ev => {
                                                        const cfg = timelineConfig[ev.type];
                                                        const Icon = cfg.icon;
                                                        return (
                                                            <div key={ev.id} className="relative flex items-start gap-4 pl-0">
                                                                <div className={clsx("relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", cfg.bg, cfg.border, cfg.color)}>
                                                                    <Icon size={18}/>
                                                                </div>
                                                                <div className={clsx("flex-1 border rounded-xl p-4 bg-white hover:shadow-md transition-all", cfg.border)}>
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <div>
                                                                            <p className="font-bold text-sm text-slate-800">{ev.title}</p>
                                                                            <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <p className="text-[10px] font-bold text-slate-400">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                                                                            {ev.value != null && ev.value > 0 && <p className="text-sm font-black text-emerald-600 mt-0.5">{formatCurrency(ev.value)}</p>}
                                                                        </div>
                                                                    </div>
                                                                    {ev.status && (
                                                                        <span className={clsx("mt-2 inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", cfg.bg, cfg.color, cfg.border)}>{ev.status}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* COURSES TAB */}
                                {profileTab === 'courses' && (
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2"><BookOpen size={16}/> Todos os Cursos e Produtos</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {selectedProfile.deals.map(d => {
                                                const pipe = pipelines.find(p => p.name === d.pipeline);
                                                const lastStageId = pipe?.stages?.[pipe.stages.length - 1]?.id;
                                                const isClosed = d.stage === lastStageId || d.stage === 'closed';
                                                const hasAccess = profileCourseAccess.some(ca => ca.student_deal_id === d.id);
                                                const hasCert = profileCertificates.some(c => c.student_deal_id === d.id);

                                                let statusLabel = 'Interesse';
                                                let statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                                                if (isClosed) {
                                                    statusLabel = 'Comprado';
                                                    statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                                }
                                                if (hasCert) {
                                                    statusLabel = 'Concluído';
                                                    statusColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                                                }

                                                return (
                                                    <div key={d.id} className="bg-white border rounded-2xl p-5 hover:shadow-md transition-all">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase", d.product_type === 'Digital' ? 'bg-violet-50 text-violet-700 border-violet-200' : d.product_type === 'Evento' ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-teal-50 text-teal-700 border-teal-200')}>
                                                                {d.product_type || 'Produto'}
                                                            </span>
                                                            <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase", statusColor)}>
                                                                {statusLabel}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-black text-slate-800 mb-2">{d.product_name || 'Produto'}</h4>
                                                        <div className="space-y-1 text-xs text-slate-500">
                                                            <p className="flex items-center gap-1.5"><Calendar size={12}/> {new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
                                                            {d.value > 0 && <p className="flex items-center gap-1.5"><DollarSign size={12}/> {formatCurrency(d.value)}</p>}
                                                            {d.payment_method && <p className="flex items-center gap-1.5"><CreditCard size={12}/> {d.payment_method}</p>}
                                                        </div>
                                                        <div className="flex gap-1.5 mt-3 flex-wrap">
                                                            {hasAccess && <span className="text-[8px] font-black bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">ACESSO ONLINE</span>}
                                                            {hasCert && <span className="text-[8px] font-black bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">CERTIFICADO</span>}
                                                            {d.class_mod_1 && <span className="text-[8px] font-black bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">TURMA: {d.class_mod_1}</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {selectedProfile.deals.length === 0 && (
                                                <div className="col-span-full text-center py-16 text-slate-400"><BookOpen size={48} className="mx-auto opacity-20 mb-4"/><p className="font-bold">Nenhum curso ou produto</p></div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* FINANCIAL TAB */}
                                {profileTab === 'financial' && (
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={16}/> Resumo Financeiro</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase">Total Gasto (CRM)</p>
                                                <p className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(selectedProfile.deals.filter(d => { const p = pipelines.find(pp => pp.name === d.pipeline); return d.stage === (p?.stages?.[p.stages.length-1]?.id) || d.stage === 'closed'; }).reduce((sum, d) => sum + d.value, 0))}</p>
                                            </div>
                                            <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase">Pedidos PagBank</p>
                                                <p className="text-2xl font-black text-indigo-700 mt-1">{profileOrders.length}</p>
                                            </div>
                                            <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100">
                                                <p className="text-[10px] font-black text-violet-600 uppercase">Total PagBank</p>
                                                <p className="text-2xl font-black text-violet-700 mt-1">{formatCurrency(profileOrders.filter(o => o.status === 'PAID').reduce((sum: number, o: any) => sum + (o.amount / 100), 0))}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500"><tr>
                                                    <th className="px-4 py-3 text-left">Origem</th>
                                                    <th className="px-4 py-3 text-left">Produto</th>
                                                    <th className="px-4 py-3 text-left">Data</th>
                                                    <th className="px-4 py-3 text-left">Pagamento</th>
                                                    <th className="px-4 py-3 text-right">Valor</th>
                                                    <th className="px-4 py-3 text-center">Status</th>
                                                </tr></thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {selectedProfile.deals.map(d => (
                                                        <tr key={d.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3"><span className="text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded">CRM</span></td>
                                                            <td className="px-4 py-3 font-bold text-slate-700">{d.product_name || '--'}</td>
                                                            <td className="px-4 py-3 text-slate-500">{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                                                            <td className="px-4 py-3 text-slate-500">{d.payment_method || '--'}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(d.value)}</td>
                                                            <td className="px-4 py-3 text-center"><span className={clsx("text-[8px] font-black px-2 py-0.5 rounded-full border", d.stage === 'closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>{d.stage === 'closed' ? 'Fechado' : d.stage}</span></td>
                                                        </tr>
                                                    ))}
                                                    {profileOrders.map((o: any) => (
                                                        <tr key={o.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3"><span className="text-[8px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">PAGBANK</span></td>
                                                            <td className="px-4 py-3 font-bold text-slate-700">{o.course_title || '--'}</td>
                                                            <td className="px-4 py-3 text-slate-500">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                                                            <td className="px-4 py-3 text-slate-500">{o.payment_method || '--'}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(o.amount / 100)}</td>
                                                            <td className="px-4 py-3 text-center"><span className={clsx("text-[8px] font-black px-2 py-0.5 rounded-full border", o.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>{o.status}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {selectedProfile.deals.length === 0 && profileOrders.length === 0 && (
                                                <div className="text-center py-16 text-slate-400"><DollarSign size={48} className="mx-auto opacity-20 mb-4"/><p className="font-bold">Nenhuma transação</p></div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CERTIFICATES TAB */}
                                {profileTab === 'certificates' && (
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2"><Award size={16}/> Certificados Emitidos</h3>
                                        {profileCertificates.length === 0 ? (
                                            <div className="text-center py-16 text-slate-400"><Award size={48} className="mx-auto opacity-20 mb-4"/><p className="font-bold">Nenhum certificado emitido</p></div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {profileCertificates.map((c: any) => {
                                                    const deal = selectedProfile.deals.find(d => d.id === c.student_deal_id);
                                                    return (
                                                        <div key={c.id} className="bg-white border border-yellow-200 rounded-2xl p-5 hover:shadow-md transition-all">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600"><Award size={20}/></div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800">{deal?.product_name || 'Certificado'}</p>
                                                                    <p className="text-[10px] text-slate-400">Emitido em {new Date(c.issued_at).toLocaleDateString('pt-BR')}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <a href={`/?certificateHash=${c.hash}`} target="_blank" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-xl text-xs font-bold transition-all border border-yellow-200"><Eye size={14}/> Visualizar</a>
                                                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?certificateHash=${c.hash}`); }} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"><ExternalLink size={14}/></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CONTA AZUL TAB */}
                                {profileTab === 'conta_azul' && (
                                    <div className="space-y-8">
                                        {/* Contas a Pagar do Aluno (dados de contas_receber da empresa) */}
                                        <div>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <DollarSign size={16} className="text-red-500"/> Contas a Pagar do Aluno
                                                <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200">{profileReceivables.length}</span>
                                            </h3>
                                            {profileReceivables.length === 0 ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                                    <Landmark size={40} className="mx-auto opacity-20 mb-3"/>
                                                    <p className="font-bold text-sm">Nenhuma conta a pagar encontrada</p>
                                                    <p className="text-xs mt-1">Os registros do Conta Azul vinculados ao nome deste aluno aparecerão aqui.</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left">Descrição</th>
                                                                    <th className="px-4 py-3 text-left">Categoria</th>
                                                                    <th className="px-4 py-3 text-center">Parcela</th>
                                                                    <th className="px-4 py-3 text-left">Vencimento</th>
                                                                    <th className="px-4 py-3 text-right">Valor</th>
                                                                    <th className="px-4 py-3 text-right">Pago</th>
                                                                    <th className="px-4 py-3 text-center">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {profileReceivables.map((r: any) => {
                                                                    const isPaid = r.status?.toUpperCase() === 'RECEBIDO' || r.status?.toUpperCase() === 'LIQUIDADO';
                                                                    const isOverdue = !isPaid && r.data_vencimento && new Date(r.data_vencimento) < new Date();
                                                                    return (
                                                                        <tr key={r.id} className="hover:bg-slate-50">
                                                                            <td className="px-4 py-3">
                                                                                <p className="font-bold text-slate-700 truncate max-w-[250px]">{r.descricao || '--'}</p>
                                                                                {r.numero_documento && <p className="text-[10px] text-slate-400 mt-0.5">Doc: {r.numero_documento}</p>}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-slate-500 text-xs">{r.categoria_nome || '--'}</td>
                                                                            <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">
                                                                                {r.parcela_numero && r.total_parcelas ? `${r.parcela_numero}/${r.total_parcelas}` : '--'}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-xs">
                                                                                <span className={clsx("font-bold", isOverdue ? "text-red-600" : "text-slate-600")}>
                                                                                    {r.data_vencimento ? new Date(r.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(Number(r.valor) || 0)}</td>
                                                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(Number(r.valor_pago) || 0)}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <span className={clsx("text-[9px] font-black px-2.5 py-1 rounded-full border uppercase",
                                                                                    isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                                    isOverdue ? "bg-red-50 text-red-700 border-red-200" :
                                                                                    "bg-amber-50 text-amber-700 border-amber-200"
                                                                                )}>{r.status || 'PENDENTE'}</span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="px-4 py-3 bg-slate-50 border-t flex items-center justify-between text-xs font-bold text-slate-500">
                                                        <span>Total: {profileReceivables.length} registro(s)</span>
                                                        <div className="flex gap-4">
                                                            <span>Valor total: <span className="text-slate-800">{formatCurrency(profileReceivables.reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0))}</span></span>
                                                            <span>Total pago: <span className="text-emerald-600">{formatCurrency(profileReceivables.reduce((s: number, r: any) => s + (Number(r.valor_pago) || 0), 0))}</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Contas a Receber do Aluno (dados de contas_pagar da empresa) */}
                                        <div>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <CreditCard size={16} className="text-emerald-600"/> Contas a Receber do Aluno
                                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">{profilePayables.length}</span>
                                            </h3>
                                            {profilePayables.length === 0 ? (
                                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                                    <Landmark size={40} className="mx-auto opacity-20 mb-3"/>
                                                    <p className="font-bold text-sm">Nenhuma conta a receber encontrada</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left">Descrição</th>
                                                                    <th className="px-4 py-3 text-left">Fornecedor</th>
                                                                    <th className="px-4 py-3 text-left">Categoria</th>
                                                                    <th className="px-4 py-3 text-center">Parcela</th>
                                                                    <th className="px-4 py-3 text-left">Vencimento</th>
                                                                    <th className="px-4 py-3 text-right">Valor</th>
                                                                    <th className="px-4 py-3 text-right">Pago</th>
                                                                    <th className="px-4 py-3 text-center">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {profilePayables.map((p: any) => {
                                                                    const isPaid = p.status?.toUpperCase() === 'PAGO' || p.status?.toUpperCase() === 'LIQUIDADO';
                                                                    const isOverdue = !isPaid && p.data_vencimento && new Date(p.data_vencimento) < new Date();
                                                                    return (
                                                                        <tr key={p.id} className="hover:bg-slate-50">
                                                                            <td className="px-4 py-3">
                                                                                <p className="font-bold text-slate-700 truncate max-w-[200px]">{p.descricao || '--'}</p>
                                                                                {p.numero_documento && <p className="text-[10px] text-slate-400 mt-0.5">Doc: {p.numero_documento}</p>}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-xs text-slate-600 font-medium">{p.fornecedor_nome || '--'}</td>
                                                                            <td className="px-4 py-3 text-xs text-slate-500">{p.categoria_nome || '--'}</td>
                                                                            <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">
                                                                                {p.parcela_numero && p.total_parcelas ? `${p.parcela_numero}/${p.total_parcelas}` : '--'}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-xs">
                                                                                <span className={clsx("font-bold", isOverdue ? "text-red-600" : "text-slate-600")}>
                                                                                    {p.data_vencimento ? new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(Number(p.valor) || 0)}</td>
                                                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(Number(p.valor_pago) || 0)}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <span className={clsx("text-[9px] font-black px-2.5 py-1 rounded-full border uppercase",
                                                                                    isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                                    isOverdue ? "bg-red-50 text-red-700 border-red-200" :
                                                                                    "bg-amber-50 text-amber-700 border-amber-200"
                                                                                )}>{p.status || 'PENDENTE'}</span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="px-4 py-3 bg-slate-50 border-t flex items-center justify-between text-xs font-bold text-slate-500">
                                                        <span>Total: {profilePayables.length} registro(s)</span>
                                                        <div className="flex gap-4">
                                                            <span>Valor total: <span className="text-slate-800">{formatCurrency(profilePayables.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0))}</span></span>
                                                            <span>Total pago: <span className="text-emerald-600">{formatCurrency(profilePayables.reduce((s: number, p: any) => s + (Number(p.valor_pago) || 0), 0))}</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Resumo */}
                                        {(profileReceivables.length > 0 || profilePayables.length > 0) && (
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                                                    <p className="text-[10px] font-black text-red-600 uppercase">A Pagar (Total)</p>
                                                    <p className="text-xl font-black text-red-700 mt-1">{formatCurrency(profileReceivables.reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0))}</p>
                                                </div>
                                                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                                                    <p className="text-[10px] font-black text-blue-600 uppercase">Já Pago</p>
                                                    <p className="text-xl font-black text-blue-700 mt-1">{formatCurrency(profileReceivables.reduce((s: number, r: any) => s + (Number(r.valor_pago) || 0), 0))}</p>
                                                </div>
                                                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase">A Receber (Total)</p>
                                                    <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(profilePayables.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0))}</p>
                                                </div>
                                                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                                                    <p className="text-[10px] font-black text-amber-600 uppercase">Em Aberto (Pagar)</p>
                                                    <p className="text-xl font-black text-amber-700 mt-1">{formatCurrency(profileReceivables.reduce((s: number, r: any) => s + ((Number(r.valor) || 0) - (Number(r.valor_pago) || 0)), 0))}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* NOTES & EDIT TAB */}
                                {profileTab === 'notes' && (
                                    <div className="max-w-3xl mx-auto space-y-8">
                                        {/* Emails Management */}
                                        <div>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2"><Mail size={16}/> Emails do Aluno</h3>
                                            <div className="space-y-2 mb-4">
                                                {profileEmails.map(em => (
                                                    <div key={em.id} className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3">
                                                        <Mail size={14} className="text-slate-400"/>
                                                        <span className="flex-1 text-sm font-medium text-slate-700">{em.email}</span>
                                                        {em.is_primary ? (
                                                            <span className="text-[9px] font-black bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">PRINCIPAL</span>
                                                        ) : (
                                                            <button onClick={() => handleSetPrimaryEmail(em.id)} className="text-[9px] font-bold text-slate-400 hover:text-teal-600 transition-all">Definir principal</button>
                                                        )}
                                                        <button onClick={() => handleRemoveEmail(em.id)} className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-all"><X size={14}/></button>
                                                    </div>
                                                ))}
                                                {profileEmails.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum email cadastrado.</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="email" placeholder="novo@email.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="flex-1 px-4 py-2 border rounded-xl text-sm"/>
                                                <button onClick={handleAddEmail} disabled={!newEmail.trim()} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"><Plus size={14}/> Adicionar</button>
                                            </div>
                                        </div>

                                        {/* Profile Edit Form */}
                                        {profileAluno && (
                                            <div>
                                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={16}/> Dados Cadastrais</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Nome Completo</label>
                                                        <input type="text" value={editForm.full_name || ''} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Telefone</label>
                                                        <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Data de Nascimento</label>
                                                        <input type="date" value={editForm.birth_date || ''} onChange={e => setEditForm({...editForm, birth_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">CEP</label>
                                                        <input type="text" value={editForm.zip_code || ''} onChange={e => setEditForm({...editForm, zip_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"/>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Endereço</label>
                                                        <input type="text" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Número</label>
                                                        <input type="text" value={editForm.address_number || ''} onChange={e => setEditForm({...editForm, address_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Bairro</label>
                                                        <input type="text" value={editForm.neighborhood || ''} onChange={e => setEditForm({...editForm, neighborhood: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Cidade</label>
                                                        <input type="text" value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
                                                        <input type="text" value={editForm.state || ''} onChange={e => setEditForm({...editForm, state: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" maxLength={2}/>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        <div>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16}/> Observações</h3>
                                            <textarea value={profileNotes} onChange={e => setProfileNotes(e.target.value)} rows={5} className="w-full px-4 py-3 border rounded-xl text-sm resize-none" placeholder="Anotações sobre o aluno..."/>
                                        </div>

                                        {profileAluno && (
                                            <div className="flex justify-end">
                                                <button onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
                                                    {isSavingProfile ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Salvar Alterações
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* VIEW ONLY DEAL MODAL */}
        {viewingDeal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20"><Briefcase size={24}/></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Negociação Comercial</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Nº {viewingDeal.deal_number} • <span className="text-indigo-600">Visualização de Registro</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setViewingDeal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={24}/></button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            
                            {/* DADOS DO CLIENTE */}
                            <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><User size={14}/> Dados do Cliente</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="lg:col-span-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Nome / Empresa</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.company_name || viewingDeal.contact_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">CPF</p>
                                        <p className="text-sm font-bold text-slate-800">{formatCPF(viewingDeal.cpf) || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">E-mail</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Mail size={12} className="text-slate-300"/> {viewingDeal.email || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Telefone</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Phone size={12} className="text-slate-300"/> {viewingDeal.phone || '--'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* DADOS DA COMPRA */}
                            <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><ShoppingBag size={14}/> Detalhes da Compra</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <div className="lg:col-span-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Produto / Curso</p>
                                        <p className="text-sm font-bold text-indigo-700">{viewingDeal.product_name || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Tipo</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.product_type || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Valor Total</p>
                                        <p className="text-sm font-black text-green-700">{formatCurrency(viewingDeal.value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Data Venda</p>
                                        <p className="text-sm font-bold text-slate-800">{new Date(viewingDeal.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Forma Pagto.</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.payment_method || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Entrada</p>
                                        <p className="text-sm font-bold text-slate-800">{formatCurrency(viewingDeal.entry_value || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Parcelamento</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.installments || 1}x {formatCurrency(viewingDeal.installment_value || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* TURMA E LOCALIZAÇÃO */}
                            {(viewingDeal.class_mod_1 || viewingDeal.course_city) && (
                                <div className="lg:col-span-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><MapPin size={14}/> Turma e Localização</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Cidade / UF</p>
                                            <p className="text-sm font-bold text-slate-800">{viewingDeal.course_city || '--'} / {viewingDeal.course_state || '--'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Cód. Turma Mod 1</p>
                                            <p className="text-sm font-mono font-bold text-slate-600">{viewingDeal.class_mod_1 || '--'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Cód. Turma Mod 2</p>
                                            <p className="text-sm font-mono font-bold text-slate-600">{viewingDeal.class_mod_2 || '--'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DADOS DE FATURAMENTO */}
                            <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><Building size={14}/> Faturamento Interno</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Empresa</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.billing_company_name || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">CNPJ</p>
                                        <p className="text-sm font-mono font-bold text-slate-800">{viewingDeal.billing_cnpj || '--'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ADMIN E STATUS */}
                            <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><Hash size={14}/> Administrativo</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Status</p>
                                        <span className="text-xs font-black bg-slate-100 px-2 py-0.5 rounded border uppercase">{viewingDeal.status}</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Etapa Funil</p>
                                        <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase">{viewingDeal.stage}</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Fonte</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.source || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Campanha</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.campaign || '--'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* OBSERVAÇÕES */}
                            {viewingDeal.observation && (
                                <div className="lg:col-span-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Info size={14}/> Observações</h4>
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-sm text-amber-900 leading-relaxed italic whitespace-pre-wrap">
                                        {viewingDeal.observation}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="px-10 py-6 bg-slate-50 border-t flex justify-end shrink-0 rounded-b-3xl">
                        <button onClick={() => setViewingDeal(null)} className="bg-slate-800 hover:bg-slate-900 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">Fechar Visualização</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};