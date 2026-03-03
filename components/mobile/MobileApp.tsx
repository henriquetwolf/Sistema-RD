import React, { useState, useEffect } from 'react';
import {
  Home, GraduationCap, Award, BookOpen, User,
  Calendar, FileSignature, LifeBuoy, MapPin,
  Newspaper, Loader2, MonitorPlay,
} from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav, NavItem } from './MobileBottomNav';
import { MobileLogin } from './MobileLogin';
import { NearbyStudios } from './NearbyStudios';
import { StudentArea } from '../StudentArea';
import { InstructorArea } from '../InstructorArea';
import { platformService } from '../../services/platformService';
import { pushService } from '../../services/pushService';
import { liveUpdateService } from '../../services/liveUpdateService';
import { offlineService } from '../../services/offlineService';
import { Teacher } from '../TeachersManager';
import { StudentSession } from '../../types';
import { appBackend } from '../../services/appBackend';
import { VOLL_LOGO_BASE64 } from '../../utils/constants';

type MobileScreen = 'home' | 'classes' | 'courses' | 'certificates' | 'events' | 'contracts' | 'support' | 'surveys' | 'news' | 'trainings' | 'nearby' | 'profile';

export const MobileApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentInstructor, setCurrentInstructor] = useState<Teacher | null>(null);
  const [currentStudent, setCurrentStudent] = useState<StudentSession | null>(null);
  const [activeScreen, setActiveScreen] = useState<MobileScreen>('home');
  const [appLogo, setAppLogo] = useState<string>(VOLL_LOGO_BASE64);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    initMobileApp();
    return () => {
      pushService.removeAllListeners();
    };
  }, []);

  const initMobileApp = async () => {
    try {
      if (platformService.isNative()) {
        await liveUpdateService.initialize();

        try {
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        } catch {}

        CapApp.addListener('backButton', ({ canGoBack }) => {
          if (activeScreen !== 'home') {
            setActiveScreen('home');
          } else {
            CapApp.exitApp();
          }
        });

        try {
          Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
          Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
        } catch {}
      }

      const savedLogo = await appBackend.getAppLogo();
      if (savedLogo) setAppLogo(savedLogo);

      const savedInstructor = sessionStorage.getItem('instructor_session');
      if (savedInstructor) {
        try { setCurrentInstructor(JSON.parse(savedInstructor)); } catch {}
      }

      const savedStudent = sessionStorage.getItem('student_session');
      if (savedStudent) {
        try { setCurrentStudent(JSON.parse(savedStudent)); } catch {}
      }
    } catch (e) {
      console.error('Error initializing mobile app:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstructorLogin = async (teacher: Teacher) => {
    setCurrentInstructor(teacher);
    sessionStorage.setItem('instructor_session', JSON.stringify(teacher));
    setActiveScreen('home');
    if (platformService.isNative()) {
      await pushService.register(teacher.id, 'instructor');
      offlineService.cacheInstructorData(teacher.id);
    }
  };

  const handleStudentLogin = async (student: StudentSession) => {
    setCurrentStudent(student);
    sessionStorage.setItem('student_session', JSON.stringify(student));
    setActiveScreen('home');
    if (platformService.isNative() && student.deals[0]?.id) {
      await pushService.register(String(student.deals[0].id), 'student');
      offlineService.cacheStudentData(student.email);
    }
  };

  const handleLogout = async () => {
    if (currentInstructor) {
      await pushService.unregister(currentInstructor.id);
      setCurrentInstructor(null);
      sessionStorage.removeItem('instructor_session');
    } else if (currentStudent) {
      if (currentStudent.deals[0]?.id) {
        await pushService.unregister(String(currentStudent.deals[0].id));
      }
      setCurrentStudent(null);
      sessionStorage.removeItem('student_session');
    }
    setActiveScreen('home');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <img src={appLogo} alt="VOLL" className="h-12 mx-auto mb-4" />
          <Loader2 className="animate-spin text-teal-600 mx-auto" size={28} />
        </div>
      </div>
    );
  }

  if (!currentInstructor && !currentStudent) {
    return (
      <MobileLogin
        onInstructorLogin={handleInstructorLogin}
        onStudentLogin={handleStudentLogin}
        logoUrl={appLogo}
      />
    );
  }

  if (currentInstructor) {
    return (
      <MobileInstructorShell
        instructor={currentInstructor}
        onLogout={handleLogout}
        logoUrl={appLogo}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        keyboardVisible={keyboardVisible}
      />
    );
  }

  if (currentStudent) {
    return (
      <MobileStudentShell
        student={currentStudent}
        onLogout={handleLogout}
        logoUrl={appLogo}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        keyboardVisible={keyboardVisible}
      />
    );
  }

  return null;
};

// ─── Student Mobile Shell ────────────────────────────────────────────────────

interface MobileStudentShellProps {
  student: StudentSession;
  onLogout: () => void;
  logoUrl: string;
  activeScreen: MobileScreen;
  setActiveScreen: (s: MobileScreen) => void;
  keyboardVisible: boolean;
}

const MobileStudentShell: React.FC<MobileStudentShellProps> = ({
  student, onLogout, logoUrl, activeScreen, setActiveScreen, keyboardVisible,
}) => {
  const studentNavItems: NavItem[] = [
    { id: 'home', label: 'Início', icon: <Home size={22} /> },
    { id: 'courses', label: 'Cursos', icon: <MonitorPlay size={22} /> },
    { id: 'certificates', label: 'Certificados', icon: <Award size={22} /> },
    { id: 'nearby', label: 'Studios', icon: <MapPin size={22} /> },
    { id: 'profile', label: 'Perfil', icon: <User size={22} /> },
  ];

  const screenTitles: Record<string, string> = {
    home: 'Início',
    classes: 'Minhas Turmas',
    courses: 'Cursos Online',
    certificates: 'Certificados',
    events: 'Eventos',
    contracts: 'Contratos',
    surveys: 'Pesquisas',
    nearby: 'Studios Próximos',
    profile: 'Meu Perfil',
  };

  if (activeScreen === 'home') {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader
          title={`Olá, ${student.name.split(' ')[0]}!`}
          subtitle="Área do Aluno"
          logoUrl={logoUrl}
          onLogout={onLogout}
        />

        <div className="p-4 pb-24 space-y-4">
          <div className="bg-gradient-to-r from-teal-600 to-indigo-700 rounded-2xl p-5 text-white">
            <p className="text-teal-100 text-xs font-bold uppercase tracking-wider mb-1">Bem-vindo(a)</p>
            <h2 className="text-xl font-black">{student.name}</h2>
            <p className="text-teal-100 text-sm mt-1">{student.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'classes', icon: <GraduationCap size={24} />, label: 'Turmas', color: 'bg-blue-50 text-blue-600' },
              { id: 'courses', icon: <MonitorPlay size={24} />, label: 'Cursos Online', color: 'bg-purple-50 text-purple-600' },
              { id: 'certificates', icon: <Award size={24} />, label: 'Certificados', color: 'bg-amber-50 text-amber-600' },
              { id: 'events', icon: <Calendar size={24} />, label: 'Eventos', color: 'bg-rose-50 text-rose-600' },
              { id: 'contracts', icon: <FileSignature size={24} />, label: 'Contratos', color: 'bg-indigo-50 text-indigo-600' },
              { id: 'surveys', icon: <BookOpen size={24} />, label: 'Pesquisas', color: 'bg-teal-50 text-teal-600' },
              { id: 'nearby', icon: <MapPin size={24} />, label: 'Studios', color: 'bg-green-50 text-green-600' },
              { id: 'profile', icon: <User size={24} />, label: 'Meu Perfil', color: 'bg-slate-100 text-slate-600' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id as MobileScreen)}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center gap-2 active:bg-slate-50 shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-slate-700">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {!keyboardVisible && (
          <MobileBottomNav
            items={studentNavItems}
            activeId={activeScreen}
            onSelect={(id) => setActiveScreen(id as MobileScreen)}
          />
        )}
      </div>
    );
  }

  if (activeScreen === 'nearby') {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader
          title="Studios Próximos"
          onBack={() => setActiveScreen('home')}
        />
        <NearbyStudios />
        {!keyboardVisible && (
          <MobileBottomNav
            items={studentNavItems}
            activeId={activeScreen}
            onSelect={(id) => setActiveScreen(id as MobileScreen)}
          />
        )}
      </div>
    );
  }

  if (activeScreen === 'profile') {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader
          title="Meu Perfil"
          onBack={() => setActiveScreen('home')}
          onLogout={onLogout}
        />
        <div className="p-4 pb-24">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={36} className="text-teal-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{student.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{student.email}</p>
            <p className="text-xs text-slate-400 mt-2">{student.deals.length} matrícula(s)</p>
          </div>

          <button
            onClick={onLogout}
            className="w-full mt-6 bg-red-50 border border-red-200 text-red-600 font-bold py-3.5 rounded-xl active:bg-red-100"
          >
            Sair da Conta
          </button>
        </div>
        {!keyboardVisible && (
          <MobileBottomNav
            items={studentNavItems}
            activeId={activeScreen}
            onSelect={(id) => setActiveScreen(id as MobileScreen)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileHeader
        title={screenTitles[activeScreen] || 'VOLL Pilates'}
        onBack={() => setActiveScreen('home')}
      />
      <div className="pb-20">
        <StudentArea student={student} onLogout={onLogout} logoUrl={logoUrl} />
      </div>
      {!keyboardVisible && (
        <MobileBottomNav
          items={studentNavItems}
          activeId={activeScreen}
          onSelect={(id) => setActiveScreen(id as MobileScreen)}
        />
      )}
    </div>
  );
};

// ─── Instructor Mobile Shell ─────────────────────────────────────────────────

interface MobileInstructorShellProps {
  instructor: Teacher;
  onLogout: () => void;
  logoUrl: string;
  activeScreen: MobileScreen;
  setActiveScreen: (s: MobileScreen) => void;
  keyboardVisible: boolean;
}

const MobileInstructorShell: React.FC<MobileInstructorShellProps> = ({
  instructor, onLogout, logoUrl, activeScreen, setActiveScreen, keyboardVisible,
}) => {
  const instructorNavItems: NavItem[] = [
    { id: 'home', label: 'Início', icon: <Home size={22} /> },
    { id: 'classes', label: 'Turmas', icon: <GraduationCap size={22} /> },
    { id: 'trainings', label: 'Treinos', icon: <MonitorPlay size={22} /> },
    { id: 'nearby', label: 'Studios', icon: <MapPin size={22} /> },
    { id: 'profile', label: 'Perfil', icon: <User size={22} /> },
  ];

  const screenTitles: Record<string, string> = {
    home: 'Início',
    classes: 'Minhas Turmas',
    contracts: 'Contratos',
    trainings: 'Treinamentos',
    support: 'Suporte',
    news: 'Novidades',
    nearby: 'Studios Próximos',
    profile: 'Meu Perfil',
  };

  if (activeScreen === 'home') {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader
          title={`Olá, ${(instructor.socialName || instructor.fullName).split(' ')[0]}!`}
          subtitle="Área do Instrutor"
          logoUrl={logoUrl}
          onLogout={onLogout}
        />

        <div className="p-4 pb-24 space-y-4">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Bem-vindo(a)</p>
            <h2 className="text-xl font-black">{instructor.socialName || instructor.fullName}</h2>
            <p className="text-indigo-100 text-sm mt-1">{instructor.specialty || 'Instrutor(a)'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'classes', icon: <GraduationCap size={24} />, label: 'Turmas', color: 'bg-blue-50 text-blue-600' },
              { id: 'contracts', icon: <FileSignature size={24} />, label: 'Contratos', color: 'bg-indigo-50 text-indigo-600' },
              { id: 'trainings', icon: <MonitorPlay size={24} />, label: 'Treinamentos', color: 'bg-purple-50 text-purple-600' },
              { id: 'support', icon: <LifeBuoy size={24} />, label: 'Suporte', color: 'bg-rose-50 text-rose-600' },
              { id: 'news', icon: <Newspaper size={24} />, label: 'Novidades', color: 'bg-amber-50 text-amber-600' },
              { id: 'nearby', icon: <MapPin size={24} />, label: 'Studios', color: 'bg-green-50 text-green-600' },
              { id: 'profile', icon: <User size={24} />, label: 'Meu Perfil', color: 'bg-slate-100 text-slate-600' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id as MobileScreen)}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center gap-2 active:bg-slate-50 shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-slate-700">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {!keyboardVisible && (
          <MobileBottomNav
            items={instructorNavItems}
            activeId={activeScreen}
            onSelect={(id) => setActiveScreen(id as MobileScreen)}
          />
        )}
      </div>
    );
  }

  if (activeScreen === 'nearby') {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader
          title="Studios Próximos"
          onBack={() => setActiveScreen('home')}
        />
        <NearbyStudios />
        {!keyboardVisible && (
          <MobileBottomNav
            items={instructorNavItems}
            activeId={activeScreen}
            onSelect={(id) => setActiveScreen(id as MobileScreen)}
          />
        )}
      </div>
    );
  }

  if (activeScreen === 'profile') {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader
          title="Meu Perfil"
          onBack={() => setActiveScreen('home')}
          onLogout={onLogout}
        />
        <div className="p-4 pb-24">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
            {instructor.photoUrl ? (
              <img src={instructor.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
            ) : (
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={36} className="text-indigo-600" />
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800">{instructor.socialName || instructor.fullName}</h3>
            <p className="text-sm text-slate-500 mt-1">{instructor.email}</p>
            {instructor.specialty && (
              <span className="inline-block mt-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {instructor.specialty}
              </span>
            )}
            {instructor.crefito && (
              <p className="text-xs text-slate-400 mt-2">CREFITO: {instructor.crefito}</p>
            )}
          </div>

          <button
            onClick={onLogout}
            className="w-full mt-6 bg-red-50 border border-red-200 text-red-600 font-bold py-3.5 rounded-xl active:bg-red-100"
          >
            Sair da Conta
          </button>
        </div>
        {!keyboardVisible && (
          <MobileBottomNav
            items={instructorNavItems}
            activeId={activeScreen}
            onSelect={(id) => setActiveScreen(id as MobileScreen)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileHeader
        title={screenTitles[activeScreen] || 'VOLL Pilates'}
        onBack={() => setActiveScreen('home')}
      />
      <div className="pb-20">
        <InstructorArea instructor={instructor} onLogout={onLogout} />
      </div>
      {!keyboardVisible && (
        <MobileBottomNav
          items={instructorNavItems}
          activeId={activeScreen}
          onSelect={(id) => setActiveScreen(id as MobileScreen)}
        />
      )}
    </div>
  );
};
