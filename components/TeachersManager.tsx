import React, { useState } from 'react';
import { 
  School, Plus, Search, MoreVertical, Phone, Mail, 
  ArrowLeft, Save, X, Book, User, MapPin, DollarSign, 
  Briefcase, Truck, Calendar, FileText, CheckSquare, Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';

// --- Types ---
interface Teacher {
  id: string;
  // Pessoal
  fullName: string;
  email: string;
  phone: string;
  rg: string;
  cpf: string;
  birthDate: string;
  maritalStatus: string;
  motherName: string;
  photoUrl: string;
  
  // Endereço
  address: string;
  district: string; // Bairro
  city: string;
  state: string;
  cep: string;
  
  // Emergência
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Profissional
  profession: string;
  councilNumber: string; // Registro Conselho
  isCouncilActive: boolean;
  cnpj: string;
  companyName: string; // Razão Social
  hasCnpjActive: boolean;
  academicFormation: string;
  otherFormation: string;
  courseType: string;
  teacherLevel: string; // Nível do Instrutor
  isActive: boolean; // Instrutor está ativo?

  // Bancário
  bank: string;
  agency: string;
  account: string;
  digit: string;
  hasPjAccount: boolean;
  pixKeyPj: string;
  pixKeyPf: string;

  // Logística / Perfil
  regionAvailability: string;
  weekAvailability: string; // SIM/NAO
  shirtSize: string;
  hasNotebook: boolean;
  hasVehicle: boolean;
  hasStudio: boolean;
  studioAddress: string;

  // Adicionais / Contratual
  additional1: string;
  valueAdditional1: string;
  dateAdditional1: string;
  additional2: string;
  valueAdditional2: string;
  dateAdditional2: string;
  additional3: string;
  valueAdditional3: string;
  dateAdditional3: string;
}

// --- Mock Initial Data ---
const INITIAL_TEACHERS: Teacher[] = [
  { 
    id: '1', 
    fullName: 'Dr. Alberto Einstein', 
    email: 'alberto@science.com', 
    phone: '(11) 99999-0001',
    isActive: true,
    city: 'São Paulo',
    state: 'SP',
    teacherLevel: 'Master',
    // Preenchendo campos obrigatórios com mock para não quebrar a UI
    rg: '123456', cpf: '123.456.789-00', birthDate: '1980-01-01', maritalStatus: 'Casado', motherName: 'Maria', photoUrl: '',
    address: 'Rua da Ciência, 10', district: 'Centro', cep: '01000-000',
    emergencyContactName: 'Elsa', emergencyContactPhone: '(11) 8888-8888',
    profession: 'Físico', councilNumber: '1234', isCouncilActive: true, cnpj: '', companyName: '', hasCnpjActive: false,
    academicFormation: 'Doutorado', otherFormation: '', courseType: 'Física',
    bank: '', agency: '', account: '', digit: '', hasPjAccount: false, pixKeyPj: '', pixKeyPf: '',
    regionAvailability: 'Brasil', weekAvailability: 'Sim', shirtSize: 'G', hasNotebook: true, hasVehicle: false, hasStudio: false, studioAddress: '',
    additional1: '', valueAdditional1: '', dateAdditional1: '',
    additional2: '', valueAdditional2: '', dateAdditional2: '',
    additional3: '', valueAdditional3: '', dateAdditional3: ''
  }
];

interface TeachersManagerProps {
  onBack: () => void;
}

export const TeachersManager: React.FC<TeachersManagerProps> = ({ onBack }) => {
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial Form State
  const initialFormState: Teacher = {
      id: '',
      fullName: '', email: '', phone: '', rg: '', cpf: '', birthDate: '', maritalStatus: '', motherName: '', photoUrl: '',
      address: '', district: '', city: '', state: '', cep: '',
      emergencyContactName: '', emergencyContactPhone: '',
      profession: '', councilNumber: '', isCouncilActive: true, cnpj: '', companyName: '', hasCnpjActive: true,
      academicFormation: '', otherFormation: '', courseType: '', teacherLevel: '', isActive: true,
      bank: '', agency: '', account: '', digit: '', hasPjAccount: true, pixKeyPj: '', pixKeyPf: '',
      regionAvailability: '', weekAvailability: '', shirtSize: '', hasNotebook: true, hasVehicle: true, hasStudio: false, studioAddress: '',
      additional1: '', valueAdditional1: '', dateAdditional1: '',
      additional2: '', valueAdditional2: '', dateAdditional2: '',
      additional3: '', valueAdditional3: '', dateAdditional3: ''
  };

  const [formData, setFormData] = useState<Teacher>(initialFormState);

  const handleInputChange = (field: keyof Teacher, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.fullName) {
        alert("Nome completo é obrigatório");
        return;
    }
    const newTeacher: Teacher = {
      ...formData,
      id: Math.random().toString(),
    };
    setTeachers([...teachers, newTeacher]);
    setShowModal(false);
    setFormData(initialFormState);
  };

  const filtered = teachers.filter(t => t.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

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
                    <School className="text-orange-600" /> Cadastro de Instrutores
                </h2>
                <p className="text-slate-500 text-sm">Gestão completa do corpo docente.</p>
            </div>
        </div>
        <button 
            onClick={() => { setFormData(initialFormState); setShowModal(true); }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Novo Instrutor
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar instrutor por nome..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
         </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-orange-200 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg overflow-hidden">
                        {t.photoUrl ? <img src={t.photoUrl} alt="" className="w-full h-full object-cover" /> : t.fullName.substring(0,1)}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">{t.fullName}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Book size={14} /> {t.teacherLevel || 'Nível não inf.'} • {t.academicFormation}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Mail size={16} className="text-slate-400" /> {t.email}
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone size={16} className="text-slate-400" /> {t.phone}
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-slate-400" /> {t.city}/{t.state}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={clsx("px-2 py-1 rounded-full text-xs font-bold", t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {t.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    <button className="p-2 hover:bg-slate-100 rounded text-slate-400">
                        <MoreVertical size={18} />
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* Modal Full Screen */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Ficha do Instrutor</h3>
                        <p className="text-sm text-slate-500">Preencha todos os campos obrigatórios.</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                </div>
                
                {/* Modal Body - Scrollable */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    
                    {/* SEÇÃO 1: DADOS PESSOAIS */}
                    <div>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <User size={16} /> Dados Pessoais
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.fullName} onChange={e => handleInputChange('fullName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Nascimento</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.birthDate} onChange={e => handleInputChange('birthDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado Civil</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.maritalStatus} onChange={e => handleInputChange('maritalStatus', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CPF</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">RG</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.rg} onChange={e => handleInputChange('rg', e.target.value)} />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da Mãe</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.motherName} onChange={e => handleInputChange('motherName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Foto (Divulgação)</label>
                                <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 cursor-pointer hover:bg-slate-100">
                                    <ImageIcon size={16} className="text-slate-400"/>
                                    <span className="text-xs text-slate-500">Adicionar imagem...</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 2: CONTATO & ENDEREÇO */}
                    <div>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <MapPin size={16} /> Contato e Endereço
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
                                <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Principal</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço (Rua, Nº, Compl)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Bairro</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.district} onChange={e => handleInputChange('district', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CEP</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cep} onChange={e => handleInputChange('cep', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.state} onChange={e => handleInputChange('state', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Contato de Emergência</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.emergencyContactName} onChange={e => handleInputChange('emergencyContactName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Emergência</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.emergencyContactPhone} onChange={e => handleInputChange('emergencyContactPhone', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 3: PROFISSIONAL */}
                    <div>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Briefcase size={16} /> Dados Profissionais
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Profissão</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.profession} onChange={e => handleInputChange('profession', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nº Registro Conselho</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.councilNumber} onChange={e => handleInputChange('councilNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Formação Acadêmica</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.academicFormation} onChange={e => handleInputChange('academicFormation', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Outra Formação</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.otherFormation} onChange={e => handleInputChange('otherFormation', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cnpj} onChange={e => handleInputChange('cnpj', e.target.value)} />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nível do Instrutor</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.teacherLevel} onChange={e => handleInputChange('teacherLevel', e.target.value)}>
                                    <option value="">Selecionar...</option>
                                    <option value="Júnior">Júnior</option>
                                    <option value="Pleno">Pleno</option>
                                    <option value="Sênior">Sênior</option>
                                    <option value="Master">Master</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Curso</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.courseType} onChange={e => handleInputChange('courseType', e.target.value)} />
                            </div>
                            
                            {/* Checkboxes Group */}
                            <div className="lg:col-span-3 flex gap-6 pt-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-orange-600" checked={formData.isCouncilActive} onChange={e => handleInputChange('isCouncilActive', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Registro conselho ativo?</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-orange-600" checked={formData.hasCnpjActive} onChange={e => handleInputChange('hasCnpjActive', e.target.checked)} />
                                    <span className="text-sm text-slate-700">CNPJ Ativo?</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-orange-600" checked={formData.isActive} onChange={e => handleInputChange('isActive', e.target.checked)} />
                                    <span className="text-sm text-slate-700 font-bold">Instrutor Ativo no Sistema?</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 4: DADOS BANCÁRIOS */}
                    <div>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <DollarSign size={16} /> Dados Bancários
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Chave PIX (Conta PJ - Honorários)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50" value={formData.pixKeyPj} onChange={e => handleInputChange('pixKeyPj', e.target.value)} />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Chave PIX (Conta PF - Reembolso)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.pixKeyPf} onChange={e => handleInputChange('pixKeyPf', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Banco</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.bank} onChange={e => handleInputChange('bank', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Agência</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.agency} onChange={e => handleInputChange('agency', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Conta</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.account} onChange={e => handleInputChange('account', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Dígito</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.digit} onChange={e => handleInputChange('digit', e.target.value)} />
                            </div>
                            <div className="lg:col-span-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-orange-600" checked={formData.hasPjAccount} onChange={e => handleInputChange('hasPjAccount', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Possui conta bancária jurídica?</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 5: LOGÍSTICA & PERFIL */}
                    <div>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Truck size={16} /> Logística e Perfil
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Região de disponibilidade</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.regionAvailability} onChange={e => handleInputChange('regionAvailability', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tamanho Camiseta</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.shirtSize} onChange={e => handleInputChange('shirtSize', e.target.value)}>
                                    <option value="">...</option>
                                    <option value="PP">PP</option>
                                    <option value="P">P</option>
                                    <option value="M">M</option>
                                    <option value="G">G</option>
                                    <option value="GG">GG</option>
                                    <option value="XG">XG</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Disponibilidade Semana?</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.weekAvailability} onChange={e => handleInputChange('weekAvailability', e.target.value)}>
                                    <option value="">Selecionar...</option>
                                    <option value="Sim">Sim</option>
                                    <option value="Não">Não</option>
                                </select>
                            </div>
                            
                            <div className="lg:col-span-4 flex flex-wrap gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-orange-600" checked={formData.hasNotebook} onChange={e => handleInputChange('hasNotebook', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Possui Notebook?</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-orange-600" checked={formData.hasVehicle} onChange={e => handleInputChange('hasVehicle', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Veículo Próprio?</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-orange-600" checked={formData.hasStudio} onChange={e => handleInputChange('hasStudio', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Possui Estúdio Próprio?</span>
                                </label>
                            </div>
                            
                            {formData.hasStudio && (
                                <div className="lg:col-span-4 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço do Estúdio</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Endereço completo do estúdio" value={formData.studioAddress} onChange={e => handleInputChange('studioAddress', e.target.value)} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SEÇÃO 6: ADICIONAIS */}
                    <div>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <FileText size={16} /> Contratual / Adicionais
                        </h4>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">ADICIONAL 1 (Descrição)</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.additional1} onChange={e => handleInputChange('additional1', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">VALOR</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.valueAdditional1} onChange={e => handleInputChange('valueAdditional1', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">DATA FINAL</label>
                                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.dateAdditional1} onChange={e => handleInputChange('dateAdditional1', e.target.value)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">ADICIONAL 2</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.additional2} onChange={e => handleInputChange('additional2', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">VALOR</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.valueAdditional2} onChange={e => handleInputChange('valueAdditional2', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">DATA FINAL</label>
                                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.dateAdditional2} onChange={e => handleInputChange('dateAdditional2', e.target.value)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">ADICIONAL 3</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.additional3} onChange={e => handleInputChange('additional3', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">VALOR</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.valueAdditional3} onChange={e => handleInputChange('valueAdditional3', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">DATA FINAL</label>
                                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.dateAdditional3} onChange={e => handleInputChange('dateAdditional3', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Anexos */}
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Anexos / Documentos</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl h-24 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                            <CheckSquare size={24} className="mb-2" />
                            <span className="text-sm">Arraste contratos ou documentos aqui</span>
                            <input type="file" className="hidden" multiple />
                        </div>
                    </div>

                </div>
                
                {/* Modal Footer */}
                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-100">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                        <Save size={18} /> Salvar Cadastro
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};