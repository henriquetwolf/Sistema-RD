
import React, { useState, useEffect } from 'react';
import { 
  Zap, Clock, Mail, Kanban, ArrowRight, Plus, X, Save, 
  Play, Pause, ChevronRight, Settings, Trash2, AlertCircle, 
  HelpCircle, CheckCircle2, Split, UserPlus, FileText, MousePointer2,
  ArrowLeft, Loader2, Info, MessageCircle
} from 'lucide-react';
import { AutomationFlow, AutomationNode, FormModel, NodeType, Pipeline } from '../types';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface AutomationFlowEditorProps {
  flow: AutomationFlow;
  onBack: () => void;
  onSave: (flow: AutomationFlow) => void;
  availableForms: FormModel[];
}

export const AutomationFlowEditor: React.FC<AutomationFlowEditorProps> = ({ flow: initialFlow, onBack, onSave, availableForms }) => {
  const [flow, setFlow] = useState<AutomationFlow>(initialFlow);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  useEffect(() => {
      appBackend.getPipelines().then(setPipelines);
  }, []);

  const selectedNode = flow.nodes.find(n => n.id === selectedNodeId);

  const addNode = (parentIndex: number, type: NodeType, pathType: 'next' | 'yes' | 'no' = 'next') => {
    const newNode: AutomationNode = {
      id: crypto.randomUUID(),
      type,
      title: 
        type === 'wait' ? 'Esperar tempo' : 
        type === 'email' ? 'Enviar E-mail' : 
        type === 'whatsapp' ? 'Enviar WhatsApp' : 
        type === 'condition' ? 'Verificar Ação' : 'Ação CRM',
      config: 
        type === 'wait' ? { days: 1, hours: 0 } : 
        type === 'crm_action' ? { stage: 'negotiation' } : {}
    };

    const newNodes = [...flow.nodes, newNode];
    const parentNode = { ...newNodes[parentIndex] };
    
    if (pathType === 'next') parentNode.nextId = newNode.id;
    else if (pathType === 'yes') parentNode.yesId = newNode.id;
    else if (pathType === 'no') parentNode.noId = newNode.id;

    newNodes[parentIndex] = parentNode;
    setFlow({ ...flow, nodes: newNodes });
    setSelectedNodeId(newNode.id);
  };

  const removeNode = (nodeId: string) => {
    if (window.confirm("Remover este passo e todos os seguintes vinculados a ele?")) {
        const newNodes = flow.nodes.filter(n => n.id !== nodeId);
        // Limpar referências no pai
        const updatedNodes = newNodes.map(n => {
            const updated = { ...n };
            if (updated.nextId === nodeId) delete updated.nextId;
            if (updated.yesId === nodeId) delete updated.yesId;
            if (updated.noId === nodeId) delete updated.noId;
            return updated;
        });
        setFlow({ ...flow, nodes: updatedNodes });
        setSelectedNodeId(null);
    }
  };

  const updateNodeConfig = (nodeId: string, config: any) => {
      setFlow(prev => ({
          ...prev,
          nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n)
      }));
  };

  const renderNode = (nodeId: string, depth = 0) => {
    const node = flow.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const isSelected = selectedNodeId === node.id;
    const nodeIdx = flow.nodes.findIndex(n => n.id === nodeId);

    return (
      <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-300">
        {/* Bloco do Nó */}
        <div 
            onClick={() => setSelectedNodeId(node.id)}
            className={clsx(
                "w-64 p-4 rounded-2xl border-2 transition-all cursor-pointer relative shadow-sm",
                isSelected ? "border-indigo-600 bg-indigo-50 ring-4 ring-indigo-100 z-20" : "border-slate-200 bg-white hover:border-slate-300 z-10"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={clsx(
                    "p-2 rounded-xl shadow-sm",
                    node.type === 'trigger' ? "bg-orange-100 text-orange-600" :
                    node.type === 'wait' ? "bg-blue-100 text-blue-600" :
                    node.type === 'email' ? "bg-purple-100 text-purple-600" :
                    node.type === 'whatsapp' ? "bg-emerald-100 text-emerald-600" :
                    node.type === 'condition' ? "bg-amber-100 text-amber-600" :
                    "bg-indigo-100 text-indigo-600"
                )}>
                    {node.type === 'trigger' && <Zap size={20}/>}
                    {node.type === 'wait' && <Clock size={20}/>}
                    {node.type === 'email' && <Mail size={20}/>}
                    {node.type === 'whatsapp' && <MessageCircle size={20}/>}
                    {node.type === 'condition' && <Split size={20}/>}
                    {node.type === 'crm_action' && <Kanban size={20}/>}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{node.type.replace('_', ' ')}</p>
                    <h4 className="text-xs font-black text-slate-800 truncate">{node.title}</h4>
                </div>
            </div>
            
            {isSelected && node.type !== 'trigger' && (
                <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors">
                    <X size={12}/>
                </button>
            )}
        </div>

        {/* Conexão e Próximo Nó */}
        {node.type !== 'condition' ? (
            <div className="flex flex-col items-center">
                <div className="w-0.5 h-10 bg-slate-300"></div>
                {!node.nextId ? (
                    <div className="relative group">
                        <button className="bg-white hover:bg-indigo-600 hover:text-white text-slate-400 w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 border-slate-200 shadow-sm active:scale-95">
                            <Plus size={20}/>
                        </button>
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 bg-slate-900 text-white rounded-3xl shadow-2xl py-2 hidden group-hover:block z-[100] animate-in zoom-in-95 p-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-2 border-b border-white/10 pb-1">Adicionar Ação</p>
                            <button onClick={() => addNode(nodeIdx, 'wait')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"><Clock size={16} className="text-blue-400"/> Esperar Tempo</button>
                            <button onClick={() => addNode(nodeIdx, 'email')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"><Mail size={16} className="text-purple-400"/> Enviar E-mail</button>
                            <button onClick={() => addNode(nodeIdx, 'whatsapp')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"><MessageCircle size={16} className="text-emerald-400"/> Enviar WhatsApp</button>
                            <button onClick={() => addNode(nodeIdx, 'condition')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"><Split size={16} className="text-amber-400"/> Condição Lógica</button>
                            <button onClick={() => addNode(nodeIdx, 'crm_action')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors"><Kanban size={16} className="text-indigo-400"/> Ação no CRM</button>
                        </div>
                    </div>
                ) : renderNode(node.nextId, depth + 1)}
            </div>
        ) : (
            <div className="flex gap-24 pt-10 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-120px)] h-0.5 bg-slate-300"></div>
                
                {/* Ramificação SIM */}
                <div className="flex flex-col items-center relative">
                    <div className="w-0.5 h-10 bg-slate-300 absolute -top-10"></div>
                    <div className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full mb-4 relative z-10 border border-green-200">SUCESSO (SIM)</div>
                    {!node.yesId ? (
                         <button onClick={() => addNode(nodeIdx, 'email', 'yes')} className="bg-white hover:bg-green-600 hover:text-white text-slate-400 w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-200 shadow-sm transition-all active:scale-95">
                            <Plus size={20}/>
                         </button>
                    ) : renderNode(node.yesId, depth + 1)}
                </div>

                {/* Ramificação NÃO */}
                <div className="flex flex-col items-center relative">
                    <div className="w-0.5 h-10 bg-slate-300 absolute -top-10"></div>
                    <div className="bg-red-100 text-red-700 text-[10px] font-black px-3 py-1 rounded-full mb-4 relative z-10 border border-red-200">NEGATIVO (NÃO)</div>
                    {!node.noId ? (
                         <button onClick={() => addNode(nodeIdx, 'wait', 'no')} className="bg-white hover:bg-red-600 hover:text-white text-slate-400 w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-200 shadow-sm transition-all active:scale-95">
                            <Plus size={20}/>
                         </button>
                    ) : renderNode(node.noId, depth + 1)}
                </div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-hidden animate-in fade-in">
        {/* Toolbar Superior */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm z-50">
            <div className="flex items-center gap-6">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={24}/></button>
                <div className="flex flex-col">
                    <input 
                        className="text-2xl font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 outline-none w-full max-w-lg"
                        value={flow.name}
                        onChange={e => setFlow({...flow, name: e.target.value})}
                        placeholder="Nome do Fluxo de Automação"
                    />
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Editor de Workflow</span>
                        {flow.isActive ? <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Publicado</span> : <span className="bg-slate-200 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Rascunho</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setFlow({...flow, isActive: !flow.isActive})}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm border",
                        flow.isActive ? "bg-green-600 text-white border-green-700" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                >
                    {flow.isActive ? <Play size={16}/> : <Pause size={16}/>}
                    {flow.isActive ? "Ativado" : "Pausado"}
                </button>
                <button 
                    onClick={() => { setIsSaving(true); onSave(flow); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl font-black text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Fluxo
                </button>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            {/* Canvas Principal */}
            <main className="flex-1 overflow-auto p-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 relative custom-scrollbar flex flex-col items-center">
                <div className="min-w-max pb-[200px]">
                    {flow.nodes.length > 0 ? renderNode(flow.nodes[0].id) : (
                        <div className="text-center p-32 border-4 border-dashed border-slate-200 rounded-[4rem] text-slate-400 bg-white shadow-inner">
                            <Zap size={64} className="mx-auto mb-6 opacity-10 animate-pulse"/>
                            <h3 className="text-xl font-black text-slate-600 mb-2">Configure o Ponto de Entrada</h3>
                            <p className="text-sm font-medium mb-8">Defina qual formulário irá disparar esta jornada.</p>
                            <button 
                                onClick={() => setFlow({...flow, nodes: [{ id: 'trigger_root', type: 'trigger', title: 'Entrada via Formulário', config: {} }]})} 
                                className="bg-indigo-600 text-white px-12 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                Começar Agora
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar de Propriedades */}
            <aside className="w-[400px] bg-white border-l border-slate-200 p-8 overflow-y-auto shrink-0 shadow-2xl z-40">
                {selectedNode ? (
                    <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-50 rounded-2xl text-indigo-600"><Settings size={20}/></div>
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Configurar Passo</h3>
                            </div>
                            <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"><X size={24}/></button>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Título de Exibição Interna</label>
                            <input 
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                value={selectedNode.title}
                                onChange={e => setFlow({...flow, nodes: flow.nodes.map(n => n.id === selectedNode.id ? { ...n, title: e.target.value } : n)})}
                            />
                        </div>

                        {selectedNode.type === 'trigger' && (
                            <div className="space-y-6">
                                <div className="p-5 bg-orange-50 border border-orange-100 rounded-3xl flex gap-4 text-xs text-orange-800">
                                    <Info size={24} className="shrink-0 text-orange-500" />
                                    <p>O fluxo inicia sempre que um contato enviar o formulário selecionado abaixo.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Formulário de Entrada</label>
                                    <select 
                                        className="w-full px-5 py-4 border-2 border-slate-100 bg-white rounded-2xl text-sm font-black appearance-none cursor-pointer focus:border-indigo-500 outline-none"
                                        value={flow.formId}
                                        onChange={e => setFlow({...flow, formId: e.target.value})}
                                    >
                                        <option value="">Selecione um formulário...</option>
                                        {availableForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedNode.type === 'wait' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Dias</label>
                                    <input type="number" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl font-black bg-slate-50" value={selectedNode.config.days || 0} onChange={e => updateNodeConfig(selectedNode.id, { days: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Horas</label>
                                    <input type="number" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl font-black bg-slate-50" value={selectedNode.config.hours || 0} onChange={e => updateNodeConfig(selectedNode.id, { hours: parseInt(e.target.value) || 0 })} />
                                </div>
                                <p className="col-span-2 text-[10px] text-slate-400 italic text-center">* O lead aguardará este tempo antes de prosseguir para o próximo nó.</p>
                            </div>
                        )}

                        {selectedNode.type === 'email' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Assunto do E-mail</label>
                                    <input type="text" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm font-bold bg-slate-50" placeholder="Ex: Olá {{nome_cliente}}, seja bem-vindo!" value={selectedNode.config.subject || ''} onChange={e => updateNodeConfig(selectedNode.id, { subject: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Corpo da Mensagem (HTML)</label>
                                    <textarea className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm h-64 resize-none bg-slate-50 focus:bg-white outline-none leading-relaxed" value={selectedNode.config.body || ''} onChange={e => updateNodeConfig(selectedNode.id, { body: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {selectedNode.type === 'whatsapp' && (
                            <div className="space-y-6">
                                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex gap-4 text-xs text-emerald-800">
                                    <MessageCircle size={24} className="shrink-0 text-emerald-500" />
                                    <p>Esta mensagem será enviada via API para o número cadastrado no formulário.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Conteúdo da Mensagem (WhatsApp)</label>
                                    <textarea className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm h-64 resize-none bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none leading-relaxed transition-all" value={selectedNode.config.message || ''} onChange={e => updateNodeConfig(selectedNode.id, { message: e.target.value })} placeholder="Olá {{nome_cliente}}, obrigado pelo interesse! ..." />
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Tags:</span>
                                        <code className="text-[9px] font-bold text-slate-500">{"{{nome_cliente}}"}</code>
                                        <code className="text-[9px] font-bold text-slate-500">{"{{email}}"}</code>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedNode.type === 'condition' && (
                            <div className="space-y-6">
                                <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 text-xs text-amber-800 flex gap-3">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p>O sistema verificará o critério abaixo. Se atendido em até 24h, segue o caminho <strong>SIM</strong>, caso contrário, <strong>NÃO</strong>.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Critério de Avaliação</label>
                                    <select className="w-full px-5 py-4 border-2 border-slate-100 bg-white rounded-2xl text-sm font-black appearance-none" value={selectedNode.config.check || ''} onChange={e => updateNodeConfig(selectedNode.id, { check: e.target.value })}>
                                        <option value="opened">Abriu o e-mail anterior</option>
                                        <option value="clicked">Clicou em link no e-mail</option>
                                        <option value="replied">Respondeu ao contato</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedNode.type === 'crm_action' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Funil de Vendas</label>
                                    <select className="w-full px-5 py-4 border-2 border-slate-100 bg-white rounded-2xl text-sm font-black" value={selectedNode.config.pipeline || ''} onChange={e => updateNodeConfig(selectedNode.id, { pipeline: e.target.value, stage: '' })}>
                                        <option value="">Selecione o funil...</option>
                                        {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Mover p/ Etapa</label>
                                    <select className="w-full px-5 py-4 border-2 border-slate-100 bg-white rounded-2xl text-sm font-black" value={selectedNode.config.stage || ''} onChange={e => updateNodeConfig(selectedNode.id, { stage: e.target.value })}>
                                        <option value="">Selecione a etapa...</option>
                                        {(pipelines.find(p => p.name === selectedNode.config.pipeline)?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="pt-10 border-t border-slate-100 flex justify-center">
                            <button onClick={() => removeNode(selectedNode.id)} className="text-red-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 px-6 py-3 rounded-2xl transition-all"><Trash2 size={16}/> Excluir este passo</button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-300 space-y-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200"><MousePointer2 size={40} className="opacity-20"/></div>
                        <p className="text-sm font-bold max-w-[200px] leading-relaxed">Selecione um passo no canvas para configurar as propriedades.</p>
                    </div>
                )}
            </aside>
        </div>
    </div>
  );
};
