import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid
} from 'lucide-react';
import clsx from 'clsx';
import { MOCK_COLLABORATORS, Collaborator } from './CollaboratorsManager';

// --- Types ---
type DealStage = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'closed';

interface Deal {
  id: string;
  title: string;
  contactName: string;
  companyName: string;
  value: number;
  stage: DealStage;
  owner: string;
  createdAt: Date;
  status: 'hot' | 'warm' | 'cold';
  nextTask?: string;
}

interface Column {
  id: DealStage;
  title: string;
  color: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: string[]; // IDs of collaborators
}

// --- Mock Data ---
const COLUMNS: Column[] = [
  { id: 'new', title: 'Sem Contato', color: 'border-slate-300' },
  { id: 'contacted', title: 'Contatado', color: 'border-blue-400' },
  { id: 'proposal', title: 'Proposta Enviada', color: 'border-yellow-400' },
  { id: 'negotiation', title: 'Em Negociação', color: 'border-orange-500' },
  { id: 'closed', title: 'Fechamento', color: 'border-green-500' },
];

const INITIAL_DEALS: Deal[] = [
  { id: '1', title: 'Licença Enterprise', contactName: 'Roberto Silva', companyName: 'TechCorp S.A.', value: 12500, stage: 'new', owner: 'Ana', createdAt: new Date(), status: 'warm', nextTask: 'Ligar amanhã' },
  { id: '2', title: 'Consultoria Mensal', contactName: 'Mariana Costa', companyName: 'Varejo Bom', value: 3200, stage: 'new', owner: 'Carlos', createdAt: new Date(), status: 'cold' },
  { id: '3', title: 'Implantação CRM', contactName: 'João Souza', companyName: 'Logística Rapida', value: 8900, stage: 'contacted', owner: 'Ana', createdAt: new Date(), status: 'hot', nextTask: 'Enviar Apresentação' },
  { id: '4', title: 'Plano Anual', contactName: 'Fernanda Lima', companyName: 'StartUp Hub', value: 24000, stage: 'proposal', owner: 'Carlos', createdAt: new Date(), status: 'hot' },
  { id: '5', title: 'Expansão de Cloud', contactName: 'Pedro Santos', companyName: 'Mega Data', value: 45000, stage: 'negotiation', owner: 'Ana', createdAt: new Date(), status: 'warm' },
];

const INITIAL_TEAMS: Team[] = [
    { id: 't1', name: 'Equipe Alpha', description: 'Focada em grandes contas (Enterprise).', members: ['4', '6'] }, // Carlos & Roberto
];

export const CrmBoard: React.FC = () => {
  // Views
  const [activeView, setActiveView] = useState<'pipeline' | 'teams'>('pipeline');

  // Kanban State
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drag and Drop State
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

  // Teams State
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ name: '', description: '', members: [] as string[] });

  // --- Helpers & Logic ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const moveDeal = (dealId: string, currentStage: DealStage, direction: 'next' | 'prev') => {
    const stageOrder: DealStage[] = ['new', 'contacted', 'proposal', 'negotiation', 'closed'];
    const currentIndex = stageOrder.indexOf(currentStage);
    
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= stageOrder.length) return;

    const newStage = stageOrder[newIndex];

    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
  };

  const getStageSummary = (stage: DealStage) => {
    const stageDeals = deals.filter(d => d.stage === stage);
    const total = stageDeals.reduce((acc, curr) => acc + curr.value, 0);
    return { count: stageDeals.length, total };
  };

  const filteredDeals = deals.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    // Permite o movimento visual
    e.dataTransfer.effectAllowed = "move";
    // Opcional: Definir dados se precisarmos de interoperabilidade com outros apps, mas para interno o state basta
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Isso é crucial: prevenir o padrão permite que o elemento seja soltável (drop target)
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    
    if (!draggedDealId) return;

    setDeals(prev => prev.map(d => 
      d.id === draggedDealId ? { ...d, stage: targetStage } : d
    ));
    
    setDraggedDealId(null);
  };

  // --- Team Logic ---
  const commercialCollaborators = MOCK_COLLABORATORS.filter(c => c.department === 'Comercial');

  const handleCreateTeam = () => {
      if (!newTeamData.name) return;
      const team: Team = {
          id: Math.random().toString(36).substr(2, 9),
          name: newTeamData.name,
          description: newTeamData.description,
          members: newTeamData.members
      };
      setTeams([...teams, team]);
      setShowTeamModal(false);
      setNewTeamData({ name: '', description: '', members: [] });
  };

  const toggleTeamMember = (collabId: string) => {
      setNewTeamData(prev => {
          const exists = prev.members.includes(collabId);
          if (exists) return { ...prev, members: prev.members.filter(id => id !== collabId) };
          return { ...prev, members: [...prev.members, collabId] };
      });
  };

  const getMemberDetails = (ids: string[]) => {
      return MOCK_COLLABORATORS.filter(c => ids.includes(c.id));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      
      {/* --- Toolbar --- */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 self-start md:self-auto">
            <button 
                onClick={() => setActiveView('pipeline')}
                className={clsx(
                    "px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all",
                    activeView === 'pipeline' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
            >
                <LayoutGrid size={16} /> Pipeline
            </button>
            <button 
                onClick={() => setActiveView('teams')}
                className={clsx(
                    "px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all",
                    activeView === 'teams' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
            >
                <Users size={16} /> Equipes
            </button>
        </div>

        {/* Global Controls */}
        {activeView === 'pipeline' && (
            <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="relative max-w-xs w-full hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar oportunidade..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-300 border rounded-full text-sm transition-all outline-none"
                    />
                </div>
                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                <button 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
                    onClick={() => alert("Funcionalidade de Novo Negócio será implementada na próxima versão.")}
                >
                    <Plus size={18} /> Novo Negócio
                </button>
            </div>
        )}

        {activeView === 'teams' && (
             <button 
                onClick={() => setShowTeamModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all ml-auto"
             >
                <Plus size={18} /> Criar Equipe
            </button>
        )}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-x-auto bg-slate-100/50 p-6 relative">
        
        {/* VIEW: PIPELINE */}
        {activeView === 'pipeline' && (
            <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(column => {
                const summary = getStageSummary(column.id);
                const columnDeals = filteredDeals.filter(d => d.stage === column.id);

                return (
                <div 
                  key={column.id} 
                  className="w-[320px] flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-100/50"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                    
                    {/* Column Header */}
                    <div className={clsx("p-3 border-t-4 bg-white rounded-t-xl border-b border-b-slate-100", column.color)}>
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-slate-700">{column.title}</h3>
                        <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500 font-medium">{summary.count} negócios</span>
                        <span className="text-xs font-bold text-slate-800">{formatCurrency(summary.total)}</span>
                    </div>
                    </div>

                    {/* Cards Container */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                    {columnDeals.length === 0 ? (
                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                            Arraste aqui
                        </div>
                    ) : (
                        columnDeals.map(deal => (
                        <div 
                            key={deal.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, deal.id)}
                            className={clsx(
                              "group bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all relative cursor-grab active:cursor-grabbing",
                              draggedDealId === deal.id ? "opacity-40 ring-2 ring-indigo-400 border-indigo-400" : ""
                            )}
                        >
                            
                            {/* Card Status Stripe */}
                            <div className={clsx("absolute left-0 top-3 bottom-3 w-1 rounded-r", 
                                deal.status === 'hot' ? 'bg-red-400' : 
                                deal.status === 'warm' ? 'bg-yellow-400' : 'bg-blue-300'
                            )}></div>

                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">{deal.title}</h4>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                        {column.id !== 'new' && (
                                            <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, 'prev')}} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={14} className="rotate-180"/></button>
                                        )}
                                        {column.id !== 'closed' && (
                                            <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, 'next')}} className="p-1 hover:bg-green-50 rounded text-green-600"><ChevronRight size={14} /></button>
                                        )}
                                    </div>
                                </div>
                                
                                <p className="text-xs text-slate-500 mb-2 truncate">{deal.companyName}</p>
                                
                                {/* Next Task Alert */}
                                {deal.nextTask && deal.stage !== 'closed' && (
                                    <div className="flex items-center gap-1.5 mb-2.5 bg-amber-50 px-2 py-1 rounded text-[10px] text-amber-700 font-medium w-fit">
                                        <AlertCircle size={10} /> {deal.nextTask}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <span className="font-bold text-slate-700 text-sm">{formatCurrency(deal.value)}</span>
                                    
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-white shadow-sm"
                                            title={`Responsável: ${deal.owner}`}
                                        >
                                            {deal.owner.substring(0,2).toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ))
                    )}
                    </div>
                </div>
                );
            })}
            </div>
        )}

        {/* VIEW: TEAMS */}
        {activeView === 'teams' && (
            <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map(team => (
                        <div key={team.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <Target size={24} />
                                </div>
                                <button className="text-slate-400 hover:text-slate-600">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{team.name}</h3>
                            <p className="text-sm text-slate-500 mb-6 min-h-[40px]">{team.description}</p>
                            
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Membros da Equipe</p>
                                <div className="flex items-center -space-x-2 overflow-hidden">
                                    {getMemberDetails(team.members).map((member, i) => (
                                        <div 
                                            key={member.id} 
                                            title={`${member.name} (${member.department})`}
                                            className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold"
                                        >
                                            {member.name.charAt(0)}
                                        </div>
                                    ))}
                                    {team.members.length === 0 && (
                                        <span className="text-xs text-slate-400 italic">Nenhum membro atribuído</span>
                                    )}
                                </div>
                                {team.members.length > 0 && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        {team.members.length} colaboradores do setor Comercial.
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}

                     {/* Create New Team Card */}
                    <button 
                        onClick={() => setShowTeamModal(true)}
                        className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all min-h-[250px]"
                    >
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <Plus size={28} />
                        </div>
                        <span className="font-bold text-lg">Criar Nova Equipe</span>
                        <span className="text-sm font-normal mt-1">Defina metas e membros</span>
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* --- CREATE TEAM MODAL --- */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Nova Equipe de Vendas</h3>
                    <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Equipe</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ex: Time Hunter"
                            value={newTeamData.name}
                            onChange={e => setNewTeamData({...newTeamData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Objetivos e foco da equipe..."
                            rows={2}
                            value={newTeamData.description}
                            onChange={e => setNewTeamData({...newTeamData, description: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Selecionar Membros (Setor Comercial)
                        </label>
                        <div className="border border-slate-200 rounded-lg max-h-[200px] overflow-y-auto divide-y divide-slate-100">
                            {commercialCollaborators.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-400">
                                    Nenhum colaborador encontrado no setor 'Comercial'.
                                    <br/>
                                    <span className="text-xs">Cadastre novos colaboradores na aba Visão Geral.</span>
                                </div>
                            ) : (
                                commercialCollaborators.map(collab => {
                                    const isSelected = newTeamData.members.includes(collab.id);
                                    return (
                                        <div 
                                            key={collab.id} 
                                            onClick={() => toggleTeamMember(collab.id)}
                                            className={clsx(
                                                "p-3 flex items-center justify-between cursor-pointer transition-colors",
                                                isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {collab.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className={clsx("text-sm font-medium", isSelected ? "text-indigo-900" : "text-slate-700")}>{collab.name}</p>
                                                    <p className="text-xs text-slate-400">{collab.email}</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "w-5 h-5 rounded border flex items-center justify-center",
                                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                                            )}>
                                                {isSelected && <CheckCircle2 size={14} />}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Apenas colaboradores do departamento <b>Comercial</b> são listados aqui.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setShowTeamModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleCreateTeam} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">
                        Criar Equipe
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};