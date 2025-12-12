import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw } from 'lucide-react';
import { appBackend } from '../services/appBackend';

interface SettingsManagerProps {
  onLogoChange: (newLogo: string | null) => void;
  currentLogo: string | null;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onLogoChange, currentLogo }) => {
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [isSaved, setIsSaved] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setIsSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (preview) {
      appBackend.saveAppLogo(preview);
      onLogoChange(preview);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleReset = () => {
      // Reset to Default VOLL logo
      const defaultLogo = "https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png";
      setPreview(defaultLogo);
      appBackend.saveAppLogo(defaultLogo);
      onLogoChange(defaultLogo);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
        <p className="text-slate-500 text-sm">Personalize a aparência e comportamento da aplicação.</p>
      </div>

      <div className="max-w-2xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Identidade Visual</h3>
          <p className="text-sm text-slate-500">Altere a logomarca exibida no canto superior esquerdo.</p>
        </div>

        <div className="p-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Preview Box */}
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pré-visualização</span>
                <div className="w-64 h-32 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
                    {preview ? (
                        <img src={preview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                    ) : (
                        <ImageIcon className="text-slate-300" size={48} />
                    )}
                </div>
            </div>

            {/* Upload Controls */}
            <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Nova Logo</label>
                <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                        <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-3 text-slate-400" />
                                <p className="text-sm text-slate-500"><span className="font-semibold">Clique para enviar</span></p>
                                <p className="text-xs text-slate-500">PNG, JPG ou GIF (Max. 2MB)</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </label>
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
             <button 
                onClick={handleReset}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"
             >
                <RotateCcw size={16} /> Restaurar Padrão
             </button>
             <button 
                onClick={handleSave}
                disabled={!preview || preview === currentLogo}
                className={isSaved 
                    ? "bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 pointer-events-none"
                    : "bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                }
             >
                {isSaved ? <><CheckCircle size={18} /> Salvo!</> : <><Save size={18} /> Salvar Alterações</>}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};