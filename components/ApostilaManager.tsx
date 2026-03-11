import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
    ArrowLeft, Loader2, Plus, Trash2, Save, BookOpen,
    Upload, FileText, CheckCircle2, AlertCircle, X, Edit2, ToggleLeft, ToggleRight,
    Users, Search, UserPlus, UserMinus, Lock, Unlock
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { Apostila } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ApostilaManagerProps {
    onBack: () => void;
}

interface ApostilaAccessEntry {
    student_cpf: string;
    student_name: string;
    granted_at: string;
}

export const ApostilaManager: React.FC<ApostilaManagerProps> = ({ onBack }) => {
    const [activeSection, setActiveSection] = useState<'apostilas' | 'access'>('apostilas');
    const [apostilas, setApostilas] = useState<Apostila[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingApostila, setEditingApostila] = useState<Apostila | null>(null);
    const [form, setForm] = useState({ title: '', description: '', total_pages: 0 });
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfFileName, setPdfFileName] = useState('');
    const [existingPdfUrl, setExistingPdfUrl] = useState('');
    const [isCountingPages, setIsCountingPages] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Access Control State
    const [accessList, setAccessList] = useState<ApostilaAccessEntry[]>([]);
    const [accessSearch, setAccessSearch] = useState('');
    const [allStudents, setAllStudents] = useState<{ cpf: string; name: string; email: string; hasPresential: boolean }[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [isLoadingAccess, setIsLoadingAccess] = useState(false);
    const [isGranting, setIsGranting] = useState<string | null>(null);
    const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadApostilas(); }, []);
    useEffect(() => { if (activeSection === 'access') loadAccessData(); }, [activeSection]);

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
        setPdfFile(null);
        setPdfFileName('');
        setExistingPdfUrl('');
        setSaveError('');
        setShowModal(true);
    };

    const openEditModal = (a: Apostila) => {
        setEditingApostila(a);
        setForm({ title: a.title, description: a.description, total_pages: a.total_pages });
        setPdfFile(null);
        setPdfFileName('PDF atual mantido');
        setExistingPdfUrl(a.pdf_url);
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

        setPdfFile(file);
        setPdfFileName(file.name);
        setExistingPdfUrl('');
        setSaveError('');
        setIsCountingPages(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
            setForm(prev => ({ ...prev, total_pages: doc.numPages }));
        } catch (err) {
            console.error('Erro ao contar paginas:', err);
        }
        setIsCountingPages(false);

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        if (!form.title.trim()) { setSaveError('Informe o titulo da apostila.'); return; }
        if (!pdfFile && !existingPdfUrl) { setSaveError('Faca o upload do arquivo PDF.'); return; }

        setIsSaving(true);
        setSaveError('');
        try {
            let finalPdfUrl = existingPdfUrl;

            if (pdfFile) {
                finalPdfUrl = await appBackend.uploadApostilaPdf(pdfFile);
                if (editingApostila?.pdf_url) {
                    await appBackend.deleteApostilaPdf(editingApostila.pdf_url);
                }
            }

            await appBackend.upsertApostila({
                id: editingApostila?.id,
                title: form.title.trim(),
                description: form.description.trim(),
                pdf_url: finalPdfUrl,
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

    const loadAccessData = async () => {
        setIsLoadingAccess(true);
        try {
            const [accessRes, dealsRes] = await Promise.all([
                appBackend.getApostilaAccessList(),
                appBackend.client.from('crm_deals').select('cpf, contact_name, company_name, email, product_type, student_access_enabled').neq('status', 'excluido')
            ]);
            setAccessList(accessRes);

            const studentMap: Record<string, { cpf: string; name: string; email: string; hasPresential: boolean }> = {};
            (dealsRes.data || []).forEach((d: any) => {
                if (!d.cpf || d.student_access_enabled === false) return;
                const clean = d.cpf.replace(/\D/g, '');
                if (!clean) return;
                if (!studentMap[clean]) {
                    studentMap[clean] = { cpf: clean, name: d.company_name || d.contact_name || 'Sem Nome', email: d.email || '', hasPresential: false };
                }
                if (d.product_type === 'Presencial') studentMap[clean].hasPresential = true;
            });
            setAllStudents(Object.values(studentMap).sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) { console.error(e); }
        setIsLoadingAccess(false);
    };

    const handleGrantAccess = async (cpf: string, name: string) => {
        setIsGranting(cpf);
        try {
            await appBackend.grantApostilaAccess(cpf, name);
            await loadAccessData();
        } catch (e) { console.error(e); }
        setIsGranting(null);
    };

    const handleRevokeAccess = async (cpf: string) => {
        try {
            await appBackend.revokeApostilaAccess(cpf);
            setRevokeConfirm(null);
            await loadAccessData();
        } catch (e) { console.error(e); }
    };

    const formatCPF = (val: string) => {
        if (!val) return '';
        const n = val.replace(/\D/g, '');
        return n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
    };

    const accessCpfSet = useMemo(() => new Set(accessList.map(a => a.student_cpf)), [accessList]);

    const filteredAccessList = useMemo(() => {
        if (!accessSearch.trim()) return accessList;
        const q = accessSearch.toLowerCase();
        return accessList.filter(a => a.student_name.toLowerCase().includes(q) || a.student_cpf.includes(q.replace(/\D/g, '')));
    }, [accessList, accessSearch]);

    const filteredStudentsToGrant = useMemo(() => {
        if (!studentSearch.trim()) return [];
        const q = studentSearch.toLowerCase();
        return allStudents
            .filter(s => !s.hasPresential && !accessCpfSet.has(s.cpf))
            .filter(s => s.name.toLowerCase().includes(q) || s.cpf.includes(q.replace(/\D/g, '')) || s.email.toLowerCase().includes(q))
            .slice(0, 20);
    }, [allStudents, studentSearch, accessCpfSet]);

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
                        <p className="text-sm text-slate-500 mt-0.5">Gerencie as apostilas e controle de acesso dos alunos</p>
                    </div>
                </div>
                {activeSection === 'apostilas' && (
                    <button onClick={openNewModal} className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-600/20 transition-all active:scale-95">
                        <Plus size={18} /> Nova Apostila
                    </button>
                )}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
                <button onClick={() => setActiveSection('apostilas')} className={clsx("px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2", activeSection === 'apostilas' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    <BookOpen size={16} /> Apostilas
                </button>
                <button onClick={() => setActiveSection('access')} className={clsx("px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2", activeSection === 'access' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    <Users size={16} /> Acesso de Alunos
                </button>
            </div>

            {/* Success toast */}
            {saveSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle2 size={18} /> Apostila salva com sucesso!
                </div>
            )}

            {/* ── Seção: Apostilas ────────────────────────────── */}
            {activeSection === 'apostilas' && (
            <>
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
            </>
            )}

            {/* ── Seção: Acesso de Alunos ───────────────────── */}
            {activeSection === 'access' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
                        <p className="font-bold flex items-center gap-2 mb-1"><Unlock size={16} /> Regras de acesso à Apostila Digital</p>
                        <p className="text-amber-700">Alunos com <strong>curso presencial</strong> recebem acesso automaticamente. Use esta seção para liberar manualmente para outros alunos.</p>
                    </div>

                    {/* Search to grant */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2"><UserPlus size={16} className="text-rose-500" /> Liberar Acesso Manual</h3>
                        <div className="relative">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                placeholder="Busque pelo nome, CPF ou e-mail do aluno..."
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            />
                        </div>

                        {filteredStudentsToGrant.length > 0 && (
                            <div className="mt-3 border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                                {filteredStudentsToGrant.map(s => (
                                    <div key={s.cpf} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{s.name}</p>
                                            <p className="text-xs text-slate-400">{formatCPF(s.cpf)} &middot; {s.email}</p>
                                        </div>
                                        <button
                                            onClick={() => handleGrantAccess(s.cpf, s.name)}
                                            disabled={isGranting === s.cpf}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            {isGranting === s.cpf ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />}
                                            Liberar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {studentSearch.trim() && filteredStudentsToGrant.length === 0 && (
                            <p className="text-xs text-slate-400 mt-3 text-center py-2">Nenhum aluno encontrado sem acesso automático.</p>
                        )}
                    </div>

                    {/* Current access list */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2"><Users size={16} className="text-indigo-500" /> Acessos Manuais Liberados ({accessList.length})</h3>
                            {accessList.length > 5 && (
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" value={accessSearch} onChange={e => setAccessSearch(e.target.value)} placeholder="Filtrar..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-48 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                                </div>
                            )}
                        </div>

                        {isLoadingAccess ? (
                            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-rose-500" size={28} /></div>
                        ) : filteredAccessList.length === 0 ? (
                            <div className="py-12 text-center text-slate-300">
                                <Lock size={36} className="mx-auto mb-3 opacity-20" />
                                <p className="font-bold">Nenhum acesso manual liberado</p>
                                <p className="text-xs mt-1">Use a busca acima para liberar alunos.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 max-h-96 overflow-y-auto">
                                {filteredAccessList.map(a => (
                                    <div key={a.student_cpf} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{a.student_name || 'Sem Nome'}</p>
                                            <p className="text-xs text-slate-400">{formatCPF(a.student_cpf)} &middot; Liberado em {new Date(a.granted_at).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        {revokeConfirm === a.student_cpf ? (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleRevokeAccess(a.student_cpf)} className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700">Revogar</button>
                                                <button onClick={() => setRevokeConfirm(null)} className="px-2.5 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setRevokeConfirm(a.student_cpf)} className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors">
                                                <UserMinus size={13} /> Remover
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                                {(pdfFile || existingPdfUrl) ? (
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
                                        <button onClick={() => { setPdfFile(null); setPdfFileName(''); setExistingPdfUrl(''); setForm(prev => ({ ...prev, total_pages: 0 })); }} className="p-1.5 hover:bg-rose-100 rounded-lg transition-colors text-rose-400">
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
