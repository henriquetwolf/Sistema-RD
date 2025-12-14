import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, Plus, Search, Calendar as CalendarIcon, Clock, MapPin, 
  ArrowLeft, Save, X, MoreHorizontal, BookOpen, CheckSquare, 
  Coffee, DollarSign, FileText, Paperclip, Bed, Plane, Map,
  Edit2, Trash2, Hash, Loader2, Users, Filter, ChevronRight,
  LayoutList, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import clsx from 'clsx';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import { appBackend } from '../services/appBackend';
import { ClassStudentsViewer } from './ClassStudentsViewer';

// --- Types ---
interface ClassItem {
  id: string;
  // General
  status: string;
  state: string; 
  city: string;  
  classCode: string; 
  extraClass: string;
  course: string;
  createdAt: string;

  // Module 1
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

  // Module 2
  dateMod2: string;
  mod2Code?: string; 
  instructorMod2: string;
  ticketMod2: string;
  coffeeMod2: string;
  hotelMod2: string;
  hotelLocMod2: string;
  costHelp2: string;

  // Financial / Admin
  studioRent: number;
  contaAzulRD: string;

  // Checklists
  isReady: boolean;
  onSite: boolean;
  onCRM: boolean;

  // Misc
  observations: string;
  attachments: string[]; 
}

// --- Dropdown Options Mock ---
const COURSES = ['Formação Completa em Pilates', 'Pilates Clínico', 'Pilates Suspenso', 'Gestão de Studios', 'MIT Movimento Inteligente'];
// INSTRUCTORS removed - fetched dynamically
const STUDIOS = ['Studio Central', 'Espaço Vida', 'Pilates Zone', 'Clinica Integrada', 'Box Cross Pilates'];

interface ClassesManagerProps {
  onBack: () => void;
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({ onBack }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Selection / Filter State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  // Separate state for modal viewing (Calendar interactions) vs embedded viewing (List interactions)
  const [modalViewerClass, setModalViewerClass] = useState<ClassItem | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  
  // IBGE State
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // Instructors State
  const [instructorsList, setInstructorsList] = useState<string[]>([]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.class-menu-btn') === null) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Initial Empty Form State
  const initialFormState: ClassItem = {
      id: '',
      status: 'Planejamento',
      state: '',
      city: '',
      classCode: '', 
      extraClass: '',
      course: '',
      createdAt: new Date().toISOString().split('T')[0], 
      dateMod1: '',
      mod1Code: '',
      material: '',
      studioMod1: '',
      instructorMod1: '',
      ticketMod1: '',
      infrastructure: '',
      coffeeMod1: '',
      hotelMod1: '',
      hotelLocMod1: '',
      costHelp1: '',
      dateMod2: '',
      mod2Code: '',
      instructorMod2: '',
      ticketMod2: '',
      coffeeMod2: '',
      hotelMod2: '',
      hotelLocMod2: '',
      costHelp2: '',
      studioRent: 0,
      contaAzulRD: '',
      isReady: false,
      onSite: false,
      onCRM: false,
      observations: '',
      attachments: []
  };

  const [formData, setFormData] = useState<ClassItem>(initialFormState);

  // Fetch Data on Mount
  useEffect(() => {
      fetchClasses();
      fetchInstructors();
      ibgeService.getStates().then(setStates);
  }, []);

  const fetchClasses = async () => {
      setIsLoadingData(true);
      try {
          const { data, error } = await appBackend.client.from('crm_classes').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          
          const mapped = (data || []).map((d: any) => ({
            id: d.id,
            status: d.status,
            state: d.state,
            city: d.city,
            classCode: d.class_code,
            extraClass: d.extra_class,
            course: d.course,
            createdAt: d.created_at,
            dateMod1: d.date_mod_1,
            mod1Code: d.mod_1_code,
            material: d.material,
            studioMod1: d.studio_mod_1,
            instructorMod1: d.instructor_mod_1,
            ticketMod1: d.ticket_mod_1,
            infrastructure: d.infrastructure,
            coffeeMod1: d.coffee_mod_1,
            hotelMod1: d.hotel_mod_1,
            hotelLocMod1: d.hotel_loc_mod_1,
            costHelp1: d.cost_help_1,
            dateMod2: d.date_mod_2,
            mod2Code: d.mod_2_code,
            instructorMod2: d.instructor_mod_2,
            ticketMod2: d.ticket_mod_2,
            coffeeMod2: d.coffee_mod_2,
            hotelMod2: d.hotel_mod_2,
            hotelLocMod2: d.hotel_loc_mod_2,
            costHelp2: d.cost_help_2,
            studioRent: Number(d.studio_rent),
            contaAzulRD: d.conta_azul_rd,
            isReady: d.is_ready,
            onSite: d.on_site,
            onCRM: d.on_crm,
            observations: d.observations,
            attachments: [] 
          }));
          setClasses(mapped);
          
          // Select first class by default if available (only in list mode)
          if (mapped.length > 0 && viewMode === 'list') {
              setSelectedClassId(mapped[0].id);
          }
      } catch (e: any) {
          console.error("Erro ao buscar turmas:", e);
          const msg = e.message || JSON.stringify(e);
          if (msg.includes('does not exist')) {
              alert("A tabela 'crm_classes' não existe. Vá em Configurações > Diagnóstico e execute o SQL de correção.");
          }
      } finally {
          setIsLoadingData(false);
      }
  };

  const fetchInstructors = async () => {
      try {
          const { data, error } = await appBackend.client
              .from('crm_teachers')
              .select('full_name')
              .order('full_name', { ascending: true });
          
          if (!error && data) {
              setInstructorsList(data.map((t: any) => t.full_name));
          }
      } catch (e) {
          console.error("Erro ao buscar instrutores:", e);
      }
  };

  // Fetch Cities when State changes
  useEffect(() => {
      if (formData.state) {
          setIsLoadingCities(true);
          ibgeService.getCities(formData.state).then(data => {
              setCities(data);
              setIsLoadingCities(false);
          });
      } else {
          setCities([]);
      }
  }, [formData.state]);

  // Auto-generate Module Codes
  useEffect(() => {
      const generateCode = (dateStr: string) => {
          if (!dateStr) return '';
          const [year, month, day] = dateStr.split('-');
          const formattedDate = `${day}/${month}/${year}`;
          const location = formData.city && formData.state ? `${formData.city} - ${formData.state}` : '';
          const parts = [
              location,
              formData.classCode,
              formData.extraClass,
              formData.course,
              formattedDate
          ];
          return parts.filter(p => p && p.trim() !== '').join(' - ');
      };

      const newMod1Code = generateCode(formData.dateMod1);
      const newMod2Code = generateCode(formData.dateMod2);

      if (newMod1Code !== formData.mod1Code || newMod2Code !== formData.mod2Code) {
          setFormData(prev => ({
              ...prev,
              mod1Code: newMod1Code,
              mod2Code: newMod2Code
          }));
      }
  }, [formData.city, formData.state, formData.classCode, formData.extraClass, formData.course, formData.dateMod1, formData.dateMod2]);


  const handleOpenNew = () => {
      setFormData(initialFormState);
      setShowModal(true);
  };

  const handleEdit = (item: ClassItem) => {
      setFormData({ ...item });
      setActiveMenuId(null);
      setShowModal(true);
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta turma?")) {
          try {
              const { error } = await appBackend.client.from('crm_classes').delete().eq('id', id);
              if (error) throw error;
              setClasses(prev => prev.filter(c => c.id !== id));
              if (selectedClassId === id) setSelectedClassId(null);
          } catch(e) {
              alert("Erro ao excluir turma.");
          }
      }
      setActiveMenuId(null);
  };

  const handleSave = async () => {
    if (!formData.course || !formData.city) {
        alert("Preencha ao menos o Curso e a Cidade.");
        return;
    }

    setIsSaving(true);
    
    const payload = {
        status: formData.status,
        state: formData.state,
        city: formData.city,
        class_code: formData.classCode,
        extra_class: formData.extraClass,
        course: formData.course,
        date_mod_1: formData.dateMod1 || null,
        mod_1_code: formData.mod1Code,
        material: formData.material,
        studio_mod_1: formData.studioMod1,
        instructor_mod_1: formData.instructorMod1,
        ticket_mod_1: formData.ticketMod1,
        infrastructure: formData.infrastructure,
        coffee_mod_1: formData.coffeeMod1,
        hotel_mod_1: formData.hotelMod1,
        hotel_loc_mod_1: formData.hotelLocMod1,
        cost_help_1: formData.costHelp1,
        date_mod_2: formData.dateMod2 || null,
        mod_2_code: formData.mod2Code,
        instructor_mod_2: formData.instructorMod2,
        ticket_mod_2: formData.ticketMod2,
        coffee_mod_2: formData.coffeeMod2,
        hotel_mod_2: formData.hotelMod2,
        hotel_loc_mod_2: formData.hotelLocMod2,
        cost_help_2: formData.costHelp2,
        studio_rent: formData.studioRent,
        conta_azul_rd: formData.contaAzulRD,
        is_ready: formData.isReady,
        on_site: formData.onSite,
        on_crm: formData.onCRM,
        observations: formData.observations
    };

    try {
        if (formData.id) {
            const { error } = await appBackend.client.from('crm_classes').update(payload).eq('id', formData.id);
            if (error) throw error;
        } else {
            const { error } = await appBackend.client.from('crm_classes').insert([payload]);
            if (error) throw error;
        }
        await fetchClasses();
        setShowModal(false);
        setFormData(initialFormState);
    } catch(e: any) {
        console.error(e);
        alert(`Erro ao salvar: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof ClassItem, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));

  // --- FILTERING ---
  const filteredClasses = classes.filter(c => {
      const matchesSearch = c.course.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
  });

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="text-purple-600" /> Gestão de Turmas
                </h2>
                <p className="text-slate-500 text-sm">Planejamento logístico e financeiro.</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                <button 
                    onClick={() => setViewMode('list')}
                    className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'list' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <LayoutList size={16} /> Lista
                </button>
                <button 
                    onClick={() => setViewMode('calendar')}
                    className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'calendar' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <CalendarIcon size={16} /> Calendário
                </button>
            </div>

            <button 
                onClick={handleOpenNew}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
            >
                <Plus size={18} /> Nova Turma
            </button>
        </div>
      </div>

      {/* VIEW: CALENDAR */}
      {viewMode === 'calendar' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Calendar Controls */}
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-4">
                      <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600"><ChevronLeft size={20} /></button>
                      <h3 className="text-lg font-bold text-slate-800 capitalize">
                          {calendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600"><ChevronRightIcon size={20} /></button>
                  </div>
                  <div className="text-sm text-slate-500 flex gap-4">
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300"></span> Módulo 1</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300"></span> Módulo 2</div>
                  </div>
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 overflow-auto custom-scrollbar p-4">
                  <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                      {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                          <div key={day} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase">
                              {day}
                          </div>
                      ))}
                      
                      {/* Empty Cells for start of month */}
                      {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => (
                          <div key={`empty-${i}`} className="bg-white min-h-[120px]"></div>
                      ))}

                      {/* Days */}
                      {Array.from({ length: getDaysInMonth(calendarDate) }).map((_, i) => {
                          const day = i + 1;
                          const currentDateStr = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).toISOString().split('T')[0];
                          
                          // Find classes on this day
                          const dayClasses = classes.filter(c => c.dateMod1 === currentDateStr || c.dateMod2 === currentDateStr);

                          return (
                              <div key={day} className="bg-white min-h-[120px] p-2 hover:bg-slate-50 transition-colors">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className={clsx(
                                          "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                                          new Date().toISOString().split('T')[0] === currentDateStr 
                                              ? "bg-purple-600 text-white" 
                                              : "text-slate-700"
                                      )}>
                                          {day}
                                      </span>
                                  </div>
                                  
                                  <div className="space-y-1">
                                      {dayClasses.map(cls => {
                                          const isMod1 = cls.dateMod1 === currentDateStr;
                                          return (
                                              <button 
                                                  key={`${cls.id}-${isMod1 ? 'm1' : 'm2'}`}
                                                  onClick={() => setModalViewerClass(cls)}
                                                  className={clsx(
                                                      "w-full text-left px-2 py-1.5 rounded border text-[10px] font-medium transition-all shadow-sm mb-1",
                                                      isMod1 
                                                          ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" 
                                                          : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                                                  )}
                                              >
                                                  <div className="font-bold truncate">{cls.course}</div>
                                                  <div className="truncate opacity-80">{cls.city} - {isMod1 ? 'Mod 1' : 'Mod 2'}</div>
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: LIST (Split Pane) */}
      {viewMode === 'list' && (
      <div className="flex flex-col lg:flex-row flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-180px)]">
          
          {/* LEFT PANE: List & Filters */}
          <div className="w-full lg:w-1/3 flex flex-col border-r border-slate-200">
              
              {/* Filters Header */}
              <div className="p-4 border-b border-slate-200 bg-white z-10 space-y-3">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                          type="text" 
                          placeholder="Buscar por curso ou cidade..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                  </div>
                  <div className="flex gap-2">
                      <select 
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none"
                      >
                          <option value="Todos">Todos Status</option>
                          <option value="Planejamento">Planejamento</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="Concluído">Concluído</option>
                          <option value="Cancelado">Cancelado</option>
                      </select>
                      <div className="text-xs text-slate-400 flex items-center px-2">
                          {filteredClasses.length} turmas
                      </div>
                  </div>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                  {isLoadingData ? (
                      <div className="flex justify-center py-10">
                          <Loader2 size={32} className="animate-spin text-purple-600" />
                      </div>
                  ) : filteredClasses.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                          Nenhuma turma encontrada.
                      </div>
                  ) : (
                      <div className="divide-y divide-slate-100">
                          {filteredClasses.map(cls => (
                              <div 
                                  key={cls.id}
                                  onClick={() => setSelectedClassId(cls.id)}
                                  className={clsx(
                                      "p-4 cursor-pointer transition-all hover:bg-white relative group",
                                      selectedClassId === cls.id ? "bg-white border-l-4 border-l-purple-600 shadow-sm z-10" : "bg-transparent border-l-4 border-l-transparent text-slate-600"
                                  )}
                              >
                                  <div className="flex justify-between items-start mb-1">
                                      <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase", 
                                          cls.status === 'Confirmado' ? 'bg-green-100 text-green-700' : 
                                          cls.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                      )}>
                                          {cls.status}
                                      </span>
                                      
                                      {/* Context Menu Trigger */}
                                      <div className="relative">
                                          <button 
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveMenuId(activeMenuId === cls.id ? null : cls.id);
                                              }}
                                              className="p-1 hover:bg-slate-100 rounded text-slate-400 class-menu-btn"
                                          >
                                              <MoreHorizontal size={16} />
                                          </button>
                                          
                                          {activeMenuId === cls.id && (
                                              <div className="absolute right-0 top-6 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); handleEdit(cls); }}
                                                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                  >
                                                      <Edit2 size={12} /> Editar
                                                  </button>
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); handleDelete(cls.id); }}
                                                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                  >
                                                      <Trash2 size={12} /> Excluir
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  <h3 className={clsx("font-bold text-sm mb-1 leading-snug", selectedClassId === cls.id ? "text-purple-900" : "text-slate-800")}>
                                      {cls.course}
                                  </h3>
                                  
                                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                                      <MapPin size={12} /> {cls.city}/{cls.state} <span className="text-slate-300">|</span> T: {cls.classCode}
                                  </div>

                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50/50 p-1.5 rounded">
                                      <CalendarIcon size={12} /> Mod 1: {cls.dateMod1 ? new Date(cls.dateMod1).toLocaleDateString('pt-BR') : '--'}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT PANE: Detail View (Student List) */}
          <div className="hidden lg:flex flex-col flex-1 bg-slate-50 overflow-hidden relative">
              {selectedClass ? (
                  <ClassStudentsViewer 
                      classItem={selectedClass} 
                      onClose={() => setSelectedClassId(null)} 
                      variant="embedded"
                  />
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <Users size={32} className="text-slate-300" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-600">Nenhuma turma selecionada</h3>
                      <p className="text-sm max-w-xs mx-auto mt-2">Selecione uma turma na lista à esquerda para visualizar os alunos inscritos e detalhes financeiros.</p>
                  </div>
              )}
          </div>

          {/* MOBILE VIEW MODAL (When a class is selected on mobile) */}
          <div className={clsx("lg:hidden fixed inset-0 z-40 bg-white transition-transform duration-300 transform", selectedClassId ? "translate-x-0" : "translate-x-full")}>
              {selectedClass && (
                  <div className="h-full flex flex-col">
                      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                          <button onClick={() => setSelectedClassId(null)} className="p-2 hover:bg-slate-100 rounded-full">
                              <ArrowLeft size={20} />
                          </button>
                          <span className="font-bold text-slate-800">Detalhes da Turma</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                          <ClassStudentsViewer 
                              classItem={selectedClass} 
                              onClose={() => setSelectedClassId(null)} 
                              variant="embedded"
                          />
                      </div>
                  </div>
              )}
          </div>

      </div>
      )}

      {/* MODAL VIEWER (Used by Calendar) */}
      {modalViewerClass && (
          <ClassStudentsViewer 
              classItem={modalViewerClass} 
              onClose={() => setModalViewerClass(null)} 
              variant="modal"
          />
      )}

      {/* Modal Full Screen / Large (CREATE/EDIT) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Turma' : 'Cadastro de Turma'}</h3>
                        <p className="text-sm text-slate-500">Preencha todos os detalhes logísticos e financeiros.</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                </div>
                
                {/* Body - Scrollable */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    
                    {/* SEÇÃO 1: DADOS GERAIS */}
                    <div>
                        <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <BookOpen size={16} /> Informações Básicas
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">STATUS</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.status}
                                    onChange={e => handleInputChange('status', e.target.value)}
                                >
                                    <option value="Planejamento">Planejamento</option>
                                    <option value="Confirmado">Confirmado</option>
                                    <option value="Concluído">Concluído</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>
                            
                            {/* SELETORES DE ESTADO E CIDADE */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado (UF)</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.state}
                                    onChange={e => {
                                        handleInputChange('state', e.target.value);
                                        handleInputChange('city', ''); // Reset city on state change
                                    }}
                                >
                                    <option value="">Selecione...</option>
                                    {states.map(uf => <option key={uf.id} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100"
                                    value={formData.city}
                                    onChange={e => handleInputChange('city', e.target.value)}
                                    disabled={!formData.state || isLoadingCities}
                                >
                                    <option value="">{isLoadingCities ? 'Carregando...' : 'Selecione...'}</option>
                                    {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Número da Turma</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    placeholder="Ex: 105"
                                    value={formData.classCode}
                                    onChange={e => handleInputChange('classCode', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Turma EXTRA</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    placeholder="Sim/Não/Detalhes"
                                    value={formData.extraClass}
                                    onChange={e => handleInputChange('extraClass', e.target.value)}
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Curso</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.course}
                                    onChange={e => handleInputChange('course', e.target.value)}
                                >
                                    <option value="">Selecione o curso...</option>
                                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data de criação</label>
                                <input 
                                    type="date" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500"
                                    value={formData.createdAt}
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 2: MÓDULO 1 */}
                    <div>
                        <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <CalendarIcon size={16} /> Módulo 1 (Logística)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Hash size={12}/> CÓDIGO DO MÓDULO 1 (Automático)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-600 font-mono"
                                    value={formData.mod1Code}
                                    readOnly
                                    placeholder="Gerado automaticamente após preencher data, cidade, curso..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data do Módulo 1</label>
                                <input 
                                    type="date" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                                    value={formData.dateMod1}
                                    onChange={e => handleInputChange('dateMod1', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Studio MOD I</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.studioMod1}
                                    onChange={e => handleInputChange('studioMod1', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {STUDIOS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Instrutor Módulo 1</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.instructorMod1}
                                    onChange={e => handleInputChange('instructorMod1', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {instructorsList.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Passagem (Mod 1)</label>
                                <div className="relative">
                                    <Plane size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        type="text" 
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        placeholder="Voo/Horário"
                                        value={formData.ticketMod1}
                                        onChange={e => handleInputChange('ticketMod1', e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">MATERIAL</label>
                                <input type="text" placeholder="Apostilas, brindes..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.material} onChange={e => handleInputChange('material', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">PROJETOR, TV, CADEIRAS</label>
                                <input type="text" placeholder="Status infra" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.infrastructure} onChange={e => handleInputChange('infrastructure', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Coffe Módulo 1</label>
                                <div className="relative">
                                    <Coffee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.coffeeMod1} onChange={e => handleInputChange('coffeeMod1', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">AJUDA DE CUSTO</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.costHelp1} onChange={e => handleInputChange('costHelp1', e.target.value)} />
                            </div>
                            
                            {/* Hotel Row */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Hotel Módulo 1</label>
                                <div className="relative">
                                    <Bed size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Nome do Hotel" value={formData.hotelMod1} onChange={e => handleInputChange('hotelMod1', e.target.value)} />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">LOCALIZAÇÃO HOTEL MÓDULO 1</label>
                                <div className="relative">
                                    <Map size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Endereço / Link" value={formData.hotelLocMod1} onChange={e => handleInputChange('hotelLocMod1', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 3: MÓDULO 2 */}
                    <div>
                        <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <CalendarIcon size={16} /> Módulo 2 (Logística)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Hash size={12}/> CÓDIGO DO MÓDULO 2 (Automático)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-600 font-mono"
                                    value={formData.mod2Code}
                                    readOnly
                                    placeholder="Gerado automaticamente após preencher data..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data do Módulo 2</label>
                                <input 
                                    type="date" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    value={formData.dateMod2}
                                    onChange={e => handleInputChange('dateMod2', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Instrutor Módulo 2</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.instructorMod2}
                                    onChange={e => handleInputChange('instructorMod2', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {instructorsList.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Passagem (Mod 2)</label>
                                <div className="relative">
                                    <Plane size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.ticketMod2} onChange={e => handleInputChange('ticketMod2', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Coffe Módulo 2</label>
                                <div className="relative">
                                    <Coffee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.coffeeMod2} onChange={e => handleInputChange('coffeeMod2', e.target.value)} />
                                </div>
                            </div>

                             {/* Hotel Row */}
                             <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Hotel Módulo 2</label>
                                <div className="relative">
                                    <Bed size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hotelMod2} onChange={e => handleInputChange('hotelMod2', e.target.value)} />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">LOCALIZAÇÃO HOTEL MÓDULO 2</label>
                                <div className="relative">
                                    <Map size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hotelLocMod2} onChange={e => handleInputChange('hotelLocMod2', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">AJUDA DE CUSTO 2</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.costHelp2} onChange={e => handleInputChange('costHelp2', e.target.value)} />
                            </div>
                        </div>
                    </div>

                     {/* SEÇÃO 4: FINANCEIRO & CHECKLISTS */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Financeiro */}
                        <div>
                             <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <DollarSign size={16} /> Financeiro & Admin
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">ALUGUEL DO STUDIO</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        placeholder="0.00"
                                        value={formData.studioRent || ''}
                                        onChange={e => handleInputChange('studioRent', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">CONTA AZUL E RD</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.contaAzulRD} onChange={e => handleInputChange('contaAzulRD', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Checklists */}
                        <div>
                            <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <CheckSquare size={16} /> Checklist de Prontidão
                            </h4>
                            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                    <span className="text-sm font-medium text-slate-700">Tudo pronto para o Curso?</span>
                                    <input type="checkbox" className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500" checked={formData.isReady} onChange={e => handleInputChange('isReady', e.target.checked)} />
                                </label>
                                <div className="h-px bg-slate-200"></div>
                                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                    <span className="text-sm font-medium text-slate-700">Cadastrado no site</span>
                                    <input type="checkbox" className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500" checked={formData.onSite} onChange={e => handleInputChange('onSite', e.target.checked)} />
                                </label>
                                <div className="h-px bg-slate-200"></div>
                                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                    <span className="text-sm font-medium text-slate-700">Cadastrado no CRM</span>
                                    <input type="checkbox" className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500" checked={formData.onCRM} onChange={e => handleInputChange('onCRM', e.target.checked)} />
                                </label>
                            </div>
                        </div>
                     </div>

                    {/* SEÇÃO 5: OBSERVAÇÕES & ANEXOS */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-32 resize-none"
                                value={formData.observations}
                                onChange={e => handleInputChange('observations', e.target.value)}
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Anexos</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg h-32 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                <Paperclip size={24} className="mb-2" />
                                <span className="text-sm">Arraste arquivos ou clique aqui</span>
                                <input type="file" className="hidden" multiple />
                            </div>
                        </div>
                     </div>

                </div>
                
                {/* Footer */}
                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-100">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                        {formData.id ? 'Salvar Alterações' : 'Criar Turma'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
