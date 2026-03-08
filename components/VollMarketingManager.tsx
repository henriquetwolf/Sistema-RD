import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone, LayoutDashboard, Mail, FileText, MousePointerClick, Globe, Link2, Share2,
  Zap, MessageCircle, Smartphone, Bell, Users, Filter, BarChart3, Settings2,
  ArrowLeft, ChevronRight, Target, TrendingUp, Send, Sparkles, Eye, UserPlus
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { MarketingDashboard } from './marketing/MarketingDashboard';
import { EmailMarketingManager } from './marketing/EmailMarketingManager';
import { MarketingAutomationBuilder } from './marketing/MarketingAutomationBuilder';
import { LeadManager } from './marketing/LeadManager';
import { SegmentBuilder } from './marketing/SegmentBuilder';
import { MarketingAnalytics } from './marketing/MarketingAnalytics';
import { SocialMediaManager } from './marketing/SocialMediaManager';
import { LinkBioManager } from './marketing/LinkBioManager';
import { PopupManager } from './marketing/PopupManager';
import { WhatsAppButtonManager } from './marketing/WhatsAppButtonManager';
import { WhatsAppMarketingManager } from './marketing/WhatsAppMarketingManager';
import { SmsMarketingManager } from './marketing/SmsMarketingManager';
import { WebPushManager } from './marketing/WebPushManager';
import { CrmIntegrationConfig } from './marketing/CrmIntegrationConfig';
import { LandingPageManager } from './LandingPageManager';
import { FormsManager } from './FormsManager';

type MarketingModule =
  | 'dashboard'
  | 'social_media' | 'link_bio'
  | 'landing_pages' | 'forms' | 'popups' | 'wa_button'
  | 'email' | 'automation' | 'wa_marketing' | 'sms' | 'web_push'
  | 'leads' | 'segments'
  | 'analytics'
  | 'crm_integration';

interface SidebarItem {
  id: MarketingModule;
  label: string;
  icon: React.ReactNode;
  pillar?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'social_media', label: 'Redes Sociais', icon: <Share2 size={18} />, pillar: 'ATRAIR' },
  { id: 'link_bio', label: 'Link da Bio', icon: <Link2 size={18} />, pillar: 'ATRAIR' },
  { id: 'landing_pages', label: 'Landing Pages', icon: <Globe size={18} />, pillar: 'CONVERTER' },
  { id: 'forms', label: 'Formulários', icon: <FileText size={18} />, pillar: 'CONVERTER' },
  { id: 'popups', label: 'Pop-ups', icon: <MousePointerClick size={18} />, pillar: 'CONVERTER' },
  { id: 'wa_button', label: 'Botão WhatsApp', icon: <MessageCircle size={18} />, pillar: 'CONVERTER' },
  { id: 'email', label: 'Email Marketing', icon: <Mail size={18} />, pillar: 'RELACIONAR' },
  { id: 'automation', label: 'Automação', icon: <Zap size={18} />, pillar: 'RELACIONAR' },
  { id: 'wa_marketing', label: 'WhatsApp Marketing', icon: <Send size={18} />, pillar: 'RELACIONAR' },
  { id: 'sms', label: 'SMS', icon: <Smartphone size={18} />, pillar: 'RELACIONAR' },
  { id: 'web_push', label: 'Web Push', icon: <Bell size={18} />, pillar: 'RELACIONAR' },
  { id: 'leads', label: 'Gestão de Leads', icon: <Users size={18} />, pillar: 'APRIMORAR' },
  { id: 'segments', label: 'Segmentação', icon: <Filter size={18} />, pillar: 'APRIMORAR' },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, pillar: 'ANALISAR' },
  { id: 'crm_integration', label: 'Integração CRM', icon: <Settings2 size={18} /> },
];

const PILLAR_COLORS: Record<string, string> = {
  'ATRAIR': 'text-blue-500',
  'CONVERTER': 'text-green-500',
  'RELACIONAR': 'text-purple-500',
  'APRIMORAR': 'text-amber-500',
  'ANALISAR': 'text-rose-500',
};

interface Props {
  onBack: () => void;
}

export const VollMarketingManager: React.FC<Props> = ({ onBack }) => {
  const [activeModule, setActiveModule] = useState<MarketingModule>('dashboard');
  const [quickStats, setQuickStats] = useState({ leads: 0, emails: 0, automations: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadQuickStats();
  }, []);

  const loadQuickStats = async () => {
    const [leads, campaigns, autos] = await Promise.all([
      appBackend.getMarketingLeads(),
      appBackend.getEmailCampaigns(),
      appBackend.getMarketingAutomations(),
    ]);
    setQuickStats({
      leads: leads.length,
      emails: campaigns.filter((c: any) => c.status === 'sent').length,
      automations: autos.filter((a: any) => a.status === 'active').length,
    });
  };

  const groupedItems = useMemo(() => {
    const groups: { pillar: string | null; items: SidebarItem[] }[] = [];
    let currentPillar: string | null | undefined = undefined;
    for (const item of SIDEBAR_ITEMS) {
      if (item.pillar !== currentPillar) {
        currentPillar = item.pillar;
        groups.push({ pillar: item.pillar || null, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, []);

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard': return <MarketingDashboard onNavigate={setActiveModule} />;
      case 'social_media': return <SocialMediaManager />;
      case 'link_bio': return <LinkBioManager />;
      case 'landing_pages': return <LandingPageManager onBack={() => setActiveModule('dashboard')} />;
      case 'forms': return <FormsManager onBack={() => setActiveModule('dashboard')} />;
      case 'popups': return <PopupManager />;
      case 'wa_button': return <WhatsAppButtonManager />;
      case 'email': return <EmailMarketingManager />;
      case 'automation': return <MarketingAutomationBuilder />;
      case 'wa_marketing': return <WhatsAppMarketingManager />;
      case 'sms': return <SmsMarketingManager />;
      case 'web_push': return <WebPushManager />;
      case 'leads': return <LeadManager />;
      case 'segments': return <SegmentBuilder />;
      case 'analytics': return <MarketingAnalytics />;
      case 'crm_integration': return <CrmIntegrationConfig />;
      default: return <MarketingDashboard onNavigate={setActiveModule} />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md border border-white/30">
              <Megaphone size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">VOLL Marketing</h1>
              <p className="text-purple-200 text-xs font-medium">Plataforma completa de Marketing Digital</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
            <UserPlus size={14} />
            <span>{quickStats.leads} leads</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
            <Mail size={14} />
            <span>{quickStats.emails} enviados</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
            <Zap size={14} />
            <span>{quickStats.automations} ativas</span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={clsx(
          "bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-60"
        )} style={{ height: 'calc(100vh - 76px)' }}>
          <div className="p-2 sticky top-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
            >
              <ChevronRight size={16} className={clsx("transition-transform", !sidebarCollapsed && "rotate-180")} />
            </button>
          </div>
          <nav className="px-2 pb-4 space-y-1">
            {groupedItems.map((group, gi) => (
              <div key={gi}>
                {group.pillar && !sidebarCollapsed && (
                  <div className={clsx("px-3 pt-4 pb-1 text-[10px] font-black uppercase tracking-[0.15em]", PILLAR_COLORS[group.pillar] || 'text-slate-400')}>
                    {group.pillar}
                  </div>
                )}
                {group.pillar && sidebarCollapsed && (
                  <div className="border-t border-slate-100 my-2" />
                )}
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={clsx(
                      "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all",
                      sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2",
                      activeModule === item.id
                        ? "bg-purple-50 text-purple-700 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {item.icon}
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-6 bg-slate-50" style={{ height: 'calc(100vh - 76px)' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
