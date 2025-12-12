import React, { useRef, useState, useEffect } from 'react';
import { Contract, ContractSigner } from '../types';
import { appBackend } from '../services/appBackend';
import { PenTool, CheckCircle, Loader2, Eraser, Calendar, User, MapPin, Type, MousePointer2 } from 'lucide-react';
import clsx from 'clsx';

interface ContractSigningProps {
  contract: Contract;
}

export const ContractSigning: React.FC<ContractSigningProps> = ({ contract: initialContract }) => {
  const [contract, setContract] = useState<Contract>(initialContract);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Selection State (Who is signing?)
  const [currentSignerId, setCurrentSignerId] = useState<string | null>(null);
  
  // Signing State
  const [signatureMode, setSignatureMode] = useState<'type' | 'draw'>('type'); // Default to auto-type
  const [signatureFont, setSignatureFont] = useState<'dancing' | 'vibes'>('vibes'); // Font style
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const activeSigner = contract.signers.find(s => s.id === currentSignerId);
  const pendingSigners = contract.signers.filter(s => s.status === 'pending');
  const allSigned = contract.status === 'signed';

  // --- AUTOMATIC SIGNATURE LOGIC ---
  const generateAutoSignature = () => {
      const canvas = canvasRef.current;
      if (!canvas || !activeSigner) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Settings based on selected font
      if (signatureFont === 'dancing') {
          ctx.font = "50px 'Dancing Script', cursive";
      } else {
          // Great Vibes usually renders slightly smaller/lighter, bump size slightly
          ctx.font = "65px 'Great Vibes', cursive"; 
      }
      
      ctx.fillStyle = "#0f172a"; // Slate-900
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Draw Name
      ctx.fillText(activeSigner.name, canvas.width / 2, canvas.height / 2);
      
      setHasSignature(true);
  };

  // --- EFFECT: Setup Canvas & Auto Sign ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && currentSignerId && !allSigned) {
      // Set canvas size to match parent container width
      const parent = canvas.parentElement;
      if (parent) {
        // Need to set actual width/height attributes, not just CSS
        canvas.width = parent.clientWidth;
        canvas.height = 200; 
      }
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }

      // If mode is 'type', generate immediately
      if (signatureMode === 'type') {
          // Small timeout to ensure font load/layout
          setTimeout(generateAutoSignature, 100);
      }
    }
  }, [currentSignerId, allSigned, signatureMode, signatureFont]); // Re-run when font changes

  // --- DRAWING HANDLERS ---
  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    if (signatureMode !== 'draw') return;
    setIsDrawing(true);
    const { x, y } = getPos(e.nativeEvent);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing || signatureMode !== 'draw') return;
    e.preventDefault(); // Prevent scrolling on touch
    const { x, y } = getPos(e.nativeEvent);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasSignature) setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleModeSwitch = (mode: 'type' | 'draw') => {
      setSignatureMode(mode);
      if (mode === 'draw') {
          // Clear auto signature when switching to draw so user has a blank slate
          setTimeout(clearSignature, 10);
      }
  };

  const handleSubmit = async () => {
    if (!hasSignature || !currentSignerId) {
        alert("Por favor, assine no campo indicado.");
        return;
    }
    
    setIsSubmitting(true);
    const signatureData = canvasRef.current?.toDataURL() || '';
    
    try {
        await appBackend.signContract(contract.id, currentSignerId, signatureData);
        // Refresh local state to show signature immediately
        const updatedSigners = contract.signers.map(s => s.id === currentSignerId ? { ...s, status: 'signed' as const, signatureData, signedAt: new Date().toISOString() } : s);
        
        // Check if all signed
        const nowAllSigned = updatedSigners.every(s => s.status === 'signed');

        setContract({
            ...contract,
            signers: updatedSigners,
            status: nowAllSigned ? 'signed' : 'sent'
        });
        
        setCurrentSignerId(null); // Reset selection
        setHasSignature(false);

    } catch (e) {
        alert("Erro ao salvar assinatura. Tente novamente.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 flex flex-col items-center">
      <div className="bg-white max-w-4xl w-full rounded-xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">{contract.title}</h1>
            <p className="text-slate-400 text-sm">
                Documento emitido em {new Date(contract.createdAt).toLocaleDateString()}
            </p>
            {allSigned && (
                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold mt-4 border border-green-500/30">
                    <CheckCircle size={14} /> DOCUMENTO FINALIZADO
                </div>
            )}
        </div>

        {/* Content Body */}
        <div className="p-8 md:p-12 space-y-8">
            
            {/* Step 1: Select Signer (if not all signed and no one selected) */}
            {!allSigned && !currentSignerId && (
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl text-center">
                    <h3 className="font-bold text-indigo-900 text-lg mb-2">Quem está assinando?</h3>
                    <p className="text-indigo-700 text-sm mb-6">Por favor, selecione seu nome na lista abaixo para prosseguir com a assinatura.</p>
                    
                    <div className="flex flex-wrap gap-3 justify-center">
                        {pendingSigners.map(signer => (
                            <button
                                key={signer.id}
                                onClick={() => setCurrentSignerId(signer.id)}
                                className="bg-white hover:bg-white/80 border-2 border-indigo-200 hover:border-indigo-400 text-indigo-800 font-medium px-6 py-3 rounded-lg shadow-sm transition-all flex flex-col items-center min-w-[150px]"
                            >
                                <span className="text-sm font-bold">{signer.name}</span>
                                <span className="text-xs text-indigo-400">{signer.email}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-indigo-100">
                        <p className="text-xs text-indigo-400">
                            {contract.signers.filter(s => s.status === 'signed').length} de {contract.signers.length} assinaturas coletadas.
                        </p>
                    </div>
                </div>
            )}

            {/* Contract Text */}
            <div className="prose prose-slate max-w-none text-slate-700 bg-slate-50 p-8 rounded-lg border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-serif shadow-inner">
                {contract.content}
            </div>

            {/* Contract Footer (Date/City) */}
            <div className="text-center font-serif text-slate-800 mt-8">
                 <p>{contract.city}, {new Date(contract.contractDate).toLocaleDateString()}</p>
            </div>

            <div className="border-t border-slate-200 pt-8">
                <h3 className="font-bold text-slate-800 mb-8 flex items-center gap-2">
                    <PenTool className="text-teal-600" /> Assinaturas
                </h3>

                {/* Grid of Signatures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {contract.signers.map(signer => (
                        <div key={signer.id} className="flex flex-col items-center">
                             <div className="h-[120px] w-full border-b border-slate-800 mb-2 flex items-end justify-center relative">
                                {signer.status === 'signed' && signer.signatureData ? (
                                    <img src={signer.signatureData} alt={`Assinatura de ${signer.name}`} className="max-h-[100px] z-10" />
                                ) : (
                                    <span className="text-slate-300 text-xs italic mb-4">Aguardando assinatura...</span>
                                )}
                             </div>
                             <p className="font-bold text-slate-800 text-sm">{signer.name}</p>
                             <p className="text-xs text-slate-500">{signer.email}</p>
                        </div>
                    ))}
                </div>

                {/* Signature Area (Only if a signer is selected) */}
                {currentSignerId && activeSigner && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 mt-12 bg-slate-50 p-6 rounded-xl border border-slate-200">
                         <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                            <div>
                                <h4 className="font-bold text-slate-800">Assinar como: <span className="text-teal-600">{activeSigner.name}</span></h4>
                                <p className="text-xs text-slate-500 mb-3">
                                    {signatureMode === 'type' ? 'Assinatura gerada automaticamente.' : 'Desenhe sua assinatura no quadro.'}
                                </p>
                                
                                {signatureMode === 'type' && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setSignatureFont('vibes')}
                                            className={clsx("text-xs px-3 py-1 border rounded-md font-medium transition-all", signatureFont === 'vibes' ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-slate-200 text-slate-600")}
                                        >
                                            Estilo 1 (Elegante)
                                        </button>
                                        <button 
                                            onClick={() => setSignatureFont('dancing')}
                                            className={clsx("text-xs px-3 py-1 border rounded-md font-medium transition-all", signatureFont === 'dancing' ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-slate-200 text-slate-600")}
                                        >
                                            Estilo 2 (Moderno)
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-lg shrink-0">
                                <button 
                                    onClick={() => handleModeSwitch('type')}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all",
                                        signatureMode === 'type' ? "bg-white shadow text-teal-700" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <Type size={14} /> Automático
                                </button>
                                <button 
                                    onClick={() => handleModeSwitch('draw')}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all",
                                        signatureMode === 'draw' ? "bg-white shadow text-teal-700" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <MousePointer2 size={14} /> Desenhar
                                </button>
                            </div>
                         </div>

                        <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white hover:border-teal-400 transition-colors">
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className={clsx("w-full block h-[200px]", signatureMode === 'draw' ? "cursor-crosshair touch-none" : "cursor-default")}
                            />
                            
                            <div className="absolute bottom-2 right-2 flex gap-2">
                                <button 
                                    onClick={() => setCurrentSignerId(null)} 
                                    className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm border border-slate-200"
                                >
                                    Cancelar
                                </button>
                                {signatureMode === 'draw' && (
                                    <button 
                                        onClick={clearSignature}
                                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm border border-slate-200"
                                    >
                                        <Eraser size={12} /> Limpar
                                    </button>
                                )}
                            </div>
                            <div className="absolute top-1/2 left-4 right-4 h-px bg-slate-200 pointer-events-none -z-0"></div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !hasSignature}
                                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all w-full md:w-auto justify-center"
                            >
                                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <PenTool size={20} />}
                                Confirmar Assinatura Digital
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        <div className="mt-8 text-center text-slate-400 text-xs pb-10">
            <p>Sistema VOLL Pilates Group &copy; {new Date().getFullYear()}</p>
            <p>Autenticação digital segura</p>
        </div>
      </div>
    </div>
  );
};