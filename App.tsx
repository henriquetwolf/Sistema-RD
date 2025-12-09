import React, { useState, useEffect } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { ConfigPanel } from './components/ConfigPanel';
import { UploadPanel } from './components/UploadPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { SupabaseConfig, FileData, AppStep, UploadStatus } from './types';
import { parseCsvFile } from './utils/csvParser';
import { createSupabaseClient, batchUploadData } from './services/supabaseService';
import { CheckCircle, AlertTriangle, Loader2, Database } from 'lucide-react';
import clsx from 'clsx';

function App() {
  // State
  // Default to UPLOAD step now
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [config, setConfig] = useState<SupabaseConfig>({
    url: '',
    key: '',
    tableName: '',
    primaryKey: ''
  });
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Note: We removed the auto-load of single config on mount to allow the Preset system in ConfigPanel to handle it more gracefully.
  
  // Handlers
  const handleFilesSelected = async (files: File[]) => {
    setStatus('parsing');
    try {
      const parsedFiles = await Promise.all(files.map(parseCsvFile));
      
      // Basic validation: Check if all files have same headers
      if (parsedFiles.length > 1) {
          const firstHeaders = parsedFiles[0].headers.sort().join(',');
          for (let i = 1; i < parsedFiles.length; i++) {
              if (parsedFiles[i].headers.sort().join(',') !== firstHeaders) {
                  throw new Error(`O arquivo ${parsedFiles[i].fileName} tem colunas diferentes do primeiro arquivo.`);
              }
          }
      }
      
      setFilesData(parsedFiles);
      
      // Auto-suggest table name from file name if not already set
      if (!config.tableName && files.length > 0) {
          // Clean filename: remove extension, replace non-alphanumeric with underscore, lowercase
          const suggestedName = files[0].name
              .replace(/\.csv$/i, '')
              .replace(/[^a-zA-Z0-9_]/g, '_')
              .toLowerCase();
              
          setConfig(prev => ({ ...prev, tableName: suggestedName }));
      }

      setStep(AppStep.CONFIG); // Move to Config Step
      setStatus('idle');
    } catch (e: any) {
      setErrorMessage(e.message || "Erro ao ler arquivos CSV");
      setStatus('error');
    }
  };

  const handleConfigConfirm = () => {
    // ConfigPanel handles saving presets internally.
    // We just move to preview now that we have both Data and Config.
    setStep(AppStep.PREVIEW);
  };

  const handleSync = async () => {
    setStep(AppStep.SYNC);
    setStatus('uploading');
    setErrorMessage(null);
    setProgress(0);

    try {
      const client = createSupabaseClient(config.url, config.key);
      
      // Flatten data from all files
      const allRows = filesData.flatMap(f => f.data);
      
      await batchUploadData(client, config, allRows, (prog) => {
        setProgress(prog);
      });

      setStatus('success');
    } catch (e: any) {
      console.error(e);
      let msg = e.message || "Falha ao enviar dados para o Supabase.";
      
      // Check for specific type mismatch error
      if (msg.includes('invalid input syntax for type bigint') || msg.includes('invalid input syntax for type integer')) {
          msg = `ERRO DE TIPO: O banco de dados espera um número inteiro (bigint) na coluna, mas encontrou um valor decimal (ex: "0.01"). \n\nSOLUÇÃO: No painel do Supabase, exclua a tabela "${config.tableName}" e recrie-a utilizando o código SQL gerado na etapa "Preview & SQL". O novo código SQL detectará automaticamente o tipo correto (numeric).`;
      }
      // Check for RLS Policy error
      else if (msg.includes('row-level security policy') || msg.includes('new row violates row-level security policy')) {
         msg = `ERRO DE PERMISSÃO (RLS): O banco de dados bloqueou a gravação dos dados.\n\nSOLUÇÃO: A tabela está com a segurança ativada (RLS), mas não possui uma regra permitindo inserção.\n\nExecute o seguinte comando no SQL Editor do Supabase:\nCREATE POLICY "Acesso Total" ON "${config.tableName}" FOR ALL USING (true) WITH CHECK (true);`;
      }
      
      setErrorMessage(msg);
      setStatus('error');
    }
  };

  const resetProcess = () => {
    setStatus('idle');
    setStep(AppStep.UPLOAD);
    setFilesData([]);
    setProgress(0);
    setErrorMessage(null);
  };

  const goBackToConfig = () => {
      setStep(AppStep.CONFIG);
  };
  
  const goBackToUpload = () => {
      setStep(AppStep.UPLOAD);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 mb-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
               <Database size={18} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">CSV to Supabase</h1>
          </div>
          {step > AppStep.UPLOAD && (
            <button 
                onClick={resetProcess}
                className="text-sm text-slate-500 hover:text-indigo-600 transition"
            >
                Reiniciar
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4">
        
        <StepIndicator currentStep={step} />

        {/* Error Notification */}
        {errorMessage && (
            <div className="max-w-4xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg flex items-start gap-3 shadow-sm">
                <AlertTriangle className="shrink-0 mt-1" size={20} />
                <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">Ocorreu um erro na sincronização</h4>
                    <p className="text-sm whitespace-pre-line leading-relaxed">{errorMessage}</p>
                </div>
                <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400 hover:text-red-600 p-1">
                    <XIcon />
                </button>
            </div>
        )}

        {/* Render Step Content */}
        
        {step === AppStep.UPLOAD && (
          <UploadPanel 
            onFilesSelected={handleFilesSelected} 
            isLoading={status === 'parsing'}
          />
        )}

        {step === AppStep.CONFIG && (
          <ConfigPanel 
            config={config} 
            setConfig={setConfig} 
            onNext={handleConfigConfirm}
            onBack={goBackToUpload}
          />
        )}

        {step === AppStep.PREVIEW && (
          <PreviewPanel 
            files={filesData} 
            tableName={config.tableName}
            onSync={handleSync}
            onBack={goBackToConfig}
          />
        )}

        {step === AppStep.SYNC && (
          <div className="max-w-md mx-auto text-center bg-white p-12 rounded-xl shadow-sm border border-slate-200">
            {status === 'uploading' && (
                <>
                    <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Enviando dados...</h2>
                    <p className="text-slate-500 mb-6">Por favor, não feche a página.</p>
                    
                    <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
                        <div 
                            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <span className="text-sm font-semibold text-indigo-700">{progress}%</span>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Sucesso!</h2>
                    <p className="text-slate-500 mb-6">Todos os dados foram enviados para o Supabase.</p>
                    <button 
                        onClick={resetProcess}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition"
                    >
                        Enviar mais arquivos
                    </button>
                </>
            )}

             {status === 'error' && (
                <>
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Falha no Envio</h2>
                    <p className="text-slate-500 mb-6">Verifique a mensagem de erro acima.</p>
                    <button 
                        onClick={() => setStep(AppStep.CONFIG)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2 rounded-lg font-medium transition"
                    >
                        Revisar Configurações
                    </button>
                </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export default App;