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
  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'DASHBOARD', label: 'Inicio', icon: <HomeIcon /> },
    { id: 'AGENDA', label: 'Agenda', icon: <CalendarIcon /> },
    { id: 'SCANNER', label: 'Escanear', icon: <QrCodeIcon /> },
    {
      id: 'NEWS',
      label: 'Noticias',
      icon: <svg className="w-6 h-6" strokeWidth={1.5} stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>
    },
    { id: 'PROFILE', label: 'Perfil', icon: <UserCircleIcon /> },
  ];

  const activeIndex = navItems.findIndex(item => item.id === activeView);

  return (
    <nav className="fixed bottom-6 left-4 right-4 h-20 z-50">
      <div className="glass-panel h-full relative grid grid-cols-5 items-center px-2 shadow-neon overflow-hidden">
        {/* Animated Bubble */}
        <div
          className="absolute h-14 w-[18%] bg-brand-accent/10 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-0"
          style={{
            left: `${(activeIndex * 20) + 1}%`, // 1% margin + 18% width + 1% margin = 20% slot
            width: '18%'
          }}
        />

        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`relative z-10 flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${activeView === item.id ? 'text-brand-accent' : 'text-slate-500'
              }`}
          >
            <div className={`transition-transform duration-200 ${activeView === item.id ? 'scale-110' : 'scale-100'}`}>
              {item.icon}
            </div>
            <span className={`text-xs mt-1 font-medium ${activeView === item.id ? 'opacity-100' : 'opacity-70'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
