
import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, Plus, Search, Calendar as CalendarIcon, MapPin, 
  ArrowLeft, Save, X, BookOpen, CheckSquare, 
  Coffee, DollarSign, FileText, Paperclip, Bed, Plane, Map,
  Edit2, Trash2, Hash, Loader2, Users, Filter, ChevronRight,
  LayoutList, ChevronLeft, ChevronRight as ChevronRightIcon,
  CheckCircle2, Globe, Eraser, Building, Info, User, Monitor, 
  Truck, CheckCircle, Circle, ArrowUpCircle, Layout, Table, MoreHorizontal
} from 'lucide-react';
import clsx from 'clsx';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import { appBackend } from '../services/appBackend';
import { ClassStudentsViewer } from './ClassStudentsViewer';
import { PartnerStudio } from '../types';

interface ClassItem {
  id: string;
  status: string;
  state: string; 
  city: string;  
  classCode: string; 
  extraClass: string;
  course: string;
  createdAt: string;
  dateMod1: string;
  mod1Code?: string; 
  material: string;
  studioMod1: string;
  instructorMod1: string;
  ticketMod1: string;
  infrastructure: string; 
  coffeeMod1: string;
  hotelMod1: string;
  hotelLocMod1: string;
  costHelp1: string;
  dateMod2: string;
  mod2Code?: string; 
  instructorMod2: string;
  ticketMod2: string;
  coffeeMod2: string;
  hotelMod2: string;
  hotelLocMod2: string;
  costHelp2: string;
  studioRent: number;
  contaAzulRD: string;
  isReady: boolean;
  onSite: boolean;
  onCRM: boolean;
  observations: string;
  attachments: string[]; 
}

const COURSES = ['Formação Completa em Pilates', 'Formação em Pilates Clássico'];
const STATUS_OPTIONS = ['Confirmado', 'Cancelado', 'Adiado'];

interface ClassesManagerProps {
  onBack: () => void;
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({ onBack }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'list' | 'full_list' | 'calendar' | 'capacity'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Multi-selection state
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [modalViewerClass, setModalViewerClass] = useState<ClassItem | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [mod1DateFilter, setMod1DateFilter] = useState<string>('');
  const [mod2DateFilter, setMod2DateFilter] = useState<string>('');
  
  // Column-specific filters for tabular view
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
  // IBGE State
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // External Data States
  const [instructorsList, setInstructorsList] = useState<string[]>([]);
  const [partnerStudios, setPartnerStudios] = useState<PartnerStudio[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.class-menu-btn') === null) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const initialFormState: ClassItem = {
      id: '', status: 'Confirmado', state: '', city: '', classCode: '', extraClass: '', course: '', createdAt: new Date().toISOString().split('T')[0], dateMod1: '', mod1Code: '', material: '', studioMod1: '', instructorMod1: '', ticketMod1: '', infrastructure: '', coffeeMod1: '', hotelMod1: '', hotelLocMod1: '', costHelp1: '', dateMod2: '', mod2Code: '', instructorMod2: '', ticketMod2: '', coffeeMod2: '', hotelMod2: '', hotelLocMod2: '', costHelp2: '', studioRent: 0, contaAzulRD: '', isReady: false, onSite: false, onCRM: false, observations: '', attachments: []
  };

  const [formData, setFormData] = useState<ClassItem>(initialFormState);

  useEffect(() => {
      fetchClasses();
      fetchInstructors();
      fetchPartnerStudios();
      fetchDeals();
      ibgeService.getStates().then(setStates);
  }, []);

  const fetchDeals = async () => {
      try {
          const { data } = await appBackend.client.from('crm_deals').select('id, class_mod_1, class_mod_2, stage');
          if (data) setDeals(data);
      } catch (e) { console.error(e); }
  };

  const fetchClasses = async () => {
      setIsLoadingData(true);
      try {
          const { data, error } = await appBackend.client.from('crm_classes').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          const mapped = (data || []).map((d: any) => ({
            id: d.id, status: d.status || 'Confirmado', state: d.state || '', city: d.city || '', classCode: d.class_code || '', extraClass: d.extra_class || '', course: d.course || '', createdAt: d.created_at || '', dateMod1: d.date_mod_1 || '', mod1Code: d.mod_1_code || '', material: d.material || '', studioMod1: d.studio_mod_1 || '', instructorMod1: d.instructor_mod_1 || '', ticketMod1: d.ticket_mod_1 || '', infrastructure: d.infrastructure || '', coffeeMod1: d.coffee_mod_1 || '', hotelMod1: d.hotel_mod_1 || '', hotelLocMod1: d.hotel_loc_mod_1 || '', costHelp1: d.cost_help_1 || '', dateMod2: d.date_mod_2 || '', mod2Code: d.mod_2_code || '', instructorMod2: d.instructor_mod_2 || '', ticketMod2: d.ticket_mod_2 || '', coffeeMod2: d.coffee_mod_2 || '', hotelMod2: d.hotel_mod_2 || '', hotelLocMod2: d.hotel_loc_mod_2 || '', costHelp2: d.cost_help_2 || '', studioRent: Number(d.studio_rent || 0), contaAzulRD: d.conta_azul_rd || '', isReady: !!d.is_ready, onSite: !!d.on_site, onCRM: !!d.on_crm, observations: d.observations || '', attachments: [] 
          }));
          setClasses(mapped);
          if (mapped.length > 0 && viewMode === 'list' && selectedClassIds.length === 0) {
              setSelectedClassIds([mapped[0].id]);
          }
      } catch (e) { console.error(e); } finally { setIsLoadingData(false); }
  };

  const fetchInstructors = async () => {
      try {
          const { data, error } = await appBackend.client.from('crm_teachers').select('full_name').order('full_name', { ascending: true });
          if (!error && data) setInstructorsList(data.map((t: any) => t.full_name));
      } catch (e) { console.error(e); }
  };

  const fetchPartnerStudios = async () => {
      try { const data = await appBackend.getPartnerStudios(); setPartnerStudios(data); } catch (e) { console.error(e); }
  };

  useEffect(() => {
      if (formData.state) {
          setIsLoadingCities(true);
          ibgeService.getCities(formData.state).then(data => { setCities(data); setIsLoadingCities(false); });
      } else { setCities([]); }
  }, [formData.state]);

  useEffect(() => {
      if (stateFilter) {
          ibgeService.getCities(stateFilter).then(setCities);
      }
  }, [stateFilter]);

  const handleOpenNew = () => { setFormData(initialFormState); setShowModal(true); };
  const handleEdit = (item: ClassItem) => { setFormData({ ...item }); setActiveMenuId(null); setShowModal(true); };

  const handleDelete = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta turma?")) {
          try {
              const { error } = await appBackend.client.from('crm_classes').delete().eq('id', id);
              if (error) throw error;
              setClasses(prev => prev.filter(c => c.id !== id));
              setSelectedClassIds(prev => prev.filter(sid => sid !== id));
          } catch(e) { alert("Erro ao excluir turma."); }
      }
      setActiveMenuId(null);
  };

  const handleSave = async () => {
    if (!formData.course || !formData.city) { alert("Preencha ao menos o Curso e a Cidade."); return; }
    setIsSaving(true);
    const payload = {
        status: formData.status, state: formData.state, city: formData.city, class_code: formData.classCode, extra_class: formData.extraClass, course: formData.course, date_mod_1: formData.dateMod1 || null, mod_1_code: formData.mod1Code, material: formData.material, studio_mod_1: formData.studioMod1, instructor_mod_1: formData.instructorMod1, ticket_mod_1: formData.ticketMod1, infrastructure: formData.infrastructure, coffee_mod_1: formData.coffeeMod1, hotel_mod_1: formData.hotelMod1, hotel_loc_mod_1: formData.hotelLocMod1, cost_help_1: formData.costHelp1, date_mod_2: formData.date_mod_2 || null, mod_2_code: formData.mod2Code, instructor_mod_2: formData.instructorMod2, ticket_mod_2: formData.ticketMod2, coffee_mod_2: formData.coffee_mod_2, hotel_mod_2: formData.hotel_mod_2, hotel_loc_mod_2: formData.hotelLocMod2, cost_help_2: formData.costHelp2, studio_rent: formData.studioRent, conta_azul_rd: formData.contaAzulRD, is_ready: formData.isReady, on_site: formData.onSite, on_crm: formData.onCRM, observations: formData.observations
    };
    try {
        if (formData.id) await appBackend.client.from('crm_classes').update(payload).eq('id', formData.id);
        else await appBackend.client.from('crm_classes').insert([payload]).select().single();
        await fetchClasses(); setShowModal(false); setFormData(initialFormState);
    } catch(e: any) { alert(`Erro ao salvar: ${e.message}`); } finally { setIsSaving(false); }
  };

  const handleInputChange = (field: keyof ClassItem, value: any) => { setFormData(prev => ({ ...prev, [field]: value })); };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      // Fixed line below: ensure c.course and c.city are handled as strings to avoid type issues
      const matchesSearch = String(c.course || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(c.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
      const matchesState = !stateFilter || c.state === stateFilter;
      const matchesCity = !cityFilter || c.city === cityFilter;
      const matchesMod1 = !mod1DateFilter || c.dateMod1 === mod1DateFilter;
      const matchesMod2 = !mod2DateFilter || c.dateMod2 === mod2DateFilter;

      // Apply column-specific filters
      const matchesColumnFilters = Object.entries(columnFilters).every(([key, value]) => {
          if (!value) return true;
          const classValue = (c as any)[key];
          
          if (typeof classValue === 'boolean') {
              if (value === 'sim') return classValue === true;
              if (value === 'não') return classValue === false;
              return true;
          }
          
          const strValue = String(classValue || '').toLowerCase();
          // Fixed line below: cast value to string to fix 'unknown' type error for toLowerCase()
          const filterValue = (value as string).toLowerCase();
          
          return strValue.includes(filterValue);
      });

      return matchesSearch && matchesStatus && matchesState && matchesCity && matchesMod1 && matchesMod2 && matchesColumnFilters;
    });
  }, [classes, searchTerm, statusFilter, stateFilter, cityFilter, mod1DateFilter, mod2DateFilter, columnFilters]);

  const selectedClasses = useMemo(() => {
      return classes.filter(c => selectedClassIds.includes(c.id));
  }, [classes, selectedClassIds]);

  const toggleClassSelection = (id: string) => {
      setSelectedClassIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleColumnFilterChange = (column: string, value: string) => {
      setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  return (
    <div className="animate-in fade-in h-full flex flex-col pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><GraduationCap className="text-purple-600" /> Gestão de Turmas</h2>
                <p className="text-slate-500 text-sm">Planejamento logístico e financeiro.</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center mr-2">
                <button onClick={() => setViewMode('list')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'list' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}><LayoutList size={16} /> Alunos</button>
                <button onClick={() => setViewMode('full_list')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'full_list' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Table size={16} /> Lista de Turmas</button>
                <button onClick={() => setViewMode('calendar')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'calendar' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}><CalendarIcon size={16} /> Calendário</button>
                <button onClick={() => setViewMode('capacity')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'capacity' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={16} /> Capacidade</button>
            </div>
            <button onClick={handleOpenNew} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Plus size={18} /> Nova Turma</button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-4">
                      <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600"><ChevronLeft size={20} /></button>
                      <h3 className="text-lg font-bold text-slate-800 capitalize">{calendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                      <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600"><ChevronRightIcon size={20} /></button>
                  </div>
                  <div className="text-sm text-slate-500 flex gap-4">
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300"></span> Módulo 1</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300"></span> Módulo 2</div>
                  </div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar p-4">
                  <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => ( <div key={day} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase">{day}</div> ))}
                      {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => ( <div key={`empty-${i}`} className="bg-white min-h-[120px]"></div> ))}
                      {Array.from({ length: getDaysInMonth(calendarDate) }).map((_, i) => {
                          const day = i + 1;
                          const currentDateStr = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).toISOString().split('T')[0];
                          const dayClasses = classes.filter(c => c.dateMod1 === currentDateStr || c.dateMod2 === currentDateStr);
                          return (
                              <div key={day} className="bg-white min-h-[120px] p-2 hover:bg-slate-50 transition-colors">
                                  <div className="flex justify-between items-start mb-2"><span className={clsx("w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium", new Date().toISOString().split('T')[0] === currentDateStr ? "bg-purple-600 text-white" : "text-slate-700")}>{day}</span></div>
                                  <div className="space-y-1">
                                      {dayClasses.map(cls => {
                                          const isMod1 = cls.dateMod1 === currentDateStr;
                                          return ( <button key={`${cls.id}-${isMod1 ? 'm1' : 'm2'}`} onClick={() => setModalViewerClass(cls)} className={clsx("w-full text-left px-2 py-1.5 rounded border text-[10px] font-medium transition-all shadow-sm mb-1", isMod1 ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100")}><div className="font-bold truncate">{cls.course}</div><div className="truncate opacity-80">{cls.city} - {isMod1 ? 'Mod 1' : 'Mod 2'}</div></button> );
                                      })}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      ) : viewMode === 'capacity' ? (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building className="text-teal-600" /> Capacidade dos Estúdios</h3>
                  <div className="relative max-w-sm w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="text" placeholder="Buscar turma ou cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                  </div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4 border-b">Estado</th>
                              <th className="px-6 py-4 border-b">Cidade</th>
                              <th className="px-6 py-4 border-b">Nº Turma</th>
                              <th className="px-6 py-4 border-b">Estúdio Parceiro</th>
                              <th className="px-6 py-4 border-b text-center">Capacidade</th>
                              <th className="px-6 py-4 border-b text-center">Inscritos</th>
                              <th className="px-6 py-4 border-b text-center">Ocupação</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredClasses.map(cls => {
                              const enrolledCount = deals.filter(d => (d.class_mod_1 === cls.mod1Code || d.class_mod_2 === cls.mod2Code) && d.stage === 'closed').length;
                              const studioInfo = partnerStudios.find(s => s.fantasyName === cls.studioMod1);
                              const capacityNum = parseInt(studioInfo?.studentCapacity || '0');
                              const percent = capacityNum > 0 ? Math.round((enrolledCount / capacityNum) * 100) : 0;
                              
                              return (
                                  <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 font-bold text-slate-700">{cls.state}</td>
                                      <td className="px-6 py-4 text-slate-600">{cls.city}</td>
                                      <td className="px-6 py-4 font-mono font-bold text-slate-500">#{cls.classCode}</td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                              <span className="font-bold text-slate-800">{cls.studioMod1}</span>
                                              <span className="text-[10px] text-slate-400 uppercase font-black">{studioInfo?.studioType || 'Parceiro'}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-center font-black text-slate-700">{studioInfo?.studentCapacity || '--'}</td>
                                      <td className="px-6 py-4 text-center font-black text-purple-600">{enrolledCount}</td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col items-center gap-1">
                                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                  <div 
                                                      className={clsx("h-full transition-all", percent > 100 ? "bg-red-500" : percent > 80 ? "bg-orange-500" : "bg-teal-500")}
                                                      style={{ width: `${Math.min(percent, 100)}%` }}
                                                  ></div>
                                              </div>
                                              <span className={clsx("text-[10px] font-black", percent > 100 ? "text-red-600" : "text-slate-500")}>{percent}%</span>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      ) : viewMode === 'full_list' ? (
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table className="text-purple-600" /> Lista Geral de Turmas</h3>
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar na lista completa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[3000px]">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-sm">
                        <tr className="bg-slate-100">
                            <th className="px-4 py-3 border-b sticky left-0 bg-slate-100 z-30">Ações</th>
                            <th className="px-4 py-3 border-b">Status</th>
                            <th className="px-4 py-3 border-b">UF</th>
                            <th className="px-4 py-3 border-b">Cidade</th>
                            <th className="px-4 py-3 border-b">Nº Turma</th>
                            <th className="px-4 py-3 border-b">Extra</th>
                            <th className="px-4 py-3 border-b">Curso</th>
                            <th className="px-4 py-3 border-b">Data M1</th>
                            <th className="px-4 py-3 border-b">Cód M1</th>
                            <th className="px-4 py-3 border-b">Studio M1</th>
                            <th className="px-4 py-3 border-b">Instrutor M1</th>
                            <th className="px-4 py-3 border-b">Passagem M1</th>
                            <th className="px-4 py-3 border-b">Coffee M1</th>
                            <th className="px-4 py-3 border-b">Hotel M1</th>
                            <th className="px-4 py-3 border-b">Ajuda M1</th>
                            <th className="px-4 py-3 border-b">Data M2</th>
                            <th className="px-4 py-3 border-b">Cód M2</th>
                            <th className="px-4 py-3 border-b">Instrutor M2</th>
                            <th className="px-4 py-3 border-b">Passagem M2</th>
                            <th className="px-4 py-3 border-b">Coffee M2</th>
                            <th className="px-4 py-3 border-b">Hotel M2</th>
                            <th className="px-4 py-3 border-b">Ajuda M2</th>
                            <th className="px-4 py-3 border-b">Aluguel Studio</th>
                            <th className="px-4 py-3 border-b">Logística Pronta</th>
                            <th className="px-4 py-3 border-b">Publicado Site</th>
                            <th className="px-4 py-3 border-b">No CRM</th>
                        </tr>
                        {/* Filters Row */}
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-2 sticky left-0 bg-slate-50 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                <button onClick={() => setColumnFilters({})} className="p-1.5 text-slate-400 hover:text-red-500 transition-all" title="Limpar filtros da tabela"><Eraser size={14}/></button>
                            </th>
                            <th className="px-2 py-1"><select className="w-full text-[10px] p-1 border rounded" value={columnFilters.status || ''} onChange={e => handleColumnFilterChange('status', e.target.value)}><option value="">Todos</option>{STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar UF..." value={columnFilters.state || ''} onChange={e => handleColumnFilterChange('state', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Cidade..." value={columnFilters.city || ''} onChange={e => handleColumnFilterChange('city', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Turma..." value={columnFilters.classCode || ''} onChange={e => handleColumnFilterChange('classCode', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Extra..." value={columnFilters.extraClass || ''} onChange={e => handleColumnFilterChange('extraClass', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Curso..." value={columnFilters.course || ''} onChange={e => handleColumnFilterChange('course', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Data..." value={columnFilters.dateMod1 || ''} onChange={e => handleColumnFilterChange('dateMod1', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Cód..." value={columnFilters.mod1Code || ''} onChange={e => handleColumnFilterChange('mod1Code', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Studio..." value={columnFilters.studioMod1 || ''} onChange={e => handleColumnFilterChange('studioMod1', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Instrutor..." value={columnFilters.instructorMod1 || ''} onChange={e => handleColumnFilterChange('instructorMod1', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Passagem..." value={columnFilters.ticketMod1 || ''} onChange={e => handleColumnFilterChange('ticketMod1', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Coffee..." value={columnFilters.coffeeMod1 || ''} onChange={e => handleColumnFilterChange('coffeeMod1', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Hotel..." value={columnFilters.hotelMod1 || ''} onChange={e => handleColumnFilterChange('hotelMod1', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Ajuda..." value={columnFilters.costHelp1 || ''} onChange={e => handleColumnFilterChange('costHelp1', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Data..." value={columnFilters.dateMod2 || ''} onChange={e => handleColumnFilterChange('dateMod2', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Cód..." value={columnFilters.mod2Code || ''} onChange={e => handleColumnFilterChange('mod2Code', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Instrutor..." value={columnFilters.instructorMod2 || ''} onChange={e => handleColumnFilterChange('instructorMod2', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Passagem..." value={columnFilters.ticketMod2 || ''} onChange={e => handleColumnFilterChange('ticketMod2', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Coffee..." value={columnFilters.coffeeMod2 || ''} onChange={e => handleColumnFilterChange('coffeeMod2', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Hotel..." value={columnFilters.hotelMod2 || ''} onChange={e => handleColumnFilterChange('hotelLocMod2', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Ajuda..." value={columnFilters.costHelp2 || ''} onChange={e => handleColumnFilterChange('costHelp2', e.target.value)} /></th>
                            <th className="px-2 py-1"><input className="w-full text-[10px] p-1 border rounded" placeholder="Filtrar Aluguel..." value={columnFilters.studioRent || ''} onChange={e => handleColumnFilterChange('studioRent', e.target.value)} /></th>
                            <th className="px-2 py-1"><select className="w-full text-[10px] p-1 border rounded" value={columnFilters.isReady || ''} onChange={e => handleColumnFilterChange('isReady', e.target.value)}><option value="">Todos</option><option value="sim">Sim</option><option value="não">Não</option></select></th>
                            <th className="px-2 py-1"><select className="w-full text-[10px] p-1 border rounded" value={columnFilters.onSite || ''} onChange={e => handleColumnFilterChange('onSite', e.target.value)}><option value="">Todos</option><option value="sim">Sim</option><option value="não">Não</option></select></th>
                            <th className="px-2 py-1"><select className="w-full text-[10px] p-1 border rounded" value={columnFilters.onCRM || ''} onChange={e => handleColumnFilterChange('onCRM', e.target.value)}><option value="">Todos</option><option value="sim">Sim</option><option value="não">Não</option></select></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredClasses.map(cls => (
                            <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 border-b sticky left-0 bg-white group-hover:bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(cls)} className="p-1.5 text-slate-400 hover:text-purple-600 transition-colors"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDelete(cls.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold border", 
                                        cls.status === 'Confirmado' ? 'bg-green-50 text-green-700 border-green-200' : 
                                        cls.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' : 
                                        'bg-amber-50 text-amber-700 border-amber-200')}>
                                        {cls.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-bold">{cls.state}</td>
                                <td className="px-4 py-3">{cls.city}</td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-500">{cls.classCode}</td>
                                <td className="px-4 py-3">{cls.extraClass || '--'}</td>
                                <td className="px-4 py-3 font-medium">{cls.course}</td>
                                <td className="px-4 py-3">{cls.dateMod1 ? new Date(cls.dateMod1).toLocaleDateString('pt-BR') : '--'}</td>
                                <td className="px-4 py-3 font-mono">{cls.mod1Code || '--'}</td>
                                <td className="px-4 py-3">{cls.studioMod1 || '--'}</td>
                                <td className="px-4 py-3">{cls.instructorMod1 || '--'}</td>
                                <td className="px-4 py-3 font-mono">{cls.ticketMod1 || '--'}</td>
                                <td className="px-4 py-3">{cls.coffeeMod1 || '--'}</td>
                                <td className="px-4 py-3">{cls.hotelMod1 || '--'}</td>
                                <td className="px-4 py-3">{cls.costHelp1 || '--'}</td>
                                <td className="px-4 py-3">{cls.dateMod2 ? new Date(cls.dateMod2).toLocaleDateString('pt-BR') : '--'}</td>
                                <td className="px-4 py-3 font-mono">{cls.mod2Code || '--'}</td>
                                <td className="px-4 py-3">{cls.instructorMod2 || '--'}</td>
                                <td className="px-4 py-3 font-mono">{cls.ticketMod2 || '--'}</td>
                                <td className="px-4 py-3">{cls.coffeeMod2 || '--'}</td>
                                <td className="px-4 py-3">{cls.hotelMod2 || '--'}</td>
                                <td className="px-4 py-3">{cls.costHelp2 || '--'}</td>
                                <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(cls.studioRent)}</td>
                                <td className="px-4 py-3 text-center">{cls.isReady ? <CheckCircle2 size={16} className="text-green-500 mx-auto"/> : <X size={16} className="text-slate-200 mx-auto"/>}</td>
                                <td className="px-4 py-3 text-center">{cls.onSite ? <CheckCircle2 size={16} className="text-green-500 mx-auto"/> : <X size={16} className="text-slate-200 mx-auto"/>}</td>
                                <td className="px-4 py-3 text-center">{cls.onCRM ? <CheckCircle2 size={16} className="text-green-500 mx-auto"/> : <X size={16} className="text-slate-200 mx-auto"/>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-180px)]">
          <div className="w-full lg:w-1/3 flex flex-col border-r border-slate-200">
              <div className="p-4 border-b border-slate-200 bg-white z-10 space-y-3">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="text" placeholder="Buscar por curso ou cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Status</label>
                          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none">
                              <option value="Todos">Todos</option>
                              {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none">
                              <option value="">UF</option>
                              {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cidade</label>
                          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} disabled={!stateFilter} className="w-full bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none disabled:bg-slate-50">
                              <option value="">Cidade</option>
                              {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                          </select>
                      </div>
                      <div className="flex items-end">
                          <button onClick={() => { setStatusFilter('Todos'); setStateFilter(''); setCityFilter(''); setMod1DateFilter(''); setMod2DateFilter(''); setSearchTerm(''); }} className="w-full h-9 flex items-center justify-center gap-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-all"><Eraser size={14}/> Limpar</button>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                  {isLoadingData ? (
                      <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-purple-600" /></div>
                  ) : (
                      <div className="divide-y divide-slate-100">
                          {filteredClasses.map(cls => (
                              <div key={cls.id} onClick={() => toggleClassSelection(cls.id)} className={clsx("p-4 cursor-pointer transition-all hover:bg-white relative group flex items-start gap-3", selectedClassIds.includes(cls.id) ? "bg-white border-l-4 border-l-purple-600 shadow-sm z-10" : "bg-transparent border-l-4 border-l-transparent text-slate-600")}>
                                  <div className="pt-1">
                                      <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                        checked={selectedClassIds.includes(cls.id)} 
                                        onChange={(e) => { e.stopPropagation(); toggleClassSelection(cls.id); }} 
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase", cls.status === 'Confirmado' ? 'bg-green-100 text-green-700' : cls.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{cls.status}</span>
                                          <div className="relative">
                                              <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === cls.id ? null : cls.id); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 class-menu-btn"><MoreHorizontal size={16} /></button>
                                              {activeMenuId === cls.id && (
                                                  <div className="absolute right-0 top-6 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                                      <button onClick={(e) => { e.stopPropagation(); handleEdit(cls); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b"><Edit2 size={12} /> Editar</button>
                                                      <button onClick={(e) => { e.stopPropagation(); handleDelete(cls.id); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Excluir</button>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                      <h3 className={clsx("font-bold text-sm mb-1 leading-snug", selectedClassIds.includes(cls.id) ? "text-purple-900" : "text-slate-800")}>{cls.course}</h3>
                                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2"><MapPin size={12} /> {cls.city}/{cls.state} <span className="text-slate-300">|</span> T: {cls.classCode}</div>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50/50 p-1.5 rounded"><CalendarIcon size={12} /> Mod 1: {cls.dateMod1 ? new Date(cls.dateMod1).toLocaleDateString('pt-BR') : '--'}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
          <div className="hidden lg:flex flex-col flex-1 bg-slate-50 overflow-hidden relative">
              {selectedClasses.length > 0 ? (
                  <ClassStudentsViewer classItems={selectedClasses} onClose={() => setSelectedClassIds([])} variant="embedded" canTakeAttendance={true} />
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Users size={32} className="text-slate-300" /></div>
                      <h3 className="text-lg font-medium text-slate-600">Nenhuma turma selecionada</h3>
                      <p className="text-sm max-w-xs mx-auto mt-2">Selecione uma ou mais turmas na lista à esquerda.</p>
                  </div>
              )}
          </div>
      </div>
      )}

      {modalViewerClass && <ClassStudentsViewer classItems={[modalViewerClass]} onClose={() => setModalViewerClass(null)} variant="modal" canTakeAttendance={true} />}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-xl">
                    <div><h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Turma' : 'Cadastro de Turma'}</h3><p className="text-sm text-slate-500">Gestão logística e técnica.</p></div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    {/* INFORMAÇÕES BÁSICAS */}
                    <section>
                        <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><BookOpen size={16} /> Informações Básicas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">STATUS</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>{STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Estado (UF)</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.state} onChange={e => { handleInputChange('state', e.target.value); handleInputChange('city', ''); }}>{states.map(uf => <option key={uf.id} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} disabled={!formData.state || isLoadingCities}><option value="">{isLoadingCities ? '...' : 'Selecione'}</option>{cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Nº Turma</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.classCode} onChange={e => handleInputChange('classCode', e.target.value)} /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Turma EXTRA</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.extraClass} onChange={e => handleInputChange('extraClass', e.target.value)} /></div>
                            <div className="lg:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Curso</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.course} onChange={e => handleInputChange('course', e.target.value)}><option value="">Selecione o curso...</option>{COURSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1 text-slate-400">Criado em</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-400" value={formData.createdAt} readOnly /></div>
                        </div>
                    </section>

                    {/* LOGÍSTICA MÓDULO 1 */}
                    <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2"><CalendarIcon size={16} /> Logística Módulo 1</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Início</label><input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={formData.dateMod1} onChange={e => handleInputChange('dateMod1', e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cód. Módulo 1</label><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" value={formData.mod1Code} onChange={e => handleInputChange('mod1Code', e.target.value)} /></div>
                            <div className="md:col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Studio / Local</label><select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={formData.studioMod1} onChange={e => handleInputChange('studioMod1', e.target.value)}><option value="">Selecione...</option>{partnerStudios.filter(s => s.state === formData.state && s.city === formData.city).map(s => <option key={s.id} value={s.fantasyName}>{s.fantasyName}</option>)}</select></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instrutor Mod 1</label><select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={formData.instructorMod1} onChange={e => handleInputChange('instructorMod1', e.target.value)}><option value="">Selecione...</option>{instructorsList.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cód. Voo/Passagem</label><div className="relative"><Plane className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.ticketMod1} onChange={e => handleInputChange('ticketMod1', e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Coffee Break</label><div className="relative"><Coffee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.coffeeMod1} onChange={e => handleInputChange('coffeeMod1', e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hotel</label><div className="relative"><Bed className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.hotelMod1} onChange={e => handleInputChange('hotelMod1', e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Localização Hotel</label><div className="relative"><Map className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.hotelLocMod1} onChange={e => handleInputChange('hotelLocMod1', e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ajuda de Custo (R$)</label><div className="relative"><DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.costHelp1} onChange={e => handleInputChange('costHelp1', e.target.value)} /></div></div>
                        </div>
                    </section>

                    {/* LOGÍSTICA MÓDULO 2 */}
                    <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-4 border-b border-orange-100 pb-2 flex items-center gap-2"><CalendarIcon size={16} /> Logística Módulo 2</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Início</label><input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={formData.dateMod2} onChange={e => handleInputChange('dateMod2', e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cód. Módulo 2</label><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" value={formData.mod2Code} onChange={e => handleInputChange('mod2Code', e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instrutor Mod 2</label><select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={formData.instructorMod2} onChange={e => handleInputChange('instructorMod2', e.target.value)}><option value="">Selecione...</option>{instructorsList.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cód. Voo/Passagem</label><div className="relative"><Plane className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.ticketMod2} onChange={e => handleInputChange('ticketMod2', e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Coffee Break</label><div className="relative"><Coffee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.coffeeMod2} onChange={e => handleInputChange('coffeeMod2', e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hotel</label><div className="relative"><Bed className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.hotelMod2} onChange={e => handleInputChange('hotelMod2', e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Localização Hotel</label><div className="relative"><Map className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.hotelLocMod2} onChange={e => handleInputChange('hotelLocMod2', e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ajuda de Custo (R$)</label><div className="relative"><DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" value={formData.costHelp2} onChange={e => handleInputChange('costHelp2', e.target.value)} /></div></div>
                        </div>
                    </section>

                    {/* LOGÍSTICA E FINANCEIRO GERAL */}
                    <section>
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Truck size={16} /> Outros Dados Logísticos e Financeiro</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Material Didático</label>
                                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-16 resize-none" value={formData.material} onChange={e => handleInputChange('material', e.target.value)} placeholder="Livros, Apostilas, Brindes..." />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Infraestrutura Necessária</label>
                                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-16 resize-none" value={formData.infrastructure} onChange={e => handleInputChange('infrastructure', e.target.value)} placeholder="Projetor, Som, Flipchart..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Aluguel do Studio (R$)</label>
                                <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" value={formData.studioRent} onChange={e => handleInputChange('studioRent', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">ContaAzul / RD Station / Transações</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" value={formData.contaAzulRD} onChange={e => handleInputChange('contaAzulRD', e.target.value)} />
                            </div>
                        </div>
                    </section>

                    {/* STATUS DE VISIBILIDADE E OBSERVAÇÕES */}
                    <section>
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><ArrowUpCircle size={16} /> Visibilidade e Alertas</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
                                    <input type="checkbox" className="w-5 h-5 rounded text-purple-600" checked={formData.isReady} onChange={e => handleInputChange('isReady', e.target.checked)} />
                                    <div><span className="font-bold text-sm block">Logística Pronta</span><p className="text-[10px] text-slate-400 font-medium">Turma validada e completa.</p></div>
                                </label>
                                <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
                                    <input type="checkbox" className="w-5 h-5 rounded text-purple-600" checked={formData.onSite} onChange={e => handleInputChange('onSite', e.target.checked)} />
                                    <div><span className="font-bold text-sm block">Publicado no Site</span><p className="text-[10px] text-slate-400 font-medium">Visível para vendas online.</p></div>
                                </label>
                                <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
                                    <input type="checkbox" className="w-5 h-5 rounded text-purple-600" checked={formData.onCRM} onChange={e => handleInputChange('onCRM', e.target.checked)} />
                                    <div><span className="font-bold text-sm block">Visível no CRM</span><p className="text-[10px] text-slate-400 font-medium">Liberado para negociações.</p></div>
                                </label>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Observações Internas</label>
                                <textarea className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm h-[180px] resize-none focus:ring-2 focus:ring-purple-100 outline-none" value={formData.observations} onChange={e => handleInputChange('observations', e.target.value)} placeholder="Digite aqui observações relevantes sobre esta turma..." />
                            </div>
                        </div>
                    </section>
                </div>
                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-100">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {formData.id ? 'Salvar Alterações' : 'Criar Turma'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
