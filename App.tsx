import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { View, UserProfile, Speaker, Exhibitor, AgendaSession, LeaderboardEntry, UserRole, NewsPost } from './types';
import { INITIAL_EXHIBITOR_CATEGORIES } from './constants';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginView } from './components/views/LoginView';
import { useAppData } from './hooks/useAppData';
import { supabase } from './utils/supabase';

import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import LoadingSpinner from './components/common/LoadingSpinner';

const DashboardView = lazy(() => import('./components/views/DashboardView').then(module => ({ default: module.DashboardView })));
const AgendaView = lazy(() => import('./components/views/AgendaView').then(module => ({ default: module.AgendaView })));
const SpeakersView = lazy(() => import('./components/views/SpeakersView').then(module => ({ default: module.SpeakersView })));
const ExhibitorsView = lazy(() => import('./components/views/ExhibitorsView').then(module => ({ default: module.ExhibitorsView })));
const ScannerView = lazy(() => import('./components/views/ScannerView').then(module => ({ default: module.ScannerView })));
const ProfileView = lazy(() => import('./components/views/ProfileView').then(module => ({ default: module.ProfileView })));
const GamificationView = lazy(() => import('./components/views/GamificationView').then(module => ({ default: module.GamificationView })));

const InfoView = lazy(() => import('./components/views/InfoView').then(module => ({ default: module.InfoView })));
const AdminView = lazy(() => import('./components/views/AdminView').then(module => ({ default: module.AdminView })));
const ExhibitorDashboard = lazy(() => import('./components/views/ExhibitorDashboard').then(module => ({ default: module.ExhibitorDashboard })));
const NewsBoard = lazy(() => import('./components/views/NewsBoard').then(module => ({ default: module.NewsBoard })));
import { ToastContainer } from './components/ToastContainer';
import { useToast } from './contexts/ToastContext';
import { verifySecureToken } from './utils/security';

// Custom hook for localStorage used for legacy non-db items like contacts and device_id
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((prevState: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prevState: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
};

const MainApp = () => {
  const { showToast } = useToast();
  const { session, profile, isLoading, signOut, refreshProfile } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!session || !profile) return <LoginView />;

  const CURRENT_USER = profile;
  // Device ID Management
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('device_id', id);
    }
    return id;
  });

  const [activeView, setActiveView] = useState<View>('DASHBOARD');
  const [contacts, setContacts] = useLocalStorage<UserProfile[]>('contacts', []);
  const points = profile.points || 0;

  const {
    speakers, exhibitors, agendaSessions, leaderboard, exhibitorCategories, newsPosts,
    myAgenda, visitedExhibitors, checkedInSessions, loading, unreadNewsCount,
    setSpeakers, setExhibitors, setAgendaSessions, setExhibitorCategories, setNewsPosts,
    setMyAgenda, setVisitedExhibitors, setCheckedInSessions, setUnreadNewsCount, refreshData
  } = useAppData(profile.id);

  // Clear unread count when visiting News
  useEffect(() => {
    if (activeView === 'NEWS') {
      setUnreadNewsCount(0);
    }
  }, [activeView, setUnreadNewsCount]);

  const userRole = CURRENT_USER.role as UserRole;

  useEffect(() => {
    // PWA: Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New content available, please refresh.');
                }
              });
            }
          });
        })
        .catch(error => console.error('ServiceWorker registration failed: ', error));
    }
  }, []);

  const handleAddPoints = async (amount: number, reason: string) => {
    const newPoints = points + amount;
    await supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id);
    await refreshProfile();
    await refreshData();
    showToast(`${reason} (+${amount} pts)`, 'success');
  };

  const toggleAgendaItem = useCallback(async (sessionId: number) => {
    const isAdding = !myAgenda.includes(sessionId);
    setMyAgenda(prev => isAdding ? [...prev, sessionId] : prev.filter(id => id !== sessionId));

    try {
      if (isAdding) {
        await supabase.from('user_agenda').insert({ user_id: profile.id, session_id: sessionId });
        await handleAddPoints(50, 'Agregado a tu agenda');
      } else {
        await supabase.from('user_agenda').delete().match({ user_id: profile.id, session_id: sessionId });
      }
    } catch (err) {
      console.error(err);
    }
  }, [myAgenda, profile.id, points]);

  const handleScanSuccess = useCallback(async (data: any) => {
    if (data.exhibitorId) {
      if (!visitedExhibitors.includes(data.exhibitorId)) {
        setVisitedExhibitors(prev => [...prev, data.exhibitorId]);
        await supabase.from('user_visited_exhibitors').insert({ user_id: profile.id, exhibitor_id: data.exhibitorId });
        await handleAddPoints(50, `¡Visitaste ${data.name}!`);
      } else {
        showToast(`Ya has visitado a ${data.name}.`, 'info');
      }
    } else if ((data.id && data.name) || (data.payload && data.signature)) {
      let scannedUser = data as UserProfile;
      if (data.payload && data.signature) {
        const verifiedPayload = await verifySecureToken(data);
        if (verifiedPayload) {
          scannedUser = verifiedPayload as UserProfile;
        } else {
          showToast('⚠️ Error de Seguridad: Código QR inválido o manipulado.', 'error');
          return;
        }
      }

      const contact = scannedUser;
      if (contact.deviceId && contact.deviceId !== deviceId) {
        showToast(`⚠️ Alerta de Seguridad: Este perfil está vinculado a otro dispositivo.`, 'error');
        return;
      }

      if (!contacts.some(c => c.id === contact.id)) {
        const boundContact = { ...contact, deviceId: contact.deviceId || deviceId };
        setContacts(prev => [...prev, boundContact]);
        await handleAddPoints(100, `¡Contacto añadido: ${contact.name}!`);
      } else {
        showToast(`${contact.name} ya está en tus contactos.`, 'info');
      }
      setActiveView('PROFILE');
    } else {
      showToast('Código QR no reconocido.', 'error');
    }
  }, [contacts, visitedExhibitors, deviceId, profile.id, points]);

  const handleSessionCheckIn = useCallback(async (sessionId: number) => {
    if (!checkedInSessions.includes(sessionId)) {
      setCheckedInSessions(prev => [...prev, sessionId]);
      await supabase.from('user_session_checkins').insert({ user_id: profile.id, session_id: sessionId });
      await handleAddPoints(20, '¡Check-in realizado!');
    }
  }, [checkedInSessions, profile.id, points]);

  const handleCreatePost = useCallback(async (data: { title: string; content: string; category: string }) => {
    const newPost = {
      title: data.title,
      content: data.content,
      author_name: profile.name,
      author_role: userRole === 'admin' ? 'admin' : 'exhibitor',
      category: data.category,
    };

    const { error } = await supabase.from('news_posts').insert(newPost);
    if (!error) {
      showToast('¡Anuncio publicado!', 'success');
    } else {
      showToast('Error al publicar anucio', 'error');
    }
  }, [profile.name, userRole]);

  const handleDeletePost = useCallback(async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este anuncio?')) return;
    const { error } = await supabase.from('news_posts').delete().eq('id', id);
    if (!error) {
      showToast('Anuncio eliminado', 'info');
    } else {
      showToast('Error al eliminar', 'error');
    }
  }, []);

  if (loading) return <LoadingSpinner />;

  const renderView = () => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardView myAgenda={myAgenda} allSessions={agendaSessions} setActiveView={setActiveView} points={points} speakers={speakers} userRole={userRole} exhibitors={exhibitors} user={CURRENT_USER} />;
      case 'AGENDA': return <AgendaView sessions={agendaSessions} myAgenda={myAgenda} toggleAgendaItem={toggleAgendaItem} speakers={speakers} user={CURRENT_USER} checkedInSessions={checkedInSessions} onCheckIn={handleSessionCheckIn} />;
      case 'SPEAKERS': return <SpeakersView speakers={speakers} agendaSessions={agendaSessions} />;
      case 'EXHIBITORS': return <ExhibitorsView exhibitors={exhibitors} />;
      case 'SCANNER': return <ScannerView onScanSuccess={handleScanSuccess} />;
      case 'PROFILE': return <ProfileView user={CURRENT_USER} contacts={contacts} setActiveView={setActiveView} />;
      case 'GAMIFICATION': return <GamificationView leaderboard={leaderboard} userPoints={points} />;
      case 'INFO': return <InfoView />;
      case 'ADMIN': return userRole === 'admin' ? <AdminView speakers={speakers} exhibitors={exhibitors} agendaSessions={agendaSessions} setSpeakers={setSpeakers} setExhibitors={setExhibitors} setAgendaSessions={setAgendaSessions} contacts={contacts} setContacts={setContacts} exhibitorCategories={exhibitorCategories} setExhibitorCategories={setExhibitorCategories} /> : <div className="p-4 text-center text-red-600">Acceso denegado. Se requieren permisos de administrador.</div>;
      case 'MY_STAND': return userRole === 'exhibitor' ? <ExhibitorDashboard user={{ ...CURRENT_USER, role: userRole }} /> : <div className="p-4 text-center text-red-600">Acceso denegado. Solo para expositores.</div>;
      case 'NEWS': return <NewsBoard posts={newsPosts} userRole={userRole} currentUserName={CURRENT_USER.name} onCreatePost={handleCreatePost} onDeletePost={handleDeletePost} />;
      default: return <DashboardView myAgenda={myAgenda} allSessions={agendaSessions} setActiveView={setActiveView} points={points} speakers={speakers} userRole={userRole} exhibitors={exhibitors} user={CURRENT_USER} />;
    }
  };

  const viewTitles: Record<View, string> = {
    DASHBOARD: 'Inicio', AGENDA: 'Agenda', SPEAKERS: 'Ponentes', EXHIBITORS: 'Expositores', SCANNER: 'Escanear QR', PROFILE: 'Mi Perfil', GAMIFICATION: 'Gamificación', INFO: 'Información', ADMIN: 'Panel de Administración', MY_STAND: 'Mi Stand', NEWS: 'Noticias',
  };

  return (
    <div className="min-h-screen font-sans text-slate-900">
      <Header title={viewTitles[activeView]} onLogout={signOut} />
      <ToastContainer />
      <main className="pb-32">
        <Suspense fallback={<LoadingSpinner />}>
          {renderView()}
        </Suspense>
      </main>
      <BottomNav activeView={activeView} setActiveView={setActiveView} unreadNewsCount={unreadNewsCount} />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;