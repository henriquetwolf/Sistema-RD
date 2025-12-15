
import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Users, Mic, Clock, Plus, Search, 
  MoreVertical, Edit2, Trash2, ArrowLeft, Save, X, 
  Loader2, ChevronRight, Hash, BarChart3, User, RefreshCw
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { EventModel, Workshop, EventRegistration } from '../types';
import clsx from 'clsx';

interface EventsManagerProps {
  onBack: () => void;
}

const INITIAL_EVENT: EventModel = {
    id: '',
    name: '',
    location: '',
    dates: [],
    createdAt: ''
};

const INITIAL_WORKSHOP: Workshop = {
    id: '',
    eventId: '',
    title: '',
    speaker: '',
    date: '',
    time: '',
    spots: 0
};

// Helper to format YYYY-MM-DD to DD/MM/YYYY without timezone issues
const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export const EventsManager: React.FC<EventsManagerProps> = ({ onBack }) => {
  const [events, setEvents] = useState<EventModel[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // View Mode: List vs Report
  const [viewMode, setViewMode] = useState<'list' | 'report'>('list');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Report Data
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<EventModel>(INITIAL_EVENT);
  const [newDate, setNewDate] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Workshop Form State
  const [workshopForm, setWorkshopForm] = useState<Workshop>(INITIAL_WORKSHOP);
  const [isEditingWorkshop, setIsEditingWorkshop] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch workshops when an event is selected for editing (formData.id is set)
  useEffect(() => {
      if (formData.id) {
          fetchWorkshops(formData.id);
      } else {
          setWorkshops([]);
      }
  }, [formData.id]);

  // Load report data when entering report mode
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

  const fetchWorkshops = async (eventId: string) => {
      try {
          const data = await appBackend.getWorkshops(eventId);
          setWorkshops(data);
      } catch (e) {
          console.error(e);
      }
  };

  const fetchReportData = async (eventId: string) => {
      setReportLoading(true);
      try {
          // Parallel fetch
          const [ws, regs] = await Promise.all([
              appBackend.getWorkshops(eventId),
              appBackend.getEventRegistrations(eventId)
          ]);
          setWorkshops(ws);
          setRegistrations(regs);
      } catch(e) {
          console.error(e);
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
          
          // Update local state
          if (formData.id) {
              setEvents(prev => prev.map(e => e.id === savedEvent.id ? savedEvent : e));
          } else {
              setEvents(prev => [savedEvent, ...prev]);
              // Set ID so we can add workshops immediately
              setFormData(savedEvent);
          }
          
          if (!formData.id) {
              alert("Evento criado! Agora você pode adicionar os workshops.");
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
          // Sort dates chronologically
          const updatedDates = [...formData.dates, newDate].sort();
          setFormData(prev => ({ ...prev, dates: updatedDates }));
          setNewDate('');
      }
  };

  const handleRemoveDate = (dateToRemove: string) => {
      setFormData(prev => ({ ...prev, dates: prev.dates.filter(d => d !== dateToRemove) }));
  };

  // Workshop Logic
  const handleSaveWorkshop = async () => {
      if (!workshopForm.title || !workshopForm.date || !workshopForm.speaker) {
          alert("Preencha título, palestrante e data.");
          return;
      }
      
      try {
          const savedWorkshop = await appBackend.saveWorkshop({
              ...workshopForm,
              id: workshopForm.id || crypto.randomUUID(),
              eventId: formData.id // Link to current event
          });
          
          if (isEditingWorkshop) {
              setWorkshops(prev => prev.map(w => w.id === savedWorkshop.id ? savedWorkshop : w));
          } else {
              setWorkshops(prev => [...prev, savedWorkshop]);
          }
          
          // Reset form
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
      setShowModal(true);
  };

  const openEditModal = (e: EventModel) => {
      setFormData(e);
      setShowModal(true);
      setActiveMenuId(null);
  };

  const openReport = (e: EventModel) => {
      setSelectedEventId(e.id);
      setViewMode('report');
  };

  // --- REPORT VIEW ---
  if (viewMode === 'report' && selectedEventId) {
      const currentEvent = events.find(e => e.id === selectedEventId);
      
      // Calculate Stats
      const totalCapacity = workshops.reduce((acc, w) => acc + w.spots, 0);
      const totalRegistrations = registrations.length;
      const uniqueStudents = new Set(registrations.map(r => r.studentId)).size;
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
                  <button onClick={() => fetchReportData(selectedEventId)} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50">
                      <RefreshCw size={18} className={clsx(reportLoading && "animate-spin")} />
                  </button>
              </div>

              {/* Stats Cards */}
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
                      <p className="text-2xl font-bold text-indigo-600">{uniqueStudents}</p>
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

              {/* Workshops Detail */}
              <div className="space-y-6">
                  {workshops.map(w => {
                      const wRegs = registrations.filter(r => r.workshopId === w.id);
                      const occupation = (wRegs.length / w.spots) * 100;
                      const isFull = wRegs.length >= w.spots;

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
                              
                              {/* Student List Expandable */}
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
                                                  <div key={r.id} className="flex items-center gap-2 text-sm text-slate-700 border-b border-slate-100 pb-1 last:border-0">
                                                      <User size={12} className="text-slate-400" />
                                                      <span className="font-medium">{r.studentName}</span>
                                                      <span className="text-slate-400 text-xs">({r.studentEmail})</span>
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
          </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-indigo-600" /> Eventos & Workshops
                    </h2>
                    <p className="text-slate-500 text-sm">Gerencie a agenda de eventos presenciais.</p>
                </div>
            </div>
            <button 
                onClick={openNewModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
            >
                <Plus size={18} /> Novo Evento
            </button>
        </div>

        {/* Event List */}
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
                                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded border border-indigo-100 uppercase tracking-wide">
                                    {evt.dates.length > 0 ? new Date(evt.dates[0]).getFullYear() : 'S/ Data'}
                                </span>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === evt.id ? null : evt.id);
                                        }}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {activeMenuId === evt.id && (
                                        <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                            <button onClick={() => openReport(evt)} className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-bold">
                                                <BarChart3 size={12} /> Relatório / Vagas
                                            </button>
                                            <div className="h-px bg-slate-100 my-1"></div>
                                            <button onClick={() => openEditModal(evt)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                <Edit2 size={12} /> Editar Evento
                                            </button>
                                            <button onClick={() => handleDeleteEvent(evt.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={12} /> Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 text-lg mb-1">{evt.name}</h3>
                            <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
                                <MapPin size={14} /> {evt.location || 'Local não definido'}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Calendar size={14} className="text-slate-400" />
                                    {evt.dates.length > 0 ? (
                                        <span>{evt.dates.length} dias: {evt.dates.map(d => formatDateDisplay(d)).join(', ')}</span>
                                    ) : (
                                        <span className="italic">Nenhuma data definida</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                            <button onClick={() => openReport(evt)} className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                                <BarChart3 size={14} /> Ver Inscrições
                            </button>
                            <button onClick={() => openEditModal(evt)} className="text-slate-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                Workshops <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Modal: Create/Edit Event & Workshops */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Gerenciar Evento' : 'Novo Evento'}</h3>
                            <p className="text-sm text-slate-500">Detalhes do evento e programação.</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                        
                        {/* Section 1: Event Details */}
                        <div>
                            <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Calendar size={16} /> Dados Principais
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Evento</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Congresso Brasileiro de Pilates" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Local</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: Centro de Convenções SP" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Adicionar Dias</label>
                                    <div className="flex gap-2">
                                        <input type="date" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" value={newDate} onChange={e => setNewDate(e.target.value)} />
                                        <button onClick={handleAddDate} className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-indigo-200">Add</button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Dias Cadastrados</label>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.dates.map(date => (
                                            <span key={date} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs border border-slate-200 flex items-center gap-2">
                                                {formatDateDisplay(date)}
                                                <button onClick={() => handleRemoveDate(date)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                                            </span>
                                        ))}
                                        {formData.dates.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum dia adicionado.</span>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 flex justify-end">
                                <button onClick={handleSaveEvent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                                    <Save size={16} /> {formData.id ? 'Salvar Alterações' : 'Criar Evento'}
                                </button>
                            </div>
                        </div>

                        {/* Section 2: Workshops (Only visible if Event ID exists) */}
                        {formData.id && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                    <Mic size={16} /> Workshops & Palestras
                                </h4>
                                
                                {/* Add/Edit Form */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                                    <h5 className="text-xs font-bold text-slate-600 mb-3 uppercase">{isEditingWorkshop ? 'Editar Workshop' : 'Novo Workshop'}</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div className="md:col-span-2">
                                            <input type="text" placeholder="Título do Workshop" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={workshopForm.title} onChange={e => setWorkshopForm({...workshopForm, title: e.target.value})} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <input type="text" placeholder="Palestrante" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={workshopForm.speaker} onChange={e => setWorkshopForm({...workshopForm, speaker: e.target.value})} />
                                        </div>
                                        <div>
                                            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={workshopForm.date} onChange={e => setWorkshopForm({...workshopForm, date: e.target.value})}>
                                                <option value="">Selecione o Dia...</option>
                                                {formData.dates.map(d => (
                                                    <option key={d} value={d}>{formatDateDisplay(d)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <input type="time" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={workshopForm.time} onChange={e => setWorkshopForm({...workshopForm, time: e.target.value})} />
                                        </div>
                                        <div>
                                            <input type="number" placeholder="Vagas" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={workshopForm.spots} onChange={e => setWorkshopForm({...workshopForm, spots: parseInt(e.target.value) || 0})} />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleSaveWorkshop} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs">Salvar</button>
                                            {isEditingWorkshop && (
                                                <button onClick={() => { setIsEditingWorkshop(false); setWorkshopForm({...INITIAL_WORKSHOP, eventId: formData.id}); }} className="px-3 bg-slate-200 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-300">Cancelar</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="space-y-2">
                                    {workshops.map(w => (
                                        <div key={w.id} className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between hover:border-indigo-300 transition-colors">
                                            <div className="flex-1">
                                                <h5 className="font-bold text-slate-800 text-sm">{w.title}</h5>
                                                <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                                    <span className="flex items-center gap-1"><Mic size={12}/> {w.speaker}</span>
                                                    <span className="flex items-center gap-1"><Calendar size={12}/> {formatDateDisplay(w.date)}</span>
                                                    <span className="flex items-center gap-1"><Clock size={12}/> {w.time}</span>
                                                    <span className="flex items-center gap-1"><Users size={12}/> {w.spots} vagas</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleEditWorkshop(w)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDeleteWorkshop(w.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {workshops.length === 0 && <p className="text-center text-sm text-slate-400 py-4">Nenhum workshop adicionado.</p>}
                                </div>
                            </div>
                        )}

                    </div>
                    
                    <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-100">
                        <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Fechar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
