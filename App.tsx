import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { View, UserProfile, Speaker, Exhibitor, AgendaSession, LeaderboardEntry, UserRole, NewsPost } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginView } from './components/views/LoginView';
import { useAppData } from './hooks/useAppData';
import { supabase } from './utils/supabase';

import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import LoadingSpinner from './components/common/LoadingSpinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Helper to auto-reload the page once if a chunk fails to load (e.g. after a new deployment changes chunk hashes)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }
      throw error;
    }
  }) as any;

const DashboardView = lazyWithRetry(() => import('./components/views/DashboardView').then(module => ({ default: module.DashboardView })));
const AgendaView = lazyWithRetry(() => import('./components/views/AgendaView').then(module => ({ default: module.AgendaView })));
const SpeakersView = lazyWithRetry(() => import('./components/views/SpeakersView').then(module => ({ default: module.SpeakersView })));
const ExhibitorsView = lazyWithRetry(() => import('./components/views/ExhibitorsView').then(module => ({ default: module.ExhibitorsView })));
const ScannerView = lazyWithRetry(() => import('./components/views/ScannerView').then(module => ({ default: module.ScannerView })));
const ProfileView = lazyWithRetry(() => import('./components/views/ProfileView').then(module => ({ default: module.ProfileView })));
const GamificationView = lazyWithRetry(() => import('./components/views/GamificationView').then(module => ({ default: module.GamificationView })));

const InfoView = lazyWithRetry(() => import('./components/views/InfoView').then(module => ({ default: module.InfoView })));
const AdminView = lazyWithRetry(() => import('./components/views/AdminView').then(module => ({ default: module.AdminView })));
const ExhibitorDashboard = lazyWithRetry(() => import('./components/views/ExhibitorDashboard').then(module => ({ default: module.ExhibitorDashboard })));
const NewsBoard = lazyWithRetry(() => import('./components/views/NewsBoard').then(module => ({ default: module.NewsBoard })));
import { ToastContainer } from './components/ToastContainer';
import { useToast } from './contexts/ToastContext';
import { getOrCreateDeviceId } from './utils/device';
import { isSecureTokenLike, verifySecureToken } from './utils/security';
import { isSessionActive } from './utils/timeValidation';

// Custom hook for legacy client-only values stored in localStorage.
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

const UUID_LIKE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuidLike = (value: unknown): value is string =>
  typeof value === 'string' && UUID_LIKE_PATTERN.test(value.trim());

const MainApp = () => {
  // ============================================================
  // ALL HOOKS MUST BE HERE — BEFORE ANY CONDITIONAL RETURNS
  // React requires the SAME hooks to run in the SAME order on
  // every single render. No hook may appear after an early return.
  // ============================================================

  const { showToast } = useToast();
  const { session, profile, isLoading, signOut, refreshProfile } = useAuth();

  // Device ID Management
  const [deviceId] = useState(() => getOrCreateDeviceId());

  const [activeView, setActiveView] = useState<View>('DASHBOARD');

  const {
    agendaSessions,
    speakers,
    myAgenda,
    setMyAgenda,
    visitedExhibitors,
    setVisitedExhibitors,
    checkedInSessions,
    setCheckedInSessions,
    myRatings,
    setMyRatings,
    exhibitors,
    leaderboard,
    newsPosts,
    setSpeakers,
    setExhibitors,
    setAgendaSessions,
    unreadNewsCount,
    loading,
    setUnreadNewsCount,
    contacts,
    setContacts,
    refreshData
  } = useAppData(profile?.id);

  // Clear unread count when visiting News
  useEffect(() => {
    if (activeView === 'NEWS') {
      setUnreadNewsCount(0);
    }
  }, [activeView, setUnreadNewsCount]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // In local development, stale service workers are more harmful than helpful.
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
        .catch(error => console.error('ServiceWorker cleanup failed: ', error));
      return;
    }

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
  }, []);

  const handleAddPoints = useCallback(async (amount: number, reason: string) => {
    if (!profile) return;
    const currentRole = profile.role as UserRole;
    if (currentRole !== 'attendee') return;
    const newPoints = (profile.points || 0) + amount;
    await supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id);
    await refreshProfile();
    await refreshData();
    showToast(`${reason} (+${amount} pts)`, 'success');
  }, [profile, refreshProfile, refreshData, showToast]);

  const toggleAgendaItem = useCallback(async (sessionId: number) => {
    if (!profile) return;
    const isAdding = !myAgenda.includes(sessionId);
    // Optimistic UI update
    setMyAgenda(prev => isAdding ? [...prev, sessionId] : prev.filter(id => id !== sessionId));

    try {
      if (isAdding) {
        const { error } = await supabase.from('user_agenda').insert({ user_id: profile.id, session_id: sessionId });
        if (error) {
          console.error("Error adding to agenda:", error);
          showToast(`Error al guardar en agenda: ${error.message}`, 'error');
          // Revert local state
          setMyAgenda(prev => prev.filter(id => id !== sessionId));
          return;
        }
        await handleAddPoints(50, 'Agregado a tu agenda');
      } else {
        const { error } = await supabase.from('user_agenda').delete().match({ user_id: profile.id, session_id: sessionId });
        if (error) {
          console.error("Error removing from agenda:", error);
          showToast(`Error al quitar de agenda: ${error.message}`, 'error');
          // Revert local state
          setMyAgenda(prev => [...prev, sessionId]);
          return;
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error de red al actualizar agenda.', 'error');
    }
  }, [myAgenda, profile, showToast, handleAddPoints, setMyAgenda]);

  const handleScanSuccess = useCallback(async (rawData: any) => {
    if (!profile) return;

    let data = rawData;

    if (isSecureTokenLike(rawData)) {
      const verifiedPayload = await verifySecureToken(rawData);
      if (!verifiedPayload) {
        showToast('⚠️ Error de Seguridad: Código QR inválido o manipulado.', 'error');
        return;
      }

      data = verifiedPayload;
    }

    if (data.exhibitorId) {
      if (!visitedExhibitors.includes(data.exhibitorId)) {
        const { error } = await supabase.from('user_visited_exhibitors').insert({ user_id: profile.id, exhibitor_id: data.exhibitorId });
        if (error) {
          if (error.code === '23505') {
            showToast('Ya has visitado este stand (Registrado en servidor).', 'info');
            setVisitedExhibitors(prev => [...prev, data.exhibitorId]); // Sync local state
          } else {
            showToast('Error al registrar visita.', 'error');
          }
        } else {
          setVisitedExhibitors(prev => [...prev, data.exhibitorId]);
          await handleAddPoints(50, `¡Visitaste ${data.name || 'un Stand'}!`);
        }
      } else {
        showToast(`Ya has visitado a ${data.name || 'este Expositor'}.`, 'info');
      }
    } else if (data.id) {
      let contact = data as Partial<UserProfile> & { id: string };

      if (!isUuidLike(contact.id)) {
        let resolvedProfile: {
          id: string;
          name: string | null;
          title: string | null;
          company: string | null;
          photo_url: string | null;
          email: string | null;
          phone: string | null;
          role: UserRole | null;
          attendee_category: string | null;
        } | null = null;

        const normalizedEmail = typeof contact.email === 'string' ? contact.email.trim().toLowerCase() : '';
        const rawPhone = typeof contact.phone === 'string' ? contact.phone.trim() : '';
        const normalizedPhone = rawPhone.replace(/\D/g, '');

        if (normalizedEmail) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('id, name, title, company, photo_url, email, phone, role, attendee_category')
            .eq('email', normalizedEmail)
            .maybeSingle();

          resolvedProfile = profileByEmail;
        }

        if (!resolvedProfile && rawPhone) {
          const { data: profileByPhone } = await supabase
            .from('profiles')
            .select('id, name, title, company, photo_url, email, phone, role, attendee_category')
            .eq('phone', rawPhone)
            .maybeSingle();

          resolvedProfile = profileByPhone;
        }

        if (!resolvedProfile && normalizedPhone && normalizedPhone !== rawPhone) {
          const { data: profileByNormalizedPhone } = await supabase
            .from('profiles')
            .select('id, name, title, company, photo_url, email, phone, role, attendee_category')
            .eq('phone', normalizedPhone)
            .maybeSingle();

          resolvedProfile = profileByNormalizedPhone;
        }

        if (!resolvedProfile) {
          showToast('El vCard se leyó, pero esa persona aún no tiene un perfil activo reconocible en CISMM X Connect.', 'info');
          return;
        }

        contact = {
          id: resolvedProfile.id,
          name: resolvedProfile.name || contact.name,
          title: resolvedProfile.title || contact.title,
          company: resolvedProfile.company || contact.company,
          photoUrl: resolvedProfile.photo_url || contact.photoUrl,
          email: resolvedProfile.email || contact.email,
          phone: resolvedProfile.phone || contact.phone,
          role: (resolvedProfile.role as UserRole | null) || contact.role,
          attendeeCategory: contact.attendeeCategory,
          interests: [],
          track: 'General',
        };
      } else if (!contact.name) {
        // Minimal in-app QR payloads only carry the UUID. Resolve the rest of the public
        // profile here so the contact can still be saved and shown nicely.
        const { data: profileById } = await supabase
          .from('profiles')
          .select('id, name, title, company, photo_url, email, phone, role, attendee_category')
          .eq('id', contact.id)
          .maybeSingle();

        if (!profileById) {
          showToast('Se leyó el QR, pero no pudimos cargar ese perfil en CISMM X Connect.', 'info');
          return;
        }

        contact = {
          id: profileById.id,
          name: profileById.name || 'Contacto CISMM',
          title: profileById.title || '',
          company: profileById.company || '',
          photoUrl: profileById.photo_url || '',
          email: profileById.email || '',
          phone: profileById.phone || '',
          role: (profileById.role as UserRole | null) || 'attendee',
          attendeeCategory: contact.attendeeCategory,
          interests: [],
          track: 'General',
        };
      }

      if (contact.deviceId && contact.deviceId !== deviceId) {
        showToast(`⚠️ Alerta de Seguridad: Este perfil está vinculado a otro dispositivo.`, 'error');
        return;
      }

      const { data: contactSyncResult, error } = await supabase.rpc('add_mutual_contact', {
        target_user_id: contact.id
      });

      if (error) {
        showToast('Error al guardar contacto en el servidor.', 'error');
      } else {
        const syncResult = (contactSyncResult || {}) as {
          created_forward?: boolean;
          created_reverse?: boolean;
          is_self_scan?: boolean;
        };

        if (syncResult.is_self_scan) {
          showToast('No puedes escanear tu propio QR para agregarte como contacto.', 'info');
        } else if (syncResult.created_forward) {
          await handleAddPoints(100, `¡Contacto añadido: ${contact.name}! También apareces en sus contactos.`);
        } else {
          await refreshData();

          if (syncResult.created_reverse) {
            showToast(`${contact.name} ya estaba en tus contactos. Ahora tú también apareces en los suyos.`, 'success');
          } else {
            showToast(`${contact.name} ya está en tus contactos.`, 'info');
          }
        }
      }
      setActiveView('PROFILE');
    } else {
      showToast('Código QR no reconocido.', 'error');
    }
  }, [visitedExhibitors, deviceId, profile, handleAddPoints, showToast, refreshData, setVisitedExhibitors, setActiveView]);

  const handleSessionCheckIn = useCallback(async (sessionId: number) => {
    if (!profile) return;
    const sess = agendaSessions.find(s => s.id === sessionId);
    if (!sess) {
      showToast('Sesión no encontrada.', 'error');
      return;
    }

    if (!isSessionActive(sess.day, sess.startTime, sess.endTime)) {
      showToast('Esta conferencia no está activa en este momento.', 'error');
      return;
    }

    if (!checkedInSessions.includes(sessionId)) {
      const { error } = await supabase.from('user_session_checkins').insert({ user_id: profile.id, session_id: sessionId });
      if (error) {
        if (error.code === '23505') {
          showToast('Check-in previamente registrado en el servidor.', 'info');
          setCheckedInSessions(prev => [...prev, sessionId]);
        } else {
          showToast('Error al hacer check-in.', 'error');
        }
      } else {
        setCheckedInSessions(prev => [...prev, sessionId]);
        await handleAddPoints(20, '¡Check-in realizado!');
      }
    } else {
      showToast('Ya has hecho check-in a esta sesión.', 'info');
    }
  }, [checkedInSessions, profile, agendaSessions, showToast, handleAddPoints, setCheckedInSessions]);

  const invokeManageUsers = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('manage-users', {
      headers: { Authorization: `Bearer ${currentSession?.access_token}` },
      body: { action, payload }
    });

    if (error) throw new Error(data?.error || error.message);
    if (data?.error) throw new Error(data.error);

    return data;
  }, []);

  const handleCreatePost = useCallback(async (data: { title: string; content: string; category: string }) => {
    if (!profile) return;
    try {
      await invokeManageUsers('CREATE_NEWS_POST', data);
      showToast('¡Anuncio publicado!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al publicar anuncio', 'error');
    }
  }, [profile, showToast, invokeManageUsers]);

  const handleDeletePost = useCallback(async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este anuncio?')) return;
    try {
      await invokeManageUsers('DELETE_NEWS_POST', { postId: id });
      showToast('Anuncio eliminado', 'info');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar', 'error');
    }
  }, [showToast, invokeManageUsers]);

  const handleLogout = useCallback(() => {
    if (!profile) return;
    const userRole = profile.role as UserRole;
    if (userRole === 'attendee') {
      const confirmLogout = window.confirm('ATENCIÓN: Si cierras sesión, tu gafete virtual se desvinculará de este dispositivo. Para volver a entrar, necesitarás contactar a un Administrador para que resetee tu acceso.\n\n¿Estás seguro de que deseas salir?');
      if (!confirmLogout) return;
    }
    signOut();
  }, [profile, signOut]);

  // ============================================================
  // CONDITIONAL RETURNS — safe because ALL hooks are above
  // ============================================================

  if (isLoading || loading) return <LoadingSpinner />;
  if (!session || !profile) {
    return (
      <ErrorBoundary onReset={() => window.location.reload()}>
        <LoginView />
      </ErrorBoundary>
    );
  }

  // Non-hook derived values (safe after the guard)
  const userRole = profile.role as UserRole;
  const points = profile.points || 0;

  const viewTitles: Record<View, string> = {
    DASHBOARD: 'Inicio', AGENDA: 'Agenda', SPEAKERS: 'Ponentes', EXHIBITORS: 'Expositores', SCANNER: 'Escanear QR', PROFILE: 'Mi Perfil', GAMIFICATION: 'Leaderboard', INFO: 'Información', ADMIN: 'Panel de Administración', MY_STAND: 'Mi Stand', NEWS: 'Noticias',
  };

  const renderView = () => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardView myAgenda={myAgenda} allSessions={agendaSessions} setActiveView={setActiveView} points={points} speakers={speakers} userRole={userRole} exhibitors={exhibitors} user={profile} />;
      case 'AGENDA': return <AgendaView sessions={agendaSessions} myAgenda={myAgenda} toggleAgendaItem={toggleAgendaItem} speakers={speakers} user={profile} checkedInSessions={checkedInSessions} myRatings={myRatings} onCheckIn={handleSessionCheckIn} onRatingSubmitted={(sessionId) => setMyRatings(prev => [...prev, sessionId])} />;
      case 'SPEAKERS': return <SpeakersView speakers={speakers} agendaSessions={agendaSessions} />;
      case 'EXHIBITORS': return <ExhibitorsView exhibitors={exhibitors} />;
      case 'SCANNER': return <ScannerView onScanSuccess={handleScanSuccess} />;
      case 'PROFILE': return <ProfileView user={profile} contacts={contacts} setActiveView={setActiveView} speaker={speakers.find(speaker => speaker.id === profile.speakerId)} exhibitor={exhibitors.find(exhibitor => exhibitor.id === profile.exhibitorId)} refreshData={refreshData} />;
      case 'GAMIFICATION': return <GamificationView leaderboard={leaderboard} userPoints={points} />;
      case 'INFO': return <InfoView />;
      case 'ADMIN': return userRole === 'admin' ? <AdminView speakers={speakers} exhibitors={exhibitors} agendaSessions={agendaSessions} setSpeakers={setSpeakers} setExhibitors={setExhibitors} setAgendaSessions={setAgendaSessions} contacts={contacts} setContacts={setContacts} /> : <div className="p-4 text-center text-red-600">Acceso denegado. Se requieren permisos de administrador.</div>;
      case 'MY_STAND': return userRole === 'exhibitor' ? <ExhibitorDashboard user={{ ...profile, role: userRole }} /> : <div className="p-4 text-center text-red-600">Acceso denegado. Solo para expositores.</div>;
      case 'NEWS': return <NewsBoard posts={newsPosts} userRole={userRole} currentUserName={profile.name} onCreatePost={handleCreatePost} onDeletePost={handleDeletePost} />;
      default: return <DashboardView myAgenda={myAgenda} allSessions={agendaSessions} setActiveView={setActiveView} points={points} speakers={speakers} userRole={userRole} exhibitors={exhibitors} user={profile} />;
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-900">
      <Header title={viewTitles[activeView]} onLogout={handleLogout} />
      <ToastContainer />
      <main className="pb-32">
        <ErrorBoundary key={activeView} onReset={() => setActiveView('DASHBOARD')}>
          <Suspense fallback={<LoadingSpinner />}>
            {renderView()}
          </Suspense>
        </ErrorBoundary>
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
