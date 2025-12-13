import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, Plus, Search, Calendar, Clock, MapPin, 
  ArrowLeft, Save, X, MoreHorizontal, BookOpen, CheckSquare, 
  Coffee, DollarSign, FileText, Paperclip, Bed, Plane, Map,
  Edit2, Trash2, Hash
} from 'lucide-react';
import clsx from 'clsx';

// --- Types ---
interface ClassItem {
  id: string;
  // General
  status: string;
  cityState: string;
  classCode: string; // Agora representa "Número da Turma"
  extraClass: string;
  course: string;
  createdAt: string;

  // Module 1
  dateMod1: string;
  mod1Code?: string; // Novo Campo Automático
  material: string;
  studioMod1: string;
  instructorMod1: string;
  ticketMod1: string;
  infrastructure: string; // Projector, TV, Chairs
  coffeeMod1: string;
  hotelMod1: string;
  hotelLocMod1: string;
  costHelp1: string;

  // Module 2
  dateMod2: string;
  mod2Code?: string; // Novo Campo Automático
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
  attachments: string[]; // Mocked list of filenames
}

// --- Mock Data ---
const INITIAL_CLASSES: ClassItem[] = [
  { 
    id: '1', 
    status: 'Confirmado', 
    cityState: 'São Paulo - SP', 
    classCode: '105', 
    extraClass: 'Não', 
    course: 'Formação Completa em Pilates', 
    createdAt: '2024-01-15',
    dateMod1: '2025-03-10',
    mod1Code: 'São Paulo - SP-105-Não-Formação Completa em Pilates-2025-03-10',
    material: 'Apostilas V1',
    studioMod1: 'Studio Central',
    instructorMod1: 'Dra. Ana',
    ticketMod1: 'Ok',
    infrastructure: 'Ok',
    coffeeMod1: 'Buffet A',
    hotelMod1: 'Ibis Paulista',
    hotelLocMod1: 'Av Paulista',
    costHelp1: 'R$ 500,00',
    dateMod2: '2025-04-10',
    mod2Code: 'São Paulo - SP-105-Não-Formação Completa em Pilates-2025-04-10',
    instructorMod2: 'Dr. Carlos',
    ticketMod2: 'Pendente',
    coffeeMod2: 'Buffet A',
    hotelMod2: 'Ibis Paulista',
    hotelLocMod2: 'Av Paulista',
    costHelp2: 'R$ 500,00',
    studioRent: 1500.00,
    contaAzulRD: 'Faturado',
    isReady: true,
    onSite: true,
    onCRM: true,
    observations: 'Turma lotada.',
    attachments: ['contrato_locacao.pdf']
  }
];

// --- Dropdown Options Mock ---
const CITIES = ['São Paulo - SP', 'Rio de Janeiro - RJ', 'Belo Horizonte - MG', 'Porto Alegre - RS', 'Campinas - SP', 'Curitiba - PR'];
const COURSES = ['Formação Completa em Pilates', 'Pilates Clínico', 'Pilates Suspenso', 'Gestão de Studios', 'MIT Movimento Inteligente'];
const INSTRUCTORS = ['Dra. Ana Silva', 'Dr. Carlos Souza', 'Ft. Mariana Lima', 'Ft. Roberto Junior', 'Equipe VOLL'];
const STUDIOS = ['Studio Central', 'Espaço Vida', 'Pilates Zone', 'Clinica Integrada', 'Box Cross Pilates'];

interface ClassesManagerProps {
  onBack: () => void;
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({ onBack }) => {
  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
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
      cityState: '',
      classCode: '', // Número da Turma
      extraClass: '',
      course: '',
      createdAt: new Date().toISOString().split('T')[0], // Today formatted YYYY-MM-DD
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

  // Auto-generate Module Codes
  useEffect(() => {
      const generateCode = (dateStr: string) => {
          if (!dateStr) return '';
          // Format: cidade-Estado-número da turma-turma extra-Curso-data
          const parts = [
              formData.cityState,
              formData.classCode,
              formData.extraClass,
              formData.course,
              dateStr
          ];
          // Filter empty parts and join with hyphen
          return parts.filter(Boolean).join('-');
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
  }, [formData.cityState, formData.classCode, formData.extraClass, formData.course, formData.dateMod1, formData.dateMod2]);


  const handleOpenNew = () => {
      setFormData(initialFormState);
      setShowModal(true);
  };

  const handleEdit = (item: ClassItem) => {
      setFormData({ ...item });
      setActiveMenuId(null);
      setShowModal(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta turma?")) {
          setClasses(prev => prev.filter(c => c.id !== id));
      }
      setActiveMenuId(null);
  };

  const handleSave = () => {
    if (!formData.course || !formData.cityState) {
        alert("Preencha ao menos o Curso e a Cidade.");
        return;
    }

    if (formData.id) {
        // UPDATE Existing
        setClasses(prev => prev.map(c => c.id === formData.id ? formData : c));
    } else {
        // CREATE New
        const newItem: ClassItem = {
            ...formData,
            id: crypto.randomUUID(),
        };
        setClasses([...classes, newItem]);
    }
    
    setShowModal(false);
    setFormData(initialFormState);
  };

  const handleInputChange = (field: keyof ClassItem, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="text-purple-600" /> Gestão de Turmas
                </h2>
                <p className="text-slate-500 text-sm">Planejamento logístico e financeiro de cursos.</p>
            </div>
        </div>
        <button 
            onClick={handleOpenNew}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Nova Turma
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 group relative">
                
                {/* Menu Dropdown Trigger */}
                <div className="absolute top-5 right-5">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === cls.id ? null : cls.id);
                        }}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded p-1 class-menu-btn"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {activeMenuId === cls.id && (
                        <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                            <button 
                                onClick={() => handleEdit(cls)}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Edit2 size={14} /> Editar
                            </button>
                            <div className="h-px bg-slate-100 my-0"></div>
                            <button 
                                onClick={() => handleDelete(cls.id)}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Excluir
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <BookOpen size={24} />
                    </div>
                    <div className="pr-6">
                        <h3 className="font-bold text-slate-800 leading-tight">{cls.course}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                             <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase", 
                                 cls.status === 'Confirmado' ? 'bg-green-100 text-green-700' : 
                                 cls.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                             )}>
                                {cls.status}
                             </span>
                             <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                T: {cls.classCode}
                             </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-slate-400" /> <span className="font-medium">{cls.cityState}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" /> Mod 1: {cls.dateMod1 ? new Date(cls.dateMod1).toLocaleDateString('pt-BR') : '--/--'}
                    </div>
                    {cls.dateMod2 && (
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-slate-400" /> Mod 2: {new Date(cls.dateMod2).toLocaleDateString('pt-BR')}
                        </div>
                    )}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex gap-2">
                        {cls.isReady && <span title="Pronto" className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckSquare size={12}/> Pronto</span>}
                        {cls.onSite && <span title="No Site" className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1"><FileText size={12}/> Site</span>}
                    </div>
                    <span>Criado: {new Date(cls.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        ))}
        
        {/* Empty State / Add New Card */}
        <button 
            onClick={handleOpenNew}
            className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all min-h-[200px]"
        >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <Plus size={24} />
            </div>
            <span className="font-medium">Cadastrar nova turma</span>
        </button>
      </div>

      {/* Modal Full Screen / Large */}
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
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CIDADE / ESTADO</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.cityState}
                                    onChange={e => handleInputChange('cityState', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                            <Calendar size={16} /> Módulo 1 (Logística)
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
                                    {INSTRUCTORS.map(i => <option key={i} value={i}>{i}</option>)}
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
                            <Calendar size={16} /> Módulo 2 (Logística)
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
                                    {INSTRUCTORS.map(i => <option key={i} value={i}>{i}</option>)}
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
                    <button onClick={handleSave} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                        <Save size={18} /> {formData.id ? 'Salvar Alterações' : 'Criar Turma'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};