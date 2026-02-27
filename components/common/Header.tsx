
import React from 'react';

interface HeaderProps {
  title: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onLogout }) => {
  return (
    <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">CISMM X Connect</h1>
        <div className="flex items-center space-x-3">
          <h2 className="text-md font-light">{title}</h2>
          {onLogout && (
            <button onClick={onLogout} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors">
              Salir
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
