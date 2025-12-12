import React, { useState, useEffect } from 'react';
import { FormModel, FormQuestion, QuestionType } from '../types';
import { FormViewer } from './FormViewer';
import { 
  FileText, Plus, MoreVertical, Trash2, Eye, Edit2, 
  ArrowLeft, Save, GripVertical, Copy, Settings,
  Type, AlignLeft, Mail, Phone, Calendar, Hash, CheckSquare, Target
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface FormsManagerProps {
  onBack: () => void;
}

const INITIAL_FORM: FormModel = {
  id: '',
  title: 'Formulário sem título',
  description: '',
  isLeadCapture: false,
  questions: [
      { id: 'q1', title: 'Nome Completo', type: 'text', required: true, placeholder: 'Digite seu nome' }
  ],
  createdAt: '',
  submissionsCount: 0
};

export const FormsManager: React.FC<FormsManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'edit' | 'preview'>('list');
  const [forms, setForms] = useState<FormModel[]>([]);
  const [currentForm, setCurrentForm] = useState<FormModel>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
      setLoading(true);
      const data = await appBackend.getForms();
      setForms(data);
      setLoading(false);
  };

  const handleCreateNew = () => {
      const newForm = {
          ...INITIAL_FORM,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
      };
      setCurrentForm(newForm);
      setView('edit');
  };

  const handleEdit = (form: FormModel) => {
      setCurrentForm(form);
      setView('edit');
  };

  const handlePreview = (form: FormModel) => {
      setCurrentForm(form);
      setView('preview');
  };

  const handleDelete = async (id: string) => {
      if(window.confirm("Excluir este formulário e todas as respostas?")) {
          await appBackend.deleteForm(id);
          loadForms();
      }
  };

  const handleSaveForm = async () => {
      await appBackend.saveForm(currentForm);
      loadForms();
      setView('list');
  };

  // --- BUILDER ACTIONS ---
  const addQuestion = () => {
      const newQ: FormQuestion = {
          id: crypto.randomUUID(),
          title: '',
          type: 'text',
          required: false
      };
      setCurrentForm(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => {
      setCurrentForm(prev => ({
          ...prev,
          questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
      }));
  };

  const removeQuestion = (id: string) => {
      setCurrentForm(prev => ({
          ...prev,
          questions: prev.questions.filter(q => q.id !== id)
      }));
  };

  if (view === 'preview') {
      return <FormViewer form={currentForm} onBack={() => setView('list')} />;
  }

  if (view === 'edit') {
      return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4">
            {/* Toolbar */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 mb-6 -mx-4 px-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <span className="font-semibold text-slate-700">Editor de Formulário</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setView('preview')} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <Eye size={20} />
                    </button>
                    <button 
                        onClick={handleSaveForm}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
                    >
                        Salvar Formulário
                    </button>
                </div>
            </div>

            {/* Title Card */}
            <div className="bg-white rounded-xl border-t-8 border-t-indigo-600 border-x border-b border-slate-200 shadow-sm p-6 mb-4 relative overflow-hidden">
                 <input 
                    type="text" 
                    className="text-3xl font-bold text-slate-900 w-full border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none pb-2 transition-all mb-2"
                    value={currentForm.title}
                    onChange={(e) => setCurrentForm({...currentForm, title: e.target.value})}
                    placeholder="Título do Formulário"
                 />
                 <textarea 
                    className="w-full text-sm text-slate-600 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                    value={currentForm.description}
                    onChange={(e) => setCurrentForm({...currentForm, description: e.target.value})}
                    placeholder="Descrição do formulário (opcional)"
                    rows={2}
                 />

                 {/* Lead Capture Toggle */}
                 <div className="mt-6 flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-lg text-white", currentForm.isLeadCapture ? "bg-indigo-600" : "bg-slate-300")}>
                            <Target size={20} />
                        </div>
                        <div>
                            <span className="block font-bold text-slate-800 text-sm">Modo Captação de Leads</span>
                            <span className="block text-xs text-slate-500">
                                Envia respostas automaticamente para o CRM.
                            </span>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={currentForm.isLeadCapture}
                            onChange={(e) => setCurrentForm({...currentForm, isLeadCapture: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                 </div>
                 {currentForm.isLeadCapture && (
                     <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                         <CheckSquare size={12}/> Para funcionar, inclua perguntas com as palavras: <b>Nome, Empresa, Email</b> e/ou <b>Telefone</b>.
                     </p>
                 )}
            </div>

            {/* Questions List */}
            <div className="space-y-4">
                {currentForm.questions.map((q, index) => (
                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 group transition-all hover:shadow-md relative pl-10">
                        {/* Drag Handle (Visual) */}
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 cursor-move">
                            <GripVertical size={20} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="md:col-span-2">
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="Pergunta"
                                    value={q.title}
                                    onChange={(e) => updateQuestion(q.id, 'title', e.target.value)}
                                />
                            </div>
                            <div>
                                <select 
                                    className="w-full border border-slate-200 rounded p-3 text-sm text-slate-600 focus:outline-none focus:border-indigo-500 bg-white"
                                    value={q.type}
                                    onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                                >
                                    <option value="text">Texto Curto</option>
                                    <option value="paragraph">Parágrafo</option>
                                    <option value="email">Email</option>
                                    <option value="phone">Telefone</option>
                                    <option value="number">Número</option>
                                    <option value="date">Data</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="border-t border-slate-100 pt-3 flex justify-end items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={q.required}
                                    onChange={(e) => updateQuestion(q.id, 'required', e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                Obrigatória
                            </label>
                            <div className="h-4 w-px bg-slate-200"></div>
                            <button 
                                onClick={() => removeQuestion(q.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center mt-6">
                <button 
                    onClick={addQuestion}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-full shadow-sm hover:shadow hover:text-indigo-600 hover:border-indigo-300 transition-all font-medium"
                >
                    <Plus size={18} /> Adicionar Pergunta
                </button>
            </div>
        </div>
      );
  }

  // LIST VIEW
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-pink-600" /> Meus Formulários
                </h2>
                <p className="text-slate-500 text-sm">Crie formulários para pesquisa ou captação de leads.</p>
            </div>
        </div>
        <button 
            onClick={handleCreateNew}
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Criar Formulário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* New Form Card (Visual Shortcut) */}
          <div 
            onClick={handleCreateNew}
            className="bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition-all group min-h-[200px]"
          >
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-pink-200 group-hover:text-pink-700 text-slate-400 transition-colors">
                  <Plus size={24} />
              </div>
              <span className="font-medium text-slate-600 group-hover:text-pink-700">Novo em branco</span>
          </div>

          {forms.map(form => (
              <div key={form.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group">
                  <div className="h-2 bg-slate-100 group-hover:bg-pink-500 transition-colors"></div>
                  <div className="p-5 flex-1">
                      <h3 className="font-bold text-slate-800 mb-1 line-clamp-1" title={form.title}>{form.title}</h3>
                      <p className="text-xs text-slate-400 mb-4">
                          {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                      
                      {form.isLeadCapture ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium border border-indigo-100">
                              <Target size={10} /> Captação CRM
                          </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded font-medium border border-slate-100">
                            Pesquisa Padrão
                        </span>
                      )}

                      <div className="mt-4 flex items-center text-xs text-slate-500">
                          <span className="font-bold text-slate-700 mr-1">{form.submissionsCount || 0}</span> respostas
                      </div>
                  </div>
                  
                  <div className="border-t border-slate-100 p-2 flex justify-between bg-slate-50">
                      <button onClick={() => handleEdit(form)} className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded transition-colors" title="Editar">
                          <Edit2 size={16} />
                      </button>
                      <button onClick={() => handlePreview(form)} className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded transition-colors" title="Visualizar / Preencher">
                          <Eye size={16} />
                      </button>
                      <button onClick={() => handleDelete(form.id)} className="p-2 text-slate-500 hover:bg-white hover:text-red-600 rounded transition-colors" title="Excluir">
                          <Trash2 size={16} />
                      </button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};