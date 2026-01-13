import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, MapPin, Users, Mic, Clock, Plus, Search, 
  MoreVertical, Edit2, Trash2, ArrowLeft, Save, X, 
  Loader2, ChevronRight, Hash, BarChart3, User, RefreshCw, Lock, Unlock, Layers, FileText,
  FileSpreadsheet, UserMinus, ShieldAlert, CheckSquare, Square
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { EventModel, Workshop, EventRegistration, EventBlock } from '../types';
import clsx from 'clsx';

// Declaração do XLSX carregado via CDN no index.html
declare const XLSX: any;

interface EventsManagerProps {
  onBack: () => void;
}

const INITIAL_EVENT: EventModel = {
    id: '',
    name: '',
    description: '',
    location: '',
    dates: [],
    createdAt: '',
    registrationOpen: false
};

const INITIAL_WORKSHOP: Workshop = {
    id: '',
    eventId: '',
    blockId: '',
    title: '',
    description: '',
    speaker: '',
    date: '',
    time: '',
    spots: 0
};

const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export const EventsManager: React.FC<EventsManagerProps> = ({ onBack }) => {
  const [events, setEvents] = useState<EventModel[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [blocks, setBlocks] = useState<EventBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [viewMode, setViewMode] = useState<'list' | 'report'>('list');
  const [reportTab, setReportTab] = useState<'workshops' | 'students'>('workshops');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const [formData, setFormData] = useState<EventModel>(INITIAL_EVENT);
  const [newDate, setNewDate] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [workshopForm, setWorkshopForm] = useState<Workshop>(INITIAL_WORKSHOP);
  const [isEditingWorkshop, setIsEditingWorkshop] = useState(false);
  
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState<EventBlock>({ id: '', eventId: '', date: '', title: '', maxSelections: 1 });

  // States para Edição de Aluno
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState('');
  const [tempWorkshops, setTempWorkshops] = useState<string[]>([]);
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
      if (formData.id) {
          fetchEventDetails(formData.id);
      } else {
          setWorkshops([]);
          setBlocks([]);
      }
  }, [formData.id]);

  useEffect(() => {
      if (viewMode === 'report' && selectedEventId) {
          fetchReportData(selectedEventId);
      }
  }, [viewMode, selectedEventId]);

  const fetchEvents = async () => {
      setLoading(true);
      try {
          const data = await appBackend.getEvents();
          setEvents(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const fetchEventDetails = async (eventId: string) => {
      try {
          const [ws, blks] = await Promise.all([
              appBackend.getWorkshops(eventId),
              appBackend.getBlocks(eventId)
          ]);
          setWorkshops(ws);
          setBlocks(blks);
      } catch (e) {
          console.error(e);
      }
  };

  const fetchReportData = async (eventId: string) => {
      setReportLoading(true);
      try {
          // Usamos os métodos do appBackend para garantir o mapeamento de snake_case para camelCase
          const [ws, blks, regsRes] = await Promise.all([
              appBackend.getWorkshops(eventId),
              appBackend.getBlocks(eventId),
              appBackend.client.from('crm_event_registrations').select('*').eq('event_id', eventId)
          ]);
          
          setWorkshops(ws || []);
          setBlocks(blks || []);
          setRegistrations(regsRes.data || []);
      } catch(e) {
          console.error(e);
      } finally {
          setReportLoading(false);
      }
  };

  const handleToggleLockStudent = async (studentId: string, studentName: string, currentlyLocked: boolean) => {
    if (!selectedEventId) return;
    const actionLabel = currentlyLocked ? 'Desbloquear' : 'Bloquear';
    if (!window.confirm(`Deseja ${actionLabel} as escolhas de ${studentName}? ${currentlyLocked ? 'O aluno poderá voltar a escolher.' : 'O aluno não poderá mais alterar seus workshops.'}`)) return;

    setReportLoading(true);
    try {
        const studentRegs = registrations.filter(r => (r.student_id || r.studentId) === studentId);
        
        if (studentRegs.length > 0) {
            // Se já tem inscrições, atualiza o flag locked em todas elas
            const { error } = await appBackend.client
                .from('crm_event_registrations')
                .update({ locked: !currentlyLocked })
                .eq('event_id', selectedEventId)
                .eq('student_id', studentId);
            if (error) throw error;
        } else if (!currentlyLocked) {
            // Se está bloqueando e não tem inscrição, cria um registro "placeholder" bloqueado
            const { error } = await appBackend.client
                .from('crm_event_registrations')
                .insert([{
                    id: crypto.randomUUID(),
                    event_id: selectedEventId,
                    workshop_id: 'LOCK_PLACEHOLDER',
                    student_id: studentId,
                    student_name: studentName,
                    locked: true,
                    created_at: new Date().toISOString()
                }]);
            if (error) throw error;
        } else {
            // Se está desbloqueando e só tinha o placeholder, remove o placeholder
            const { error } = await appBackend.client
                .from('crm_event_registrations')
                .delete()
                .eq('event_id', selectedEventId)
                .eq('student_id', studentId)
                .eq('workshop_id', 'LOCK_PLACEHOLDER');
            if (error) throw error;
        }

        await appBackend.logActivity({ 
            action: 'update', 
            module: 'eventos', 
            details: `${actionLabel}u escolhas de ${studentName} no evento ID: ${selectedEventId}`,
            recordId: studentId
        });
        await fetchReportData(selectedEventId);
    } catch (e: any) {
        alert("Erro: " + e.message);
    } finally {
        setReportLoading(false);
    }
  };

  const handleOpenEditStudent = (sId: string, sName: string) => {
    const studentRegs = registrations.filter(r => (r.student_id || r.studentId) === sId);
    const selectedIds = studentRegs.map(r => r.workshop_id || r.workshopId).filter(id => id !== 'LOCK_PLACEHOLDER');
    setTempWorkshops(selectedIds);
    setEditingStudentId(sId);
    setEditingStudentName(sName);
  };

  const handleSaveStudentWorkshops = async () => {
    if (!selectedEventId || !editingStudentId) return;
    setIsSavingStudent(true);
    try {
        // 1. Remove inscrições atuais (incluindo placeholders)
        const { error: delErr } = await appBackend.client
            .from('crm_event_registrations')
            .delete()
            .eq('event_id', selectedEventId)
            .eq('student_id', editingStudentId);
        
        if (delErr) throw delErr;

        // 2. Se tiver workshops selecionados, insere
        if (tempWorkshops.length > 0) {
            const inserts = tempWorkshops.map(wsId => ({
                id: crypto.randomUUID(),
                event_id: selectedEventId,
                workshop_id: wsId,
                student_id: editingStudentId,
                student_name: editingStudentName,
                created_at: new Date().toISOString()
            }));
            const { error: insErr } = await appBackend.client
                .from('crm_event_registrations')
                .insert(inserts);
            if (insErr) throw insErr;
        }

        await appBackend.logActivity({ 
            action: 'update', 
            module: 'eventos', 
            details: `Admin editou workshops de ${editingStudentName} no evento ${selectedEventId}`,
            recordId: editingStudentId
        });

        setEditingStudentId(null);
        await fetchReportData(selectedEventId);
    } catch (e: any) {
        alert("Erro ao salvar: " + e.message);
    } finally {
        setIsSavingStudent(false);
    }
  };

  const handleRemoveStudentFromEvent = async (studentId: string, studentName: string) => {
    if (!selectedEventId) return;
    if (!window.confirm(`Deseja remover ${studentName} deste evento? Todas as inscrições em workshops serão canceladas e as vagas liberadas.`)) return;
    
    setReportLoading(true);
    try {
        const { error } = await appBackend.client
            .from('crm_event_registrations')
            .delete()
            .eq('event_id', selectedEventId)
            .eq('student_id', studentId);

        if (error) throw error;
        
        setRegistrations(prev => prev.filter(r => (r.student_id || r.studentId) !== studentId));
        await appBackend.logActivity({ 
            action: 'delete', 
            module: 'eventos', 
            details: `Removeu aluno ${studentName} do evento ID: ${selectedEventId}`,
            recordId: studentId
        });
    } catch (e: any) {
        alert("Erro ao remover aluno: " + e.message);
    } finally {
        setReportLoading(false);
    }
  };

  const handleSaveEvent = async () => {
      if (!formData.name) {
          alert("Nome do evento é obrigatório.");
          return;
      }
      try {
          const savedEvent = await appBackend.saveEvent({
              ...formData,
              id: formData.id || crypto.randomUUID(),
              createdAt: formData.createdAt || new Date().toISOString()
          });
          if (formData.id) {
              setEvents(prev => prev.map(e => e.id === savedEvent.id ? savedEvent : e));
          } else {
              setEvents(prev => [savedEvent, ...prev]);
              setFormData(savedEvent);
          }
          if (!formData.id) {
              alert("Evento criado! Agora você pode criar blocos e adicionar workshops.");
          } else {
              setShowModal(false);
          }
      } catch (e: any) {
          alert(`Erro ao salvar evento: ${e.message}`);
      }
  };

  const handleDeleteEvent = async (id: string) => {
      if(window.confirm("Tem certeza? Todos os workshops vinculados serão excluídos.")) {
          await appBackend.deleteEvent(id);
          setEvents(prev => prev.filter(e => e.id !== id));
      }
  };

  const handleAddDate = () => {
      if (newDate && !formData.dates.includes(newDate)) {
          const updatedDates = [...formData.dates, newDate].sort();
          setFormData(prev => ({ ...prev, dates: updatedDates }));
          setNewDate('');
      }
  };

  const handleRemoveDate = (dateToRemove: string) => {
      if (window.confirm("Remover esta data apagará os blocos e workshops associados?")) {
          setFormData(prev => ({ ...prev, dates: prev.dates.filter(d => d !== dateToRemove) }));
      }
  };

  const toggleRegistration = async (evt: EventModel) => {
      const newValue = !evt.registrationOpen;
      const updatedEvt = { ...evt, registrationOpen: newValue };
      setEvents(prev => prev.map(e => e.id === evt.id ? updatedEvt : e));
      try {
          await appBackend.saveEvent(updatedEvt);
      } catch (e) {
          alert("Erro ao atualizar status");
          setEvents(prev => prev.map(e => e.id === evt.id ? evt : e));
      }
  };

  const handleSaveBlock = async () => {
      if (!blockForm.title || !blockForm.date) {
          alert("Título e Data do bloco são obrigatórios.");
          return;
      }
      try {
          const savedBlock = await appBackend.saveBlock({
              ...blockForm,
              id: blockForm.id || crypto.randomUUID(),
              eventId: formData.id
          });
          setBlocks(prev => {
              const existing = prev.findIndex(b => b.id === savedBlock.id);
              if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = savedBlock;
                  return updated;
              }
              return [...prev, savedBlock];
          });
          setShowBlockForm(false);
          setBlockForm({ id: '', eventId: '', date: '', title: '', maxSelections: 1 });
      } catch (e: any) {
          alert(`Erro ao salvar bloco: ${e.message}`);
      }
  };

  const handleDeleteBlock = async (id: string) => {
      if (window.confirm("Excluir bloco? Todos os workshops dentro dele serão apagados.")) {
          try {
              await appBackend.deleteBlock(id);
              setBlocks(prev => prev.filter(b => b.id !== id));
              setWorkshops(prev => prev.filter(w => w.blockId !== id));
          } catch (e: any) {
              alert(`Erro: ${e.message}`);
          }
      }
  };

  const handleSaveWorkshop = async () => {
      if (!workshopForm.title || !workshopForm.date || !workshopForm.speaker || !workshopForm.blockId) {
          alert("Preencha título, palestrante, data e o bloco de horário.");
          return;
      }
      try {
          const savedWorkshop = await appBackend.saveWorkshop({
              ...workshopForm,
              id: workshopForm.id || crypto.randomUUID(),
              eventId: formData.id
          });
          if (isEditingWorkshop) {
              setWorkshops(prev => prev.map(w => w.id === savedWorkshop.id ? savedWorkshop : w));
          } else {
              setWorkshops(prev => [...prev, savedWorkshop]);
          }
          setWorkshopForm({ ...INITIAL_WORKSHOP, eventId: formData.id });
          setIsEditingWorkshop(false);
      } catch (e: any) {
          alert(`Erro ao salvar workshop: ${e.message}`);
      }
  };

  const handleEditWorkshop = (w: Workshop) => {
      setWorkshopForm(w);
      setIsEditingWorkshop(true);
  };

  const handleDeleteWorkshop = async (id: string) => {
      if(window.confirm("Excluir workshop?")) {
          await appBackend.deleteWorkshop(id);
          setWorkshops(prev => prev.filter(w => w.id !== id));
      }
  };

  const openNewModal = () => {
      setFormData(INITIAL_EVENT);
      setWorkshops([]);
      setBlocks([]);
      setShowModal(true);
  };

  const openEditModal = (e: EventModel) => {
      setFormData(e);
      setShowModal(true);
      setActiveMenuId(null);
  };

  const openReport = (e: EventModel) => {
      setSelectedEventId(e.id);
      setReportTab('workshops');
      setViewMode('report');
  };

  const studentsList = useMemo(() => {
    if (viewMode !== 'report') return [];
    const map: Record<string, any> = {};
    
    registrations.forEach(reg => {
        const sId = reg.student_id || reg.studentId; 
        if (!sId) return;

        if (!map[sId]) {
            map[sId] = {
                id: sId,
                name: reg.student_name || reg.studentName || 'Aluno s/ Nome',
                email: reg.student_email || reg.studentEmail || '--',
                phone: reg.contact_phone || reg.phone || '--',
                registrationDate: reg.created_at || reg.registeredAt,
                locked: !!reg.locked,
                workshops: []
            };
        }
        
        const workshopId = reg.workshop_id || reg.workshopId;
        if (workshopId !== 'LOCK_PLACEHOLDER') {
            const ws = workshops.find(w => String(w.id) === String(workshopId));
            if (ws) {
                map[sId].workshops.push(ws.title);
            }
        }
        
        const regDate = reg.created_at || reg.registeredAt;
        if (regDate && new Date(regDate) < new Date(map[sId].registrationDate)) {
            map[sId].registrationDate = regDate;
        }
        if (reg.locked) map[sId].locked = true;
    });

    return Object.values(map).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [registrations, workshops, viewMode]);

  const exportToExcel = () => {
    if (studentsList.length === 0) return;
    
    const currentEvent = events.find(e => e.id === selectedEventId);
    const eventName = currentEvent?.name || 'Evento';

    const dataToExport = studentsList.map((s: any) => ({
        'Data Inscrição': new Date(s.registrationDate).toLocaleDateString('pt-BR'),
        'Nome do Aluno': s.name,
        'E-mail': s.email,
        'Telefone': s.phone,
        'Workshops': s.workshops.join(', '),
        'Status Escolha': s.locked ? 'BLOQUEADO' : 'LIBERADO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos");
    XLSX.writeFile(workbook, `Lista_Alunos_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  if (viewMode === 'report' && selectedEventId) {
      const currentEvent = events.find(e => e.id === selectedEventId);
      const totalCapacity = workshops.reduce((acc, w) => acc + (w.spots || 0), 0);
      const totalRegistrations = registrations.filter(r => r.workshop_id !== 'LOCK_PLACEHOLDER').length;
      const uniqueStudentsCount = studentsList.length;
      const occupancyRate = totalCapacity > 0 ? (totalRegistrations / totalCapacity) * 100 : 0;

      return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                          <ArrowLeft size={20} />
                      </button>
                      <div>
                          <h2 className="text-xl font-bold text-slate-800">{currentEvent?.name}</h2>
                          <p className="text-sm text-slate-500">Relatório de Ocupação e Inscrições</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex mr-2">
                        <button onClick={() => setReportTab('workshops')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", reportTab === 'workshops' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Workshops</button>
                        <button onClick={() => setReportTab('students')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", reportTab === 'students' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Lista de Alunos</button>
                    </div>
                    {reportTab === 'students' && studentsList.length > 0 && (
                        <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm mr-2">
                            <FileSpreadsheet size={16} /> Exportar Excel
                        </button>
                    )}
                    <button onClick={() => fetchReportData(selectedEventId)} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50">
                        <RefreshCw size={18} className={clsx(reportLoading && "animate-spin")} />
                    </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-500 font-bold uppercase">Workshops</p>
                      <p className="text-2xl font-bold text-slate-800">{workshops.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-500 font-bold uppercase">Vagas Totais</p>
                      <p className="text-2xl font-bold text-slate-800">{totalCapacity}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-500 font-bold uppercase">Alunos Únicos</p>
                      <p className="text-2xl font-bold text-indigo-600">{uniqueStudentsCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-500 font-bold uppercase">Ocupação Geral</p>
                      <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-slate-800">{occupancyRate.toFixed(1)}%</p>
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{width: `${Math.min(occupancyRate, 100)}%`}}></div>
                          </div>
                      </div>
                  </div>
              </div>

              {reportTab === 'workshops' ? (
                  <div className="space-y-6">
                      {workshops.map(w => {
                          const wRegs = registrations.filter(r => String(r.workshop_id || r.workshopId) === String(w.id));
                          const occupation = (wRegs.length / (w.spots || 1)) * 100;
                          const isFull = wRegs.length >= (w.spots || 0);
                          return (
                              <div key={w.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                  <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">{formatDateDisplay(w.date)} • {w.time}</span>
                                              {isFull && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded">LOTADO</span>}
                                          </div>
                                          <h3 className="font-bold text-slate-800">{w.title}</h3>
                                          <p className="text-sm text-slate-500 flex items-center gap-1"><Mic size={14}/> {w.speaker}</p>
                                      </div>
                                      <div className="flex items-center gap-4 min-w-[200px]">
                                          <div className="flex-1">
                                              <div className="flex justify-between text-xs mb-1">
                                                  <span className="font-medium text-slate-600">{wRegs.length} / {w.spots} vagas</span>
                                                  <span className="font-bold text-slate-800">{occupation.toFixed(0)}%</span>
                                              </div>
                                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                  <div className={clsx("h-full rounded-full", isFull ? "bg-red-500" : "bg-green-500")} style={{width: `${Math.min(occupation, 100)}%`}}></div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="bg-slate-50 p-4">
                                      <details className="group">
                                          <summary className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer hover:text-indigo-600 w-fit">
                                              <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                                              Ver Lista de Inscritos ({wRegs.length})
                                          </summary>
                                          <div className="mt-3 pl-6 space-y-1">
                                              {wRegs.length === 0 ? (
                                                  <p className="text-xs text-slate-400 italic">Nenhum inscrito.</p>
                                              ) : (
                                                  wRegs.map(r => (
                                                      <div key={r.id} className="flex items-center justify-between text-sm text-slate-700 border-b border-slate-100 pb-1 last:border-0">
                                                          <div className="flex items-center gap-2">
                                                            <User size={12} className="text-slate-400" />
                                                            <span className="font-medium">{r.student_name || r.studentName}</span>
                                                            <span className="text-slate-400 text-xs">({r.student_email || r.studentEmail})</span>
                                                          </div>
                                                      </div>
                                                  ))
                                              )}
                                          </div>
                                      </details>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                  <tr>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inscrição</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome do Aluno</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Workshops Selecionados</th>
                                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Escolha</th>
                                      <th className="px-6 py-4 text-right">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {studentsList.length === 0 ? (
                                      <tr><td colSpan={6} className="py-20 text-center text-slate-400 italic">Nenhum aluno inscrito.</td></tr>
                                  ) : studentsList.map((s: any) => (
                                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <span className="text-xs font-bold text-slate-600">{new Date(s.registrationDate).toLocaleDateString('pt-BR')}</span>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">{s.name}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">{s.email}</td>
                                          <td className="px-6 py-4">
                                              <div className="flex flex-wrap gap-1">
                                                  {s.workshops.length === 0 ? (
                                                      <span className="text-slate-300 text-[10px] italic">Sem workshops</span>
                                                  ) : (
                                                      s.workshops.map((w: string, i: number) => (
                                                          <span key={i} className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-indigo-100">{w}</span>
                                                      ))
                                                  )}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <button 
                                                onClick={() => handleToggleLockStudent(s.id, s.name, s.locked)}
                                                className={clsx(
                                                    "p-1.5 rounded-lg transition-all border",
                                                    s.locked ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" : "bg-green-50 text-green-600 border-green-100 hover:bg-green-100"
                                                )}
                                                title={s.locked ? "Desbloquear Escolhas" : "Bloquear Escolhas"}
                                              >
                                                  {s.locked ? <Lock size={16} /> : <Unlock size={16} />}
                                              </button>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                  <button 
                                                    onClick={() => handleOpenEditStudent(s.id, s.name)}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Editar Workshops do Aluno"
                                                  >
                                                      <Edit2 size={16} />
                                                  </button>
                                                  <button 
                                                    onClick={() => handleRemoveStudentFromEvent(s.id, s.name)}
                                                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remover aluno do evento"
                                                  >
                                                      <UserMinus size={16} />
                                                  </button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* MODAL DE EDIÇÃO DE WORKSHOPS DO ALUNO */}
              {editingStudentId && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                              <div>
                                  <h3 className="text-xl font-bold text-slate-800">Editar Workshops</h3>
                                  <p className="text-sm text-slate-500">Aluno: <strong className="text-indigo-600">{editingStudentName}</strong></p>
                              </div>
                              <button onClick={() => setEditingStudentId(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                          </div>
                          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                              {blocks.map(block => {
                                  const blockWS = workshops.filter(w => w.blockId === block.id);
                                  const selectedInBlock = tempWorkshops.filter(id => blockWS.some(w => w.id === id));
                                  return (
                                      <div key={block.id} className="space-y-4">
                                          <div className="flex items-center justify-between border-b pb-2">
                                              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                  <Clock size={16} className="text-indigo-600"/> {block.title} 
                                                  <span className="text-[10px] text-slate-400">({formatDateDisplay(block.date)})</span>
                                              </h4>
                                              <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded", selectedInBlock.length > block.maxSelections ? "bg-red-100 text-red-700" : "bg-indigo-50 text-indigo-700")}>
                                                  {selectedInBlock.length} / {block.maxSelections} Seleções
                                              </span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              {blockWS.map(ws => {
                                                  const isChecked = tempWorkshops.includes(ws.id);
                                                  return (
                                                      <div 
                                                        key={ws.id} 
                                                        onClick={() => {
                                                            if (isChecked) setTempWorkshops(prev => prev.filter(id => id !== ws.id));
                                                            else setTempWorkshops(prev => [...prev, ws.id]);
                                                        }}
                                                        className={clsx(
                                                            "p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center justify-between group",
                                                            isChecked ? "border-indigo-500 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                        )}
                                                      >
                                                          <div className="flex items-center gap-3">
                                                              {isChecked ? <CheckSquare className="text-indigo-600" size={20}/> : <Square className="text-slate-300 group-hover:text-slate-400" size={20}/>}
                                                              <div className="min-w-0">
                                                                  <p className="font-bold text-sm text-slate-800 truncate">{ws.title}</p>
                                                                  <p className="text-[10px] text-slate-500">{ws.time} • {ws.speaker}</p>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                          <div className="px-8 py-5 bg-slate-50 border-t flex justify-between items-center shrink-0">
                              <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                                  <ShieldAlert size={14}/> 
                                  <span>Alterações manuais pelo admin ignoram limites de vagas, mas respeitam a grade.</span>
                              </div>
                              <div className="flex gap-3">
                                  <button onClick={() => setEditingStudentId(null)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-sm transition-all">Cancelar</button>
                                  <button 
                                    onClick={handleSaveStudentWorkshops} 
                                    disabled={isSavingStudent}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-lg font-black text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                  >
                                      {isSavingStudent ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                      Salvar Workshops
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-indigo-600" /> Eventos & Workshops
                    </h2>
                    <p className="text-slate-500 text-sm">Gerencie a agenda de eventos presenciais.</p>
                </div>
            </div>
            <button onClick={openNewModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Plus size={18} /> Novo Evento</button>
        </div>

        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
        ) : events.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhum evento cadastrado.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(evt => (
                    <div key={evt.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded border border-indigo-100 uppercase tracking-wide">{evt.dates.length > 0 ? new Date(evt.dates[0]).getFullYear() : 'S/ Data'}</span>
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === evt.id ? null : evt.id); }} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 class-menu-btn"><MoreVertical size={18} /></button>
                                    {activeMenuId === evt.id && (
                                        <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                            <button onClick={() => openReport(evt)} className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-bold"><BarChart3 size={12} /> Relatório / Vagas</button>
                                            <div className="h-px bg-slate-100 my-1"></div>
                                            <button onClick={() => openEditModal(evt)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={12} /> Editar Evento</button>
                                            <button onClick={() => handleDeleteEvent(evt.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Excluir</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{evt.name}</h3>
                            <div className="flex items-center gap-1 text-sm text-slate-500 mb-4"><MapPin size={14} /> {evt.location || 'Local não definido'}</div>
                            {evt.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{evt.description}</p>}
                            <div className="mb-4">
                                <button onClick={(e) => { e.stopPropagation(); toggleRegistration(evt); }} className={clsx("text-xs font-bold px-2 py-1.5 rounded-md border flex items-center gap-1.5 transition-all w-fit", evt.registrationOpen ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200")}>{evt.registrationOpen ? <Unlock size={12}/> : <Lock size={12}/>} {evt.registrationOpen ? 'Inscrições Abertas' : 'Inscrições Fechadas'}</button>
                            </div>
                            <div className="space-y-2"><div className="flex items-center gap-2 text-xs text-slate-600"><Calendar size={14} className="text-slate-400" /> {evt.dates.length > 0 ? <span>{evt.dates.length} dias: {evt.dates.map(d => formatDateDisplay(d)).join(', ')}</span> : <span className="italic">Nenhuma data definida</span>}</div></div>
                        </div>
                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                            <button onClick={() => openReport(evt)} className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"><BarChart3 size={14} /> Ver Inscrições</button>
                            <button onClick={() => openEditModal(evt)} className="text-slate-600 hover:text-indigo-800 font-medium flex items-center gap-1">Workshops <ChevronRight size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                        <div><h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Gerenciar Evento' : 'Novo Evento'}</h3><p className="text-sm text-slate-500">Detalhes do evento e programação.</p></div>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                        <div>
                            <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Calendar size={16} /> Dados Principais</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Evento</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Congresso Brasileiro de Pilates" /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Informações do Evento</label><textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20 resize-none" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descrição detalhada sobre o evento..." /></div>
                                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Local</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: Centro de Convenções SP" /></div>
                                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Adicionar Dias</label><div className="flex gap-2"><input type="date" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" value={newDate} onChange={e => setNewDate(e.target.value)} /><button onClick={handleAddDate} className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-indigo-200">Add</button></div></div>
                                <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Dias Cadastrados</label><div className="flex flex-wrap gap-2">{formData.dates.map(date => (<span key={date} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs border border-slate-200 flex items-center gap-2">{formatDateDisplay(date)}<button onClick={() => handleRemoveDate(date)} className="text-slate-400 hover:text-red-500"><X size={12}/></button></span>))}{formData.dates.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum dia adicionado.</span>}</div></div>
                            </div>
                            <div className="mt-4 flex justify-end"><button onClick={handleSaveEvent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Save size={16} /> {formData.id ? 'Salvar Alterações' : 'Criar Evento'}</button></div>
                        </div>
                        {formData.id && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2"><h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-2"><Layers size={16} /> Grade de Horários (Blocos)</h4><button onClick={() => setShowBlockForm(true)} className="text-xs bg-slate-100 hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold border border-slate-200 hover:border-indigo-200 flex items-center gap-1 transition-colors"><Plus size={14} /> Novo Bloco</button></div>
                                {showBlockForm && (
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6"><h5 className="text-xs font-bold text-indigo-700 mb-3 uppercase">Configurar Bloco</h5><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div className="md:col-span-2"><input type="text" placeholder="Título (ex: Manhã)" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={blockForm.title} onChange={e => setBlockForm({...blockForm, title: e.target.value})} /></div><div><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={blockForm.date} onChange={e => setBlockForm({...blockForm, date: e.target.value})}><option value="">Data...</option>{formData.dates.map(d => (<option key={d} value={d}>{formatDateDisplay(d)}</option>))}</select></div><div><input type="number" placeholder="Max Escolhas" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={blockForm.maxSelections} onChange={e => setBlockForm({...blockForm, maxSelections: parseInt(e.target.value) || 1})} min={1} /></div><div className="md:col-span-4 flex justify-end gap-2 mt-2"><button onClick={() => setShowBlockForm(false)} className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700">Cancelar</button><button onClick={handleSaveBlock} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700">Salvar Bloco</button></div></div></div>
                                )}
                                {blocks.length === 0 ? (<div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl"><Layers size={32} className="mx-auto mb-2 opacity-50"/><p className="text-sm">Nenhum bloco de horário criado.</p><p className="text-xs">Crie blocos (ex: Manhã, Tarde) para agrupar os workshops.</p></div>) : (
                                    <div className="space-y-6">{formData.dates.sort().map(dateStr => { const dayBlocks = blocks.filter(b => b.date === dateStr); if (dayBlocks.length === 0) return null; return ( <div key={dateStr} className="border border-slate-200 rounded-xl overflow-hidden"><div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center"><span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Calendar size={14} className="text-slate-400"/>{formatDateDisplay(dateStr)}</span></div><div className="divide-y divide-slate-100">{dayBlocks.map(block => ( <div key={block.id} className="p-4 bg-white hover:bg-slate-50 transition-colors"><div className="flex justify-between items-start mb-3"><div><h5 className="font-bold text-indigo-700 text-sm">{block.title}</h5><p className="text-xs text-slate-500">Aluno pode escolher até <strong className="text-slate-700">{block.maxSelections}</strong> workshop(s).</p></div><div className="flex gap-2"><button onClick={() => { setWorkshopForm({ ...INITIAL_WORKSHOP, eventId: formData.id, blockId: block.id, date: block.date }); setIsEditingWorkshop(false); }} className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-indigo-600 px-2 py-1 rounded flex items-center gap-1 shadow-sm"><Plus size={12}/> Add Workshop</button><button onClick={() => handleDeleteBlock(block.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14} /></button></div></div><div className="pl-4 border-l-2 border-slate-100 space-y-2">{workshopForm.blockId === block.id && ( <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-2 animate-in fade-in zoom-in-95"><div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2"><div className="md:col-span-2"><input type="text" placeholder="Título" className="w-full px-2 py-1.5 border rounded text-xs mb-2" value={workshopForm.title} onChange={e => setWorkshopForm({...workshopForm, title: e.target.value})} /><textarea placeholder="Resumo do Workshop" className="w-full px-2 py-1.5 border rounded text-xs resize-none h-16" value={workshopForm.description || ''} onChange={e => setWorkshopForm({...workshopForm, description: e.target.value})} /></div><div className="md:col-span-2"><div className="grid grid-cols-3 gap-2"><input type="text" placeholder="Palestrante" className="w-full px-2 py-1.5 border rounded text-xs" value={workshopForm.speaker} onChange={e => setWorkshopForm({...workshopForm, speaker: e.target.value})} /><input type="time" className="w-full px-2 py-1.5 border rounded text-xs" value={workshopForm.time} onChange={e => setWorkshopForm({...workshopForm, time: e.target.value})} /><input type="number" placeholder="Vagas" className="w-full px-2 py-1.5 border rounded text-xs" value={workshopForm.spots} onChange={e => setWorkshopForm({...workshopForm, spots: parseInt(e.target.value) || 0})} /></div></div></div><div className="flex justify-end gap-2"><button onClick={() => setWorkshopForm(INITIAL_WORKSHOP)} className="text-xs text-slate-500">Cancelar</button><button onClick={handleSaveWorkshop} className="text-xs bg-green-600 text-white px-3 py-1 rounded font-bold">Salvar</button></div></div> )}{workshops.filter(w => w.blockId === block.id).map(w => ( <div key={w.id} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded hover:border-slate-300 transition-colors"><div className="flex-1"><p className="text-xs font-bold text-slate-700">{w.title}</p><p className="text-[10px] text-slate-500 mb-1">{w.time} • {w.speaker} • {w.spots} vagas</p>{w.description && <p className="text-[10px] text-slate-400 italic line-clamp-1">{w.description}</p>}</div><div className="flex gap-1"><button onClick={() => handleEditWorkshop(w)} className="p-1 text-slate-400 hover:text-slate-600"><Edit2 size={12}/></button><button onClick={() => handleDeleteWorkshop(w.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={12}/></button></div></div> ))}{workshops.filter(w => w.blockId === block.id).length === 0 && !isEditingWorkshop && (<p className="text-[10px] text-slate-400 italic">Nenhum workshop neste bloco.</p>)}</div></div> ))}</div></div> ); })}</div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0 border-t border-slate-100"><button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Fechar</button></div>
                </div>
            </div>
        )}
    </div>
  );
};