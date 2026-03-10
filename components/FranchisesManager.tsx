
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, Plus, Search, MoreVertical, MapPin, Phone, Mail, 
  ArrowLeft, Save, X, Edit2, Trash2, Loader2, Calendar, FileText, 
  DollarSign, User, Building, Map as MapIcon, List,
  Navigation, AlertTriangle, CheckCircle, Briefcase, Globe, Info, Ruler, Dumbbell,
  AlertCircle, ShieldCheck, Crosshair, HelpCircle, MapPinned, Sparkles, Presentation,
  Video, CalendarDays, Clock, Ban, Settings2, ExternalLink, ChevronLeft, ChevronRight, Trash, Eye, Send,
  MessageCircle, Copy, ChevronDown, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { whatsappService } from '../services/whatsappService';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { GoogleGenAI } from '@google/genai';
import { Franchise, FranchisePresentationSection, FranchiseMeetingAvailability, FranchiseMeetingBlockedDate, FranchiseMeetingBooking, FranchiseMeetingSettings } from '../types';

interface FranchisesManagerProps {
  onBack: () => void;
}

const INITIAL_FORM_STATE: Franchise = {
    id: '',
    saleNumber: '',
    contractStartDate: '',
    inaugurationDate: '',
    salesConsultant: '',
    franchiseeName: '',
    cpf: '',
    companyName: '',
    cnpj: '',
    phone: '',
    email: '',
    residentialAddress: '',
    commercialState: '',
    commercialCity: '',
    commercialAddress: '',
    commercialNeighborhood: '',
    latitude: '',
    longitude: '',
    exclusivityRadiusKm: '',
    kmStreetPoint: '',
    kmCommercialBuilding: '',
    studioStatus: 'Em implantação',
    studioSizeM2: '',
    equipmentList: '',
    royaltiesValue: '',
    bankAccountInfo: '',
    hasSignedContract: false,
    contractEndDate: '',
    isRepresentative: false,
    partner1Name: '',
    partner2Name: '',
    franchiseeFolderLink: '',
    pathInfo: '',
    observations: ''
};

// --- Helpers de Geolocalização ---

const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

// Componente para controle do Mapa
const MapController = ({ center }: { center?: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
};

export const FranchisesManager: React.FC<FranchisesManagerProps> = ({ onBack }) => {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'presentation' | 'meetings'>('list');
  const [activeTab, setActiveTab] = useState<'dados' | 'local' | 'studio'>('dados');
  
  const [formData, setFormData] = useState<Franchise>(INITIAL_FORM_STATE);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Apresentação da Franquia (base de conhecimento)
  const [presentationSections, setPresentationSections] = useState<FranchisePresentationSection[]>([]);
  const [presentationLoading, setPresentationLoading] = useState(false);
  const [presentationSaving, setPresentationSaving] = useState(false);
  const [aiHelpKey, setAiHelpKey] = useState<string | null>(null);

  // Meetings / Agendamento
  const [meetingAvailability, setMeetingAvailability] = useState<FranchiseMeetingAvailability[]>([]);
  const [meetingBlockedDates, setMeetingBlockedDates] = useState<FranchiseMeetingBlockedDate[]>([]);
  const [meetingBookings, setMeetingBookings] = useState<FranchiseMeetingBooking[]>([]);
  const [meetingSettings, setMeetingSettings] = useState<FranchiseMeetingSettings>({ advance_days: 30, max_bookings_per_student: 1, admin_email: '', admin_phone: '', meeting_title: 'Reunião Franquia VOLL Studios', meeting_description: 'Reunião de apresentação da Franquia VOLL Studios', brevo_api_key: '', brevo_sender_email: '', brevo_sender_name: '' });
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [meetingTab, setMeetingTab] = useState<'availability' | 'bookings' | 'settings'>('availability');
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');
  const [meetingBookingFilter, setMeetingBookingFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [franchiseTestEmail, setFranchiseTestEmail] = useState('');
  const [isSendingFranchiseTest, setIsSendingFranchiseTest] = useState(false);
  const [franchiseTestResult, setFranchiseTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [resendingWhatsApp, setResendingWhatsApp] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  // Estados de Simulação no Mapa
  const [simAddress, setSimAddress] = useState('');
  const [simRadius, setSimRadius] = useState('5');
  const [simLocation, setSimLocation] = useState<[number, number] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Geocoding loading
  const [isGeocoding, setIsGeocoding] = useState(false);

  // IBGE State
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
      fetchFranchises();
      ibgeService.getStates().then(setStates);
  }, []);

  useEffect(() => {
      if (formData.commercialState) {
          setIsLoadingCities(true);
          ibgeService.getCities(formData.commercialState).then(data => {
              setCities(data);
              setIsLoadingCities(false);
          });
      } else {
          setCities([]);
      }
  }, [formData.commercialState]);

  const fetchFranchises = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await appBackend.client
              .from('crm_franchises')
              .select('*')
              .order('franchisee_name', { ascending: true });
          
          if (error) throw error;
          
          setFranchises(data.map((d: any) => ({
              id: d.id,
              saleNumber: d.sale_number || '',
              contractStartDate: d.contract_start_date || '',
              inaugurationDate: d.inauguration_date || '',
              salesConsultant: d.sales_consultant || '',
              franchiseeName: d.franchisee_name || '',
              cpf: d.cpf || '',
              companyName: d.company_name || '',
              cnpj: d.cnpj || '',
              phone: d.phone || '',
              email: d.email || '',
              residentialAddress: d.residential_address || '',
              commercialState: d.commercial_state || '',
              commercialCity: d.commercial_city || '',
              commercialAddress: d.commercial_address || '',
              commercialNeighborhood: d.commercial_neighborhood || '',
              latitude: d.latitude?.toString() || '',
              longitude: d.longitude?.toString() || '',
              exclusivityRadiusKm: d.exclusivity_radius_km?.toString() || '',
              kmStreetPoint: d.km_street_point?.toString() || '',
              kmCommercialBuilding: d.km_commercial_building?.toString() || '',
              studioStatus: d.studio_status || 'Em implantação',
              studioSizeM2: d.studio_size_m2 || '',
              equipmentList: d.equipment_list || '',
              royaltiesValue: d.royalties_value || '',
              bankAccountInfo: d.bank_account_info || '',
              hasSignedContract: !!d.has_signed_contract,
              contractEndDate: d.contract_end_date || '',
              isRepresentative: !!d.is_representative,
              partner1Name: d.partner_1_name || '',
              partner2Name: d.partner_2_name || '',
              franchiseeFolderLink: d.franchisee_folder_link || '',
              path_info: d.path_info || '',
              observations: d.observations || ''
          })));
      } catch (e: any) {
          console.error("Erro ao buscar franquias:", e);
      } finally {
          setIsLoading(false);
      }
  };

  // --- Lógica de Geocoding (Nominatim OpenStreetMap) ---
  const handleAutoGeocode = async () => {
    if (!formData.commercialAddress || !formData.commercialCity || !formData.commercialState) {
        alert("Preencha endereço, cidade e estado para buscar as coordenadas.");
        return;
    }
    setIsGeocoding(true);
    try {
        const query = encodeURIComponent(`${formData.commercialAddress}, ${formData.commercialCity}, ${formData.commercialState}, Brasil`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            setFormData(prev => ({
                ...prev,
                latitude: data[0].lat,
                longitude: data[0].lon
            }));
        } else {
            alert("Endereço não localizado no mapeamento automático. Verifique os dados ou insira manualmente.");
        }
    } catch (e) {
        alert("Erro ao conectar com serviço de mapas.");
    } finally {
        setIsGeocoding(false);
    }
  };

  const handleSimulateGeocode = async () => {
    if (!simAddress) return;
    setIsSimulating(true);
    try {
        const query = encodeURIComponent(`${simAddress}, Brasil`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            setSimLocation([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        } else {
            alert("Endereço não localizado.");
        }
    } catch (e) {
        alert("Erro de conexão.");
    } finally {
        setIsSimulating(false);
    }
  };

  // --- Análise de Colisões ---
  const collisions = useMemo(() => {
    const list: { f1: Franchise, f2: Franchise }[] = [];
    const geocoded = franchises.filter(f => f.latitude && f.longitude && f.exclusivityRadiusKm);

    for (let i = 0; i < geocoded.length; i++) {
        for (let j = i + 1; j < geocoded.length; j++) {
            const f1 = geocoded[i];
            const f2 = geocoded[j];
            const dist = getDistanceInMeters(
                parseFloat(f1.latitude), parseFloat(f1.longitude),
                parseFloat(f2.latitude), parseFloat(f2.longitude)
            );
            const r1 = parseFloat(f1.exclusivityRadiusKm!) * 1000;
            const r2 = parseFloat(f2.exclusivityRadiusKm!) * 1000;

            if (dist < (r1 + r2)) {
                list.push({ f1, f2 });
            }
        }
    }
    return list;
  }, [franchises]);

  const conflictingIds = useMemo(() => {
      const ids = new Set<string>();
      collisions.forEach(c => {
          ids.add(c.f1.id);
          ids.add(c.f2.id);
      });
      return ids;
  }, [collisions]);

  const simulationConflicts = useMemo(() => {
      if (!simLocation || !simRadius) return [];
      const simR = parseFloat(simRadius) * 1000;
      return franchises.filter(f => {
          if (!f.latitude || !f.longitude || !f.exclusivityRadiusKm) return false;
          const dist = getDistanceInMeters(
              simLocation[0], simLocation[1],
              parseFloat(f.latitude), parseFloat(f.longitude)
          );
          const fR = parseFloat(f.exclusivityRadiusKm) * 1000;
          return dist < (simR + fR);
      });
  }, [simLocation, simRadius, franchises]);

  const handleInputChange = (field: keyof Franchise, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
      if (!formData.franchiseeName) {
          alert("O nome do franqueado é obrigatório.");
          return;
      }

      setIsSaving(true);
      const payload = {
          sale_number: formData.saleNumber,
          contract_start_date: formData.contractStartDate || null,
          inauguration_date: formData.inaugurationDate || null,
          sales_consultant: formData.salesConsultant,
          franchisee_name: formData.franchiseeName,
          cpf: formData.cpf,
          company_name: formData.companyName,
          cnpj: formData.cnpj,
          phone: formData.phone,
          email: formData.email,
          residential_address: formData.residentialAddress,
          commercial_state: formData.commercialState,
          commercial_city: formData.commercialCity,
          commercial_address: formData.commercialAddress,
          commercial_neighborhood: formData.commercialNeighborhood,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          exclusivity_radius_km: formData.exclusivityRadiusKm ? parseFloat(formData.exclusivityRadiusKm) : null,
          km_street_point: formData.kmStreetPoint ? parseFloat(formData.kmStreetPoint) : null,
          km_commercial_building: formData.kmCommercialBuilding ? parseFloat(formData.kmCommercialBuilding) : null,
          studio_status: formData.studioStatus,
          studio_size_m2: formData.studioSizeM2,
          equipment_list: formData.equipmentList,
          royalties_value: formData.royaltiesValue,
          bank_account_info: formData.bankAccountInfo,
          has_signed_contract: formData.hasSignedContract,
          contract_end_date: formData.contractEndDate || null,
          is_representative: formData.isRepresentative,
          partner_1_name: formData.partner1Name,
          partner_2_name: formData.partner2Name,
          franchisee_folder_link: formData.franchiseeFolderLink,
          path_info: formData.pathInfo,
          observations: formData.observations
      };

      try {
          if (formData.id) {
              const { error } = await appBackend.client.from('crm_franchises').update(payload).eq('id', formData.id);
              if (error) throw error;
              await appBackend.logActivity({ action: 'update', module: 'franchises', details: `Editou franquia: ${formData.franchiseeName}`, recordId: formData.id });
          } else {
              const { data, error } = await appBackend.client.from('crm_franchises').insert([payload]).select().single();
              if (error) throw error;
              await appBackend.logActivity({ action: 'create', module: 'franchises', details: `Cadastrou nova franquia: ${formData.franchiseeName}`, recordId: data?.id });
          }
          await fetchFranchises();
          setShowModal(false);
          setFormData(INITIAL_FORM_STATE);
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      const target = franchises.find(f => f.id === id);
      if (window.confirm(`Excluir permanentemente a franquia de ${target?.franchiseeName}?`)) {
          try {
              const { error } = await appBackend.client.from('crm_franchises').delete().eq('id', id);
              if (error) throw error;
              await appBackend.logActivity({ action: 'delete', module: 'franchises', details: `Excluiu franquia: ${target?.franchiseeName}`, recordId: id });
              setFranchises(prev => prev.filter(f => f.id !== id));
          } catch (e: any) {
              alert(`Erro: ${e.message}`);
          }
      }
  };

  useEffect(() => {
      if (viewMode === 'presentation') loadPresentation();
      if (viewMode === 'meetings') loadMeetingData();
  }, [viewMode]);

  const loadPresentation = async () => {
      setPresentationLoading(true);
      try {
          const data = await appBackend.getFranchisePresentation();
          setPresentationSections(data);
      } catch (e) {
          console.error('Erro ao carregar apresentação:', e);
      } finally {
          setPresentationLoading(false);
      }
  };

  const savePresentation = async () => {
      setPresentationSaving(true);
      try {
          await appBackend.saveFranchisePresentation(presentationSections);
          alert('Apresentação salva com sucesso.');
      } catch (e: any) {
          alert('Erro ao salvar: ' + (e.message || e));
      } finally {
          setPresentationSaving(false);
      }
  };

  const FRANQUIA_SITE_CONTEXT = `A Franquia VOLL Pilates Studios é o maior grupo de Pilates do Brasil. Site: franquiadepilates.com.br. Dados: 229+ unidades, 15 anos, 100 mil alunos/mês, investimento facilitado, kit completo (Cadillac, Reformer, Step Chair, Ladder Barrel), payback 8-12 meses, breakeven 2-4 meses, royalties R$990/mês fixo, sem fundo de propaganda, formação técnica, projeto arquitetônico, plataforma do franqueado, associados ABF.`;

  const handleAiHelp = async (section: FranchisePresentationSection) => {
      if (!process.env.API_KEY) {
          alert('Configure a chave da API Gemini nas variáveis de ambiente para usar a Ajuda IA.');
          return;
      }
      setAiHelpKey(section.section_key);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Gere conteúdo em português para a seção "${section.title}" da apresentação da Franquia VOLL Pilates Studios. Contexto: ${FRANQUIA_SITE_CONTEXT}. O texto deve ser claro, profissional e adequado para futuros franqueados. Use markdown se útil (listas, negrito). Responda APENAS com o texto da seção, sem título.`,
              config: { temperature: 0.7 },
          });
          const text = (response.text || '').trim();
          if (text) {
              setPresentationSections(prev => prev.map(s => s.section_key === section.section_key ? { ...s, content: text } : s));
          }
      } catch (e) {
          console.error('Erro Ajuda IA:', e);
          alert('Não foi possível gerar sugestão. Tente novamente.');
      } finally {
          setAiHelpKey(null);
      }
  };

  const updatePresentationSection = (sectionKey: string, field: 'title' | 'content', value: string) => {
      setPresentationSections(prev => prev.map(s => s.section_key === sectionKey ? { ...s, [field]: value } : s));
  };

  // ── Meeting management functions ──────────────────────────────

  const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const loadMeetingData = async () => {
      setMeetingLoading(true);
      try {
          const [avail, blocked, bookings, settings] = await Promise.all([
              appBackend.getFranchiseMeetingAvailability(),
              appBackend.getFranchiseMeetingBlockedDates(),
              appBackend.getFranchiseMeetingBookings(),
              appBackend.getFranchiseMeetingSettings(),
          ]);
          setMeetingAvailability(avail);
          setMeetingBlockedDates(blocked);
          setMeetingBookings(bookings);
          setMeetingSettings(settings);
      } catch (e) {
          console.error('Erro ao carregar reuniões:', e);
      } finally {
          setMeetingLoading(false);
      }
  };

  const saveMeetingAvailability = async () => {
      setMeetingSaving(true);
      try {
          await appBackend.saveFranchiseMeetingAvailability(meetingAvailability);
          alert('Disponibilidade salva com sucesso!');
      } catch (e: any) {
          alert('Erro: ' + (e.message || e));
      } finally {
          setMeetingSaving(false);
      }
  };

  const saveMeetingSettingsHandler = async () => {
      setMeetingSaving(true);
      try {
          await appBackend.saveFranchiseMeetingSettings(meetingSettings);
          alert('Configurações salvas com sucesso!');
      } catch (e: any) {
          alert('Erro: ' + (e.message || e));
      } finally {
          setMeetingSaving(false);
      }
  };

  const handleFranchiseTestEmail = async () => {
      if (!franchiseTestEmail) return;
      setIsSendingFranchiseTest(true);
      setFranchiseTestResult(null);
      try {
          await appBackend.saveFranchiseMeetingSettings(meetingSettings);
          const result = await appBackend.sendFranchiseTestEmail(franchiseTestEmail);
          setFranchiseTestResult(result);
      } catch (e: any) {
          setFranchiseTestResult({ success: false, error: e.message || 'Erro desconhecido' });
      } finally {
          setIsSendingFranchiseTest(false);
      }
  };

  const handleResendEmail = async (booking: FranchiseMeetingBooking) => {
      if (!booking.student_email) { alert('Aluno não possui e-mail cadastrado.'); return; }
      setResendingEmail(booking.id);
      try {
          const meetDate = new Date(booking.meeting_start);
          const dateStr = meetDate.toLocaleDateString('pt-BR');
          const timeStr = meetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const meetLink = booking.meet_link || 'Link será enviado em breve';
          const emailBody = `
              <h2>Reunião Franquia VOLL Studios</h2>
              <p><strong>Data:</strong> ${dateStr}</p>
              <p><strong>Horário:</strong> ${timeStr}</p>
              <p><strong>Link Google Meet:</strong> <a href="${booking.meet_link}">${meetLink}</a></p>
              <p><strong>Aluno:</strong> ${booking.student_name}</p>
              <hr>
              <p>Em caso de dúvidas, entre em contato conosco.</p>
          `;
          await appBackend.sendFranchiseEmail(booking.student_email, `Reunião Franquia VOLL - ${dateStr} às ${timeStr}`, emailBody);
          alert('E-mail reenviado com sucesso!');
      } catch (e: any) {
          alert('Erro ao reenviar e-mail: ' + (e.message || e));
      } finally {
          setResendingEmail(null);
      }
  };

  const handleResendWhatsApp = async (booking: FranchiseMeetingBooking) => {
      const phone = booking.student_phone?.replace(/\D/g, '');
      if (!phone) { alert('Aluno não possui telefone cadastrado.'); return; }
      setResendingWhatsApp(booking.id);
      try {
          const meetDate = new Date(booking.meeting_start);
          const dateStr = meetDate.toLocaleDateString('pt-BR');
          const timeStr = meetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const meetLink = booking.meet_link || 'Link será enviado em breve';
          const waMsg = `*Reunião Franquia VOLL Studios*\n\n📅 Data: ${dateStr}\n⏰ Horário: ${timeStr}\n📎 Link: ${meetLink}\n\nNos vemos lá! 🚀`;
          await whatsappService.sendTextMessage({ wa_id: phone, contact_phone: phone }, waMsg);
          alert('WhatsApp reenviado com sucesso!');
      } catch (e: any) {
          alert('Erro ao reenviar WhatsApp: ' + (e.message || e));
      } finally {
          setResendingWhatsApp(null);
      }
  };

  const handleSaveBookingNotes = async (bookingId: string) => {
      const notes = editingNotes[bookingId];
      if (notes === undefined) return;
      try {
          await appBackend.updateFranchiseMeetingBooking(bookingId, { admin_notes: notes });
          setMeetingBookings(prev => prev.map(b => b.id === bookingId ? { ...b, admin_notes: notes } : b));
          alert('Observações salvas!');
      } catch (e: any) {
          alert('Erro ao salvar: ' + (e.message || e));
      }
  };

  const handleAddBlockedDate = async () => {
      if (!newBlockedDate) return;
      try {
          await appBackend.addFranchiseMeetingBlockedDate(newBlockedDate, newBlockedReason);
          setNewBlockedDate('');
          setNewBlockedReason('');
          const blocked = await appBackend.getFranchiseMeetingBlockedDates();
          setMeetingBlockedDates(blocked);
      } catch (e: any) {
          alert('Erro: ' + (e.message || e));
      }
  };

  const handleRemoveBlockedDate = async (id: string) => {
      try {
          await appBackend.removeFranchiseMeetingBlockedDate(id);
          setMeetingBlockedDates(prev => prev.filter(d => d.id !== id));
      } catch (e: any) {
          alert('Erro: ' + (e.message || e));
      }
  };

  const handleCancelBooking = async (id: string) => {
      if (!confirm('Deseja realmente cancelar este agendamento?')) return;
      try {
          await appBackend.cancelFranchiseMeeting(id);
          setMeetingBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      } catch (e: any) {
          alert('Erro ao cancelar: ' + (e.message || e));
      }
  };

  const handleCompleteBooking = async (id: string) => {
      try {
          await appBackend.updateFranchiseMeetingBooking(id, { status: 'completed' });
          setMeetingBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'completed' } : b));
      } catch (e: any) {
          alert('Erro: ' + (e.message || e));
      }
  };

  const updateAvailDay = (dayOfWeek: number, field: string, value: any) => {
      setMeetingAvailability(prev => prev.map(a => a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a));
  };

  const filteredBookings = useMemo(() => {
      if (meetingBookingFilter === 'all') return meetingBookings;
      return meetingBookings.filter(b => b.status === meetingBookingFilter);
  }, [meetingBookings, meetingBookingFilter]);

  const filtered = useMemo(() => {
    return franchises.filter(f => 
        f.franchiseeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.commercialCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [franchises, searchTerm]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Store className="text-teal-600" /> Gestão de Franquias
                    </h2>
                    <p className="text-slate-500 text-sm">Controle de unidades, contratos e mapeamento.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <div className="bg-slate-100 p-1 rounded-lg flex">
                    <button onClick={() => setViewMode('list')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'list' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                        <List size={16} /> Lista
                    </button>
                    <button onClick={() => setViewMode('map')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'map' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                        <MapIcon size={16} /> Mapa
                    </button>
                    <button onClick={() => setViewMode('presentation')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'presentation' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                        <Presentation size={16} /> Apresentação
                    </button>
                    <button onClick={() => setViewMode('meetings')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'meetings' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                        <Video size={16} /> Reuniões
                    </button>
                </div>
                <button 
                    onClick={() => { setFormData(INITIAL_FORM_STATE); setActiveTab('dados'); setShowModal(true); }}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
                >
                    <Plus size={18} /> Nova Unidade
                </button>
            </div>
        </div>

        {viewMode === 'list' && (
            <>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por franqueado, cidade ou empresa..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                            Nenhuma franquia encontrada.
                        </div>
                    ) : (
                        filtered.map(item => (
                            <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={clsx("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide border", 
                                            item.studioStatus === 'Ativo' ? "bg-green-50 text-green-700 border-green-100" : "bg-orange-50 text-orange-700 border-orange-100")}>
                                            {item.studioStatus}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setFormData(item); setActiveTab('dados'); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-teal-600"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{item.franchiseeName}</h3>
                                    <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><MapPin size={12}/> {item.commercialCity}/{item.commercialState}</p>
                                    
                                    <div className="space-y-2 text-xs text-slate-600">
                                        <p className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {item.phone}</p>
                                        <p className="flex items-center gap-2 truncate"><Mail size={12} className="text-slate-400" /> {item.email}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                    <span>Venda: {item.saleNumber || '--'}</span>
                                    <span className={clsx("flex items-center gap-1 font-black", conflictingIds.has(item.id) ? "text-red-600" : "text-teal-600")}>
                                        <ShieldCheck size={10}/> {item.exclusivityRadiusKm ? `${item.exclusivityRadiusKm}km` : 'S/ Exclusividade'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        )}

        {viewMode === 'presentation' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Presentation size={20} className="text-teal-600" /> Apresentação da Franquia VOLL Studios
                    </h3>
                    <button onClick={savePresentation} disabled={presentationSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50">
                        {presentationSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar alterações
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6">
                    {presentationLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                    ) : presentationSections.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">Nenhuma seção cadastrada. Execute a migration 020 para popular as seções iniciais.</p>
                    ) : (
                        presentationSections.map(section => (
                            <div key={section.section_key} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</label>
                                    <button type="button" onClick={() => handleAiHelp(section)} disabled={!!aiHelpKey} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors disabled:opacity-50">
                                        {aiHelpKey === section.section_key ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        Ajuda IA
                                    </button>
                                </div>
                                <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 bg-white" value={section.title} onChange={e => updatePresentationSection(section.section_key, 'title', e.target.value)} />
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Conteúdo (markdown)</label>
                                <textarea className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white min-h-[120px] resize-y" value={section.content} onChange={e => updatePresentationSection(section.section_key, 'content', e.target.value)} placeholder="Conteúdo da seção..." />
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {viewMode === 'meetings' && (
            <div className="space-y-6">
                {/* Sub-tabs */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1 flex gap-1">
                    <button onClick={() => setMeetingTab('availability')} className={clsx("flex-1 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all", meetingTab === 'availability' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-500 hover:bg-slate-50")}>
                        <CalendarDays size={16} /> Disponibilidade
                    </button>
                    <button onClick={() => setMeetingTab('bookings')} className={clsx("flex-1 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all", meetingTab === 'bookings' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-500 hover:bg-slate-50")}>
                        <Video size={16} /> Agendamentos ({meetingBookings.filter(b => b.status === 'scheduled').length})
                    </button>
                    <button onClick={() => setMeetingTab('settings')} className={clsx("flex-1 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all", meetingTab === 'settings' ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-500 hover:bg-slate-50")}>
                        <Settings2 size={16} /> Configurações
                    </button>
                </div>

                {meetingLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                ) : (
                    <>
                        {/* AVAILABILITY TAB */}
                        {meetingTab === 'availability' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <CalendarDays size={20} className="text-teal-600" /> Horários Disponíveis por Dia
                                        </h3>
                                        <button onClick={saveMeetingAvailability} disabled={meetingSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50">
                                            {meetingSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            Salvar
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-3">
                                        {meetingAvailability.map(day => (
                                            <div key={day.day_of_week} className={clsx("flex items-center gap-4 p-4 rounded-xl border transition-all", day.is_active ? "bg-teal-50/50 border-teal-200" : "bg-slate-50 border-slate-200 opacity-60")}>
                                                <label className="flex items-center gap-3 min-w-[140px] cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={day.is_active}
                                                        onChange={e => updateAvailDay(day.day_of_week, 'is_active', e.target.checked)}
                                                        className="w-5 h-5 rounded text-teal-600"
                                                    />
                                                    <span className="text-sm font-bold text-slate-700">{DAY_NAMES[day.day_of_week]}</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">De</label>
                                                    <input type="time" value={day.start_time} onChange={e => updateAvailDay(day.day_of_week, 'start_time', e.target.value)} disabled={!day.is_active} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Até</label>
                                                    <input type="time" value={day.end_time} onChange={e => updateAvailDay(day.day_of_week, 'end_time', e.target.value)} disabled={!day.is_active} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Duração</label>
                                                    <select value={day.slot_duration_minutes} onChange={e => updateAvailDay(day.day_of_week, 'slot_duration_minutes', parseInt(e.target.value))} disabled={!day.is_active} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40">
                                                        <option value={30}>30 min</option>
                                                        <option value={60}>1 hora</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Blocked dates */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Ban size={20} className="text-red-500" /> Datas Bloqueadas
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Feriados, férias ou datas específicas sem atendimento.</p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex gap-3 items-end">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data</label>
                                                <input type="date" value={newBlockedDate} onChange={e => setNewBlockedDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Motivo (opcional)</label>
                                                <input type="text" value={newBlockedReason} onChange={e => setNewBlockedReason(e.target.value)} placeholder="Ex: Feriado Nacional" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <button onClick={handleAddBlockedDate} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                                <Plus size={16} /> Bloquear
                                            </button>
                                        </div>
                                        {meetingBlockedDates.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma data bloqueada.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {meetingBlockedDates.map(bd => (
                                                    <div key={bd.id} className="flex items-center justify-between px-4 py-2 bg-red-50 border border-red-100 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <Ban size={14} className="text-red-400" />
                                                            <span className="text-sm font-bold text-slate-800">{new Date(bd.blocked_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                            {bd.reason && <span className="text-xs text-slate-500">— {bd.reason}</span>}
                                                        </div>
                                                        <button onClick={() => handleRemoveBlockedDate(bd.id)} className="text-red-400 hover:text-red-600 p-1"><Trash size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BOOKINGS TAB */}
                        {meetingTab === 'bookings' && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Video size={20} className="text-teal-600" /> Reuniões Agendadas
                                    </h3>
                                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                        {(['all', 'scheduled', 'completed', 'cancelled'] as const).map(f => (
                                            <button key={f} onClick={() => setMeetingBookingFilter(f)} className={clsx("px-3 py-1 rounded-md text-xs font-bold transition-all", meetingBookingFilter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                                                {f === 'all' ? 'Todas' : f === 'scheduled' ? 'Agendadas' : f === 'completed' ? 'Realizadas' : 'Canceladas'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {filteredBookings.length === 0 ? (
                                        <div className="py-16 text-center text-slate-400">
                                            <Video size={40} className="mx-auto mb-3 opacity-40" />
                                            <p className="font-bold">Nenhuma reunião encontrada.</p>
                                        </div>
                                    ) : filteredBookings.map(b => {
                                        const isExpanded = expandedBookingId === b.id;
                                        const meetDate = new Date(b.meeting_start);
                                        const dateStr = meetDate.toLocaleDateString('pt-BR');
                                        const timeStr = meetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                        <div key={b.id} className="transition-colors">
                                            <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedBookingId(isExpanded ? null : b.id)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", b.status === 'scheduled' ? "bg-teal-100 text-teal-600" : b.status === 'completed' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500")}>
                                                        <Video size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{b.student_name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {dateStr} às {timeStr}{' — '}{b.student_email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx("text-[10px] font-black px-2 py-1 rounded uppercase", b.status === 'scheduled' ? "bg-teal-100 text-teal-700" : b.status === 'completed' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                                                        {b.status === 'scheduled' ? 'Agendada' : b.status === 'completed' ? 'Realizada' : 'Cancelada'}
                                                    </span>
                                                    {b.status === 'scheduled' && (
                                                        <>
                                                            <button onClick={e => { e.stopPropagation(); handleCompleteBooking(b.id); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Marcar como realizada">
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <button onClick={e => { e.stopPropagation(); handleCancelBooking(b.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar">
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-6 pb-5 pt-0 space-y-4 bg-slate-50/50 border-t border-slate-100">
                                                    {/* Google Meet Link */}
                                                    <div className="pt-4">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Link Google Meet</label>
                                                        {b.meet_link ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-teal-700 truncate">
                                                                    {b.meet_link}
                                                                </div>
                                                                <button onClick={() => { navigator.clipboard.writeText(b.meet_link || ''); alert('Link copiado!'); }} className="p-2 text-slate-500 hover:bg-white hover:text-teal-600 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Copiar link">
                                                                    <Copy size={16} />
                                                                </button>
                                                                <a href={b.meet_link} target="_blank" rel="noopener noreferrer" className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200" title="Abrir no navegador">
                                                                    <ExternalLink size={16} />
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-400 italic">Link não disponível (Google Meet não configurado)</p>
                                                        )}
                                                    </div>

                                                    {/* Resend buttons */}
                                                    {b.status === 'scheduled' && (
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Reenviar Link para o Aluno</label>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleResendEmail(b)} disabled={resendingEmail === b.id} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                                                                    {resendingEmail === b.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                                                                    Enviar por E-mail
                                                                </button>
                                                                <button onClick={() => handleResendWhatsApp(b)} disabled={resendingWhatsApp === b.id} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                                                                    {resendingWhatsApp === b.id ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                                                                    Enviar por WhatsApp
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Student info */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-0.5">E-mail</label>
                                                            <p className="text-sm text-slate-700">{b.student_email || '—'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-0.5">Telefone</label>
                                                            <p className="text-sm text-slate-700">{b.student_phone || '—'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-0.5">CPF</label>
                                                            <p className="text-sm text-slate-700">{b.student_cpf}</p>
                                                        </div>
                                                    </div>

                                                    {/* Observations */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Observações</label>
                                                        <div className="flex gap-2">
                                                            <textarea
                                                                value={editingNotes[b.id] !== undefined ? editingNotes[b.id] : (b.admin_notes || '')}
                                                                onChange={e => setEditingNotes(prev => ({ ...prev, [b.id]: e.target.value }))}
                                                                placeholder="Adicionar observações sobre esta reunião..."
                                                                rows={2}
                                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none"
                                                            />
                                                            {editingNotes[b.id] !== undefined && editingNotes[b.id] !== (b.admin_notes || '') && (
                                                                <button onClick={() => handleSaveBookingNotes(b.id)} className="self-end px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors">
                                                                    <Save size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SETTINGS TAB */}
                        {meetingTab === 'settings' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Settings2 size={20} className="text-teal-600" /> Configurações de Reuniões
                                        </h3>
                                        <button onClick={saveMeetingSettingsHandler} disabled={meetingSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50">
                                            {meetingSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            Salvar
                                        </button>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Dias de Antecedência para Agendar</label>
                                            <input type="number" min={1} max={90} value={meetingSettings.advance_days} onChange={e => setMeetingSettings(s => ({ ...s, advance_days: parseInt(e.target.value) || 30 }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Máx. Reuniões por Aluno</label>
                                            <input type="number" min={1} max={10} value={meetingSettings.max_bookings_per_student} onChange={e => setMeetingSettings(s => ({ ...s, max_bookings_per_student: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">E-mail do Responsável (notificações)</label>
                                            <input type="email" value={meetingSettings.admin_email} onChange={e => setMeetingSettings(s => ({ ...s, admin_email: e.target.value }))} placeholder="admin@empresa.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Telefone do Responsável (WhatsApp)</label>
                                            <input type="text" value={meetingSettings.admin_phone} onChange={e => setMeetingSettings(s => ({ ...s, admin_phone: e.target.value }))} placeholder="5511999999999" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Título da Reunião (Google Calendar)</label>
                                            <input type="text" value={meetingSettings.meeting_title} onChange={e => setMeetingSettings(s => ({ ...s, meeting_title: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Descrição da Reunião</label>
                                            <input type="text" value={meetingSettings.meeting_description} onChange={e => setMeetingSettings(s => ({ ...s, meeting_description: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                </div>

                                {/* Google Calendar Setup */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Video size={20} className="text-blue-600" /> Configuração Google Meet
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Configure a integração com Google Calendar para gerar links do Google Meet automaticamente.</p>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        {/* OAuth2 - Recommended for personal Gmail */}
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
                                            <h4 className="text-sm font-black text-emerald-800 uppercase flex items-center gap-2"><Info size={16} /> Método Recomendado: OAuth2 (Gmail Pessoal ou Workspace)</h4>
                                            <p className="text-xs text-emerald-700">Este método gera links do Google Meet para qualquer conta Gmail, inclusive contas pessoais.</p>
                                            <ol className="list-decimal list-inside text-sm text-emerald-900 space-y-3 leading-relaxed">
                                                <li>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="font-bold underline">Google Cloud Console</a> e crie um projeto (ou use um existente).</li>
                                                <li>Habilite a <strong>Google Calendar API</strong> em "APIs e Serviços" &gt; "Biblioteca".</li>
                                                <li>Vá em <strong>"APIs e Serviços" &gt; "Credenciais"</strong> e crie um <strong>ID do cliente OAuth 2.0</strong> (tipo: "Aplicativo da Web").</li>
                                                <li>Em <strong>"URIs de redirecionamento autorizados"</strong>, adicione: <code className="bg-white px-1.5 py-0.5 rounded text-emerald-700 border border-emerald-200">https://developers.google.com/oauthplayground</code></li>
                                                <li>Acesse o <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="font-bold underline">OAuth2 Playground</a>, clique na engrenagem, marque <strong>"Use your own OAuth credentials"</strong> e insira seu Client ID e Client Secret.</li>
                                                <li>No Step 1, selecione o scope <code className="bg-white px-1.5 py-0.5 rounded text-emerald-700 border border-emerald-200">https://www.googleapis.com/auth/calendar</code> e clique em "Authorize APIs".</li>
                                                <li>Faça login com a <strong>conta Gmail que será dona das reuniões</strong> e autorize.</li>
                                                <li>No Step 2, clique em <strong>"Exchange authorization code for tokens"</strong> e copie o <strong>Refresh Token</strong>.</li>
                                                <li>Configure os Secrets no <strong>Supabase Edge Functions</strong>:</li>
                                            </ol>
                                            <div className="bg-white rounded-lg p-4 border border-emerald-100 font-mono text-xs space-y-1">
                                                <p><span className="text-emerald-600 font-bold">GOOGLE_CLIENT_ID</span> = Client ID do OAuth2</p>
                                                <p><span className="text-emerald-600 font-bold">GOOGLE_CLIENT_SECRET</span> = Client Secret do OAuth2</p>
                                                <p><span className="text-emerald-600 font-bold">GOOGLE_REFRESH_TOKEN</span> = Refresh Token obtido no Playground</p>
                                                <p><span className="text-emerald-600 font-bold">GOOGLE_CALENDAR_ID</span> = E-mail da conta Gmail ou ID da agenda (ex: seuemail@gmail.com)</p>
                                            </div>
                                        </div>

                                        {/* Service Account - Alternative for Workspace */}
                                        <details className="group">
                                            <summary className="cursor-pointer text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-2 py-2">
                                                <ChevronDown size={16} className="group-open:rotate-180 transition-transform" /> Método Alternativo: Service Account (apenas Google Workspace)
                                            </summary>
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4 mt-2">
                                                <p className="text-xs text-blue-700">Service Accounts geram links do Meet apenas em contas Google Workspace (empresarial). Para Gmail pessoal, use o método OAuth2 acima.</p>
                                                <ol className="list-decimal list-inside text-sm text-blue-900 space-y-3 leading-relaxed">
                                                    <li>Crie uma <strong>Conta de Serviço</strong> no Google Cloud Console.</li>
                                                    <li>Gere uma chave JSON na aba "Chaves" da conta de serviço.</li>
                                                    <li>Compartilhe a agenda do Google Calendar com o e-mail da conta de serviço (permissão de <strong>editor</strong>).</li>
                                                    <li>Configure os Secrets no Supabase:</li>
                                                </ol>
                                                <div className="bg-white rounded-lg p-4 border border-blue-100 font-mono text-xs space-y-1">
                                                    <p><span className="text-blue-600 font-bold">GOOGLE_SERVICE_ACCOUNT_EMAIL</span> = e-mail da conta de serviço</p>
                                                    <p><span className="text-blue-600 font-bold">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</span> = chave privada do JSON</p>
                                                    <p><span className="text-blue-600 font-bold">GOOGLE_CALENDAR_ID</span> = ID da agenda compartilhada</p>
                                                </div>
                                            </div>
                                        </details>

                                        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 space-y-3">
                                            <h4 className="text-sm font-black text-violet-800 uppercase flex items-center gap-2"><User size={16} /> Acesso de Usuário de Teste</h4>
                                            <p className="text-sm text-violet-900 leading-relaxed">
                                                Solicite ao administrador da conta <strong>vollpilatesadm@gmail.com</strong> para incluir seu acesso como <strong>Usuário de teste</strong> através do link:
                                            </p>
                                            <a href="https://console.cloud.google.com/auth/audience?authuser=1&project=agenda-franquias" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm">
                                                <ExternalLink size={16} /> Acessar Tela de Audiência do Projeto
                                            </a>
                                            <p className="text-xs text-violet-600 font-mono break-all">https://console.cloud.google.com/auth/audience?authuser=1&project=agenda-franquias</p>
                                        </div>

                                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                            <p className="text-xs text-amber-800"><strong>Nota:</strong> Se ambos os métodos estiverem configurados, o sistema prioriza OAuth2. Sem nenhuma configuração, o agendamento funciona normalmente mas sem link do Google Meet.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Brevo Franchise Email Config */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Mail size={20} className="text-emerald-600" /> Configuração de E-mail (Brevo Franquia)
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Configure uma chave Brevo específica para e-mails de agendamento de reuniões. Se vazio, será usado a configuração geral do sistema (Formulários &gt; E-mail).</p>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Chave API Brevo</label>
                                                <input type="password" value={meetingSettings.brevo_api_key} onChange={e => setMeetingSettings(s => ({ ...s, brevo_api_key: e.target.value }))} placeholder="xkeysib-..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">E-mail Remetente</label>
                                                <input type="email" value={meetingSettings.brevo_sender_email} onChange={e => setMeetingSettings(s => ({ ...s, brevo_sender_email: e.target.value }))} placeholder="noreply@empresa.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome de Exibição</label>
                                                <input type="text" value={meetingSettings.brevo_sender_name} onChange={e => setMeetingSettings(s => ({ ...s, brevo_sender_name: e.target.value }))} placeholder="VOLL Franquias" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 pt-5">
                                            <h4 className="text-xs font-black text-slate-500 uppercase mb-3">Envio de Teste</h4>
                                            <div className="flex gap-2">
                                                <input type="email" value={franchiseTestEmail} onChange={e => setFranchiseTestEmail(e.target.value)} placeholder="destinatario@email.com" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                <button onClick={handleFranchiseTestEmail} disabled={isSendingFranchiseTest || !franchiseTestEmail} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50 whitespace-nowrap">
                                                    {isSendingFranchiseTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                    Enviar Teste
                                                </button>
                                            </div>
                                            {franchiseTestResult && (
                                                <div className={clsx("mt-3 px-4 py-2.5 rounded-lg text-sm font-medium", franchiseTestResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200")}>
                                                    {franchiseTestResult.success ? 'E-mail de teste enviado com sucesso!' : `Erro: ${franchiseTestResult.error}`}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                            <p className="text-xs text-amber-800"><strong>Nota:</strong> Os campos acima são salvos junto com as demais configurações ao clicar em "Salvar" no topo. O envio de teste salva automaticamente antes de enviar. Se os campos estiverem vazios, os e-mails de reunião usarão a configuração geral do Brevo (Formulários &gt; Configurar E-mail).</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

        {viewMode === 'map' && (
            <div className="flex flex-col lg:flex-row gap-6 h-[700px]">
                {/* Lado Esquerdo: Mapa */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative z-0">
                    <MapContainer center={[-15.7801, -47.9292]} zoom={4} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                        <MapController center={simLocation || undefined} />
                        
                        {franchises.filter(f => f.latitude && f.longitude).map(f => {
                            const lat = parseFloat(f.latitude);
                            const lng = parseFloat(f.longitude);
                            const radiusKm = parseFloat(f.exclusivityRadiusKm || '0');
                            const hasConflict = conflictingIds.has(f.id);
                            
                            return (
                                <React.Fragment key={f.id}>
                                    <Marker position={[lat, lng]}>
                                        <Popup>
                                            <div className="p-1">
                                                <h4 className="font-bold text-slate-800">{f.franchiseeName}</h4>
                                                <p className="text-xs text-slate-500">{f.commercialCity}/{f.commercialState}</p>
                                                {hasConflict && <p className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded mt-1 font-bold">⚠️ CONFLITO DE RAIO</p>}
                                            </div>
                                        </Popup>
                                    </Marker>
                                    {radiusKm > 0 && (
                                        <Circle 
                                            center={[lat, lng]} 
                                            radius={radiusKm * 1000} 
                                            pathOptions={{ 
                                                fillColor: hasConflict ? '#ef4444' : '#0d9488', 
                                                fillOpacity: 0.15, 
                                                color: hasConflict ? '#ef4444' : '#0d9488', 
                                                weight: 2,
                                                dashArray: hasConflict ? undefined : '5, 10'
                                            }} 
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {/* Círculo de Simulação */}
                        {simLocation && (
                            <Circle 
                                center={simLocation} 
                                radius={parseFloat(simRadius) * 1000} 
                                pathOptions={{ 
                                    fillColor: simulationConflicts.length > 0 ? '#ef4444' : '#6366f1', 
                                    fillOpacity: 0.3, 
                                    color: simulationConflicts.length > 0 ? '#ef4444' : '#6366f1', 
                                    weight: 3
                                }} 
                            />
                        )}
                    </MapContainer>
                    
                    {/* Barra de Simulação Flutuante */}
                    <div className="absolute top-4 right-4 z-[1000] w-72 space-y-2">
                        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPinned size={14}/> Testar Viabilidade</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Endereço do Local</label>
                                    <div className="flex gap-1">
                                        <input type="text" className="w-full text-xs px-2 py-1.5 border rounded-lg" placeholder="Rua, Cidade, UF" value={simAddress} onChange={e => setSimAddress(e.target.value)} />
                                        <button onClick={handleSimulateGeocode} disabled={isSimulating} className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                                            {isSimulating ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Raio de Exclusividade (Km)</label>
                                    <input type="number" className="w-full text-xs px-2 py-1.5 border rounded-lg" value={simRadius} onChange={e => setSimRadius(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lado Direito: Alertas e Conflitos */}
                <aside className="w-full lg:w-80 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Lista de Conflitos Existentes */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[300px]">
                        <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center justify-between">
                            <h3 className="text-red-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle size={14}/> Colisões de Território ({collisions.length})
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {collisions.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4 italic">Nenhuma colisão detectada entre as unidades atuais.</p>
                            ) : collisions.map((c, idx) => (
                                <div key={idx} className="p-3 bg-red-50/50 rounded-xl border border-red-100 animate-in slide-in-from-right-2">
                                    <p className="text-xs font-bold text-slate-800">{c.f1.franchiseeName}</p>
                                    <p className="text-[9px] text-slate-400 italic font-medium">conflita com</p>
                                    <p className="text-xs font-bold text-slate-800">{c.f2.franchiseeName}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resultado da Simulação */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
                            <h3 className="text-indigo-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                <Crosshair size={14}/> Resultado da Simulação
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {!simLocation ? (
                                <div className="text-center py-8">
                                    <MapPin size={24} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-400">Pesquise um endereço acima para ver a viabilidade do território.</p>
                                </div>
                            ) : (
                                <>
                                    <div className={clsx(
                                        "p-4 rounded-xl border-2 flex flex-col items-center gap-2 text-center",
                                        simulationConflicts.length > 0 ? "bg-red-50 border-red-500" : "bg-green-50 border-green-500"
                                    )}>
                                        {simulationConflicts.length > 0 ? (
                                            <>
                                                <XCircleIcon />
                                                <p className="text-xs font-black text-red-700 uppercase">Território Indisponível</p>
                                                <p className="text-[10px] text-red-600 font-medium">Este raio sobrepõe {simulationConflicts.length} {simulationConflicts.length === 1 ? 'franqueado' : 'franqueados'}.</p>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircleIcon />
                                                <p className="text-xs font-black text-green-700 uppercase">Território Livre</p>
                                                <p className="text-[10px] text-green-600 font-medium">Não há sobreposição com franqueados existentes neste raio.</p>
                                            </>
                                        )}
                                    </div>
                                    
                                    {simulationConflicts.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Sobreposições com:</p>
                                            <div className="space-y-1">
                                                {simulationConflicts.map(f => (
                                                    <div key={f.id} className="text-xs font-bold text-slate-700 border-l-2 border-red-400 pl-2 py-1 bg-slate-50">{f.franchiseeName}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <button onClick={() => setSimLocation(null)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Limpar Simulação</button>
                                </>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        )}

        {/* MODAL FORM */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Ficha da Unidade' : 'Cadastro de Nova Unidade'}</h3>
                            <p className="text-sm text-slate-500">Gestão documental e técnica da franquia.</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                    </div>

                    <div className="flex bg-slate-100 px-8 py-2 gap-2 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('dados')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'dados' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>
                            <User size={14}/> Franqueado e Venda
                        </button>
                        <button onClick={() => setActiveTab('local')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'local' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>
                            <MapPin size={14}/> Localização e Mapeamento
                        </button>
                        <button onClick={() => setActiveTab('studio')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'studio' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>
                            <Building size={14}/> Dados do Studio e Financeiro
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        {activeTab === 'dados' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-2">
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nº Venda</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 font-mono" value={formData.saleNumber} onChange={e => handleInputChange('saleNumber', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome do Franqueado *</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={formData.franchiseeName} onChange={e => handleInputChange('franchiseeName', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CPF</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CNPJ</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cnpj} onChange={e => handleInputChange('cnpj', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Razão Social</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Telefone</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">E-mail</label>
                                    <input type="email" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Consultor de Venda</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.salesConsultant} onChange={e => handleInputChange('salesConsultant', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Início Contrato</label>
                                    <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.contractStartDate} onChange={e => handleInputChange('contractStartDate', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Término Contrato</label>
                                    <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.contractEndDate} onChange={e => handleInputChange('contractEndDate', e.target.value)} />
                                </div>
                                <div className="flex items-center pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border w-full">
                                        <input type="checkbox" className="w-5 h-5 rounded text-teal-600" checked={formData.hasSignedContract} onChange={e => handleInputChange('hasSignedContract', e.target.checked)} />
                                        <span className="text-xs font-bold text-slate-700 uppercase">Contrato Assinado?</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'local' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-left-2">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Estado (UF)</label>
                                        <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.commercialState} onChange={e => handleInputChange('commercialState', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cidade</label>
                                        <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:opacity-50" value={formData.commercialCity} onChange={e => handleInputChange('commercialCity', e.target.value)} disabled={!formData.commercialState || isLoadingCities}>
                                            <option value="">{isLoadingCities ? 'Carregando...' : 'Selecione...'}</option>
                                            {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Bairro</label>
                                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.commercialNeighborhood} onChange={e => handleInputChange('commercialNeighborhood', e.target.value)} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Endereço do Studio</label>
                                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.commercialAddress} onChange={e => handleInputChange('commercialAddress', e.target.value)} />
                                    </div>
                                    <div className="md:col-span-1 flex items-end">
                                        <button 
                                            onClick={handleAutoGeocode}
                                            disabled={isGeocoding}
                                            className="w-full py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                                        >
                                            {isGeocoding ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
                                            Buscar Coordenadas (Auto)
                                        </button>
                                    </div>
                                    
                                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 md:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-amber-700 uppercase flex items-center gap-2 mb-2"><Navigation size={14}/> Coordenadas Geográficas</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="block text-[10px] font-bold text-amber-600 mb-1">Latitude</label><input type="text" placeholder="-23.5505" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" value={formData.latitude} onChange={e => handleInputChange('latitude', e.target.value)} /></div>
                                                <div><label className="block text-[10px] font-bold text-amber-600 mb-1">Longitude</label><input type="text" placeholder="-46.6333" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" value={formData.longitude} onChange={e => handleInputChange('longitude', e.target.value)} /></div>
                                            </div>
                                            <p className="text-[10px] text-amber-600 leading-relaxed"><Info size={10} className="inline mr-1"/> Use o botão acima para preenchimento automático ou coordenadas manuais.</p>
                                        </div>
                                        
                                        <div className="space-y-4 bg-white/50 p-4 rounded-xl border border-amber-200">
                                            <h4 className="text-xs font-black text-indigo-700 uppercase flex items-center gap-2 mb-2"><ShieldCheck size={16}/> Regras de Zoneamento</h4>
                                            <div>
                                                <label className="block text-[10px] font-bold text-indigo-600 mb-1">Raio de Exclusividade Territorial (Km)</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        step="0.1" 
                                                        placeholder="Ex: 5" 
                                                        className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white font-bold text-indigo-900" 
                                                        value={formData.exclusivityRadiusKm} 
                                                        onChange={e => handleInputChange('exclusivityRadiusKm', e.target.value)} 
                                                    />
                                                    <span className="text-xs font-bold text-indigo-400">KM</span>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-indigo-500 leading-relaxed italic">Este valor será plotado no mapa para análise visual de sobreposição entre franqueados.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-amber-700 uppercase flex items-center gap-2 mb-2"><Ruler size={14}/> Distâncias Estratégicas</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="block text-[10px] font-bold text-amber-600 mb-1">KM Ponto de Rua</label><input type="text" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" value={formData.kmStreetPoint} onChange={e => handleInputChange('kmStreetPoint', e.target.value)} /></div>
                                                <div><label className="block text-[10px] font-bold text-amber-600 mb-1">KM Prédio Comercial</label><input type="text" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" value={formData.kmCommercialBuilding} onChange={e => handleInputChange('kmCommercialBuilding', e.target.value)} /></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'studio' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-2">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2"><Building size={16}/> Estrutura</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Status Studio</label>
                                            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={formData.studioStatus} onChange={e => handleInputChange('studioStatus', e.target.value)}>
                                                <option value="Ativo">Ativo</option>
                                                <option value="Em implantação">Em implantação</option>
                                                <option value="Distrato">Distrato</option>
                                            </select>
                                        </div>
                                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Área (M²)</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.studioSizeM2} onChange={e => handleInputChange('studioSizeM2', e.target.value)} /></div>
                                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Lista de Equipamentos</label><textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none" value={formData.equipmentList} onChange={e => handleInputChange('equipmentList', e.target.value)} placeholder="Descreva os aparelhos inclusos..." /></div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2"><DollarSign size={16}/> Financeiro e Outros</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Royalties (R$)</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-teal-700" value={formData.royaltiesValue} onChange={e => handleInputChange('royaltiesValue', e.target.value)} /></div>
                                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Inauguração</label><input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.inaugurationDate} onChange={e => handleInputChange('inaugurationDate', e.target.value)} /></div>
                                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Dados Bancários / Cobrança</label><textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none font-mono text-[11px]" value={formData.bankAccountInfo} onChange={e => handleInputChange('bankAccountInfo', e.target.value)} /></div>
                                        <div className="col-span-2 space-y-3 pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition-colors"><input type="checkbox" className="w-4 h-4 rounded text-teal-600" checked={formData.isRepresentative} onChange={e => handleInputChange('isRepresentative', e.target.checked)} /><span className="text-xs font-bold text-slate-700 uppercase">É Representante Regional?</span></label>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sócios e Pastas Cloud</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sócio 1</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.partner1Name} onChange={e => handleInputChange('partner1Name', e.target.value)} /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sócio 2</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.partner2Name} onChange={e => handleInputChange('partner2Name', e.target.value)} /></div>
                                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Link Pasta Franqueado (Docs)</label><div className="relative"><Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"/><input type="text" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white text-blue-600 underline" value={formData.franchiseeFolderLink} onChange={e => handleInputChange('franchiseeFolderLink', e.target.value)} placeholder="Link do Drive" /></div></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-8 py-5 bg-slate-50 flex justify-between items-center gap-3 shrink-0 border-t">
                        <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                            <AlertCircle size={14}/>
                            <span>Preencha as coordenadas e o raio de exclusividade para mapeamento técnico.</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {formData.id ? 'Salvar Alterações' : 'Cadastrar Franquia'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const XCircleIcon = () => (
    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
        <X size={24} />
    </div>
);

const CheckCircleIcon = () => (
    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
        <CheckCircle size={24} />
    </div>
);
