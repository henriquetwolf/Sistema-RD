import React, { useState, useEffect } from 'react';
import { Contract, ContractSigner, ContractFolder } from '../types';
import { appBackend } from '../services/appBackend';
import { 
  FileSignature, Plus, Search, Eye, Trash2, Copy, CheckCircle, 
  ArrowLeft, Save, X, PenTool, ExternalLink, RefreshCw, UserPlus, 
  Users, MapPin, Calendar, Folder, FolderPlus, ChevronRight, LayoutGrid, List, Filter, MoveRight, Loader2, AlertTriangle, Send
} from 'lucide-react';
import clsx from 'clsx';

interface ContractsManagerProps {
  onBack: () => void;
}

const INITIAL_CONTRACT_FORM = {
    title: '',
    city: '',
    contractDate: new Date().toISOString().split('T')[0],
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

ENTRE:

CONTRATANTE: [Nome da Empresa], com sede em [Endereço].
CONTRATADO: [Nome do Contratado].

CLÁUSULA 1 - DO OBJETO
O presente contrato tem como objeto a prestação de serviços de...

CLÁUSULA 2 - DO PRAZO
O contrato terá vigência de...

CLÁUSULA 3 - DO PAGAMENTO
Pela prestação dos serviços, o CONTRATANTE pagará ao CONTRATADO...`
};

export const ContractsManager: React.FC<ContractsManagerProps> = ({ onBack }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [folders, setFolders] = useState<ContractFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Navigation State
  const [view, setView] = useState<'list' | 'create' | 'preview'>('list');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState(INITIAL_CONTRACT_FORM);
  const [targetFolderId, setTargetFolderId] = useState<string>(''); // For creation
  const [signersList, setSignersList] = useState<{name: string, email: string}[]>([{name: '', email: ''}]);
  
  // Selection State
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{title: string, id: string} | null>(null);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'signed'>('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // UI State
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState<Contract | null>(null); // Contract to be moved
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
        const [c, f] = await Promise.all([
            appBackend.getContracts(),
            appBackend.getFolders()
        ]);
        setContracts(c || []);
        setFolders(f || []);
    } catch (e: any) {
        console.error("Erro ao carregar dados de contratos:", e);
        setFetchError("Falha na conexão com o banco de dados. Verifique a estrutura da tabela crm_contracts.");
    } finally {
        setIsLoading(false);
    }
  };

  // --- FOLDER LOGIC ---

  const handleCreateFolder = async () => {
      if (!newFolderName.trim()) return;
      
      const newFolder: ContractFolder = {
          id: crypto.randomUUID(),
          name: newFolderName,
          createdAt: new Date().toISOString()
      };

      try {
          await appBackend.saveFolder(newFolder);
          await loadData();
          setShowFolderModal(false);
          setNewFolderName('');
      } catch (e) {
          alert("Erro ao criar pasta.");
      }
  };

  const handleDeleteFolder = async (id: string) => {
      if(window.confirm('Excluir esta pasta? Os contratos dentro dela serão movidos para "Todos os Contratos".')) {
          try {
              await appBackend.deleteFolder(id);
              if (currentFolderId === id) setCurrentFolderId(null);
              await loadData();
          } catch (e) {
              alert("Erro ao excluir pasta.");
          }
      }
  };

  const handleMoveContract = async (contract: Contract, folderId: string | null) => {
      try {
          const updated = { ...contract, folderId: folderId || null };
          await appBackend.saveContract(updated);
          await loadData();
          setShowMoveModal(null);
      } catch (e) {
          alert("Erro ao mover contrato.");
      }
  };

  // --- CONTRACT LOGIC ---

  const handleCreate = async () => {
      if (!formData.title || signersList.length === 0 || !signersList[0].name) {
          alert("Preencha o título e pelo menos um signatário.");
          return;
      }

      setIsSaving(true);
      try {
          const formattedSigners: ContractSigner[] = signersList.map(s => ({
              id: crypto.randomUUID(),
              name: s.name,
              email: s.email,
              status: 'pending'
          }));

          const contractId = crypto.randomUUID();
          const newContract: Contract = {
              id: contractId,
              createdAt: new Date().toISOString(),
              status: 'sent',
              title: formData.title,
              content: formData.content,
              city: formData.city || 'Cidade',
              contractDate: formData.contractDate,
              signers: formattedSigners,
              folderId: targetFolderId || currentFolderId // Use selected in form or current folder
          };

          await appBackend.saveContract(newContract);
          
          // Simulação de envio de e-mail para todos os signatários
          for (const signer of formattedSigners) {
              if (signer.email) {
                  await appBackend.sendContractEmailSimulation(signer.email, signer.name, newContract.title);
              }
          }

          await loadData();
          setSuccessInfo({ title: newContract.title, id: contractId });
          setView('list');
          setFormData(INITIAL_CONTRACT_FORM);
          setSignersList([{name: '', email: ''}]);
          setTargetFolderId('');
      } catch (e: any) {
          console.error(e);
          alert("Erro ao salvar contrato: " + (e.message || "Tente rodar o script de reparo em Configurações."));
      } finally {
          setIsSaving(false);
      }
  };

  // --- FILTERING ---
  
  const filteredContracts = contracts.filter(c => {
      // Correção: Se estamos em "Todos os Contratos" (null), mostra tudo.
      // Se estamos em uma pasta específica, filtra.
      if (currentFolderId !== null && c.folderId !== currentFolderId) return false;

      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.signers.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      if (statusFilter === 'signed' && c.status !== 'signed') return false;
      if (statusFilter === 'pending' && c.status === 'signed') return false;

      if (dateStart) {
          const d = new Date(c.createdAt).toISOString().split('T')[0];
          if (d < dateStart) return false;
      }
      if (dateEnd) {
          const d = new Date(c.createdAt).toISOString().split('T')[0];
          if (d > dateEnd) return false;
      }

      return true;
  });

  const handleAddSigner = () => setSignersList([...signersList, {name: '', email: ''}]);
  const handleRemoveSigner = (idx: number) => {
      const l = [...signersList]; l.splice(idx, 1); setSignersList(l);
  };
  const handleSignerChange = (idx: number, f: 'name'|'email', v: string) => {
      const l = [...signersList]; l[idx][f] = v; setSignersList(l);
  };
  const handleDelete = async (id: string) => {
      if(window.confirm("Excluir contrato permanentemente?")) {
          try {
              await appBackend.deleteContract(id);
              await loadData();
          } catch (e) {
              alert("Erro ao excluir.");
          }
      }
  };
  const handleCopyLink = (id: string) => {
      const link = `${window.location.origin}${window.location.pathname}?contractId=${id}`;
      navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };
  const openPreview = (c: Contract) => { setSelectedContract(c); setView('preview'); };

  if (view === 'create') {
      return (
        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <PenTool size={20} className="text-teal-600" /> Novo Contrato
                    </h3>
                    <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Título do Contrato</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Ex: Contrato de Adesão - Plano Anual"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><MapPin size={14} /> Cidade da Assinatura</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Ex: São Paulo"
                                value={formData.city}
                                onChange={e => setFormData({...formData, city: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Calendar size={14} /> Data do Documento</label>
                            <input 
                                type="date" 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={formData.contractDate}
                                onChange={e => setFormData({...formData, contractDate: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Folder size={14} /> Salvar na Pasta</label>
                            <select 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={targetFolderId}
                                onChange={e => setTargetFolderId(e.target.value)}
                            >
                                <option value="">Sem pasta (Raiz)</option>
                                {folders.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Signers Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-bold text-slate-700">Quem deve assinar? (Signatários)</label>
                            <button onClick={handleAddSigner} className="text-xs flex items-center gap-1 text-teal-600 font-bold hover:bg-teal-100 px-2 py-1 rounded">
                                <UserPlus size={14} /> Adicionar
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {signersList.map((signer, idx) => (
                                <div key={idx} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2">
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            placeholder="Nome Completo"
                                            value={signer.name}
                                            onChange={e => handleSignerChange(idx, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input 
                                            type="email" 
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            placeholder="Email para envio"
                                            value={signer.email}
                                            onChange={e => handleSignerChange(idx, 'email', e.target.value)}
                                        />
                                    </div>
                                    {signersList.length > 1 && (
                                        <button onClick={() => handleRemoveSigner(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contract Content */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Termos do Contrato</label>
                        <div className="border border-slate-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-teal-500">
                            <textarea 
                                className="w-full h-80 p-2 resize-none outline-none text-sm font-mono text-slate-600"
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Este texto será exibido para assinatura.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                    <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleCreate} disabled={isSaving} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                        Gerar e Enviar Convites
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- PREVIEW RENDER ---
  if (view === 'preview' && selectedContract) {
    const signedCount = selectedContract.signers.filter(s => s.status === 'signed').length;
    const totalSigners = selectedContract.signers.length;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Visualizar Contrato</h3>
                    <button onClick={() => setView('list')} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
                    <div className="bg-white p-8 shadow-sm border border-slate-200 min-h-[500px] mx-auto max-w-2xl rounded-lg">
                      <div className="text-center mb-8 border-b border-slate-100 pb-6">
                          <h2 className="text-2xl font-bold text-slate-900">{selectedContract.title}</h2>
                          <div className="flex justify-center gap-2 mt-4">
                              <span className={clsx("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold", selectedContract.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                                  {selectedContract.status === 'signed' ? <CheckCircle size={12}/> : <ExternalLink size={12}/>}
                                  Status: {selectedContract.status === 'signed' ? 'Finalizado' : 'Em andamento'}
                              </span>
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                  <Users size={12}/> {signedCount}/{totalSigners} Assinaturas
                              </span>
                          </div>
                      </div>

                      <div className="prose prose-sm max-w-none mb-10 text-slate-600 whitespace-pre-wrap font-serif leading-relaxed">
                          {selectedContract.content}
                      </div>

                      <div className="mt-12 mb-12 text-center font-serif text-slate-800">
                           <p>{selectedContract.city}, {new Date(selectedContract.contractDate).toLocaleDateString()}</p>
                      </div>

                      <div className="border-t border-slate-200 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                          {selectedContract.signers.map(signer => (
                              <div key={signer.id} className="flex flex-col items-center">
                                  <div className="h-20 w-full border-b border-slate-800 mb-2 flex items-end justify-center">
                                      {signer.status === 'signed' && signer.signatureData ? (
                                          <img src={signer.signatureData} alt="Assinatura" className="max-h-16" />
                                      ) : (
                                          <span className="text-xs text-slate-400 italic mb-2">Pendente...</span>
                                      )}
                                  </div>
                                  <p className="font-bold text-slate-800 text-sm">{signer.name}</p>
                                  <p className="text-xs text-slate-500">{signer.email}</p>
                                  {signer.signedAt && (
                                      <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                          <CheckCircle size={10} /> {new Date(signer.signedAt).toLocaleString()}
                                      </p>
                                  )}
                              </div>
                          ))}
                      </div>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col md:flex-row gap-6 pb-20">
        
        {/* SIDEBAR: FOLDERS */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-4">
             {/* Header Actions */}
             <div>
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-4">
                    <ArrowLeft size={16} /> Voltar ao Painel
                </button>
                <button 
                    onClick={() => { setSuccessInfo(null); setView('create'); }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 mb-4"
                >
                    <Plus size={18} /> Novo Contrato
                </button>
             </div>

             <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
                <p className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Navegação</p>
                
                <button 
                    onClick={() => setCurrentFolderId(null)}
                    className={clsx(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                        currentFolderId === null ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <span className="flex items-center gap-2"><LayoutGrid size={16} /> Todos os Contratos</span>
                    <span className="text-xs opacity-60 bg-white px-1.5 rounded-full border border-slate-100">{contracts.length}</span>
                </button>

                <div className="mt-4 flex items-center justify-between px-3 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pastas</p>
                    <button onClick={() => setShowFolderModal(true)} className="text-slate-400 hover:text-teal-600" title="Nova Pasta">
                        <FolderPlus size={14} />
                    </button>
                </div>

                <div className="space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {folders.map(f => (
                        <div key={f.id} className="group relative">
                            <button 
                                onClick={() => setCurrentFolderId(f.id)}
                                className={clsx(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    currentFolderId === f.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Folder size={16} className={currentFolderId === f.id ? "fill-teal-200 text-teal-600" : "text-slate-400"} />
                                <span className="truncate flex-1 text-left">{f.name}</span>
                            </button>
                            <button 
                                onClick={() => handleDeleteFolder(f.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    {folders.length === 0 && (
                        <p className="text-xs text-slate-400 px-3 italic py-4">Nenhuma pasta criada.</p>
                    )}
                </div>
             </div>
        </aside>

        {/* MAIN CONTENT: LIST */}
        <div className="flex-1 min-w-0">
            
            {/* Success Notification after Create */}
            {successInfo && (
                <div className="mb-6 animate-in slide-in-from-top-4">
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-5 rounded-r-xl shadow-sm flex items-start gap-4">
                        <div className="p-2 bg-emerald-100 rounded-full text-emerald-600 shrink-0">
                            <CheckCircle size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-emerald-900">Contrato Gerado com Sucesso!</h4>
                            <p className="text-sm text-emerald-700 mt-1">
                                O contrato <strong>{successInfo.title}</strong> foi salvo e os links de assinatura foram preparados.
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                                <button 
                                    onClick={() => handleCopyLink(successInfo.id)}
                                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-black uppercase rounded-lg shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-2"
                                >
                                    <Copy size={14}/> Copiar Link Manual
                                </button>
                                <button onClick={() => setSuccessInfo(null)} className="text-xs font-bold text-emerald-600 hover:underline">Dispensar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar: Search & Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar contratos..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select 
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none"
                        >
                            <option value="all">Todos os Status</option>
                            <option value="pending">Pendentes</option>
                            <option value="signed">Finalizados</option>
                        </select>
                        <button onClick={loadData} className="p-2 text-slate-400 hover:text-teal-600 transition-colors"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
                    </div>
                </div>
                
                {/* Advanced Date Filter */}
                <div className="flex items-center gap-2 text-sm text-slate-600 pt-2 border-t border-slate-100">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-bold uppercase text-slate-400 mr-2">Filtrar Data:</span>
                    <input 
                        type="date" 
                        value={dateStart}
                        onChange={e => setDateStart(e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                    <span className="text-slate-300">-</span>
                    <input 
                        type="date" 
                        value={dateEnd}
                        onChange={e => setDateEnd(e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                    {(dateStart || dateEnd) && (
                        <button onClick={() => {setDateStart(''); setDateEnd('')}} className="text-xs text-red-500 hover:underline ml-2">Limpar</button>
                    )}
                </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
                 <span className={clsx("cursor-pointer hover:text-teal-600", !currentFolderId && "font-bold text-slate-800")} onClick={() => setCurrentFolderId(null)}>
                     Todos
                 </span>
                 {currentFolderId && (
                     <>
                        <ChevronRight size={14} />
                        <span className="font-bold text-slate-800">
                            {folders.find(f => f.id === currentFolderId)?.name || 'Pasta Desconhecida'}
                        </span>
                     </>
                 )}
            </div>

            {/* Contracts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 size={48} className="animate-spin text-teal-600 mb-4" />
                        <p className="font-bold">Sincronizando documentos...</p>
                    </div>
                ) : fetchError ? (
                    <div className="col-span-full text-center py-12 bg-red-50 border-2 border-red-100 rounded-xl p-8">
                        <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                        <p className="text-red-700 font-bold mb-2">Erro ao carregar contratos</p>
                        <p className="text-red-600 text-sm mb-6">{fetchError}</p>
                        <button onClick={loadData} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 mx-auto">
                            <RefreshCw size={16}/> Tentar novamente
                        </button>
                    </div>
                ) : filteredContracts.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
                        <FileSignature size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">Nenhum contrato encontrado nesta visão.</p>
                        <button onClick={() => setView('create')} className="text-teal-600 font-bold text-sm mt-2 hover:underline">
                            Criar novo contrato
                        </button>
                    </div>
                ) : (
                    filteredContracts.map(contract => {
                        const signedCount = (contract.signers || []).filter(s => s.status === 'signed').length;
                        const totalSigners = (contract.signers || []).length || 1;
                        const percent = Math.round((signedCount / totalSigners) * 100);

                        return (
                            <div key={contract.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group">
                                <div className="relative h-1.5 w-full bg-slate-100">
                                    <div className={clsx("absolute left-0 top-0 h-full transition-all duration-500", contract.status === 'signed' ? "bg-green-500" : "bg-amber-400")} style={{width: `${percent}%`}}></div>
                                </div>
                                
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border", 
                                            contract.status === 'signed' ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-100"
                                        )}>
                                            {contract.status === 'signed' ? 'Finalizado' : 'Aguardando'}
                                        </span>
                                        
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setShowMoveModal(contract)} className="text-slate-300 hover:text-teal-600 hover:bg-teal-50 p-1 rounded" title="Mover para pasta">
                                                <MoveRight size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(contract.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded" title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-slate-800 mb-1 truncate" title={contract.title}>{contract.title}</h3>
                                    <p className="text-xs text-slate-400 mb-2">{new Date(contract.createdAt).toLocaleDateString()}</p>
                                    
                                    <div className="mt-3 space-y-2">
                                        {(contract.signers || []).slice(0, 2).map(signer => (
                                            <div key={signer.id} className="flex items-center justify-between text-xs text-slate-600">
                                                <span className="flex items-center gap-1.5 truncate">
                                                    {signer.status === 'signed' ? <CheckCircle size={12} className="text-green-500 shrink-0"/> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0"></div>}
                                                    {signer.name}
                                                </span>
                                            </div>
                                        ))}
                                        {(contract.signers || []).length > 2 && (
                                            <p className="text-xs text-slate-400 italic">+ {contract.signers.length - 2} outros</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                                        <button 
                                            onClick={() => openPreview(contract)}
                                            className="text-sm font-medium text-slate-600 hover:text-teal-600 flex items-center gap-1.5"
                                        >
                                            <Eye size={16} /> Visualizar
                                        </button>
                                        
                                        {contract.status !== 'signed' && (
                                            <button 
                                                onClick={() => handleCopyLink(contract.id)}
                                                className={clsx("text-sm font-medium flex items-center gap-1.5 transition-colors", copiedId === contract.id ? "text-green-600" : "text-teal-600 hover:text-teal-800")}
                                            >
                                                {copiedId === contract.id ? <CheckCircle size={16}/> : <Copy size={16}/>}
                                                Link
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* --- MODALS --- */}

        {/* Create Folder Modal */}
        {showFolderModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">Nova Pasta</h3>
                        <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="p-5">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Pasta</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Ex: Contratos 2024"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="px-5 py-3 bg-slate-50 flex justify-end gap-2">
                        <button onClick={() => setShowFolderModal(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
                        <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700">Criar</button>
                    </div>
                </div>
            </div>
        )}

        {/* Move Contract Modal */}
        {showMoveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">Mover Contrato</h3>
                        <button onClick={() => setShowMoveModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-slate-500 mb-4">Selecione o destino para: <br/><strong className="text-slate-800">{showMoveModal.title}</strong></p>
                        <div className="space-y-1">
                            <button 
                                onClick={() => handleMoveContract(showMoveModal, null)}
                                className={clsx("w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors", !showMoveModal.folderId ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                            >
                                <LayoutGrid size={16} /> Sem Pasta (Raiz)
                            </button>
                            {folders.map(f => (
                                <button 
                                    key={f.id}
                                    onClick={() => handleMoveContract(showMoveModal, f.id)}
                                    className={clsx("w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors", showMoveModal.folderId === f.id ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                                >
                                    <Folder size={16} /> {f.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};