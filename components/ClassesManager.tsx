import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, Plus, Search, Calendar as CalendarIcon, MapPin, 
  ArrowLeft, Save, X, MoreHorizontal, BookOpen, CheckSquare, 
  Coffee, DollarSign, FileText, Paperclip, Bed, Plane, Map,
  Edit2, Trash2, Hash, Loader2, Users, Filter, ChevronRight,
  LayoutList, ChevronLeft, ChevronRight as ChevronRightIcon,
  CheckCircle2, Globe, Eraser, Building, ArrowUpDown, ArrowUp, ArrowDown
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
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'capacity'>('list');
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
  const [classCodeFilter, setClassCodeFilter] = useState<string>('');
  
  // IBGE State
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [filterCities, setFilterCities] = useState<IBGECity[]>([]);

  // External Data States
  const [instructorsList, setInstructorsList] = useState<string[]>([]);
  const [partnerStudios, setPartnerStudios] = useState<PartnerStudio[]>([]);

  // Sorting State for Capacity View
  const [capSortConfig, setCapSortConfig] = useState<{ key: 'enrolled' | 'percent'; direction: 'asc' | 'desc' } | null>(null);

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
            id: d.id, status: d.status || 'Confirmado', state: d.state || '', city: d.city || '', classCode: d.class_code || '', extraClass: d.extra_class || '', course: d.course || '', createdAt: d.created_at || '', dateMod1: d.date_mod_1 || '', mod1Code: d.mod_1_code || '', material: d.material || '', studio_mod_1: d.studio_mod_1 || '', instructor_mod_1: d.instructor_mod_1 || '', ticket_mod_1: d.ticket_mod_1 || '', infrastructure: d.infrastructure || '', coffee_mod_1: d.coffee_mod_1 || '', hotel_mod_1: d.hotel_mod_1 || '', hotel_loc_mod_1: d.hotel_loc_mod_1 || '', cost_help_1: d.cost_help_1 || '', date_mod_2: d.date_mod_2 || '', mod_2_code: d.mod_2_code || '', instructor_mod_2: d.instructor_mod_2 || '', ticket_mod_2: d.ticket_mod_2 || '', coffee_mod_2: d.coffee_mod_2 || '', hotel_mod_2: d.hotel_mod_2 || '', hotel_loc_2: d.hotel_loc_mod_2 || '', cost_help_2: d.cost_help_2 || '', studio_rent: Number(d.studio_rent || 0), conta_azul_rd: d.conta_azul_rd || '', is_ready: !!d.is_ready, on_site: !!d.on_site, on_crm: !!d.on_crm, observations: d.observations || '', attachments: [] 
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
          ibgeService.getCities(stateFilter).then(setFilterCities);
          setCityFilter('');
      } else {
          setFilterCities([]);
          setCityFilter('');
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
        status: formData.status, state: formData.state, city: formData.city, class_code: formData.classCode, extra_class: formData.extraClass, course: formData.course, date_mod_1: formData.dateMod1 || null, mod_1_code: formData.mod1Code, material: formData.material, studio_mod_1: formData.studioMod1, instructor_mod_1: formData.instructorMod1, ticket_mod_1: formData.ticketMod1, infrastructure: formData.infrastructure, coffee_mod_1: formData.coffeeMod1, hotel_mod_1: formData.hotelMod1, hotel_loc_mod_1: formData.hotelLocMod1, cost_help_1: formData.costHelp1, date_mod_2: formData.date_mod_2 || null, mod_2_code: formData.mod2Code, instructor_mod_2: formData.instructorMod2, ticket_mod_2: formData.ticketMod2, coffee_mod_2: formData.coffee_mod_2, hotel_mod_2: formData.hotel_mod_2, hotel_loc_mod_2: formData.hotelLocMod2, cost_help_2: formData.costHelp2, studio_rent: formData.studioRent, conta_azul_rd: formData.contaAzulRD, is_ready: formData.is_ready, on_site: formData.onSite, on_crm: formData.onCRM, observations: formData.observations
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
      const matchesSearch = c.course.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.classCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
      const matchesState = !stateFilter || c.state === stateFilter;
      const matchesCity = !cityFilter || c.city === cityFilter;
      const matchesMod1 = !mod1DateFilter || c.dateMod1 === mod1DateFilter;
      const matchesMod2 = !mod2DateFilter || c.dateMod2 === mod2DateFilter;
      const matchesClassCode = !classCodeFilter || c.classCode.includes(classCodeFilter);
      return matchesSearch && matchesStatus && matchesState && matchesCity && matchesMod1 && matchesMod2 && matchesClassCode;
    });
  }, [classes, searchTerm, statusFilter, stateFilter, cityFilter, mod1DateFilter, mod2DateFilter, classCodeFilter]);

  const capacitySortedData = useMemo(() => {
    const data = filteredClasses.map(cls => {
      const enrolledCount = deals.filter(d => (d.class_mod_1 === cls.mod1Code || d.class_mod_2 === cls.mod2Code) && d.stage === 'closed').length;
      const studioInfo = partnerStudios.find(s => s.fantasyName === cls.studioMod1);
      const capacityNum = parseInt(studioInfo?.studentCapacity || '0');
      const percent = capacityNum > 0 ? Math.round((enrolledCount / capacityNum) * 100) : 0;
      return { ...cls, enrolledCount, capacityNum, percent, studioInfo };
    });

    if (capSortConfig) {
      data.sort((a, b) => {
        const valA = capSortConfig.key === 'enrolled' ? a.enrolledCount : a.percent;
        const valB = capSortConfig.key === 'enrolled' ? b.enrolledCount : b.percent;
        if (capSortConfig.direction === 'asc') return valA - valB;
        return valB - valA;
      });
    }

    return data;
  }, [filteredClasses, deals, partnerStudios, capSortConfig]);

  const selectedClasses = useMemo(() => {
      return classes.filter(c => selectedClassIds.includes(c.id));
  }, [classes, selectedClassIds]);

  const toggleClassSelection = (id: string) => {
      setSelectedClassIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const handleCapSort = (key: 'enrolled' | 'percent') => {
    setCapSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const renderSortIcon = (key: 'enrolled' | 'percent') => {
    if (capSortConfig?.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
    return capSortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col pb-20">
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
                <button onClick={() => setViewMode('list')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'list' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}><LayoutList size={16} /> Lista</button>
                <button onClick={() => setViewMode('calendar')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'calendar' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}><CalendarIcon size={16} /> Calendário</button>
                <button onClick={() => setViewMode('capacity')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'capacity' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={16} /> Capacidade dos Estúdios</button>
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
                      {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => ( <div key={day} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase">{day}</div> ))}
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
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 shrink-0"><Building className="text-teal-600" /> Capacidade dos Estúdios</h3>
                  <div className="flex flex-wrap items-center gap-3 w-full justify-end">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Estado</label>
                        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1.5 outline-none">
                            <option value="">Todos</option>
                            {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cidade</label>
                        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} disabled={!stateFilter} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1.5 outline-none disabled:bg-slate-50">
                            <option value="">Todas Cidades</option>
                            {filterCities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Turma</label>
                        <input 
                            type="text" 
                            placeholder="Nº..." 
                            value={classCodeFilter} 
                            onChange={e => setClassCodeFilter(e.target.value)} 
                            className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs" 
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Mod 1</label>
                        <input 
                            type="date" 
                            value={mod1DateFilter} 
                            onChange={e => setMod1DateFilter(e.target.value)} 
                            className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] outline-none" 
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Mod 2</label>
                        <input 
                            type="date" 
                            value={mod2DateFilter} 
                            onChange={e => setMod2DateFilter(e.target.value)} 
                            className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] outline-none" 
                        />
                      </div>
                      <div className="relative max-w-xs w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input type="text" placeholder="Buscar estúdio ou curso..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <button onClick={() => { setStatusFilter('Todos'); setStateFilter(''); setCityFilter(''); setSearchTerm(''); setClassCodeFilter(''); setMod1DateFilter(''); setMod2DateFilter(''); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Limpar Filtros"><Eraser size={18}/></button>
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
                              <th className="px-6 py-4 border-b text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleCapSort('enrolled')}>
                                <div className="flex items-center justify-center">Inscritos {renderSortIcon('enrolled')}</div>
                              </th>
                              <th className="px-6 py-4 border-b text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleCapSort('percent')}>
                                <div className="flex items-center justify-center">Ocupação {renderSortIcon('percent')}</div>
                              </th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {capacitySortedData.map(item => {
                              return (
                                  <tr key={item.id} className={clsx(
                                      "transition-colors",
                                      item.percent <= 27 ? "bg-white hover:bg-slate-50" :
                                      item.percent <= 37 ? "bg-green-50 hover:bg-green-100/50" :
                                      item.percent <= 49 ? "bg-yellow-50 hover:bg-yellow-100/50" :
                                      "bg-red-50 hover:bg-red-100/50"
                                  )}>
                                      <td className="px-6 py-4 font-bold text-slate-700">{item.state}</td>
                                      <td className="px-6 py-4 text-slate-600">{item.city}</td>
                                      <td className="px-6 py-4 font-mono font-bold text-slate-500">#{item.classCode}</td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                              <span className="font-bold text-slate-800">{item.studioMod1}</span>
                                              <span className="text-[10px] text-slate-400 uppercase font-black">{item.studioInfo?.studioType || 'Parceiro'}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-center font-black text-slate-700">{item.studioInfo?.studentCapacity || '--'}</td>
                                      <td className="px-6 py-4 text-center font-black text-purple-600">{item.enrolledCount}</td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col items-center gap-1">
                                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                  <div 
                                                      className={clsx("h-full transition-all", 
                                                          item.percent <= 27 ? "bg-slate-300" :
                                                          item.percent <= 37 ? "bg-green-500" :
                                                          item.percent <= 49 ? "bg-yellow-500" :
                                                          "bg-red-500"
                                                      )}
                                                      style={{ width: `${Math.min(item.percent, 100)}%` }}
                                                  ></div>
                                              </div>
                                              <span className={clsx("text-[10px] font-black", 
                                                  item.percent <= 27 ? "text-slate-500" :
                                                  item.percent <= 37 ? "text-green-700" :
                                                  item.percent <= 49 ? "text-yellow-700" :
                                                  "text-red-700"
                                              )}>{item.percent}%</span>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                          {capacitySortedData.length === 0 && (
                              <tr><td colSpan={7} className="py-20 text-center text-slate-400 italic">Nenhuma turma encontrada.</td></tr>
                          )}
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
                      <input type="text" placeholder="Buscar por curso ou cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
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
                              {filterCities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Mod 1</label>
                          <input type="date" value={mod1DateFilter} onChange={e => setMod1DateFilter(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-600 text-[10px] rounded-lg px-1 py-1.5 outline-none" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Mod 2</label>
                          <input type="date" value={mod2DateFilter} onChange={e => setMod2DateFilter(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-600 text-[10px] rounded-lg px-1 py-1.5 outline-none" />
                      </div>
                      <div className="flex items-end">
                          <button onClick={() => { setStatusFilter('Todos'); setStateFilter(''); setCityFilter(''); setMod1DateFilter(''); setMod2DateFilter(''); setSearchTerm(''); setClassCodeFilter(''); }} className="w-full h-9 flex items-center justify-center gap-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-all"><Eraser size={14}/> Limpar</button>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                  {isLoadingData ? (
                      <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-purple-600" /></div>
                  ) : filteredClasses.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">Nenhuma turma encontrada.</div>
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
                      <p className="text-sm max-w-xs mx-auto mt-2">Selecione uma ou mais turmas na lista à esquerda para visualizar todos os alunos inscritos, financeiro e lista de presença consolidada.</p>
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
                    <div><h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Turma' : 'Cadastro de Turma'}</h3><p className="text-sm text-slate-500">Preencha todos os detalhes logísticos e financeiros.</p></div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    <div>
                        <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><BookOpen size={16} /> Informações Básicas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">STATUS</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>{STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Estado (UF)</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.state} onChange={e => { handleInputChange('state', e.target.value); handleInputChange('city', ''); handleInputChange('studioMod1', ''); }}>{states.map(uf => <option key={uf.id} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100" value={formData.city} onChange={e => { handleInputChange('city', e.target.value); handleInputChange('studioMod1', ''); }} disabled={!formData.state || isLoadingCities}><option value="">{isLoadingCities ? 'Carregando...' : 'Selecione...'}</option>{cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Número da Turma</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.classCode} onChange={e => handleInputChange('classCode', e.target.value)} /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Turma EXTRA</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.extraClass} onChange={e => handleInputChange('extraClass', e.target.value)} /></div>
                            <div className="lg:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Curso</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.course} onChange={e => handleInputChange('course', e.target.value)}><option value="">Selecione o curso...</option>{COURSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Data de criação</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500" value={formData.createdAt} readOnly /></div>
                        </div>
                    </div>
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