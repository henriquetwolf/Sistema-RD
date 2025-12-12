import React, { useState, useEffect } from 'react';
import { Contract } from '../types';
import { appBackend } from '../services/appBackend';
import { 
  FileSignature, Plus, Search, Eye, Trash2, Copy, CheckCircle, 
  ArrowLeft, Save, X, PenTool, ExternalLink, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

interface ContractsManagerProps {
  onBack: () => void;
}

const INITIAL_CONTRACT: Omit<Contract, 'id' | 'createdAt' | 'status'> = {
    title: '',
    signerName: '',
    signerEmail: '',
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

ENTRE:

CONTRATANTE: [Nome da Empresa], com sede em [Endereço].
CONTRATADO: [Nome do Contratado].

CLÁUSULA 1 - DO OBJETO
O presente contrato tem como objeto a prestação de serviços de...

CLÁUSULA 2 - DO PRAZO
O contrato terá vigência de...

CLÁUSULA 3 - DO PAGAMENTO
Pela prestação dos serviços, o CONTRATANTE pagará ao CONTRATADO...

[Cidade], [Data].`
};

export const ContractsManager: React.FC<ContractsManagerProps> = ({ onBack }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'preview'>('list');
  const [formData, setFormData] = useState(INITIAL_CONTRACT);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    const data = await appBackend.getContracts();
    setContracts(data);
  };

  const handleCreate = async () => {
      if (!formData.title || !formData.signerName) return;

      const newContract: Contract = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          status: 'sent',
          ...formData
      };

      await appBackend.saveContract(newContract);
      await loadContracts();
      setView('list');
      setFormData(INITIAL_CONTRACT);
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Excluir este contrato permanentemente?")) {
          await appBackend.deleteContract(id);
          loadContracts();
      }
  };

  const handleCopyLink = (id: string) => {
      const link = `${window.location.origin}${window.location.pathname}?contractId=${id}`;
      navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const openPreview = (c: Contract) => {
      setSelectedContract(c);
      setView('preview');
  };

  const filtered = contracts.filter(c => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.signerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- VIEWS ---

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
                
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Signatário</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Nome completo do cliente"
                                value={formData.signerName}
                                onChange={e => setFormData({...formData, signerName: e.target.value})}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email do Signatário (Opcional)</label>
                            <input 
                                type="email" 
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="cliente@email.com"
                                value={formData.signerEmail}
                                onChange={e => setFormData({...formData, signerEmail: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Termos do Contrato</label>
                        <div className="border border-slate-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-teal-500">
                            <textarea 
                                className="w-full h-96 p-2 resize-none outline-none text-sm font-mono text-slate-600"
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Este texto será exibido para assinatura.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                    <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleCreate} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                        <Save size={16} /> Gerar Contrato
                    </button>
                </div>
            </div>
        </div>
      );
  }

  if (view === 'preview' && selectedContract) {
      return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Visualizar Contrato</h3>
                      <button onClick={() => setView('list')} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                  </div>
                  
                  <div className="p-8 overflow-y-auto flex-1">
                      <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold text-slate-900">{selectedContract.title}</h2>
                          <div className={clsx("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2", selectedContract.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                              {selectedContract.status === 'signed' ? <CheckCircle size={12}/> : <ExternalLink size={12}/>}
                              {selectedContract.status === 'signed' ? 'Assinado' : 'Aguardando Assinatura'}
                          </div>
                      </div>

                      <div className="prose prose-sm max-w-none mb-10 text-slate-600 whitespace-pre-wrap">
                          {selectedContract.content}
                      </div>

                      {selectedContract.status === 'signed' && selectedContract.signatureData && (
                          <div className="border-t border-slate-200 pt-6">
                              <p className="text-xs font-bold text-slate-400 uppercase mb-4">Dados da Assinatura</p>
                              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                                  <div>
                                      <p className="font-bold text-slate-800">{selectedContract.signerName}</p>
                                      <p className="text-xs text-slate-500">{selectedContract.signerEmail}</p>
                                      <p className="text-xs text-slate-400 mt-1">Assinado em: {new Date(selectedContract.signedAt!).toLocaleString()}</p>
                                  </div>
                                  <div className="bg-white p-2 border border-slate-200 rounded">
                                      <img src={selectedContract.signatureData} alt="Assinatura" className="h-16" />
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileSignature className="text-teal-600" /> Gestão de Contratos
                </h2>
                <p className="text-slate-500 text-sm">Crie, envie e colete assinaturas digitais.</p>
            </div>
        </div>
        <button 
            onClick={() => setView('create')}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Novo Contrato
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar por título ou signatário..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
         </div>
         <button onClick={loadContracts} className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
             <RefreshCw size={20} />
         </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                  <FileSignature size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhum contrato encontrado.</p>
              </div>
          )}

          {filtered.map(contract => (
              <div key={contract.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
                  <div className={clsx("h-1.5 w-full", contract.status === 'signed' ? "bg-green-500" : "bg-amber-400")}></div>
                  
                  <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-3">
                          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide", 
                              contract.status === 'signed' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          )}>
                              {contract.status === 'signed' ? 'Assinado' : 'Pendente'}
                          </span>
                          <button onClick={() => handleDelete(contract.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                          </button>
                      </div>

                      <h3 className="font-bold text-slate-800 mb-1 truncate" title={contract.title}>{contract.title}</h3>
                      <p className="text-sm text-slate-500 mb-4">
                          Signatário: <span className="font-medium text-slate-700">{contract.signerName}</span>
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
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
                                  {copiedId === contract.id ? 'Link Copiado' : 'Copiar Link'}
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};