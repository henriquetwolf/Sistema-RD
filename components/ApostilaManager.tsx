import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    ArrowLeft, Loader2, Plus, Trash2, Save, BookOpen,
    Upload, FileText, CheckCircle2, AlertCircle, X, Edit2, ToggleLeft, ToggleRight
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { Apostila } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';

interface ApostilaManagerProps {
    onBack: () => void;
}

export const ApostilaManager: React.FC<ApostilaManagerProps> = ({ onBack }) => {
    const [apostilas, setApostilas] = useState<Apostila[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingApostila, setEditingApostila] = useState<Apostila | null>(null);
    const [form, setForm] = useState({ title: '', description: '', total_pages: 0 });
    const [pdfData, setPdfData] = useState<string>('');
    const [pdfFileName, setPdfFileName] = useState('');
    const [isCountingPages, setIsCountingPages] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadApostilas(); }, []);

    const loadApostilas = async () => {
        setIsLoading(true);
        try {
            const data = await appBackend.getApostilas();
            setApostilas(data);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const openNewModal = () => {
        setEditingApostila(null);
        setForm({ title: '', description: '', total_pages: 0 });
        setPdfData('');
        setPdfFileName('');
        setSaveError('');
        setShowModal(true);
    };

    const openEditModal = (a: Apostila) => {
        setEditingApostila(a);
        setForm({ title: a.title, description: a.description, total_pages: a.total_pages });
        setPdfData(a.pdf_url);
        setPdfFileName('PDF já carregado');
        setSaveError('');
        setShowModal(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setSaveError('Selecione apenas arquivos PDF.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setSaveError('Arquivo muito grande. Maximo: 50MB.');
            return;
        }

        setPdfFileName(file.name);
        setSaveError('');
        setIsCountingPages(true);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setPdfData(base64);

            try {
                const raw = base64.split(',')[1];
                const binary = atob(raw);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
                setForm(prev => ({ ...prev, total_pages: doc.numPages }));
            } catch (err) {
                console.error('Erro ao contar paginas:', err);
            }
            setIsCountingPages(false);
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        if (!form.title.trim()) { setSaveError('Informe o titulo da apostila.'); return; }
        if (!pdfData) { setSaveError('Faca o upload do arquivo PDF.'); return; }

        setIsSaving(true);
        setSaveError('');
        try {
            await appBackend.upsertApostila({
                id: editingApostila?.id,
                title: form.title.trim(),
                description: form.description.trim(),
                pdf_url: pdfData,
                total_pages: form.total_pages,
                is_active: editingApostila?.is_active ?? true,
            });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            setShowModal(false);
            loadApostilas();
        } catch (err: any) {
            setSaveError(err.message || 'Erro ao salvar.');
        }
        setIsSaving(false);
    };

    const handleToggleActive = async (a: Apostila) => {
        await appBackend.toggleApostilaActive(a.id, !a.is_active);
        loadApostilas();
    };

    const handleDelete = async (id: string) => {
        await appBackend.deleteApostila(id);
        setDeleteConfirm(null);
        loadApostilas();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <BookOpen size={24} className="text-rose-600" /> Apostila Digital
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Gerencie as apostilas interativas disponíveis para os alunos</p>
                    </div>
                </div>
                <button onClick={openNewModal} className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-600/20 transition-all active:scale-95">
                    <Plus size={18} /> Nova Apostila
                </button>
            </div>

            {/* Success toast */}
            {saveSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle2 size={18} /> Apostila salva com sucesso!
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-600" size={32} /></div>
            ) : apostilas.length === 0 ? (
                <div className="py-20 bg-white rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-slate-300">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p className="font-bold text-lg">Nenhuma apostila cadastrada</p>
                    <p className="text-sm mt-1">Clique em "Nova Apostila" para adicionar a primeira.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {apostilas.map(a => (
                        <div key={a.id} className={clsx("bg-white rounded-2xl border p-5 transition-all", a.is_active ? "border-slate-200 hover:shadow-md" : "border-slate-100 opacity-60")}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className={clsx("p-3 rounded-2xl shrink-0", a.is_active ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400")}>
                                        <BookOpen size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-800 text-base truncate">{a.title}</h3>
                                        {a.description && <p className="text-slate-500 text-sm mt-1 line-clamp-2">{a.description}</p>}
                                        <div className="flex items-center gap-3 mt-3 text-xs font-bold text-slate-400">
                                            <span className="flex items-center gap-1"><FileText size={13} /> {a.total_pages} paginas</span>
                                            <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-black uppercase", a.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                                                {a.is_active ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => handleToggleActive(a)} title={a.is_active ? 'Desativar' : 'Ativar'} className={clsx("p-2 rounded-xl transition-colors", a.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100")}>
                                        {a.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                    </button>
                                    <button onClick={() => openEditModal(a)} title="Editar" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    {deleteConfirm === a.id ? (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleDelete(a.id)} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700">Confirmar</button>
                                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeleteConfirm(a.id)} title="Excluir" className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                            <h2 className="text-lg font-black text-slate-800">
                                {editingApostila ? 'Editar Apostila' : 'Nova Apostila'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Titulo *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Ex: Apostila VOLL Pilates Classico"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descricao</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Descricao breve da apostila..."
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>

                            {/* PDF Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Arquivo PDF *</label>
                                {pdfData ? (
                                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                                        <FileText size={24} className="text-rose-600 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-rose-700 truncate">{pdfFileName}</p>
                                            <p className="text-xs text-rose-500 mt-0.5">
                                                {isCountingPages ? (
                                                    <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Contando paginas...</span>
                                                ) : (
                                                    `${form.total_pages} paginas detectadas`
                                                )}
                                            </p>
                                        </div>
                                        <button onClick={() => { setPdfData(''); setPdfFileName(''); setForm(prev => ({ ...prev, total_pages: 0 })); }} className="p-1.5 hover:bg-rose-100 rounded-lg transition-colors text-rose-400">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50/50 transition-all group">
                                        <div className="p-3 bg-slate-100 rounded-2xl text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-500 transition-colors">
                                            <Upload size={28} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-600">Clique para selecionar o PDF</p>
                                            <p className="text-xs text-slate-400 mt-1">Maximo 50MB</p>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Page count override */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total de Paginas</label>
                                <input
                                    type="number"
                                    value={form.total_pages}
                                    onChange={e => setForm(prev => ({ ...prev, total_pages: parseInt(e.target.value) || 0 }))}
                                    min={0}
                                    className="w-32 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                                <p className="text-xs text-slate-400 mt-1">Detectado automaticamente ao enviar o PDF</p>
                            </div>

                            {/* Error */}
                            {saveError && (
                                <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-sm font-bold">
                                    <AlertCircle size={16} /> {saveError}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 active:scale-95">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {editingApostila ? 'Salvar Alteracoes' : 'Criar Apostila'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
