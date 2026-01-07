
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, Package, Building2, 
  ChevronRight, Inbox, Truck, Clock, CheckCircle2, User, Info,
  CheckSquare, Save, X, MessageSquare, TrendingDown, History, AlertCircle, LifeBuoy
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { PartnerStudioSession, InventoryRecord } from '../types';
import { SupportChannel } from './SupportChannel';
import clsx from 'clsx';

interface PartnerStudioAreaProps {
  studio: PartnerStudioSession;
  onLogout: () => void;
}

export const PartnerStudioArea: React.FC<PartnerStudioAreaProps> = ({ studio, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'inventory' | 'support'>('classes');
  const [classes, setClasses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studio]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: classesData } = await appBackend.client.from('crm_classes').select('*').eq('studio_mod_1', studio.fantasyName).order('date_mod_1', { ascending: true });
      const { data: invData } = await appBackend.client.from('crm_inventory').select('*').eq('studio_id', studio.id).eq('type', 'exit').order('registration_date', { ascending: false });
      setClasses(classesData || []);
      setInventory((invData || []).map((d: any) => ({
        id: d.id, type: d.type, itemApostilaNova: d.item_apostila_nova, itemApostilaClassico: d.item_apostila_classico, itemSacochila: d.item_sacochila, itemLapis: d.item_lapis, registrationDate: d.registration_date, studioId: d.studio_id, trackingCode: d.tracking_code, observations: d.observations || '', conferenceDate: d.conference_date || '', attachments: d.attachments
      })));
    } catch (e) {} finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold shadow-lg"><Building2 size={24} /></div>
             <div><h1 className="text-sm font-bold text-slate-800 leading-tight">{studio.fantasyName}</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Portal do Studio Parceiro</p></div>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><LogOut size={20} /></button>
      </header>

      <nav className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto flex">
              <button onClick={() => setActiveTab('classes')} className={clsx("px-8 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all", activeTab === 'classes' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-400")}>Minhas Turmas</button>
              <button onClick={() => setActiveTab('inventory')} className={clsx("px-8 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all", activeTab === 'inventory' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-400")}>Estoque Local</button>
              <button onClick={() => setActiveTab('support')} className={clsx("px-8 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all", activeTab === 'support' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-400")}>Falar com VOLL</button>
          </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={40} /></div> : (
            <div className="animate-in fade-in">
                {activeTab === 'classes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {classes.map(cls => (
                            <div key={cls.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div><h3 className="font-bold text-slate-800">{cls.course}</h3><p className="text-xs text-slate-500 mb-4">{cls.city}/{cls.state}</p></div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50"><span className="text-[10px] font-black uppercase text-teal-600">Mod 1: {new Date(cls.date_mod_1).toLocaleDateString()}</span><ChevronRight size={16} className="text-slate-300"/></div>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'inventory' && <div className="bg-white p-6 rounded-3xl border text-center text-slate-400 py-20"><Package size={48} className="mx-auto opacity-10 mb-4"/>Controle de estoque do studio disponível.</div>}
                {activeTab === 'support' && (
                    <div className="max-w-4xl mx-auto">
                        <SupportChannel userId={studio.id} userName={studio.fantasyName} userEmail={studio.email} userType="studio" />
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};
