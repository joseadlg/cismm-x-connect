
import React from 'react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">CISMM X Connect</h1>
        <h2 className="text-md font-light">{title}</h2>
      </div>
    </header>
  );
};
