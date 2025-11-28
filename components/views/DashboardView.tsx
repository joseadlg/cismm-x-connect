
import { ReactNode } from 'react';
import { AgendaSession, Speaker, UserProfile, View, Exhibitor } from '../../types';
import { ALL_ATTENDEES, CURRENT_USER } from '../../constants';
import { CalendarIcon, InformationCircleIcon, TrophyIcon, UserGroupIcon } from '../Icons';

interface DashboardViewProps {
  myAgenda: number[];
  allSessions: AgendaSession[];
  setActiveView: (view: View) => void;
  points: number;
  speakers: Speaker[];
  userRole: 'admin' | 'exhibitor' | 'attendee';
  exhibitors: Exhibitor[];
}

const QuickAccessCard = ({ title, icon, onClick }: { title: string; icon: ReactNode; onClick: () => void; }) => (
  <button onClick={onClick} className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
    <div className="text-brand-accent mb-2">{icon}</div>
    <h3 className="font-semibold text-brand-primary">{title}</h3>
  </button>
);

export const DashboardView = ({ myAgenda, allSessions, setActiveView, points, speakers, userRole, exhibitors }: DashboardViewProps) => {
  const getSpeakerName = (speakerId: number) => {
    return speakers.find(s => s.id === speakerId)?.name || 'Ponente Desconocido';
  };

  const upcomingSessions = allSessions.filter(session => myAgenda.includes(session.id)).slice(0, 2);

  const recommendedProfiles = ALL_ATTENDEES.filter(attendee =>
    attendee.id !== CURRENT_USER.id &&
    attendee.interests.some(interest => CURRENT_USER.interests.includes(interest))
  ).slice(0, 3);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-brand-primary mb-2">Hola, {CURRENT_USER.name}</h2>
        <p className="text-gray-600">Bienvenido a CISMM X Connect. Aquí tienes un resumen de tu día.</p>
        <p className="text-gray-600 mt-2">Tus Puntos: <span className="font-bold text-brand-accent">{points}</span></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAccessCard title="Ponentes" icon={<UserGroupIcon />} onClick={() => setActiveView('SPEAKERS')} />
        <QuickAccessCard title="Expositores" icon={<UserGroupIcon />} onClick={() => setActiveView('EXHIBITORS')} />
        <QuickAccessCard title="Gamificación" icon={<TrophyIcon />} onClick={() => setActiveView('GAMIFICATION')} />

        {userRole === 'admin' && (
          <QuickAccessCard title="Admin Panel" icon={<UserGroupIcon />} onClick={() => setActiveView('ADMIN')} />
        )}

        {userRole === 'exhibitor' && (
          <QuickAccessCard title="Mi Stand" icon={<UserGroupIcon />} onClick={() => setActiveView('MY_STAND')} />
        )}

        <QuickAccessCard title="Info General" icon={<InformationCircleIcon />} onClick={() => setActiveView('INFO')} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center mb-4">
          <CalendarIcon />
          <h3 className="text-lg font-bold text-brand-primary ml-2">Próximo en tu Agenda</h3>
        </div>
        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map(session => (
              <div key={session.id} className="border-l-4 border-brand-accent pl-3">
                <p className="font-semibold">{session.title}</p>
                <p className="text-sm text-gray-500">{session.startTime} - {session.endTime} | {session.room}</p>
                <p className="text-sm text-gray-700">{session.speakerIds.map(getSpeakerName).join(', ')}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No tienes sesiones agendadas. <button onClick={() => setActiveView('AGENDA')} className="text-brand-accent font-semibold">¡Explora la agenda!</button></p>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center mb-4 justify-between">
          <div className="flex items-center">
            <UserGroupIcon />
            <h3 className="text-lg font-bold text-brand-primary ml-2">Expositores Destacados</h3>
          </div>
          <button onClick={() => setActiveView('EXHIBITORS')} className="text-sm text-brand-accent font-semibold">Ver todos</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {exhibitors.slice(0, 4).map(exhibitor => (
            <div key={exhibitor.id} className="border rounded-lg p-3 text-center hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveView('EXHIBITORS')}>
              <img src={exhibitor.logoUrl} alt={exhibitor.name} className="w-16 h-16 mx-auto mb-2 object-contain" />
              <p className="font-semibold text-sm truncate">{exhibitor.name}</p>
              <p className="text-xs text-gray-500 truncate">{exhibitor.category}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-bold text-brand-primary mb-4">Perfiles recomendados para conectar</h3>
        <div className="space-y-3">
          {recommendedProfiles.map(profile => (
            <div key={profile.id} className="flex items-center space-x-3">
              <img src={profile.photoUrl} alt={profile.name} className="w-12 h-12 rounded-full" />
              <div>
                <p className="font-semibold text-brand-secondary">{profile.name}</p>
                <p className="text-sm text-gray-500">{profile.title} en {profile.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};