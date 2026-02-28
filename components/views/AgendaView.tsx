
import React, { useState } from 'react';
import { AgendaSession, Speaker, UserProfile } from '../../types';
import { StarIcon } from '../Icons';

import { supabase } from '../../utils/supabase';
import { useToast } from '../../contexts/ToastContext';

interface AgendaViewProps {
  sessions: AgendaSession[];
  myAgenda: number[];
  toggleAgendaItem: (sessionId: number) => void;
  speakers: Speaker[];
  user: UserProfile;
  checkedInSessions: number[];
  myRatings: number[];
  onCheckIn: (sessionId: number) => void;
  onRatingSubmitted: (sessionId: number) => void;
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
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-brand-secondary mt-3 underline"
        >
          {expanded ? 'Mostrar menos' : 'Mostrar detalles de la plática...'}
        </button>
        {expanded && (
          <p className="text-gray-600 mt-2 text-sm leading-relaxed">{session.description}</p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCheckIn}
            disabled={isCheckedIn}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${isCheckedIn ? 'bg-green-100 text-green-700 cursor-not-allowed' : 'bg-brand-accent text-white hover:bg-opacity-90 shadow-md'}`}
          >
            {isCheckedIn ? '✓ Check-in Realizado' : 'Hacer Check-in (+20 pts)'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RatingModal: React.FC<{
  session: AgendaSession;
  userId: string;
  onClose: () => void;
  onSuccess: (sessionId: number) => void;
}> = ({ session, userId, onClose, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.from('session_ratings').insert({
      user_id: userId,
      session_id: session.id,
      rating,
      comment
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        showToast('Ya has calificado esta sesión anteriormente.', 'info');
        onSuccess(session.id); // trigger sync anyways
        onClose();
      } else {
        showToast('Error al enviar la calificación.', 'error');
      }
    } else {
      showToast('¡Gracias por tu reseña anónima!', 'success');
      onSuccess(session.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-brand-primary mb-2 text-center">Calificar Sesión</h3>
        <p className="text-sm text-gray-600 outline-none text-center mb-6 line-clamp-2">{session.title}</p>

        <div className="flex justify-center space-x-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
              <StarIcon filled={star <= rating} className="w-10 h-10 text-brand-accent" />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Qué te pareció la plática? (Opcional)"
          className="w-full border border-gray-300 rounded-xl p-3 text-sm mb-4 h-24 focus:ring-2 focus:ring-brand-secondary outline-none resize-none"
        ></textarea>

        <p className="text-xs text-center text-gray-500 mb-6 italic">Tu calificación cuenta para mejorar. Es anónima y no se publicará tu nombre.</p>

        <div className="flex space-x-3">
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 text-gray-600 font-semibold rounded-xl bg-gray-100 hover:bg-gray-200">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-3 text-white font-semibold rounded-xl bg-brand-primary hover:bg-opacity-90 flex justify-center items-center">
            {isSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AgendaView: React.FC<AgendaViewProps> = ({ sessions, myAgenda, toggleAgendaItem, speakers, user, checkedInSessions, myRatings, onCheckIn, onRatingSubmitted }) => {
  const [view, setView] = useState<'all' | 'my'>('all');
  const [selectedDay, setSelectedDay] = useState<'Viernes' | 'Sábado' | 'Domingo'>('Viernes');
  const [ratingSession, setRatingSession] = useState<AgendaSession | null>(null);

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
    <div className="p-4 pb-24">
      <div className="flex justify-center mb-6 bg-gray-100 rounded-xl p-1 shadow-inner">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`w-1/3 py-2.5 text-sm font-semibold rounded-lg transition-all ${selectedDay === day ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="flex justify-center mb-6 bg-gray-100 rounded-xl p-1 shadow-inner">
        <button
          onClick={() => setView('all')}
          className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-all ${view === 'all' ? 'bg-brand-secondary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Agenda Completa
        </button>
        <button
          onClick={() => setView('my')}
          className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-all ${view === 'my' ? 'bg-brand-secondary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Mi Agenda ({myAgenda.filter(id => filteredSessions.some(s => s.id === id)).length})
        </button>
      </div>

      <div className="space-y-4">
        {filteredSessions.length > 0 ? (
          filteredSessions.map(session => (
            <div key={session.id} className="relative">
              <SessionCard
                session={session}
                isFavorite={myAgenda.includes(session.id)}
                onToggleFavorite={() => toggleAgendaItem(session.id)}
                speakers={speakers}
                isCheckedIn={checkedInSessions.includes(session.id)}
                onCheckIn={() => onCheckIn(session.id)}
              />

              {/* Rating Bubble Overlay over the Session Card */}
              {checkedInSessions.includes(session.id) && !myRatings.includes(session.id) && (
                <div className="absolute top-2 right-12 z-10">
                  <button
                    onClick={() => setRatingSession(session)}
                    className="bg-yellow-400 text-yellow-900 border border-yellow-500 font-bold text-xs px-2 py-1 flex items-center shadow-lg rounded-full hover:bg-yellow-300 transition-transform hover:scale-105"
                  >
                    <StarIcon filled className="w-3 h-3 mr-1" /> Calificar Plática
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <p className="text-gray-500 font-medium">{view === 'my' ? 'No tienes sesiones agendadas para este día.' : 'No hay pláticas programadas para este horario o especialidad.'}</p>
            {view === 'my' && <p className="text-gray-400 mt-2 text-sm">Explora la agenda completa para añadir tus favoritas.</p>}
          </div>
        )}
      </div>

      {ratingSession && (
        <RatingModal
          session={ratingSession}
          userId={user.id}
          onClose={() => setRatingSession(null)}
          onSuccess={onRatingSubmitted}
        />
      )}
    </div>
  );
};