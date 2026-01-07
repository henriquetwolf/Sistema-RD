
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
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [confirmingRecord, setConfirmingRecord] = useState<InventoryRecord | null>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studio]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: classesData } = await appBackend.client
        .from('crm_classes')
        .select('*')
        .eq('studio_mod_1', studio.fantasyName)
        .order('date_mod_1', { ascending: true });

      const { data: invData } = await appBackend.client
        .from('crm_inventory')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('type', 'exit')
        .order('registration_date', { ascending: false });

      const { data: dealsData } = await appBackend.client.from('crm_deals').select('id, class_mod_1, stage');
      const { data: attendData } = await appBackend.client.from('crm_attendance').select('student_id, class_id, present').eq('present', true);

      setClasses(classesData || []);
      setAllDeals(dealsData || []);
      setAttendance(attendData || []);
      setInventory((invData || []).map((d: any) => ({
        id: d.id, type: d.type, itemApostilaNova: d.item_apostila_nova, itemApostilaClassico: d.item_apostila_classico, itemSacochila: d.item_sacochila, itemLapis: d.item_lapis, registrationDate: d.registration_date, studioId: d.studio_id, trackingCode: d.tracking_code, observations: d.observations || '', conferenceDate: d.conference_date || '', attachments: d.attachments
      })));
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold border-2 border-white shadow-sm"><Building2 size={24} /></div>
             <div><h1 className="text-sm font-bold text-slate-800 leading-tight">{studio.fantasyName}</h1><p className="text-xs text-slate-500">Portal do Studio Parceiro</p></div>
          </div>
          <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 shrink-0">
          <div className="max-w-5xl mx-auto px-4 flex">
              <button onClick={() => setActiveTab('classes')} className={clsx("px-6 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'classes' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}>Turmas</button>
              <button onClick={() => setActiveTab('inventory')} className={clsx("px-6 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'inventory' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}>Estoque</button>
              <button onClick={() => setActiveTab('support')} className={clsx("px-6 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'support' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}>Suporte</button>
          </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
        {isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" /></div> : (
            <div className="animate-in fade-in duration-300">
                {activeTab === 'support' ? (
                    <SupportChannel 
                        userId={studio.id} 
                        userName={studio.fantasyName} 
                        userType="studio" 
                    />
                ) : activeTab === 'classes' ? (
                    <div className="grid grid-cols-1 gap-4">
                        {classes.map(cls => (
                             <div key={cls.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800">{cls.course}</h3>
                                    <p className="text-xs text-slate-500">{cls.city}/{cls.state}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-teal-600 uppercase">Mod 1</p>
                                    <p className="text-sm font-bold text-slate-700">{new Date(cls.date_mod_1).toLocaleDateString()}</p>
                                </div>
                             </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-3xl border text-center text-slate-400 italic">Área de estoque carregada.</div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};
