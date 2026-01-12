
import React, { useState, useEffect, useMemo } from 'react';
import { SurveyModel, FormQuestion, QuestionType, FormStyle, FormAnswer, Product, FormFolder } from '../types';
import { FormViewer } from './FormViewer';
import { 
  Plus, Trash2, Eye, Edit2, ArrowLeft, Save, Copy, Target, Share2, 
  Loader2, Check, List, CheckSquare as CheckboxIcon, Inbox, Download, Table, 
  Layout, Folder, FolderPlus, MoveRight, LayoutGrid, X, PieChart
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

declare const XLSX: any;

interface SurveyManagerProps {
  onBack: () => void;
}

const INITIAL_SURVEY: SurveyModel = {
  id: '',
  title: 'Pesquisa de Satisfação',
  description: 'Gostaríamos de ouvir sua opinião.',
  isLeadCapture: false,
  questions: [],
  createdAt: '',
  submissionsCount: 0,
  targetType: 'all',
  onlyIfFinished: true,
  isActive: true,
  folderId: null,
  style: {
      backgroundType: 'color', backgroundColor: '#fff7ed', cardTransparent: false, primaryColor: '#f59e0b', textColor: '#451a03', fontFamily: 'sans', titleAlignment: 'left', borderRadius: 'medium', buttonText: 'Enviar Pesquisa', shadowIntensity: 'soft', successTitle: 'Obrigado!', successMessage: 'Sua opinião é fundamental.', successButtonText: 'Fechar'
  }
};

export const SurveyManager: React.FC<SurveyManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'editor' | 'responses'>('list');
  const [surveys, setSurveys] = useState<SurveyModel[]>([]);
  const [folders, setFolders] = useState<FormFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentSurvey, setCurrentSurvey] = useState<SurveyModel>(INITIAL_SURVEY);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<SurveyModel | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => { loadSurveys(); loadFolders(); }, []);

  const loadSurveys = async () => { 
      setLoading(true); 
      try { const data = await appBackend.getSurveys(); setSurveys(data); } 
      catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  const loadFolders = async () => {
    try { const data = await appBackend.getFormFolders('survey'); setFolders(data); } catch (e) {}
  };

  const handleSaveSurvey = async () => { 
      if (!currentSurvey.title.trim()) { alert("O título é obrigatório."); return; }
      setIsSaving(true);
      try {
          await appBackend.saveSurvey(currentSurvey); 
          await loadSurveys(); 
          setView('list'); 
      } catch (e: any) { alert("Erro ao salvar pesquisa."); } 
      finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => { 
      const target = surveys.find(s => s.id === id); 
      if(window.confirm(`Excluir a pesquisa "${target?.title}"? Todas as respostas também serão apagadas.`)) { 
          try {
              await appBackend.deleteForm(id); 
              setSurveys(prev => prev.filter(s => s.id !== id));
          } catch (e: any) { alert("Erro ao excluir: " + e.message); }
      } 
  };

  const filteredSurveys = useMemo(() => {
    if (currentFolderId === null) return surveys;
    return surveys.filter(s => s.folderId === currentFolderId);
  }, [surveys, currentFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newFolder: FormFolder = { id: crypto.randomUUID(), name: newFolderName, createdAt: new Date().toISOString() };
    await appBackend.saveFormFolder(newFolder, 'survey');
    await loadFolders();
    setShowFolderModal(false);
    setNewFolderName('');
  };

  const handleMoveSurvey = async (survey: SurveyModel, folderId: string | null) => {
    const updated = { ...survey, folderId: folderId || null };
    await appBackend.saveSurvey(updated);
    await loadSurveys();
    setShowMoveModal(null);
  };

  const handleViewResponses = async (survey: SurveyModel) => {
    setCurrentSurvey(survey);
    setView('responses');
    setLoadingSubmissions(true);
    try {
        const data = await appBackend.getFormSubmissions(survey.id);
        setSubmissions(data);
    } catch (e) { alert("Erro ao carregar respostas."); } 
    finally { setLoadingSubmissions(false); }
  };

  if (view === 'responses') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
                  <h2 className="text-lg font-bold text-slate-800">{currentSurvey.title} ({submissions.length} respostas)</h2>
              </div>
              <button onClick={() => setView('list')} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm">Fechar</button>
          </div>
          <div className="flex-1 overflow-auto bg-slate-50 p-6">
              {loadingSubmissions ? <Loader2 className="animate-spin mx-auto text-amber-600" /> : (
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-3">Data</th>{currentSurvey.questions.map(q => <th key={q.id} className="p-3">{q.title}</th>)}</tr>
                        </thead>
                        <tbody>
                            {submissions.map((sub, i) => (
                                <tr key={i} className="border-b">
                                    <td className="p-3 text-slate-400">{new Date(sub.created_at).toLocaleString()}</td>
                                    {currentSurvey.questions.map(q => {
                                        const ans = sub.answers?.find((a: any) => a.questionId === q.id);
                                        return <td key={q.id} className="p-3">{ans?.value || '-'}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              )}
          </div>
      </div>
  );

  if (view === 'editor') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-amber-50 rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
              <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1"><ArrowLeft size={16} /> Sair</button>
              <button onClick={handleSaveSurvey} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Pesquisa
              </button>
          </div>
          <div className="flex-1 overflow-y-auto p-12">
              <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm space-y-6">
                  <input type="text" className="w-full text-2xl font-black border-b outline-none focus:border-amber-500" value={currentSurvey.title} onChange={e => setCurrentSurvey({...currentSurvey, title: e.target.value})} placeholder="Título da Pesquisa..." />
                  <textarea className="w-full h-20 text-slate-500 outline-none resize-none" value={currentSurvey.description} onChange={e => setCurrentSurvey({...currentSurvey, description: e.target.value})} placeholder="Instruções para o aluno..." />
                  <div className="pt-6 border-t">
                      <button onClick={() => setCurrentSurvey({...currentSurvey, questions: [...currentSurvey.questions, { id: crypto.randomUUID(), title: 'Nova Pergunta', type: 'text', required: true }]})} className="text-amber-600 font-bold text-sm">+ Adicionar Pergunta</button>
                  </div>
                  {currentSurvey.questions.map((q, idx) => (
                      <div key={q.id} className="p-4 border rounded-xl space-y-2 group">
                          <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Pergunta {idx + 1}</span><button onClick={() => setCurrentSurvey({...currentSurvey, questions: currentSurvey.questions.filter(x => x.id !== q.id)})} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div>
                          <input type="text" className="w-full font-bold outline-none" value={q.title} onChange={e => setCurrentSurvey({...currentSurvey, questions: currentSurvey.questions.map(x => x.id === q.id ? {...x, title: e.target.value} : x)})} />
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  return (
    <div className="animate-in fade-in h-full flex flex-col md:flex-row gap-6 pb-20">
      <aside className="w-full md:w-64 flex-shrink-0 space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-4"><ArrowLeft size={16} /> Voltar</button>
        <button onClick={() => { setCurrentSurvey(INITIAL_SURVEY); setView('editor'); }} className="w-full bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mb-4 active:scale-95"><Plus size={18} /> Nova Pesquisa</button>
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <button onClick={() => setCurrentFolderId(null)} className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors", currentFolderId === null ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50")}><LayoutGrid size={16} /> Todas</button>
            <div className="mt-4 flex items-center justify-between px-3 mb-2"><p className="text-xs font-bold text-slate-400 uppercase">Pastas de Pesquisa</p><button onClick={() => setShowFolderModal(true)}><FolderPlus size={16}/></button></div>
            {folders.map(f => <button key={f.id} onClick={() => setCurrentFolderId(f.id)} className={clsx("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm", currentFolderId === f.id ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50")}><Folder size={16}/> {f.name}</button>)}
        </div>
      </aside>
      <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSurveys.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-700 uppercase">Pesquisa Interna</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setShowMoveModal(s)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-100 rounded-lg"><MoveRight size={16}/></button>
                            <button onClick={() => { setCurrentSurvey(s); setView('editor'); }} className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-1">{s.title}</h3>
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button onClick={() => handleViewResponses(s)} className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center transition-colors">
                            <PieChart size={20} className="mb-1 text-amber-500" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Respostas</p>
                            <p className="text-xl font-black text-slate-800">{s.submissionsCount || 0}</p>
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?publicFormId=${s.id}`); alert("Link copiado!"); }} className="bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl flex flex-col items-center justify-center">
                            <Share2 size={20} />
                            <span className="text-[10px] font-black uppercase mt-1">Link Interno</span>
                        </button>
                    </div>
                </div>
            ))}
          </div>
      </div>

      {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Nova Pasta de Pesquisas</h3>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg mb-4" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nome..." />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowFolderModal(false)} className="px-3 py-1.5 text-sm text-slate-600">Cancelar</button>
                      <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm font-bold">Criar</button>
                  </div>
              </div>
          </div>
      )}

      {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Mover Pesquisa</h3>
                  <div className="space-y-1">
                      <button onClick={() => handleMoveSurvey(showMoveModal, null)} className="w-full text-left px-3 py-2 rounded text-sm hover:bg-amber-50">Sem Pasta (Raiz)</button>
                      {folders.map(f => <button key={f.id} onClick={() => handleMoveSurvey(showMoveModal, f.id)} className="w-full text-left px-3 py-2 rounded text-sm hover:bg-amber-50">{f.name}</button>)}
                  </div>
                  <button onClick={() => setShowMoveModal(null)} className="mt-4 w-full py-2 text-xs font-bold text-slate-400">Fechar</button>
              </div>
          </div>
      )}
    </div>
  );
};
