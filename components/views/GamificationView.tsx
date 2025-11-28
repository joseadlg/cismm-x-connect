

import React from 'react';
import { LeaderboardEntry } from '../../types';
import { CURRENT_USER } from '../../constants';
import { TrophyIcon } from '../Icons';

interface GamificationViewProps {
  leaderboard: LeaderboardEntry[];
  userPoints: number;
}

export const GamificationView: React.FC<GamificationViewProps> = ({ leaderboard, userPoints }) => {
  return (
    <div className="p-4 space-y-6">
      <div className="bg-brand-primary text-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-brand-accent">
          <TrophyIcon className="w-16 h-16 mx-auto mb-2" />
        </div>
        <h2 className="text-2xl font-bold">Gamificación</h2>
        <p className="opacity-80">¡Participa, conecta y gana!</p>
        <div className="mt-4 bg-white/20 rounded-full px-4 py-2 inline-block">
          <span className="font-bold text-xl">{userPoints}</span>
          <span className="text-sm"> PUNTOS</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-xl font-bold text-brand-primary mb-4">Tabla de Líderes</h3>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center space-x-4 p-3 rounded-lg ${entry.name === CURRENT_USER.name ? 'bg-brand-accent/20 border-l-4 border-brand-accent' : ''
                }`}
            >
              <span className="font-bold text-lg text-brand-secondary w-6 text-center">{entry.rank}</span>
              <img src={entry.photoUrl} alt={entry.name} className="w-12 h-12 rounded-full" />
              <div className="flex-grow">
                <p className="font-semibold text-brand-secondary">{entry.name}</p>
              </div>
              <span className="font-bold text-brand-primary">{entry.points}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center text-gray-500 text-sm p-4">
        <p>Gana puntos haciendo check-in en conferencias (+20), escaneando QRs de expositores (+50), añadiendo sesiones a tu agenda (+50) y conectando con otros asistentes (+100).</p>
      </div>
    </div>
  );
};
