
import React, { useState } from 'react';
import { AgendaSession, Speaker, UserProfile } from '../../types';
import { StarIcon } from '../Icons';

interface AgendaViewProps {
  sessions: AgendaSession[];
  myAgenda: number[];
  toggleAgendaItem: (sessionId: number) => void;
  speakers: Speaker[];
  user: UserProfile;
  checkedInSessions: number[];
  onCheckIn: (sessionId: number) => void;
}

const SessionCard: React.FC<{
  session: AgendaSession;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  speakers: Speaker[];
  isCheckedIn: boolean;
  onCheckIn: () => void;
}> = ({ session, isFavorite, onToggleFavorite, speakers, isCheckedIn, onCheckIn }) => {
  const [expanded, setExpanded] = useState(false);

  const getSpeakers = (speakerIds: number[]) => {
    return speakerIds.map(id => speakers.find(s => s.id === id)).filter(Boolean) as Speaker[];
  }

  const sessionSpeakers = getSpeakers(session.speakerIds);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-brand-accent font-semibold">{session.startTime} - {session.endTime} | {session.room}</p>
            <h3 className="text-lg font-bold text-brand-primary mt-1">{session.title}</h3>
            {session.track && <span className="text-xs bg-brand-secondary text-white px-2 py-0.5 rounded-full mt-1 inline-block">{session.track}</span>}
          </div>
          <button onClick={onToggleFavorite} className="text-brand-accent p-2">
            <StarIcon filled={isFavorite} />
          </button>
        </div>
        <div className="flex items-center space-x-2 mt-3">
          {sessionSpeakers.map(speaker => (
            <div key={speaker.id} className="flex items-center">
              <img src={speaker.photoUrl} alt={speaker.name} className="w-8 h-8 rounded-full" />
              <p className="text-sm text-gray-700 ml-2">{speaker.name}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-sm text-brand-secondary mt-3">
          {expanded ? 'Mostrar menos' : 'Mostrar más...'}
        </button>
        {expanded && (
          <p className="text-gray-600 mt-2 text-sm">{session.description}</p>
        )}
        <button
          onClick={onCheckIn}
          disabled={isCheckedIn}
          className={`mt-3 w-full py-2 rounded font-bold text-sm ${isCheckedIn ? 'bg-green-100 text-green-700 cursor-not-allowed' : 'bg-brand-accent text-white hover:bg-opacity-90'}`}
        >
          {isCheckedIn ? '✓ Check-in Realizado' : 'Check-in (+20 pts)'}
        </button>
      </div>
    </div>
  );
};

export const AgendaView: React.FC<AgendaViewProps> = ({ sessions, myAgenda, toggleAgendaItem, speakers, user, checkedInSessions, onCheckIn }) => {
  const [view, setView] = useState<'all' | 'my'>('all');
  const [selectedDay, setSelectedDay] = useState<'Viernes' | 'Sábado' | 'Domingo'>('Viernes');

  const days: ('Viernes' | 'Sábado' | 'Domingo')[] = ['Viernes', 'Sábado', 'Domingo'];

  const sessionsForDay = sessions.filter(s => {
    if (s.day !== selectedDay) {
      return false;
    }
    // Apply track-based filtering only for Friday
    if (selectedDay === 'Viernes') {
      // 'General' track users see everything.
      // If the session has no specific track, everyone sees it.
      // If the session track matches the user's track, they see it.
      return user.track === 'General' || !s.track || s.track === user.track;
    }
    // For other days, show all sessions
    return true;
  });

  const filteredSessions = view === 'my' ? sessionsForDay.filter(s => myAgenda.includes(s.id)) : sessionsForDay;

  return (
    <div className="p-4">
      <div className="flex justify-center mb-4 bg-gray-200 rounded-lg p-1">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`w-1/3 py-2 text-sm font-semibold rounded-md transition-colors ${selectedDay === day ? 'bg-brand-secondary text-white' : 'text-gray-600'}`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="flex justify-center mb-4 bg-gray-200 rounded-lg p-1">
        <button
          onClick={() => setView('all')}
          className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'all' ? 'bg-brand-primary text-white' : 'text-gray-600'}`}
        >
          Agenda Completa
        </button>
        <button
          onClick={() => setView('my')}
          className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'my' ? 'bg-brand-primary text-white' : 'text-gray-600'}`}
        >
          Mi Agenda ({myAgenda.filter(id => filteredSessions.some(s => s.id === id)).length})
        </button>
      </div>

      {filteredSessions.length > 0 ? (
        filteredSessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            isFavorite={myAgenda.includes(session.id)}
            onToggleFavorite={() => toggleAgendaItem(session.id)}
            speakers={speakers}
            isCheckedIn={checkedInSessions.includes(session.id)}
            onCheckIn={() => onCheckIn(session.id)}
          />
        ))
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500">{view === 'my' ? 'No tienes sesiones agendadas para este día.' : 'No hay sesiones programadas para este día o track.'}</p>
          {view === 'my' && <p className="text-gray-500 mt-2">Añade sesiones desde la agenda completa.</p>}
        </div>
      )}
    </div>
  );
};