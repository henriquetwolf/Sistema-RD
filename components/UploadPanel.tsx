import React, { useRef, useState } from 'react';
import { Upload, FileType, X } from 'lucide-react';
import clsx from 'clsx';

interface UploadPanelProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onFilesSelected, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFiles(Array.from(e.target.files));
    }
  };

  const validateAndPassFiles = (files: File[]) => {
    const csvFiles = files.filter(f => f.type === 'text/csv' || f.name.endsWith('.csv'));
    if (csvFiles.length > 0) {
      onFilesSelected(csvFiles);
    } else {
      alert('Por favor, selecione apenas arquivos CSV.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out cursor-pointer",
          dragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 hover:border-indigo-400 bg-white"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          multiple
          accept=".csv"
          onChange={handleChange}
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center animate-pulse">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
               <FileType className="animate-bounce" size={32} />
            </div>
            <p className="text-lg font-medium text-slate-700">Processando arquivos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
             <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
              <Upload size={32} />
            </div>
            <p className="text-lg font-medium text-slate-700 mb-1">
              Arraste e solte seus arquivos CSV aqui
            </p>
            <p className="text-sm text-slate-500">
              ou clique para selecionar arquivos do computador
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
