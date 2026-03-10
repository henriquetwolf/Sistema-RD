import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Canvas as FabricCanvas, PencilBrush, Textbox, Rect, Circle, Line, Group, FabricObject } from 'fabric';
import { appBackend } from '../services/appBackend';
import { Apostila, ApostilaAnnotation } from '../types';
import {
    Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Pen, Type, Highlighter,
    StickyNote, Eraser, Square, CircleIcon, Minus, Undo2, Redo2, Save, Bookmark,
    BookOpen, Eye, Palette, LayoutList
} from 'lucide-react';
import clsx from 'clsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';

interface DigitalWorkbookProps {
    studentCpf: string;
}

type ToolType = 'select' | 'pen' | 'highlighter' | 'text' | 'sticky' | 'eraser' | 'rect' | 'circle' | 'line';

const PEN_COLORS = ['#1e293b', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];
const PEN_WIDTHS = [2, 4, 8];
const HIGHLIGHTER_COLORS = ['#fde047', '#86efac', '#93c5fd', '#fca5a5', '#d8b4fe'];

export const DigitalWorkbook: React.FC<DigitalWorkbookProps> = ({ studentCpf }) => {
    const [apostilas, setApostilas] = useState<Apostila[]>([]);
    const [selectedApostila, setSelectedApostila] = useState<Apostila | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.2);
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [penColor, setPenColor] = useState(PEN_COLORS[0]);
    const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1]);
    const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);

    const [annotations, setAnnotations] = useState<Map<number, ApostilaAnnotation>>(new Map());
    const [pagesVisited, setPagesVisited] = useState<Set<number>>(new Set());
    const [bookmarkedPages, setBookmarkedPages] = useState<Set<number>>(new Set());

    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [sidebarTab, setSidebarTab] = useState<'pages' | 'bookmarks'>('pages');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pageThumbnails, setPageThumbnails] = useState<Map<number, string>>(new Map());
    const [isRenderingPdf, setIsRenderingPdf] = useState(false);
    const [goToPageInput, setGoToPageInput] = useState('');

    const [undoStack, setUndoStack] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);

    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<FabricCanvas | null>(null);
    const fabricCanvasElRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfDocRef = useRef<any>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentPageRef = useRef(currentPage);
    const isLoadingAnnotationRef = useRef(false);

    currentPageRef.current = currentPage;

    // ── Load apostilas list ──────────────────────────────────
    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const list = await appBackend.getApostilas(true);
            setApostilas(list);
            if (list.length === 1) {
                setSelectedApostila(list[0]);
            }
            setIsLoading(false);
        })();
    }, []);

    // ── Load PDF when apostila is selected ───────────────────
    useEffect(() => {
        if (!selectedApostila) return;
        (async () => {
            setIsLoading(true);
            setLoadError('');
            try {
                const response = await fetch(selectedApostila.pdf_url);
                if (!response.ok) throw new Error(`HTTP ${response.status} ao baixar PDF`);
                const arrayBuffer = await response.arrayBuffer();
                const pdfData = new Uint8Array(arrayBuffer);

                const doc = await pdfjsLib.getDocument({ data: pdfData }).promise;
                pdfDocRef.current = doc;
                setTotalPages(doc.numPages);

                const [annots, prog] = await Promise.all([
                    appBackend.getApostilaAnnotations(selectedApostila.id, studentCpf),
                    appBackend.getApostilaProgress(selectedApostila.id, studentCpf),
                ]);

                const annotMap = new Map<number, ApostilaAnnotation>();
                const bmSet = new Set<number>();
                annots.forEach(a => {
                    annotMap.set(a.page_number, a);
                    if (a.bookmarked) bmSet.add(a.page_number);
                });
                setAnnotations(annotMap);
                setBookmarkedPages(bmSet);

                const visitedSet = new Set<number>(prog?.pages_visited || []);
                setPagesVisited(visitedSet);

                const startPage = prog?.last_page || 1;
                setCurrentPage(startPage);

                generateThumbnails(doc, Math.min(doc.numPages, 50));
            } catch (err: any) {
                console.error('[Apostila] Erro ao carregar PDF:', err);
                setLoadError(err.message || 'Erro ao carregar o PDF.');
            }
            setIsLoading(false);
        })();

        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, [selectedApostila]);

    // ── Render current page ──────────────────────────────────
    useEffect(() => {
        if (!pdfDocRef.current || !pdfCanvasRef.current || totalPages === 0) return;
        renderPage(currentPage);
    }, [currentPage, scale, totalPages]);

    // ── Track visited pages ──────────────────────────────────
    useEffect(() => {
        if (!selectedApostila || totalPages === 0) return;
        setPagesVisited(prev => {
            const next = new Set(prev);
            next.add(currentPage);
            return next;
        });
    }, [currentPage, selectedApostila, totalPages]);

    // ── Auto-save timer ──────────────────────────────────────
    useEffect(() => {
        if (!hasUnsavedChanges || !selectedApostila) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            saveCurrentAnnotations();
        }, 5000);
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [hasUnsavedChanges, selectedApostila]);

    // ── Tool change ──────────────────────────────────────────
    useEffect(() => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;

        if (activeTool === 'pen') {
            fc.isDrawingMode = true;
            const brush = new PencilBrush(fc);
            brush.color = penColor;
            brush.width = penWidth;
            fc.freeDrawingBrush = brush;
        } else if (activeTool === 'highlighter') {
            fc.isDrawingMode = true;
            const brush = new PencilBrush(fc);
            brush.color = highlighterColor + '66';
            brush.width = 20;
            fc.freeDrawingBrush = brush;
        } else if (activeTool === 'eraser') {
            fc.isDrawingMode = false;
            fc.selection = false;
        } else {
            fc.isDrawingMode = false;
            fc.selection = activeTool === 'select';
        }
    }, [activeTool, penColor, penWidth, highlighterColor]);

    // ── Keyboard shortcuts ───────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveCurrentAnnotations();
            } else if (e.key === 'ArrowRight' && !e.ctrlKey) {
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    goToPage(currentPageRef.current + 1);
                }
            } else if (e.key === 'ArrowLeft' && !e.ctrlKey) {
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    goToPage(currentPageRef.current - 1);
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    deleteSelectedObjects();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const generateThumbnails = async (doc: any, maxPages: number) => {
        const thumbs = new Map<number, string>();
        for (let i = 1; i <= maxPages; i++) {
            try {
                const page = await doc.getPage(i);
                const vp = page.getViewport({ scale: 0.2 });
                const c = document.createElement('canvas');
                c.width = vp.width;
                c.height = vp.height;
                const ctx = c.getContext('2d')!;
                await page.render({ canvasContext: ctx, viewport: vp }).promise;
                thumbs.set(i, c.toDataURL('image/jpeg', 0.5));
            } catch { /* skip */ }
        }
        setPageThumbnails(thumbs);
    };

    const renderPage = async (pageNum: number) => {
        if (!pdfDocRef.current || !pdfCanvasRef.current || isRenderingPdf) return;
        setIsRenderingPdf(true);

        try {
            await saveCurrentFabricState();

            const page = await pdfDocRef.current.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const canvas = pdfCanvasRef.current;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d')!;
            await page.render({ canvasContext: ctx, viewport }).promise;

            initFabricCanvas(viewport.width, viewport.height, pageNum);
        } catch (err) {
            console.error('[Apostila] Erro ao renderizar página:', err);
        }
        setIsRenderingPdf(false);
    };

    const initFabricCanvas = (width: number, height: number, pageNum: number) => {
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
            fabricCanvasRef.current = null;
        }

        const el = fabricCanvasElRef.current;
        if (!el) return;

        el.width = width;
        el.height = height;

        const fc = new FabricCanvas(el, {
            width,
            height,
            selection: activeTool === 'select',
            isDrawingMode: activeTool === 'pen' || activeTool === 'highlighter',
        });

        fc.on('object:added', () => {
            if (!isLoadingAnnotationRef.current) {
                pushUndo(fc);
                setHasUnsavedChanges(true);
            }
        });
        fc.on('object:modified', () => {
            if (!isLoadingAnnotationRef.current) {
                pushUndo(fc);
                setHasUnsavedChanges(true);
            }
        });
        fc.on('object:removed', () => {
            if (!isLoadingAnnotationRef.current) {
                pushUndo(fc);
                setHasUnsavedChanges(true);
            }
        });

        fc.on('mouse:down', (opt) => {
            if (activeTool === 'eraser' && opt.target) {
                fc.remove(opt.target);
                fc.requestRenderAll();
            }
        });

        fabricCanvasRef.current = fc;
        loadAnnotationForPage(fc, pageNum);

        if (activeTool === 'pen') {
            fc.isDrawingMode = true;
            const brush = new PencilBrush(fc);
            brush.color = penColor;
            brush.width = penWidth;
            fc.freeDrawingBrush = brush;
        } else if (activeTool === 'highlighter') {
            fc.isDrawingMode = true;
            const brush = new PencilBrush(fc);
            brush.color = highlighterColor + '66';
            brush.width = 20;
            fc.freeDrawingBrush = brush;
        }
    };

    const loadAnnotationForPage = (fc: FabricCanvas, pageNum: number) => {
        const annot = annotations.get(pageNum);
        if (!annot?.fabric_json || !annot.fabric_json.objects?.length) return;

        isLoadingAnnotationRef.current = true;
        fc.loadFromJSON(annot.fabric_json).then(() => {
            fc.requestRenderAll();
            isLoadingAnnotationRef.current = false;
        }).catch(() => {
            isLoadingAnnotationRef.current = false;
        });
    };

    const pushUndo = (fc: FabricCanvas) => {
        const json = JSON.stringify(fc.toJSON());
        setUndoStack(prev => [...prev.slice(-30), json]);
        setRedoStack([]);
    };

    const handleUndo = () => {
        const fc = fabricCanvasRef.current;
        if (!fc || undoStack.length === 0) return;

        const currentState = JSON.stringify(fc.toJSON());
        setRedoStack(prev => [...prev, currentState]);

        const prevState = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));

        isLoadingAnnotationRef.current = true;
        fc.loadFromJSON(JSON.parse(prevState)).then(() => {
            fc.requestRenderAll();
            isLoadingAnnotationRef.current = false;
            setHasUnsavedChanges(true);
        });
    };

    const handleRedo = () => {
        const fc = fabricCanvasRef.current;
        if (!fc || redoStack.length === 0) return;

        const currentState = JSON.stringify(fc.toJSON());
        setUndoStack(prev => [...prev, currentState]);

        const nextState = redoStack[redoStack.length - 1];
        setRedoStack(prev => prev.slice(0, -1));

        isLoadingAnnotationRef.current = true;
        fc.loadFromJSON(JSON.parse(nextState)).then(() => {
            fc.requestRenderAll();
            isLoadingAnnotationRef.current = false;
            setHasUnsavedChanges(true);
        });
    };

    const deleteSelectedObjects = () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObjects();
        if (active.length > 0) {
            active.forEach(obj => fc.remove(obj));
            fc.discardActiveObject();
            fc.requestRenderAll();
        }
    };

    const saveCurrentFabricState = async () => {
        const fc = fabricCanvasRef.current;
        if (!fc || !selectedApostila) return;

        const json = fc.toJSON();
        const pageNum = currentPageRef.current;

        setAnnotations(prev => {
            const next = new Map(prev);
            const existing = next.get(pageNum);
            next.set(pageNum, {
                id: existing?.id || '',
                apostila_id: selectedApostila.id,
                student_cpf: studentCpf,
                page_number: pageNum,
                fabric_json: json,
                bookmarked: existing?.bookmarked || false,
                updated_at: new Date().toISOString(),
            });
            return next;
        });
    };

    const saveCurrentAnnotations = async () => {
        if (!selectedApostila || isSaving) return;
        setIsSaving(true);

        try {
            await saveCurrentFabricState();

            const fc = fabricCanvasRef.current;
            const currentJson = fc ? fc.toJSON() : annotations.get(currentPage)?.fabric_json;

            if (currentJson) {
                await appBackend.saveApostilaAnnotation({
                    apostila_id: selectedApostila.id,
                    student_cpf: studentCpf,
                    page_number: currentPage,
                    fabric_json: currentJson,
                    bookmarked: bookmarkedPages.has(currentPage),
                });
            }

            const visitedArr = Array.from(pagesVisited);
            await appBackend.saveApostilaProgress({
                apostila_id: selectedApostila.id,
                student_cpf: studentCpf,
                last_page: currentPage,
                pages_visited: visitedArr,
            });

            setHasUnsavedChanges(false);
        } catch (err) {
            console.error('[Apostila] Erro ao salvar:', err);
        }
        setIsSaving(false);
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        setCurrentPage(page);
    };

    const handleGoToPageSubmit = () => {
        const num = parseInt(goToPageInput);
        if (!isNaN(num)) goToPage(num);
        setGoToPageInput('');
    };

    const toggleBookmark = async () => {
        if (!selectedApostila) return;
        const isBookmarked = bookmarkedPages.has(currentPage);
        setBookmarkedPages(prev => {
            const next = new Set(prev);
            if (isBookmarked) next.delete(currentPage);
            else next.add(currentPage);
            return next;
        });
        await appBackend.toggleApostilaBookmark(selectedApostila.id, studentCpf, currentPage, !isBookmarked);
    };

    const addTextBox = () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const text = new Textbox('Escreva aqui...', {
            left: 100,
            top: 100,
            width: 250,
            fontSize: 16,
            fill: penColor,
            fontFamily: 'sans-serif',
            editable: true,
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: 8,
        });
        fc.add(text);
        fc.setActiveObject(text);
        fc.requestRenderAll();
        setActiveTool('select');
    };

    const addStickyNote = () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const bg = new Rect({
            width: 200,
            height: 150,
            fill: '#fef08a',
            rx: 8,
            ry: 8,
            shadow: '2px 2px 6px rgba(0,0,0,0.15)',
            selectable: false,
            evented: false,
        });
        const text = new Textbox('Nota...', {
            width: 180,
            fontSize: 14,
            fill: '#713f12',
            fontFamily: 'sans-serif',
            editable: true,
            padding: 10,
        });
        const group = new Group([bg, text], {
            left: 120,
            top: 120,
        });
        fc.add(group);
        fc.setActiveObject(group);
        fc.requestRenderAll();
        setActiveTool('select');
    };

    const addShape = (type: 'rect' | 'circle' | 'line') => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;

        let shape: FabricObject;
        if (type === 'rect') {
            shape = new Rect({ left: 100, top: 100, width: 120, height: 80, fill: 'transparent', stroke: penColor, strokeWidth: 2 });
        } else if (type === 'circle') {
            shape = new Circle({ left: 100, top: 100, radius: 50, fill: 'transparent', stroke: penColor, strokeWidth: 2 });
        } else {
            shape = new Line([100, 100, 300, 100], { stroke: penColor, strokeWidth: 2 });
        }

        fc.add(shape);
        fc.setActiveObject(shape);
        fc.requestRenderAll();
        setActiveTool('select');
    };

    const progressPercent = totalPages > 0 ? Math.round((pagesVisited.size / totalPages) * 100) : 0;
    const annotatedPages = useMemo(() => {
        const set = new Set<number>();
        annotations.forEach((v, k) => {
            if (v.fabric_json?.objects?.length > 0) set.add(k);
        });
        return set;
    }, [annotations]);

    // ── Apostila selection screen ────────────────────────────
    if (!selectedApostila) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 rounded-[2.5rem] p-10 text-white shadow-xl">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-white/20 rounded-2xl"><BookOpen size={28} /></div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Apostila Digital</h1>
                            <p className="text-white/70 text-sm font-medium mt-1">Estude de forma interativa - desenhe, escreva e anote diretamente na sua apostila</p>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-600" size={32} /></div>
                ) : apostilas.length === 0 ? (
                    <div className="py-20 bg-white rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-slate-300">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">Nenhuma apostila disponivel no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {apostilas.map(a => (
                            <button key={a.id} onClick={() => setSelectedApostila(a)} className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-rose-300 hover:shadow-lg transition-all text-left group">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 group-hover:bg-rose-100 transition-colors">
                                        <BookOpen size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-800 text-lg">{a.title}</h3>
                                        {a.description && <p className="text-slate-500 text-sm mt-1 line-clamp-2">{a.description}</p>}
                                        <p className="text-xs text-slate-400 mt-2 font-bold">{a.total_pages} paginas</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── Loading state ────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-rose-600" size={40} />
                <p className="text-slate-500 font-bold text-sm">Carregando apostila... (pode levar alguns segundos)</p>
            </div>
        );
    }

    // ── Error state ──────────────────────────────────────────
    if (loadError) {
        return (
            <div className="max-w-lg mx-auto py-20 text-center space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-bold">
                    Erro ao carregar a apostila: {loadError}
                </div>
                <button onClick={() => setSelectedApostila(null)} className="text-sm text-slate-500 hover:text-slate-700 font-bold underline">
                    Voltar
                </button>
            </div>
        );
    }

    // ── Main workbook view ───────────────────────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-220px)] bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => { saveCurrentAnnotations(); setSelectedApostila(null); }} className="text-slate-400 hover:text-slate-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="font-black text-slate-800 text-sm truncate max-w-[200px]">{selectedApostila.title}</h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        {currentPage} / {totalPages}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Progress */}
                    <div className="hidden md:flex items-center gap-2 mr-4">
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500">{progressPercent}%</span>
                    </div>

                    {/* Zoom */}
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500" title="Diminuir zoom"><ZoomOut size={16} /></button>
                    <span className="text-[10px] font-black text-slate-500 w-10 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500" title="Aumentar zoom"><ZoomIn size={16} /></button>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Bookmark */}
                    <button onClick={toggleBookmark} className={clsx("p-2 rounded-xl transition-colors", bookmarkedPages.has(currentPage) ? "bg-amber-50 text-amber-500" : "text-slate-400 hover:bg-slate-100")} title="Favoritar pagina">
                        <Bookmark size={16} fill={bookmarkedPages.has(currentPage) ? 'currentColor' : 'none'} />
                    </button>

                    {/* Sidebar toggle */}
                    <button onClick={() => setShowSidebar(!showSidebar)} className={clsx("p-2 rounded-xl transition-colors", showSidebar ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:bg-slate-100")} title="Painel lateral">
                        <LayoutList size={16} />
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Save */}
                    <button onClick={saveCurrentAnnotations} disabled={isSaving} className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all", hasUnsavedChanges ? "bg-rose-600 text-white hover:bg-rose-700 shadow-sm" : "bg-slate-100 text-slate-500")}>
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Salvar
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                {showSidebar && (
                    <div className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0">
                        <div className="flex border-b border-slate-100">
                            <button onClick={() => setSidebarTab('pages')} className={clsx("flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors", sidebarTab === 'pages' ? "text-rose-600 border-b-2 border-rose-600" : "text-slate-400")}>
                                Paginas
                            </button>
                            <button onClick={() => setSidebarTab('bookmarks')} className={clsx("flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors", sidebarTab === 'bookmarks' ? "text-amber-600 border-b-2 border-amber-600" : "text-slate-400")}>
                                Favoritos
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                            {sidebarTab === 'pages' ? (
                                Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} onClick={() => goToPage(p)} className={clsx("w-full rounded-xl overflow-hidden border-2 transition-all relative group", currentPage === p ? "border-rose-500 shadow-md" : "border-transparent hover:border-slate-300")}>
                                        {pageThumbnails.get(p) ? (
                                            <img src={pageThumbnails.get(p)} alt={`Pag ${p}`} className="w-full" />
                                        ) : (
                                            <div className="w-full aspect-[3/4] bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">{p}</div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 flex items-center justify-between">
                                            <span className="text-[9px] font-black text-white">{p}</span>
                                            <div className="flex gap-1">
                                                {annotatedPages.has(p) && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Anotada" />}
                                                {bookmarkedPages.has(p) && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Favorita" />}
                                                {pagesVisited.has(p) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Visitada" />}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                Array.from(bookmarkedPages).sort((a, b) => a - b).length === 0 ? (
                                    <div className="py-10 text-center text-slate-300 text-xs font-bold">Nenhum favorito</div>
                                ) : (
                                    Array.from(bookmarkedPages).sort((a, b) => a - b).map(p => (
                                        <button key={p} onClick={() => goToPage(p)} className={clsx("w-full rounded-xl overflow-hidden border-2 transition-all", currentPage === p ? "border-amber-500 shadow-md" : "border-transparent hover:border-slate-300")}>
                                            {pageThumbnails.get(p) ? (
                                                <img src={pageThumbnails.get(p)} alt={`Pag ${p}`} className="w-full" />
                                            ) : (
                                                <div className="w-full aspect-[3/4] bg-amber-50 flex items-center justify-center text-amber-500 text-xs font-bold">{p}</div>
                                            )}
                                            <div className="text-center py-1 bg-amber-50 text-[9px] font-black text-amber-600">Pag. {p}</div>
                                        </button>
                                    ))
                                )
                            )}
                        </div>
                    </div>
                )}

                {/* Main PDF + Canvas area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto shrink-0">
                        <ToolButton icon={<Eye size={16} />} label="Selecionar" active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <ToolButton icon={<Pen size={16} />} label="Caneta" active={activeTool === 'pen'} onClick={() => setActiveTool('pen')} />
                        <ToolButton icon={<Highlighter size={16} />} label="Marca-texto" active={activeTool === 'highlighter'} onClick={() => setActiveTool('highlighter')} />
                        <ToolButton icon={<Eraser size={16} />} label="Borracha" active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <ToolButton icon={<Type size={16} />} label="Texto" active={false} onClick={addTextBox} />
                        <ToolButton icon={<StickyNote size={16} />} label="Post-it" active={false} onClick={addStickyNote} />

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <ToolButton icon={<Square size={16} />} label="Retangulo" active={false} onClick={() => addShape('rect')} />
                        <ToolButton icon={<CircleIcon size={16} />} label="Circulo" active={false} onClick={() => addShape('circle')} />
                        <ToolButton icon={<Minus size={16} />} label="Linha" active={false} onClick={() => addShape('line')} />

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        {/* Color picker for pen */}
                        {(activeTool === 'pen' || activeTool === 'highlighter') && (
                            <div className="relative">
                                <button onClick={() => setShowColorPicker(!showColorPicker)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                    <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: activeTool === 'pen' ? penColor : highlighterColor }} />
                                    <Palette size={14} className="text-slate-400" />
                                </button>
                                {showColorPicker && (
                                    <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex gap-1.5 mb-2">
                                            {(activeTool === 'pen' ? PEN_COLORS : HIGHLIGHTER_COLORS).map(c => (
                                                <button key={c} onClick={() => { activeTool === 'pen' ? setPenColor(c) : setHighlighterColor(c); setShowColorPicker(false); }} className={clsx("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110", (activeTool === 'pen' ? penColor : highlighterColor) === c ? "border-slate-800 scale-110" : "border-slate-200")}>
                                                    <div className="w-full h-full rounded-full" style={{ backgroundColor: c + (activeTool === 'highlighter' ? '66' : '') }} />
                                                </button>
                                            ))}
                                        </div>
                                        {activeTool === 'pen' && (
                                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                {PEN_WIDTHS.map(w => (
                                                    <button key={w} onClick={() => { setPenWidth(w); setShowColorPicker(false); }} className={clsx("flex items-center justify-center w-8 h-8 rounded-lg transition-colors", penWidth === w ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                                                        <div className="rounded-full bg-current" style={{ width: w * 2, height: w * 2 }} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex-1" />

                        <ToolButton icon={<Undo2 size={16} />} label="Desfazer (Ctrl+Z)" active={false} onClick={handleUndo} disabled={undoStack.length === 0} />
                        <ToolButton icon={<Redo2 size={16} />} label="Refazer (Ctrl+Y)" active={false} onClick={handleRedo} disabled={redoStack.length === 0} />
                    </div>

                    {/* Canvas area */}
                    <div ref={containerRef} className="flex-1 overflow-auto bg-slate-100 flex items-start justify-center p-6" style={{ scrollbarWidth: 'thin' }}>
                        <div className="relative shadow-2xl rounded-lg overflow-hidden">
                            <canvas ref={pdfCanvasRef} className="block" />
                            <canvas
                                ref={fabricCanvasElRef}
                                className="absolute top-0 left-0"
                                style={{ cursor: activeTool === 'eraser' ? 'crosshair' : activeTool === 'pen' || activeTool === 'highlighter' ? 'crosshair' : 'default' }}
                            />
                        </div>
                    </div>

                    {/* Bottom navigation */}
                    <div className="flex items-center justify-center gap-3 px-4 py-3 bg-white border-t border-slate-200 shrink-0">
                        <button onClick={() => goToPage(1)} disabled={currentPage <= 1} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            Inicio
                        </button>
                        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={goToPageInput}
                                onChange={e => setGoToPageInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGoToPageSubmit()}
                                placeholder={String(currentPage)}
                                className="w-12 text-center text-sm font-black border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            />
                            <span className="text-xs text-slate-400 font-bold">de {totalPages}</span>
                        </div>

                        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronRight size={18} />
                        </button>
                        <button onClick={() => goToPage(totalPages)} disabled={currentPage >= totalPages} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            Fim
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function ToolButton({ icon, label, active, onClick, disabled }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={clsx(
                "p-2 rounded-xl transition-all",
                active ? "bg-rose-100 text-rose-700 shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                disabled && "opacity-30 cursor-not-allowed"
            )}
        >
            {icon}
        </button>
    );
}
