
import React, { useState, useEffect } from 'react';
import { 
  Zap, Clock, Mail, Kanban, ArrowRight, Plus, X, Save, 
  Play, Pause, ChevronRight, Settings, Trash2, AlertCircle, 
  HelpCircle, CheckCircle2, Split, UserPlus, FileText, MousePointer2,
  // Fix: Add missing icon imports
  ArrowLeft, Loader2, Info
} from 'lucide-react';
import { AutomationFlow, AutomationNode, FormModel, NodeType } from '../types';
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

  const selectedNode = flow.nodes.find(n => n.id === selectedNodeId);

  const addNode = (parentIndex: number, type: NodeType, pathType: 'next' | 'yes' | 'no' = 'next') => {
    const newNode: AutomationNode = {
      id: crypto.randomUUID(),
      type,
      title: type === 'wait' ? 'Esperar tempo' : type === 'email' ? 'Enviar E-mail' : type === 'condition' ? 'Verificar Ação' : 'Ação CRM',
      config: type === 'wait' ? { days: 1, hours: 0 } : type === 'crm_action' ? { stage: 'negotiation' } : {}
    };

    const newNodes = [...flow.nodes, newNode];
    const parentNode = newNodes[parentIndex];
    
    if (pathType === 'next') parentNode.nextId = newNode.id;
    else if (pathType === 'yes') parentNode.yesId = newNode.id;
    else if (pathType === 'no') parentNode.noId = newNode.id;

    setFlow({ ...flow, nodes: newNodes });
    setSelectedNodeId(newNode.id);
  };

  const removeNode = (nodeId: string) => {
    if (window.confirm("Remover este passo e todos os seguintes?")) {
        const newNodes = flow.nodes.filter(n => n.id !== nodeId);
        // Limpar referências
        newNodes.forEach(n => {
            if (n.nextId === nodeId) delete n.nextId;
            if (n.yesId === nodeId) delete n.yesId;
            if (n.noId === nodeId) delete n.noId;
        });
        setFlow({ ...flow, nodes: newNodes });
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
      <div className="flex flex-col items-center">
        {/* O nó propriamente dito */}
        <div 
            onClick={() => setSelectedNodeId(node.id)}
            className={clsx(
                "w-64 p-4 rounded-xl border-2 transition-all cursor-pointer relative shadow-sm",
                isSelected ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100" : "border-slate-200 bg-white hover:border-slate-300"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={clsx(
                    "p-2 rounded-lg",
                    node.type === 'trigger' ? "bg-orange-100 text-orange-600" :
                    node.type === 'wait' ? "bg-blue-100 text-blue-600" :
                    node.type === 'email' ? "bg-purple-100 text-purple-600" :
                    node.type === 'condition' ? "bg-amber-100 text-amber-600" :
                    "bg-emerald-100 text-emerald-600"
                )}>
                    {node.type === 'trigger' && <Zap size={18}/>}
                    {node.type === 'wait' && <Clock size={18}/>}
                    {node.type === 'email' && <Mail size={18}/>}
                    {node.type === 'condition' && <Split size={18}/>}
                    {node.type === 'crm_action' && <Kanban size={18}/>}
                </div>
                <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{node.type.replace('_', ' ')}</p>
                    <h4 className="text-xs font-bold text-slate-800 truncate">{node.title}</h4>
                </div>
            </div>
            
            {isSelected && (
                <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="absolute -top-2 -right-2 bg-red-50 text-white p-1 rounded-full shadow-lg">
                    <X size={12}/>
                </button>
            )}
        </div>

        {/* Linha de conexão e botão de adicionar (se não for condição) */}
        {node.type !== 'condition' && (
            <div className="flex flex-col items-center">
                <div className="w-0.5 h-8 bg-slate-300"></div>
                {!node.nextId ? (
                    <div className="relative group">
                        <button className="bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-400 w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 border-slate-200">
                            <Plus size={16}/>
                        </button>
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white rounded-2xl shadow-2xl py-2 hidden group-hover:block z-50 animate-in zoom-in-95">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">Inserir Ação</p>
                            <button onClick={() => addNode(nodeIdx, 'wait')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 flex items-center gap-2"><Clock size={14}/> Espera</button>
                            <button onClick={() => addNode(nodeIdx, 'email')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 flex items-center gap-2"><Mail size={14}/> Enviar E-mail</button>
                            <button onClick={() => addNode(nodeIdx, 'condition')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 flex items-center gap-2"><Split size={14}/> Condição (SIM/NÃO)</button>
                            <button onClick={() => addNode(nodeIdx, 'crm_action')} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/10 flex items-center gap-2"><Kanban size={14}/> Ação no CRM</button>
                        </div>
                    </div>
                ) : renderNode(node.nextId, depth + 1)}
            </div>
        )}

        {/* Ramificações se for Condição */}
        {node.type === 'condition' && (
            <div className="flex gap-20 pt-8 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-120px)] h-0.5 bg-slate-300"></div>
                
                {/* Caminho SIM */}
                <div className="flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-slate-300 absolute left-[60px] top-0"></div>
                    <div className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-4 relative z-10">SIM</div>
                    {!node.yesId ? (
                         <button onClick={() => addNode(nodeIdx, 'email', 'yes')} className="bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-400 w-8 h-8 rounded-full flex items-center justify-center border-2 border-slate-200">
                            <Plus size={16}/>
                         </button>
                    ) : renderNode(node.yesId, depth + 1)}
                </div>

                {/* Caminho NÃO */}
                <div className="flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-slate-300 absolute right-[60px] top-0"></div>
                    <div className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-4 relative z-10">NÃO</div>
                    {!node.noId ? (
                         <button onClick={() => addNode(nodeIdx, 'wait', 'no')} className="bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-400 w-8 h-8 rounded-full flex items-center justify-center border-2 border-slate-200">
                            <Plus size={16}/>
                         </button>
                    ) : renderNode(node.noId, depth + 1)}
                </div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-slate-50 overflow-hidden animate-in fade-in">
        {/* Toolbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-50">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
                <div className="flex flex-col">
                    <input 
                        className="text-lg font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 outline-none"
                        value={flow.name}
                        onChange={e => setFlow({...flow, name: e.target.value})}
                    />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Editor de Fluxo Automático</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setFlow({...flow, isActive: !flow.isActive})}
                    className={clsx(
                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                        flow.isActive ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"
                    )}
                >
                    {flow.isActive ? <Play size={14}/> : <Pause size={14}/>}
                    {flow.isActive ? "Publicado" : "Rascunho"}
                </button>
                <button 
                    onClick={() => { setIsSaving(true); onSave(flow); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar
                </button>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            {/* Canvas Principal */}
            <main className="flex-1 overflow-auto p-12 bg-slate-100 relative custom-scrollbar">
                <div className="min-w-max flex justify-center pt-10">
                    {flow.nodes.length > 0 ? renderNode(flow.nodes[0].id) : (
                        <div className="text-center p-20 border-4 border-dashed border-slate-200 rounded-[3rem] text-slate-400">
                            <Zap size={48} className="mx-auto mb-4 opacity-10"/>
                            <p className="font-bold">Fluxo vazio.</p>
                            <button onClick={() => setFlow({...flow, nodes: [{ id: 'start', type: 'trigger', title: 'Entrada via Formulário', config: {} }]})} className="mt-4 text-indigo-600 font-bold hover:underline">Iniciar Fluxo</button>
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar de Propriedades */}
            <aside className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto shrink-0 shadow-xl z-40">
                {selectedNode ? (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Configurar Passo</h3>
                            <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título Exibição</label>
                            <input 
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                value={selectedNode.title}
                                onChange={e => setFlow({...flow, nodes: flow.nodes.map(n => n.id === selectedNode.id ? { ...n, title: e.target.value } : n)})}
                            />
                        </div>

                        {selectedNode.type === 'trigger' && (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-500 leading-relaxed"><Info size={14} className="inline mr-1 text-indigo-500"/> Este fluxo iniciará sempre que alguém enviar o formulário selecionado abaixo.</p>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Formulário de Entrada</label>
                                    <select 
                                        className="w-full px-4 py-2.5 border rounded-xl bg-white text-sm font-bold"
                                        value={flow.formId}
                                        onChange={e => setFlow({...flow, formId: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {availableForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedNode.type === 'wait' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Dias</label>
                                    <input type="number" className="w-full px-3 py-2 border rounded-xl" value={selectedNode.config.days} onChange={e => updateNodeConfig(selectedNode.id, { days: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horas</label>
                                    <input type="number" className="w-full px-3 py-2 border rounded-xl" value={selectedNode.config.hours} onChange={e => updateNodeConfig(selectedNode.id, { hours: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                        )}

                        {selectedNode.type === 'email' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Assunto do E-mail</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="Ex: Seja bem-vindo!" value={selectedNode.config.subject || ''} onChange={e => updateNodeConfig(selectedNode.id, { subject: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Conteúdo (Copy)</label>
                                    <textarea className="w-full px-3 py-2 border rounded-xl text-xs h-32 resize-none" value={selectedNode.config.body || ''} onChange={e => updateNodeConfig(selectedNode.id, { body: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {selectedNode.type === 'condition' && (
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Critério de Ramificação</label>
                                <select className="w-full border rounded-xl p-2 text-sm bg-white font-bold" value={selectedNode.config.check || ''} onChange={e => updateNodeConfig(selectedNode.id, { check: e.target.value })}>
                                    <option value="opened">Abriu o e-mail anterior</option>
                                    <option value="clicked">Clicou em algum link</option>
                                    <option value="replied">Respondeu ao contato</option>
                                </select>
                                <p className="text-[10px] text-slate-400 italic">O sistema verificará a ação por 24h antes de seguir pelo caminho NÃO.</p>
                            </div>
                        )}

                        {selectedNode.type === 'crm_action' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Mover p/ Etapa:</label>
                                    <select className="w-full border rounded-xl p-2 text-sm bg-white font-bold" value={selectedNode.config.stage || ''} onChange={e => updateNodeConfig(selectedNode.id, { stage: e.target.value })}>
                                        <option value="new">Novo Lead</option>
                                        <option value="contacted">Contatado</option>
                                        <option value="negotiation">Em Negociação</option>
                                        <option value="closed">Venda Fechada</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100 flex justify-center">
                            <button onClick={() => removeNode(selectedNode.id)} className="text-red-500 font-bold text-xs flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"><Trash2 size={14}/> Excluir este passo</button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
                        <MousePointer2 size={48} className="opacity-10"/>
                        <p className="text-sm font-medium px-4 leading-relaxed">Selecione um passo do fluxo no canvas para configurar as propriedades.</p>
                    </div>
                )}
            </aside>
        </div>
    </div>
  );
};
