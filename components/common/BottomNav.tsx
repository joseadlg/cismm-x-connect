import { ReactNode } from 'react';
import { View } from '../../types';
import { HomeIcon, CalendarIcon, QrCodeIcon, UserCircleIcon, UserGroupIcon } from '../Icons';

interface BottomNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const NavItem = ({ icon, label, isActive, onClick }: {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-brand-accent' : 'text-gray-400'
      }`}
  >
    {icon}
    <span className="text-xs mt-1">{label}</span>
  </button>
);

export const BottomNav = ({ activeView, setActiveView }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-brand-primary shadow-lg border-t border-brand-secondary z-20 h-16">
      <div className="container mx-auto px-2 h-full">
        <div className="flex justify-around items-center h-full">
          <NavItem
            icon={<HomeIcon />}
            label="Inicio"
            isActive={activeView === 'DASHBOARD'}
            onClick={() => setActiveView('DASHBOARD')}
          />
          <NavItem
            icon={<CalendarIcon />}
            label="Agenda"
            isActive={activeView === 'AGENDA'}
            onClick={() => setActiveView('AGENDA')}
          />
          <NavItem
            icon={<QrCodeIcon />}
            label="Escanear"
            isActive={activeView === 'SCANNER'}
            onClick={() => setActiveView('SCANNER')}
          />
          <NavItem
            icon={<svg className="w-6 h-6" strokeWidth={1.5} stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>}
            label="Noticias"
            isActive={activeView === 'NEWS'}
            onClick={() => setActiveView('NEWS')}
          />
          <NavItem
            icon={<UserCircleIcon />}
            label="Perfil"
            isActive={activeView === 'PROFILE'}
            onClick={() => setActiveView('PROFILE')}
          />
        </div>
      </div>
    </nav>
  );
};
