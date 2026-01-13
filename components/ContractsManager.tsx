import React, { useState, useEffect } from 'react';
import { Contract, ContractSigner, ContractFolder } from '../types';
import { appBackend } from '../services/appBackend';
import { 
  FileSignature, Plus, Search, Eye, Trash2, Copy, CheckCircle, 
  ArrowLeft, Save, X, PenTool, ExternalLink, RefreshCw, UserPlus, 
  Users, MapPin, Calendar, Folder, FolderPlus, ChevronRight, LayoutGrid, List, Filter, MoveRight, Loader2, AlertTriangle, Send, Clock
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

Pelo presente instrumento particular, de um lado VOLL Pilates Group, inscrita no CNPJ sob o nº [CNPJ_VOLL], com sede em [ENDERECO_VOLL], doravante denominada CONTRATADA, e de outro lado [NOME_CLIENTE], inscrito no CPF sob o nº [CPF_CLIENTE], doravante denominado CONTRATANTE, celebram o presente contrato sob as cláusulas abaixo:

1. OBJETO
O presente contrato tem por objeto a prestação de serviços educacionais para o curso [NOME_CURSO].

2. VALOR E PAGAMENTO
O valor total do investimento é de R$ [VALOR_TOTAL], a ser pago na forma de [FORMA_PAGAMENTO].

3. FORO
As partes elegem o foro da comarca de São Paulo/SP para dirimir quaisquer dúvidas oriundas deste contrato.`,
    signers: [],
    folderId: null
};

export const ContractsManager: React.FC<ContractsManagerProps> = ({ onBack }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [folders, setFolders] = useState<ContractFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Partial<Contract>>(INITIAL_CONTRACT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Signer management
  const [newSignerName, setNewSignerName] = useState('');
  const [newSignerEmail, setNewSignerEmail] = useState('');

  // Folder management
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState<Contract | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [contractsData, foldersData] = await Promise.all([
        appBackend.getContracts(),
        appBackend.getContractFolders()
      ]);
      setContracts(contractsData);
      setFolders(foldersData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingContract.title || !editingContract.signers || editingContract.signers.length === 0) {
      alert("Título e ao menos um signatário são obrigatórios.");
      return;
    }
    setIsSaving(true);
    try {
      const contractToSave: Contract = {
        id: editingContract.id || crypto.randomUUID(),
        title: editingContract.title || '',
        content: editingContract.content || '',
        city: editingContract.city || 'São Paulo',
        contractDate: editingContract.contractDate || new Date().toISOString(),
        status: editingContract.status || 'sent',
        folderId: editingContract.folderId || null,
        signers: (editingContract.signers || []) as ContractSigner[],
        createdAt: editingContract.createdAt || new Date().toISOString()
      };
      await appBackend.saveContract(contractToSave);
      
      // Simulation of sending emails
      for (const signer of contractToSave.signers) {
          if (signer.status === 'pending') {
              await appBackend.sendContractEmailSimulation(signer.email, signer.name, contractToSave.title);
          }
      }

      await fetchData();
      setShowModal(false);
    } catch (e) {
      alert("Erro ao salvar contrato.");
    } finally {
      setIsSaving(false);
    }
  };

  const addSigner = () => {
      if (!newSignerName || !newSignerEmail) return;
      const newSigner: ContractSigner = {
          id: crypto.randomUUID(),
          name: newSignerName,
          email: newSignerEmail,
          status: 'pending'
      };
      setEditingContract(prev => ({
          ...prev,
          signers: [...(prev.signers || []), newSigner]
      }));
      setNewSignerName('');
      setNewSignerEmail('');
  };

  const removeSigner = (id: string) => {
      setEditingContract(prev => ({
          ...prev,
          signers: prev.signers?.filter(s => s.id !== id)
      }));
  };

  const handleCreateFolder = async () => {
      if (!newFolderName.trim()) return;
      try {
        await appBackend.saveContractFolder({
            id: crypto.randomUUID(),
            name: newFolderName,
            createdAt: new Date().toISOString()
        });
        await fetchData();
        setShowFolderModal(false);
        setNewFolderName('');
      } catch (e) { alert("Erro ao criar pasta."); }
  };

  const handleDeleteFolder = async (id: string) => {
      if (window.confirm("Excluir esta pasta? Os contratos nela voltarão para a raiz.")) {
          await appBackend.deleteContractFolder(id);
          fetchData();
      }
  };

  const handleMoveContract = async (contract: Contract, folderId: string | null) => {
      const updated = { ...contract, folderId };
      await appBackend.saveContract(updated);
      await fetchData();
      setShowMoveModal(null);
  };

  const filteredContracts = contracts.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.signers.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFolder = currentFolderId === null ? true : c.folderId === currentFolderId;
      return matchesSearch && matchesFolder;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col md:flex-row gap-6 pb-20">
      {/* Sidebar: Pastas */}
      <aside className="w-full md:w-64 flex-shrink-0 space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-4">
          <ArrowLeft size={16} /> Voltar
        </button>
        
        <button 
            onClick={() => { setEditingContract(INITIAL_CONTRACT_FORM); setShowModal(true); }}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 mb-6 transition-all active:scale-95"
        >
            <Plus size={20} /> Novo Contrato
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
            <button 
                onClick={() => setCurrentFolderId(null)}
                className={clsx(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    currentFolderId === null ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                )}
            >
                <div className="flex items-center gap-3">
                    <LayoutGrid size={18} />
                    <span>Todos</span>
                </div>
                <span className="text-xs opacity-50">{contracts.length}</span>
            </button>

            <div className="mt-4 flex items-center justify-between px-4 mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minhas Pastas</p>
                <button onClick={() => setShowFolderModal(true)} className="text-slate-400 hover:text-teal-600 transition-colors"><FolderPlus size={16}/></button>
            </div>
            
            <div className="space-y-1">
                {folders.map(folder => (
                    <div key={folder.id} className="group relative">
                        <button 
                            onClick={() => setCurrentFolderId(folder.id)}
                            className={clsx(
                                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                                currentFolderId === folder.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Folder size={18} className={currentFolderId === folder.id ? "text-teal-600" : "text-slate-400"} />
                                <span>{folder.name}</span>
                            </div>
                        </button>
                        <button 
                            onClick={() => handleDeleteFolder(folder.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </aside>

      {/* Main Content: Lista de Contratos */}
      <div className="flex-1 space-y-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por título ou signatário..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                />
            </div>
            <button onClick={fetchData} className="p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-50 transition-all"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
        </div>

        {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={40} /></div>
        ) : filteredContracts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                <FileSignature size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium text-lg">Nenhum contrato encontrado</p>
                <p className="text-sm">Inicie uma nova assinatura ou mude o filtro.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContracts.map(contract => (
                    <div key={contract.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col group overflow-hidden border-t-4 border-t-teal-600">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className={clsx(
                                    "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest border",
                                    contract.status === 'signed' ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                )}>
                                    {contract.status === 'signed' ? 'Finalizado' : 'Aguardando'}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setShowMoveModal(contract)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Mover para pasta"><MoveRight size={16}/></button>
                                    <button 
                                        onClick={() => {
                                            const link = `${window.location.origin}/?contractId=${contract.id}`;
                                            navigator.clipboard.writeText(link);
                                            alert("Link de assinatura copiado!");
                                        }} 
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                        title="Copiar Link de Assinatura"
                                    >
                                        <Copy size={16}/>
                                    </button>
                                    <button onClick={() => appBackend.deleteContract(contract.id).then(fetchData)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-slate-800 mb-2 leading-tight group-hover:text-teal-700 transition-colors">{contract.title}</h3>
                            <p className="text-xs text-slate-400 mb-6 flex items-center gap-1.5"><Calendar size={12}/> Emitido em {new Date(contract.createdAt).toLocaleDateString()}</p>
                            
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signatários</p>
                                {contract.signers.map(signer => (
                                    <div key={signer.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-2 truncate">
                                            <div className={clsx("w-2 h-2 rounded-full shrink-0", signer.status === 'signed' ? "bg-green-500" : "bg-slate-300")}></div>
                                            <span className="font-medium text-slate-700 truncate">{signer.name}</span>
                                        </div>
                                        {signer.status === 'signed' ? (
                                            <CheckCircle size={14} className="text-green-500 shrink-0" />
                                        ) : (
                                            <Clock size={14} className="text-slate-300 shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                            <button 
                                onClick={() => { setEditingContract(contract); setShowModal(true); }}
                                className="w-full py-2 bg-white hover:bg-teal-600 hover:text-white text-slate-600 rounded-lg border border-slate-200 hover:border-teal-600 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
                            >
                                Gerenciar Documento
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* MODAL: NOVO/EDITAR CONTRATO */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh]">
                  <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{editingContract.id ? 'Gerenciar Documento' : 'Novo Contrato Digital'}</h3>
                        <p className="text-sm text-slate-500 uppercase font-black tracking-widest text-teal-600">VOLL Pilates Legal</p>
                      </div>
                      <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"><X size={24}/></button>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Título do Documento *</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-2.5 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-50 outline-none" 
                                value={editingContract.title} 
                                onChange={e => setEditingContract({...editingContract, title: e.target.value})} 
                                placeholder="Ex: Contrato de Prestação de Serviços - João da Silva"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cidade / Foro</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none" 
                                value={editingContract.city} 
                                onChange={e => setEditingContract({...editingContract, city: e.target.value})} 
                                placeholder="Ex: São Paulo"
                              />
                          </div>
                          
                          <div className="md:col-span-3">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Conteúdo do Contrato (Termos Legais)</label>
                              <textarea 
                                className="w-full px-4 py-3 border rounded-xl text-sm h-64 font-serif leading-relaxed focus:ring-2 focus:ring-teal-50 outline-none resize-none" 
                                value={editingContract.content} 
                                onChange={e => setEditingContract({...editingContract, content: e.target.value})}
                              />
                              <p className="text-[10px] text-slate-400 mt-1 italic">Use [TAGS] para facilitar o preenchimento manual antes de enviar.</p>
                          </div>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 space-y-6">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-teal-600"/> Signatários do Documento</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                              <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                                  <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={newSignerName} onChange={e => setNewSignerName(e.target.value)} />
                              </div>
                              <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">E-mail</label>
                                  <input type="email" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={newSignerEmail} onChange={e => setNewSignerEmail(e.target.value)} />
                              </div>
                              <button onClick={addSigner} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
                                  <UserPlus size={16}/> Adicionar Signatário
                              </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {editingContract.signers?.map(signer => (
                                  <div key={signer.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group">
                                      <div className="flex items-center gap-3">
                                          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg", signer.status === 'signed' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400")}>
                                              {signer.status === 'signed' ? <CheckCircle size={20}/> : signer.name.charAt(0)}
                                          </div>
                                          <div className="min-w-0">
                                              <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{signer.name}</p>
                                              <p className="text-[10px] text-slate-500">{signer.email}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {signer.status === 'signed' ? (
                                              <span className="text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded border border-green-100">Assinou</span>
                                          ) : (
                                              <button onClick={() => removeSigner(signer.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center rounded-b-2xl shrink-0">
                      <div className="flex items-center gap-4">
                        {editingContract.id && (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <Calendar size={14}/> 
                                <span>Criado em: {new Date(editingContract.createdAt!).toLocaleDateString()}</span>
                            </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm transition-all">Cancelar</button>
                          <button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-teal-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                              Salvar e Enviar p/ Assinatura
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: NOVA PASTA */}
      {showFolderModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><FolderPlus size={18} className="text-teal-600"/> Criar Pasta</h3>
                      <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-50 transition-all font-medium text-sm" 
                        value={newFolderName} 
                        onChange={e => setNewFolderName(e.target.value)} 
                        placeholder="Nome da pasta (Ex: RH, Acadêmico...)"
                        autoFocus
                      />
                      <button onClick={handleCreateFolder} className="w-full bg-teal-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all">Criar Pasta</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: MOVER CONTRATO */}
      {showMoveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">Mover Documento</div>
                  <div className="p-6">
                      <p className="text-sm text-slate-700 mb-4 font-bold">Mover "{showMoveModal.title}" para:</p>
                      <div className="space-y-1">
                          <button 
                              onClick={() => handleMoveContract(showMoveModal, null)}
                              className={clsx("w-full text-left px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-all", !showMoveModal.folderId ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50")}
                          >
                              <LayoutGrid size={16} /> Sem Pasta (Raiz)
                          </button>
                          {folders.map(f => (
                              <button 
                                  key={f.id}
                                  onClick={() => handleMoveContract(showMoveModal, f.id)}
                                  className={clsx("w-full text-left px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-all", showMoveModal.folderId === f.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50")}
                              >
                                  <Folder size={16} /> {f.name}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t flex justify-end">
                      <button onClick={() => setShowMoveModal(null)} className="text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700">Cancelar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
